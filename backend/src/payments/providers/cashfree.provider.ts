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
 * Cashfree Payment Provider Implementation
 */
export class CashfreeProvider extends BasePaymentProvider implements PaymentProvider {
    readonly name = 'CASHFREE';

    private readonly baseUrl: string;
    private readonly appId: string;

    constructor(config: ProviderConfig) {
        super(config);
        this.baseUrl = config.isProduction
            ? 'https://api.cashfree.com/pg'
            : 'https://sandbox.cashfree.com/pg';
        this.appId = config.keyId;
    }

    /**
     * Create a Cashfree Payment Order
     */
    async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
        try {
            const orderId = this.generateOrderId();

            const payload = {
                order_id: orderId,
                order_amount: params.amount,
                order_currency: params.currency || 'INR',
                customer_details: {
                    customer_id: `cust_${Date.now()}`,
                    customer_name: params.customerName || '',
                    customer_email: params.customerEmail || '',
                    customer_phone: params.customerPhone || '',
                },
                order_meta: {
                    return_url: params.metadata?.returnUrl || '',
                    notify_url: params.metadata?.notifyUrl || '',
                    payment_methods: params.paymentMethod,
                },
                order_expiry_time: params.metadata?.expiryTime || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            };

            const response = await this.makeRequest<any>('POST', `${this.baseUrl}/orders`, payload);

            if (response.order_status === 'ACTIVE') {
                return {
                    success: true,
                    orderId: response.order_id,
                    providerData: response,
                    checkoutUrl: response.payment_link,
                    message: 'Payment link created successfully',
                };
            }

            return {
                success: false,
                error: response.message || 'Failed to create order',
            };
        } catch (error: any) {
            console.error('Cashfree create order error:', error);
            return {
                success: false,
                error: error.message || 'Failed to create order',
            };
        }
    }

    /**
     * Verify Cashfree payment signature
     */
    async verifySignature(params: VerifySignatureParams): Promise<boolean> {
        try {
            const { orderId, paymentId, signature } = params;

            // Get order status and verify
            const response = await this.makeRequest<any>(
                'GET',
                `${this.baseUrl}/orders/${orderId}`,
                undefined,
                1
            );

            // Cashfree uses order_id + order_amount for signature verification
            const dataToSign = `${orderId}${response.order_amount}`;
            const expectedSignature = crypto
                .createHmac('sha256', this.config.keySecret)
                .update(dataToSign)
                .digest('hex');

            return signature === expectedSignature;
        } catch (error) {
            console.error('Cashfree signature verification error:', error);
            return false;
        }
    }

    /**
     * Get payment status from Cashfree
     */
    async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
        try {
            const response = await this.makeRequest<any>(
                'GET',
                `${this.baseUrl}/orders/${paymentId}`,
                undefined,
                1
            );

            if (!response) {
                return {
                    success: false,
                    status: 'FAILED',
                    errorMessage: 'Order not found',
                };
            }

            return {
                success: true,
                status: this.mapCashfreeStatus(response.order_status),
                paymentId: response.order_id,
                amount: response.order_amount,
                currency: response.order_currency,
                customerEmail: response.customer_details?.customer_email,
                customerPhone: response.customer_details?.customer_phone,
                customerName: response.customer_details?.customer_name || '',
            };
        } catch (error: any) {
            console.error('Cashfree get payment status error:', error);
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
            const refundId = `refund_${Date.now()}`;

            const payload: any = {
                refund_id: refundId,
                order_id: params.paymentId,
                refund_amount: params.amount ? params.amount.toString() : undefined,
                refund_note: params.reason,
            };

            const response = await this.makeRequest<any>(
                'POST',
                `${this.baseUrl}/refunds`,
                payload
            );

            if (response.refund_status) {
                return {
                    success: true,
                    refundId: response.refund_id,
                    status: response.refund_status,
                    message: 'Refund processed successfully',
                };
            }

            return {
                success: false,
                error: response.message || 'Failed to process refund',
            };
        } catch (error: any) {
            console.error('Cashfree refund error:', error);
            return {
                success: false,
                error: error.message || 'Failed to process refund',
            };
        }
    }

    /**
     * Create recurring payment using Cashfree Subscriptions
     */
    async createMandate(params: CreateMandateParams): Promise<MandateResponse> {
        try {
            const subscriptionId = `sub_${Date.now()}`;

            const payload = {
                subscription_id: subscriptionId,
                plan_id: `plan_${params.frequency}`,
                customer_name: params.customerName,
                customer_email: params.customerEmail,
                customer_phone: params.customerPhone,
                subscription_amount: params.amount,
                subscription_currency: 'INR',
                subscription_frequency: this.mapFrequency(params.frequency),
                subscription_start_date: Math.floor(params.startDate.getTime() / 1000),
                subscription_end_date: params.endDate ? Math.floor(params.endDate.getTime() / 1000) : undefined,
                subscription_notes: params.description,
            };

            const response = await this.makeRequest<any>(
                'POST',
                `${this.baseUrl}/subscriptions`,
                payload
            );

            if (response.subscription_status) {
                return {
                    success: true,
                    mandateId: response.subscription_id,
                    authLink: response.activation_link,
                    status: response.subscription_status,
                    message: 'Subscription created successfully',
                };
            }

            return {
                success: false,
                error: response.message || 'Failed to create subscription',
            };
        } catch (error: any) {
            console.error('Cashfree create mandate error:', error);
            return {
                success: false,
                error: error.message || 'Failed to create subscription',
            };
        }
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string): boolean {
        try {
            const expectedSignature = crypto
                .createHmac('sha256', this.config.webhookSecret || this.config.keySecret)
                .update(payload)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch (error) {
            console.error('Cashfree webhook signature verification error:', error);
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
                case 'order.paid':
                    return {
                        success: true,
                        processed: true,
                        action: 'PAYMENT_SUCCESS',
                        transactionId: paymentData.order_id,
                        message: 'Payment successful',
                    };

                case 'PAYMENT_FAILED':
                case 'order.failed':
                    return {
                        success: true,
                        processed: true,
                        action: 'PAYMENT_FAILED',
                        transactionId: paymentData.order_id,
                        message: 'Payment failed',
                    };

                case 'ORDER_EXPIRED':
                    return {
                        success: true,
                        processed: true,
                        action: 'ORDER_EXPIRED',
                        transactionId: paymentData.order_id,
                        message: 'Order expired',
                    };

                case 'REFUND_PROCESSED':
                    return {
                        success: true,
                        processed: true,
                        action: 'REFUND_PROCESSED',
                        transactionId: paymentData.order_id,
                        message: 'Refund processed',
                    };

                case 'SUBSCRIPTION_ACTIVATED':
                    return {
                        success: true,
                        processed: true,
                        action: 'SUBSCRIPTION_ACTIVATED',
                        transactionId: paymentData.subscription_id,
                        message: 'Subscription activated',
                    };

                case 'SUBSCRIPTION_CANCELLED':
                    return {
                        success: true,
                        processed: true,
                        action: 'SUBSCRIPTION_CANCELLED',
                        transactionId: paymentData.subscription_id,
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
            console.error('Cashfree webhook processing error:', error);
            return {
                success: false,
                processed: false,
                message: error.message,
            };
        }
    }

    // Helper methods

    private generateOrderId(): string {
        return `ORD_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    private mapCashfreeStatus(status: string): 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' {
        const statusMap: Record<string, 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'> = {
            'ACTIVE': 'PENDING',
            'PAID': 'SUCCESS',
            'SUCCESS': 'SUCCESS',
            'FAILED': 'FAILED',
            'CANCELLED': 'FAILED',
            'EXPIRED': 'FAILED',
            'REFUNDED': 'REFUNDED',
            'PARTIALLY_REFUNDED': 'REFUNDED',
        };
        return statusMap[status] || 'PENDING';
    }

    private mapFrequency(frequency: string): string {
        const freqMap: Record<string, string> = {
            'daily': 'DAILY',
            'weekly': 'WEEKLY',
            'monthly': 'MONTHLY',
            'quarterly': 'QUARTERLY',
            'yearly': 'YEARLY',
        };
        return freqMap[frequency] || 'MONTHLY';
    }
}
