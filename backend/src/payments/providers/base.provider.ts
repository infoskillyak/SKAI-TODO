import { PaymentProvider, ProviderConfig, CreateOrderParams, VerifySignatureParams, RefundParams, WebhookEvent } from '../interfaces/payment-provider.interface';

/**
 * Base Payment Provider Class
 * Provides common functionality for all payment providers
 */
export abstract class BasePaymentProvider implements PaymentProvider {
    abstract readonly name: string;

    protected config: ProviderConfig;
    protected isProduction: boolean;

    constructor(config: ProviderConfig) {
        this.config = config;
        this.isProduction = config.isProduction;
    }

    /**
     * Create a payment order - must be implemented by each provider
     */
    abstract createOrder(params: CreateOrderParams): Promise<any>;

    /**
     * Verify payment signature - must be implemented by each provider
     */
    abstract verifySignature(params: VerifySignatureParams): Promise<boolean>;

    /**
     * Get payment status - must be implemented by each provider
     */
    abstract getPaymentStatus(paymentId: string): Promise<any>;

    /**
     * Refund a payment - must be implemented by each provider
     */
    abstract refund(params: RefundParams): Promise<any>;

    /**
     * Verify webhook signature - must be implemented by each provider
     */
    abstract verifyWebhookSignature(payload: string, signature: string): boolean;

    /**
     * Process webhook event - must be implemented by each provider
     */
    abstract processWebhookEvent(event: WebhookEvent): Promise<any>;

    /**
     * Create recurring payment mandate
     * Override in provider if supported
     */
    createMandate?(params: any): Promise<any> {
        throw new Error(`${this.name} does not support recurring payments`);
    }

    /**
     * Format amount to provider's expected format (usually paise)
     */
    protected formatAmount(amount: number): number {
        // Amount in rupees -> paise (multiply by 100)
        return Math.round(amount * 100);
    }

    /**
     * Parse amount from provider's format
     */
    protected parseAmount(amount: number): number {
        // Amount in paise -> rupees (divide by 100)
        return amount / 100;
    }

    /**
     * Get headers for API requests
     */
    protected getHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'User-Agent': 'SKAI-Todo-Payment/1.0',
        };
    }

    /**
     * Get authorization header
     */
    protected getAuthHeader(): Record<string, string> {
        const credentials = Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString('base64');
        return {
            'Authorization': `Basic ${credentials}`,
        };
    }

    /**
     * Make HTTP request with retry logic
     */
    protected async makeRequest<T>(
        method: string,
        url: string,
        body?: any,
        retries: number = this.config.retryAttempts || 3
    ): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await this.executeRequest<T>(method, url, body);
                return response;
            } catch (error: any) {
                lastError = error;
                console.error(`Payment request failed (attempt ${attempt}/${retries}):`, error.message);

                // Don't retry on client errors (4xx)
                if (error.status && error.status >= 400 && error.status < 500) {
                    throw error;
                }

                // Wait before retrying (exponential backoff)
                if (attempt < retries) {
                    await this.delay(Math.pow(2, attempt) * 1000);
                }
            }
        }

        throw lastError || new Error('Request failed after retries');
    }

    /**
     * Execute the actual HTTP request
     */
    protected async executeRequest<T>(method: string, url: string, body?: any): Promise<T> {
        const headers = {
            ...this.getHeaders(),
            ...this.getAuthHeader(),
        };

        const options: RequestInit = {
            method,
            headers,
        };

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, {
            ...options,
            signal: AbortSignal.timeout(this.config.timeout || 30000),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.description || error.message || `HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * Delay helper
     */
    protected delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate unique receipt ID
     */
    protected generateReceiptId(): string {
        return `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    /**
     * Map provider status to common status
     */
    protected mapStatus(providerStatus: string): string {
        const statusMap: Record<string, string> = {
            'created': 'PENDING',
            'pending': 'PENDING',
            'processing': 'PROCESSING',
            'authorized': 'PROCESSING',
            'captured': 'SUCCESS',
            'paid': 'SUCCESS',
            'success': 'SUCCESS',
            'failed': 'FAILED',
            'error': 'FAILED',
            'refunded': 'REFUNDED',
            'partial_refunded': 'REFUNDED',
        };

        return statusMap[providerStatus?.toLowerCase()] || 'PENDING';
    }
}
