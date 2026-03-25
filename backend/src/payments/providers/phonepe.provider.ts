import { BasePaymentProvider } from './base.provider';
import {
    PaymentProvider,
    CreateOrderParams,
    CreateOrderResponse,
    VerifySignatureParams,
    PaymentStatusResponse,
    RefundParams,
    RefundResponse,
    CreateMandateParams,
    MandateResponse,
    WebhookEvent,
    WebhookProcessResult,
    ProviderConfig,
} from '../interfaces/payment-provider.interface';
import * as crypto from 'crypto';

/**
 * PhonePe Payment Provider Implementation
 */
export class PhonePeProvider extends BasePaymentProvider implements PaymentProvider {
    readonly name = 'PHONEPE';

    private readonly baseUrl: string;
    private readonly merchantId: string;

    constructor(config: ProviderConfig) {
        super(config);
        this.baseUrl = config.isProduction
            ? 'https://api.phonepe.com/apis/pg'
            : 'https://api-preprod.phonepe.com/apis/pg';
        this.merchantId = config.keyId;
    }

    /**
     * Create a PhonePe Payment
     */
    async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
        try {
            const transactionId = this.generateTransactionId();

            const payload = {
                merchantId: this.merchantId,
                merchantTransactionId: transactionId,
                merchantUserId: `MUID_${Date.now()}`,
                amount: this.formatAmount(params.amount),
                currency: params.currency || 'INR',
                redirectUrl: params.metadata?.redirectUrl || '',
                redirectMode: 'REDIRECT',
                callbackUrl: params.metadata?.callbackUrl || '',
                paymentInstrument: {
                    type: params.paymentMethod === 'UPI' ? 'UPI_INTENT' : 'PAY_PAGE',
                },
            };

            // Generate X-Verify header
            const requestBody = JSON.stringify(payload);
            const base64Payload = Buffer.from(requestBody).toString('base64');
            const signature = this.generateSignature(base64Payload, '/pg/v1/pay');

            const response = await this.makeRequest<any>(
                'POST',
                `${this.baseUrl}/v1/pay`,
                { request: base64Payload },
                1 // No retries for payment creation
            );

            if (response.success && response.data?.instrumentResponse?.redirectInfo?.url) {
                return {
                    success: true,
                    orderId: transactionId,
                    providerData: response.data,
                    checkoutUrl: response.data.instrumentResponse.redirectInfo.url,
                    message: 'Payment initiated successfully',
                };
            }

            return {
                success: false,
                error: response.message || 'Failed to initiate payment',
            };
        } catch (error: any) {
            console.error('PhonePe create order error:', error);
            return {
                success: false,
                error: error.message || 'Failed to create order',
            };
        }
    }

    /**
     * Verify PhonePe payment signature
     */
    async verifySignature(params: VerifySignatureParams): Promise<boolean> {
        try {
            const { orderId, paymentId, signature } = params;

            // PhonePe verification endpoint
            const response = await this.makeRequest<any>(
                'GET',
                `${this.baseUrl}/v1/transaction/${orderId}/${paymentId}/status`,
                undefined,
                1
            );

            return response.success && response.data?.responseCode === 'SUCCESS';
        } catch (error) {
            console.error('PhonePe signature verification error:', error);
            return false;
        }
    }

    /**
     * Get payment status from PhonePe
     */
    async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
        try {
            // PhonePe uses merchantTransactionId for status check
            const response = await this.makeRequest<any>(
                'GET',
                `${this.baseUrl}/v1/transaction/${paymentId}/status`,
                undefined,
                1
            );

            if (!response.success) {
                return {
                    success: false,
                    status: 'FAILED',
                    errorMessage: response.message,
                };
            }

            const data = response.data;

            return {
                success: true,
                status: this.mapPhonePeStatus(data.state),
                paymentId: data.transactionId,
                amount: this.parseAmount(data.amount),
                currency: data.currency,
                customerPhone: data.customerMobileNumber,
                paymentMethod: this.mapPaymentMethod(data.paymentInstrument?.type),
            };
        } catch (error: any) {
            console.error('PhonePe get payment status error:', error);
            return {
                success: false,
                status: 'FAILED',
                errorMessage: error.message,
            };
        }
    }

    /**
     * Refund a payment
     */
    async refund(params: RefundParams): Promise<RefundResponse> {
        try {
            const refundTransactionId = `refund_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            const payload = {
                merchantId: this.merchantId,
                merchantTransactionId: params.paymentId,
                merchantRefundId: refundTransactionId,
                amount: this.formatAmount(params.amount || 0),
            };

            const requestBody = JSON.stringify(payload);
            const base64Payload = Buffer.from(requestBody).toString('base64');
            const signature = this.generateSignature(base64Payload, '/pg/v1/refund');

            const response = await this.makeRequest<any>(
                'POST',
                `${this.baseUrl}/v1/refund`,
                { request: base64Payload },
                1
            );

            if (response.success) {
                return {
                    success: true,
                    refundId: refundTransactionId,
                    status: response.data?.state,
                    message: 'Refund initiated successfully',
                };
            }

            return {
                success: false,
                error: response.message || 'Failed to process refund',
            };
        } catch (error: any) {
            console.error('PhonePe refund error:', error);
            return {
                success: false,
                error: error.message || 'Failed to process refund',
            };
        }
    }

    /**
     * Create recurring payment mandate using PhonePe Autopay
     */
    async createMandate(params: CreateMandateParams): Promise<MandateResponse> {
        try {
            const transactionId = this.generateTransactionId();

            const payload = {
                merchantId: this.merchantId,
                merchantTransactionId: transactionId,
                merchantUserId: `MUID_${Date.now()}`,
                amount: this.formatAmount(params.amount),
                currency: 'INR',
                deviceContext: {
                    deviceOS: 'WEB',
                },
                mandateType: {
                    type: 'RECURRING',
                    frequency: params.frequency.toUpperCase(),
                    expiryDate: params.endDate ? Math.floor(params.endDate.getTime() / 1000) : undefined,
                    maxAmount: params.maxAmount ? this.formatAmount(params.maxAmount) : undefined,
                },
            };

            const requestBody = JSON.stringify(payload);
            const base64Payload = Buffer.from(requestBody).toString('base64');
            const signature = this.generateSignature(base64Payload, '/pg/v1/recurring');

            const response = await this.makeRequest<any>(
                'POST',
                `${this.baseUrl}/v1/recurring`,
                { request: base64Payload },
                1
            );

            if (response.success) {
                return {
                    success: true,
                    mandateId: transactionId,
                    authLink: response.data?.redirectUrl,
                    status: response.data?.state,
                    message: 'Mandate created successfully',
                };
            }

            return {
                success: false,
                error: response.message || 'Failed to create mandate',
            };
        } catch (error: any) {
            console.error('PhonePe create mandate error:', error);
            return {
                success: false,
                error: error.message || 'Failed to create mandate',
            };
        }
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string): boolean {
        try {
            const base64Payload = Buffer.from(payload).toString('base64');
            const expectedSignature = this.generateSignature(base64Payload, '/pg/v1/status/webhook');
            return signature === expectedSignature;
        } catch (error) {
            console.error('PhonePe webhook signature verification error:', error);
            return false;
        }
    }

    /**
     * Process webhook event
     */
    async processWebhookEvent(event: WebhookEvent): Promise<WebhookProcessResult> {
        const eventType = event.eventType;
        const paymentData = event.data;

        try {
            switch (eventType) {
                case 'PAYMENT_SUCCESS':
                    return {
                        success: true,
                        processed: true,
                        action: 'PAYMENT_SUCCESS',
                        transactionId: paymentData.transactionId,
                        message: 'Payment successful',
                    };

                case 'PAYMENT_FAILED':
                    return {
                        success: true,
                        processed: true,
                        action: 'PAYMENT_FAILED',
                        transactionId: paymentData.transactionId,
                        message: 'Payment failed',
                    };

                case 'REFUND_SUCCESS':
                    return {
                        success: true,
                        processed: true,
                        action: 'REFUND_PROCESSED',
                        transactionId: paymentData.transactionId,
                        message: 'Refund successful',
                    };

                case 'REFUND_FAILED':
                    return {
                        success: true,
                        processed: true,
                        action: 'REFUND_FAILED',
                        transactionId: paymentData.transactionId,
                        message: 'Refund failed',
                    };

                default:
                    return {
                        success: true,
                        processed: false,
                        message: `Event type ${eventType} not processed`,
                    };
            }
        } catch (error: any) {
            console.error('PhonePe webhook processing error:', error);
            return {
                success: false,
                processed: false,
                message: error.message,
            };
        }
    }

    // Helper methods

    private generateTransactionId(): string {
        return `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    private generateSignature(payload: string, endpoint: string): string {
        const stringToSign = `${payload}${endpoint}${this.config.keySecret}`;
        const signature = crypto
            .createHash('sha256')
            .update(stringToSign)
            .digest('hex');

        return `${signature}:${this.merchantId}`;
    }

    private mapPhonePeStatus(state: string): 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' {
        const statusMap: Record<string, 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'> = {
            'PENDING': 'PENDING',
            'SUBMITTED': 'PROCESSING',
            'SUCCESS': 'SUCCESS',
            'FAILED': 'FAILED',
            'REFUNDED': 'REFUNDED',
        };
        return statusMap[state] || 'PENDING';
    }

    private mapPaymentMethod(type?: string): string {
        const methodMap: Record<string, string> = {
            'UPI_INTENT': 'UPI',
            'UPI_COLLECT': 'UPI',
            'CARD': 'CARD',
            'WALLET': 'WALLET',
            'NETBANKING': 'NETBANKING',
        };
        return methodMap[type || ''] || '';
    }
}
