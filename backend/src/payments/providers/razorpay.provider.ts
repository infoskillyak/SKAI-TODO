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

/**
 * Razorpay Payment Provider Implementation
 */
export class RazorpayProvider extends BasePaymentProvider implements PaymentProvider {
    readonly name = 'RAZORPAY';

    private readonly baseUrl: string;

    constructor(config: ProviderConfig) {
        super(config);
        this.baseUrl = config.isProduction
            ? 'https://api.razorpay.com/v1'
            : 'https://api.razorpay.com/v1';
    }

    /**
     * Create a Razorpay Order
     */
    async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
        try {
            const orderData = {
                amount: this.formatAmount(params.amount),
                currency: params.currency || 'INR',
                receipt: params.receipt || this.generateReceiptId(),
                payment_capture: 1, // Auto-capture
                notes: {
                    ...params.metadata,
                    customer_email: params.customerEmail,
                    customer_phone: params.customerPhone,
                    customer_name: params.customerName,
                },
            };

            // Add UPI specific options
            if (params.paymentMethod === 'UPI') {
                Object.assign(orderData, {
                    method: 'upi',
                });
            }

            const response = await this.makeRequest<any>('POST', `${this.baseUrl}/orders`, orderData);

            return {
                success: true,
                orderId: response.id,
                providerData: response,
                message: 'Order created successfully',
            };
        } catch (error: any) {
            console.error('Razorpay create order error:', error);
            return {
                success: false,
                error: error.message || 'Failed to create order',
            };
        }
    }

    /**
     * Verify Razorpay payment signature
     */
    async verifySignature(params: VerifySignatureParams): Promise<boolean> {
        try {
            const { orderId, paymentId, signature } = params;

            // Create signature verification payload
            const payload = `${orderId}|${paymentId}`;

            // Use crypto to verify
            const crypto = await import('crypto');
            const expectedSignature = crypto
                .createHmac('sha256', this.config.keySecret)
                .update(payload)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch (error) {
            console.error('Razorpay signature verification error:', error);
            return false;
        }
    }

    /**
     * Get payment status from Razorpay
     */
    async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
        try {
            const response = await this.makeRequest<any>('GET', `${this.baseUrl}/payments/${paymentId}`);

            return {
                success: true,
                status: this.mapStatus(response.status) as 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED',
                paymentId: response.id,
                amount: this.parseAmount(response.amount),
                currency: response.currency,
                customerEmail: response.email,
                customerPhone: response.contact,
                paymentMethod: response.method?.toUpperCase(),
                upiVpa: response.vpa,
                cardLast4: response.card?.last4,
            };
        } catch (error: any) {
            console.error('Razorpay get payment status error:', error);
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
            const refundData: any = {
                amount: params.amount ? this.formatAmount(params.amount) : undefined,
                notes: {
                    reason: params.reason || 'Customer requested refund',
                },
            };

            const response = await this.makeRequest<any>(
                'POST',
                `${this.baseUrl}/payments/${params.paymentId}/refund`,
                refundData
            );

            return {
                success: true,
                refundId: response.id,
                status: response.status,
                message: 'Refund initiated successfully',
            };
        } catch (error: any) {
            console.error('Razorpay refund error:', error);
            return {
                success: false,
                error: error.message || 'Failed to process refund',
            };
        }
    }

    /**
     * Create recurring payment mandate using Razorpay EMI/UPI AutoPay
     */
    async createMandate(params: CreateMandateParams): Promise<MandateResponse> {
        try {
            // For UPI recurring, create a subscription
            const subscriptionData = {
                plan_id: `plan_${params.frequency}`,
                customer_id: `cust_${Date.now()}`,
                customer_email: params.customerEmail,
                customer_phone: params.customerPhone,
                customer_name: params.customerName,
                amount: this.formatAmount(params.amount),
                currency: 'INR',
                frequency: params.frequency.toUpperCase(),
                start_date: Math.floor(params.startDate.getTime() / 1000),
                end_date: params.endDate ? Math.floor(params.endDate.getTime() / 1000) : undefined,
                notes: {
                    description: params.description,
                },
            };

            // Note: Requires Razorpay Subscription/Emandate feature
            // This is a simplified implementation
            const response = await this.makeRequest<any>('POST', `${this.baseUrl}/subscriptions`, subscriptionData);

            return {
                success: true,
                mandateId: response.id,
                authLink: response.short_url,
                status: response.status,
                message: 'Mandate created successfully',
            };
        } catch (error: any) {
            console.error('Razorpay create mandate error:', error);
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
            const crypto = require('crypto');
            const expectedSignature = crypto
                .createHmac('sha256', this.config.webhookSecret || this.config.keySecret)
                .update(payload)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch (error) {
            console.error('Razorpay webhook signature verification error:', error);
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
                case 'payment.captured':
                    return {
                        success: true,
                        processed: true,
                        action: 'PAYMENT_SUCCESS',
                        transactionId: paymentData.id,
                        message: 'Payment captured successfully',
                    };

                case 'payment.failed':
                    return {
                        success: true,
                        processed: true,
                        action: 'PAYMENT_FAILED',
                        transactionId: paymentData.id,
                        message: 'Payment failed',
                    };

                case 'refund.created':
                    return {
                        success: true,
                        processed: true,
                        action: 'REFUND_PROCESSED',
                        transactionId: paymentData.id,
                        message: 'Refund processed',
                    };

                case 'subscription.activated':
                    return {
                        success: true,
                        processed: true,
                        action: 'SUBSCRIPTION_ACTIVATED',
                        transactionId: paymentData.id,
                        message: 'Subscription activated',
                    };

                case 'subscription.cancelled':
                    return {
                        success: true,
                        processed: true,
                        action: 'SUBSCRIPTION_CANCELLED',
                        transactionId: paymentData.id,
                        message: 'Subscription cancelled',
                    };

                default:
                    return {
                        success: true,
                        processed: false,
                        message: `Event type ${eventType} not processed`,
                    };
            }
        } catch (error: any) {
            console.error('Razorpay webhook processing error:', error);
            return {
                success: false,
                processed: false,
                message: error.message,
            };
        }
    }
}
