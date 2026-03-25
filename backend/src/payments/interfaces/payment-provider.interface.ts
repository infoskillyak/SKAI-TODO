/**
 * Payment Provider Interface
 * All payment providers must implement this interface
 */
export interface PaymentProvider {
    readonly name: string;

    /**
     * Create a payment/order
     */
    createOrder(params: CreateOrderParams): Promise<CreateOrderResponse>;

    /**
     * Verify payment signature
     */
    verifySignature(params: VerifySignatureParams): Promise<boolean>;

    /**
     * Get payment status
     */
    getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse>;

    /**
     * Refund a payment
     */
    refund(params: RefundParams): Promise<RefundResponse>;

    /**
     * Create recurring payment mandate
     */
    createMandate?(params: CreateMandateParams): Promise<MandateResponse>;

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string): boolean;

    /**
     * Process webhook event
     */
    processWebhookEvent(event: WebhookEvent): Promise<WebhookProcessResult>;
}

/**
 * Create Order Parameters
 */
export interface CreateOrderParams {
    amount: number;          // Amount in paise (INR)
    currency?: string;
    receipt?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerName?: string;
    description?: string;
    metadata?: Record<string, any>;
    paymentMethod?: string;  // UPI, CARD, WALLET, etc.
}

/**
 * Create Order Response
 */
export interface CreateOrderResponse {
    success: boolean;
    orderId?: string;
    paymentId?: string;      // Some providers return payment ID directly
    providerData?: any;
    checkoutUrl?: string;    // For redirect-based payments
    qrCode?: string;         // For UPI QR codes
    message?: string;
    error?: string;
}

/**
 * Verify Signature Parameters
 */
export interface VerifySignatureParams {
    orderId: string;
    paymentId: string;
    signature: string;
    amount?: number;
}

/**
 * Payment Status Response
 */
export interface PaymentStatusResponse {
    success: boolean;
    status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
    paymentId?: string;
    amount?: number;
    currency?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerName?: string;
    paymentMethod?: string;
    upiVpa?: string;
    cardLast4?: string;
    errorMessage?: string;
}

/**
 * Refund Parameters
 */
export interface RefundParams {
    paymentId: string;
    amount?: number;         // Partial refund amount in paise
    reason?: string;
    speed?: 'normal' | 'optimal';
}

/**
 * Refund Response
 */
export interface RefundResponse {
    success: boolean;
    refundId?: string;
    status?: string;
    message?: string;
    error?: string;
}

/**
 * Create Mandate Parameters (for recurring payments)
 */
export interface CreateMandateParams {
    customerEmail: string;
    customerPhone: string;
    customerName: string;
    amount: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate?: Date;
    upiVpa?: string;
    maxAmount?: number;
    description?: string;
}

/**
 * Mandate Response
 */
export interface MandateResponse {
    success: boolean;
    mandateId?: string;
    authLink?: string;       // URL for customer authorization
    status?: string;
    message?: string;
    error?: string;
}

/**
 * Webhook Event
 */
export interface WebhookEvent {
    eventId: string;
    eventType: string;
    timestamp: Date;
    data: any;
}

/**
 * Webhook Process Result
 */
export interface WebhookProcessResult {
    success: boolean;
    processed: boolean;
    action?: string;
    transactionId?: string;
    message?: string;
}

/**
 * Payment Method Types
 */
export enum PaymentMethod {
    UPI = 'UPI',
    CARD = 'CARD',
    WALLET = 'WALLET',
    NETBANKING = 'NETBANKING',
    BANK_TRANSFER = 'BANK_TRANSFER',
    EMI = 'EMI',
}

/**
 * Provider Type
 */
export enum PaymentProviderType {
    RAZORPAY = 'RAZORPAY',
    PHONEPE = 'PHONEPE',
    CASHFREE = 'CASHFREE',
    UPI = 'UPI',
    BANK_TRANSFER = 'BANK_TRANSFER',
}

/**
 * Default Provider Configuration
 */
export interface ProviderConfig {
    keyId: string;
    keySecret: string;
    webhookSecret?: string;
    isProduction: boolean;
    timeout?: number;
    retryAttempts?: number;
}
