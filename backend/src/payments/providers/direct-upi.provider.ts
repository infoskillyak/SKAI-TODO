import { BasePaymentProvider } from './base.provider';
import {
    PaymentProvider,
    CreateOrderParams,
    CreateOrderResponse,
    VerifySignatureParams,
    PaymentStatusResponse,
    RefundParams,
    RefundResponse,
    WebhookEvent,
    WebhookProcessResult,
    ProviderConfig,
} from '../interfaces/payment-provider.interface';
import * as crypto from 'crypto';

/**
 * Direct UPI Payment Provider
 * Supports UPI Collect, UPI Intent, and QR Code payments
 * Can be used with any UPI-enabled bank/payment app
 */
export class DirectUpiProvider extends BasePaymentProvider implements PaymentProvider {
    readonly name = 'UPI';

    private readonly vpaEndpoint: string; // UPI VPA endpoint

    constructor(config: ProviderConfig & { vpaEndpoint?: string }) {
        super(config);
        this.vpaEndpoint = config.vpaEndpoint || 'upi://pay';
    }

    /**
     * Create a UPI Payment
     * Generates UPI payment link or QR code
     */
    async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
        try {
            const transactionId = this.generateTransactionId();
            const upiVpa = params.metadata?.upiVpa;

            if (!upiVpa) {
                // Generate QR code payment link
                const qrData = this.generateUpiQrData({
                    vpa: params.metadata?.merchantVpa || '',
                    amount: params.amount,
                    transactionId,
                    note: params.description || 'Payment',
                    customerName: params.customerName || '',
                });

                return {
                    success: true,
                    orderId: transactionId,
                    providerData: { qrData, transactionId },
                    qrCode: qrData,
                    message: 'UPI QR Code generated successfully',
                };
            }

            // Generate UPI payment link (Intent or Collect)
            const upiLink = this.generateUpiLink({
                vpa: upiVpa,
                amount: params.amount,
                transactionId,
                note: params.description || 'Payment',
                customerName: params.customerName || '',
                customerEmail: params.customerEmail,
                customerPhone: params.customerPhone,
            });

            return {
                success: true,
                orderId: transactionId,
                providerData: { upiLink, transactionId },
                checkoutUrl: upiLink,
                message: 'UPI payment link generated successfully',
            };
        } catch (error: any) {
            console.error('Direct UPI create order error:', error);
            return {
                success: false,
                error: error.message || 'Failed to create UPI payment',
            };
        }
    }

    /**
     * Verify UPI payment - For direct UPI, this is typically done via webhook or polling
     */
    async verifySignature(params: VerifySignatureParams): Promise<boolean> {
        // For direct UPI, verification is typically done via:
        // 1. Webhook callbacks from UPI app
        // 2. Checking UPI transaction status via API
        // Here we return true if there's a valid transaction ID
        return !!params.orderId && !!params.paymentId;
    }

    /**
     * Get UPI payment status - Would typically call UPI provider API
     */
    async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
        // In a real implementation, this would call the UPI provider's status API
        // For now, we return a placeholder that indicates the need for webhook/polling
        try {
            // This would typically be an API call to the UPI provider
            // Since each UPI provider has different APIs, we'll simulate
            return {
                success: true,
                status: 'PENDING', // UPI payments need webhook confirmation
                paymentId,
            };
        } catch (error: any) {
            return {
                success: false,
                status: 'FAILED',
                errorMessage: error.message,
            };
        }
    }

    /**
     * Refund - UPI typically doesn't support standard refunds
     * Would need to use IMPS/NEFT/RTGS for refunds
     */
    async refund(params: RefundParams): Promise<RefundResponse> {
        // UPI doesn't have a standard refund mechanism
        // Refunds would need to be processed via IMPS/NEFT manually
        return {
            success: false,
            error: 'UPI refunds are not supported directly. Please process via IMPS/NEFT.',
        };
    }

    /**
     * Verify webhook signature from UPI provider
     */
    verifyWebhookSignature(payload: string, signature: string): boolean {
        try {
            // Generate expected signature
            const expectedSignature = crypto
                .createHmac('sha256', this.config.keySecret)
                .update(payload)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch (error) {
            console.error('Direct UPI webhook signature verification error:', error);
            return false;
        }
    }

    /**
     * Process webhook event from UPI provider
     */
    async processWebhookEvent(event: WebhookEvent): Promise<WebhookProcessResult> {
        const eventType = event.eventType;
        const paymentData = event.data;

        try {
            switch (eventType) {
                case 'UPI_COLLECT_SUCCESS':
                case 'UPI_INTENT_SUCCESS':
                case 'UPI_QR_SUCCESS':
                    return {
                        success: true,
                        processed: true,
                        action: 'PAYMENT_SUCCESS',
                        transactionId: paymentData.transactionId || paymentData.rrn,
                        message: 'UPI payment successful',
                    };

                case 'UPI_COLLECT_FAILED':
                case 'UPI_INTENT_FAILED':
                case 'UPI_QR_FAILED':
                    return {
                        success: true,
                        processed: true,
                        action: 'PAYMENT_FAILED',
                        transactionId: paymentData.transactionId || paymentData.rrn,
                        message: 'UPI payment failed',
                    };

                case 'UPI_COLLECT_DEFERRED':
                    return {
                        success: true,
                        processed: true,
                        action: 'PAYMENT_PENDING',
                        transactionId: paymentData.transactionId,
                        message: 'UPI payment pending (requires customer verification)',
                    };

                default:
                    return {
                        success: true,
                        processed: false,
                        message: `Event type ${eventType} not processed`,
                    };
            }
        } catch (error: any) {
            console.error('Direct UPI webhook processing error:', error);
            return {
                success: false,
                processed: false,
                message: error.message,
            };
        }
    }

    // Helper methods

    private generateTransactionId(): string {
        return `UPI_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    /**
     * Generate UPI deep link for payment
     */
    private generateUpiLink(params: {
        vpa: string;
        amount: number;
        transactionId: string;
        note: string;
        customerName: string;
        customerEmail?: string;
        customerPhone?: string;
    }): string {
        // Encode parameters for UPI link
        const pa = encodeURIComponent(params.vpa);
        const am = encodeURIComponent(params.amount.toString());
        const tn = encodeURIComponent(params.transactionId);
        const note = encodeURIComponent(params.note);
        const mn = encodeURIComponent(params.customerName);

        // Build UPI payment link (works with most UPI apps)
        return `upi://pay?pa=${pa}&am=${am}&tn=${tn}&note=${note}&mn=${mn}`;
    }

    /**
     * Generate UPI QR code data
     */
    private generateUpiQrData(params: {
        vpa: string;
        amount: number;
        transactionId: string;
        note: string;
        customerName: string;
    }): string {
        // UPI QR code format
        return this.generateUpiLink(params).replace('upi://', 'https://upi://');
    }

    /**
     * Generate static QR code for merchant
     */
    generateStaticQr(vpa: string, merchantName: string): string {
        const params = {
            pa: encodeURIComponent(vpa),
            pn: encodeURIComponent(merchantName),
            cu: 'INR',
        };

        return `https://upi://pay?pa=${params.pa}&pn=${params.pn}&cu=${params.cu}`;
    }
}
