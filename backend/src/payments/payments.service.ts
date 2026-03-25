import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentFactoryService } from './payment.factory';
import { EncryptionUtil } from './utils/encryption.util';
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
} from './interfaces/payment-provider.interface';

/**
 * Main Payment Service
 * Handles all payment operations for tenants
 */
@Injectable()
export class PaymentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly paymentFactory: PaymentFactoryService,
    ) { }

    /**
     * Create a payment order for a tenant
     */
    async createOrder(orgId: string, params: CreateOrderParams): Promise<CreateOrderResponse> {
        // Get tenant's payment configuration
        const config = await this.getTenantConfig(orgId);

        if (!config || !config.isActive) {
            throw new BadRequestException('Payment is not configured for this organization');
        }

        // Create provider instance
        const provider = this.createProvider(config);

        // Create order with provider
        const result = await provider.createOrder(params);

        if (result.success) {
            // Save transaction to database
            await this.createTransaction({
                orgId,
                provider: config.provider,
                orderId: result.orderId || '',
                amount: params.amount,
                currency: params.currency || 'INR',
                customerEmail: params.customerEmail,
                customerPhone: params.customerPhone,
                customerName: params.customerName,
                paymentMethod: params.paymentMethod,
                status: 'PENDING',
            });
        }

        return result;
    }

    /**
     * Verify payment signature
     */
    async verifyPayment(
        orgId: string,
        orderId: string,
        paymentId: string,
        signature: string,
    ): Promise<boolean> {
        const config = await this.getTenantConfig(orgId);

        if (!config) {
            throw new NotFoundException('Payment configuration not found');
        }

        const provider = this.createProvider(config);

        return provider.verifySignature({ orderId, paymentId, signature });
    }

    /**
     * Get payment status
     */
    async getPaymentStatus(orgId: string, paymentId: string): Promise<PaymentStatusResponse> {
        // Try to find transaction in database first
        const transaction = await this.prisma.paymentTransaction.findFirst({
            where: {
                OR: [
                    { providerOrderId: paymentId },
                    { id: paymentId },
                ],
            },
        });

        if (transaction) {
            return {
                success: true,
                status: transaction.status as any,
                paymentId: transaction.providerPaymentId || transaction.id,
                amount: transaction.amount,
                currency: transaction.currency,
                customerEmail: transaction.customerEmail || undefined,
                customerPhone: transaction.customerPhone || undefined,
                paymentMethod: transaction.paymentMethod || undefined,
            };
        }

        // If not in DB, check with provider
        const config = await this.getTenantConfig(orgId);

        if (!config) {
            throw new NotFoundException('Payment configuration not found');
        }

        const provider = this.createProvider(config);
        return provider.getPaymentStatus(paymentId);
    }

    /**
     * Process refund
     */
    async refund(orgId: string, params: RefundParams): Promise<RefundResponse> {
        const config = await this.getTenantConfig(orgId);

        if (!config) {
            throw new NotFoundException('Payment configuration not found');
        }

        const provider = this.createProvider(config);
        const result = await provider.refund(params);

        if (result.success) {
            // Update transaction status
            await this.prisma.paymentTransaction.updateMany({
                where: { providerPaymentId: params.paymentId },
                data: { status: 'REFUNDED' },
            });
        }

        return result;
    }

    /**
     * Create recurring payment mandate
     */
    async createMandate(orgId: string, params: CreateMandateParams): Promise<MandateResponse> {
        const config = await this.getTenantConfig(orgId);

        if (!config) {
            throw new NotFoundException('Payment configuration not found');
        }

        if (!this.paymentFactory.supportsRecurring(config.provider)) {
            throw new BadRequestException('Selected provider does not support recurring payments');
        }

        const provider = this.createProvider(config) as PaymentProvider & { createMandate: Function };

        if (!provider.createMandate) {
            throw new BadRequestException('Recurring payments not supported');
        }

        const result = await provider.createMandate(params);

        if (result.success) {
            // Save recurring payment to database
            await this.createRecurringPayment({
                orgId,
                provider: config.provider,
                providerMandateId: result.mandateId || '',
                frequency: 'monthly', // This should match params
                amount: params.amount,
                customerEmail: params.customerEmail,
                customerPhone: params.customerPhone,
                customerName: params.customerName,
                upiVpa: params.upiVpa,
                startDate: params.startDate,
                endDate: params.endDate,
                status: 'ACTIVE',
            });
        }

        return result;
    }

    /**
     * Process webhook from payment provider
     */
    async processWebhook(
        providerType: string,
        payload: string,
        signature: string,
    ): Promise<{ success: boolean; message: string }> {
        // Create a dummy config for webhook processing
        const config: any = {
            keyId: '',
            keySecret: process.env[`${providerType.toUpperCase()}_SECRET`] || '',
            webhookSecret: process.env[`${providerType.toUpperCase()}_WEBHOOK_SECRET`] || '',
            isProduction: process.env.NODE_ENV === 'production',
        };

        try {
            const provider = this.paymentFactory.createProvider(providerType, config);

            // Verify webhook signature
            if (!provider.verifyWebhookSignature(payload, signature)) {
                return { success: false, message: 'Invalid webhook signature' };
            }

            // Parse webhook payload
            const webhookData = JSON.parse(payload);

            // Process the event
            const result = await provider.processWebhookEvent({
                eventId: webhookData.id || `evt_${Date.now()}`,
                eventType: webhookData.event || webhookData.type,
                timestamp: new Date(),
                data: webhookData,
            });

            if (result.processed && result.transactionId && result.action) {
                // Update transaction status based on action
                await this.handleWebhookAction(result.action, result.transactionId, webhookData);
            }

            return { success: true, message: result.message || 'Webhook processed' };
        } catch (error: any) {
            console.error('Webhook processing error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Get tenant payment configuration
     */
    async getTenantPaymentConfig(orgId: string) {
        const config = await this.prisma.tenantPaymentConfig.findUnique({
            where: { orgId },
            include: { organization: true },
        });

        if (!config) {
            return null;
        }

        // Return config with masked sensitive data
        return {
            id: config.id,
            orgId: config.orgId,
            provider: config.provider,
            isActive: config.isActive,
            enabledMethods: config.enabledMethods,
            lastTestedAt: config.lastTestedAt,
            lastTestStatus: config.lastTestStatus,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
            // Don't expose keys
        };
    }

    /**
     * Update tenant payment configuration
     */
    async updateTenantPaymentConfig(
        orgId: string,
        data: {
            provider?: string;
            keyId?: string;
            keySecret?: string;
            webhookSecret?: string;
            isActive?: boolean;
            enabledMethods?: string[];
            settings?: any;
        },
    ) {
        // Check if config exists
        const existingConfig = await this.prisma.tenantPaymentConfig.findUnique({
            where: { orgId },
        });

        const updateData: any = {
            isActive: data.isActive,
            enabledMethods: data.enabledMethods,
            settings: data.settings,
        };

        // Encrypt sensitive data
        if (data.keyId) {
            updateData.keyId = EncryptionUtil.encrypt(data.keyId);
        }

        if (data.keySecret) {
            updateData.keySecret = EncryptionUtil.encrypt(data.keySecret);
        }

        if (data.webhookSecret) {
            updateData.webhookSecret = EncryptionUtil.encrypt(data.webhookSecret);
        }

        if (data.provider) {
            updateData.provider = data.provider;
        }

        if (existingConfig) {
            return this.prisma.tenantPaymentConfig.update({
                where: { orgId },
                data: updateData,
            });
        } else {
            return this.prisma.tenantPaymentConfig.create({
                data: {
                    orgId,
                    ...updateData,
                },
            });
        }
    }

    /**
     * Get global payment provider settings (Super Admin)
     */
    async getGlobalPaymentProviders() {
        return this.prisma.globalPaymentProvider.findMany({
            orderBy: { displayName: 'asc' },
        });
    }

    /**
     * Update global payment provider (Super Admin)
     */
    async updateGlobalProvider(
        name: string,
        data: { isEnabled?: boolean; isActive?: boolean; supportedMethods?: string[] },
    ) {
        const existing = await this.prisma.globalPaymentProvider.findUnique({
            where: { name },
        });

        if (existing) {
            return this.prisma.globalPaymentProvider.update({
                where: { name },
                data: {
                    isEnabled: data.isEnabled ?? existing.isEnabled,
                    isActive: data.isActive ?? existing.isActive,
                    supportedMethods: data.supportedMethods ?? existing.supportedMethods,
                },
            });
        } else {
            return this.prisma.globalPaymentProvider.create({
                data: {
                    name,
                    displayName: name,
                    isEnabled: data.isEnabled ?? false,
                    isActive: data.isActive ?? true,
                    supportedMethods: data.supportedMethods ?? [],
                },
            });
        }
    }

    /**
     * Initialize default global payment providers
     */
    async initializeGlobalProviders() {
        const defaultProviders = [
            { name: 'RAZORPAY', displayName: 'Razorpay', supportedMethods: ['UPI', 'CARD', 'WALLET', 'NETBANKING', 'EMI'] },
            { name: 'PHONEPE', displayName: 'PhonePe', supportedMethods: ['UPI', 'CARD', 'WALLET', 'NETBANKING'] },
            { name: 'CASHFREE', displayName: 'Cashfree', supportedMethods: ['UPI', 'CARD', 'WALLET', 'NETBANKING', 'EMI'] },
            { name: 'UPI', displayName: 'Direct UPI', supportedMethods: ['UPI'] },
            { name: 'BANK_TRANSFER', displayName: 'Bank Transfer', supportedMethods: ['BANK_TRANSFER'] },
        ];

        for (const provider of defaultProviders) {
            await this.prisma.globalPaymentProvider.upsert({
                where: { name: provider.name },
                update: {},
                create: provider,
            });
        }
    }

    /**
     * Get payment transactions for an organization
     */
    async getTransactions(orgId: string, options?: { limit?: number; offset?: number }) {
        return this.prisma.paymentTransaction.findMany({
            where: { orgId },
            orderBy: { createdAt: 'desc' },
            take: options?.limit || 50,
            skip: options?.offset || 0,
        });
    }

    /**
     * Test payment configuration
     */
    async testPaymentConfig(orgId: string): Promise<{ success: boolean; message: string }> {
        const config = await this.getTenantConfig(orgId);

        if (!config) {
            return { success: false, message: 'Payment configuration not found' };
        }

        try {
            const provider = this.createProvider(config);

            // Try to create a small test order
            const testOrder = await provider.createOrder({
                amount: 1, // 1 rupee
                currency: 'INR',
                description: 'Test payment',
            });

            // Update last test status
            await this.prisma.tenantPaymentConfig.update({
                where: { orgId },
                data: {
                    lastTestedAt: new Date(),
                    lastTestStatus: testOrder.success ? 'SUCCESS' : 'FAILED',
                },
            });

            return {
                success: testOrder.success,
                message: testOrder.success ? 'Payment configuration working' : testOrder.error || 'Test failed',
            };
        } catch (error: any) {
            await this.prisma.tenantPaymentConfig.update({
                where: { orgId },
                data: {
                    lastTestedAt: new Date(),
                    lastTestStatus: 'FAILED',
                },
            });

            return { success: false, message: error.message };
        }
    }

    // Private helper methods

    private async getTenantConfig(orgId: string): Promise<any> {
        const config = await this.prisma.tenantPaymentConfig.findUnique({
            where: { orgId },
        });

        if (!config) {
            return null;
        }

        // Decrypt credentials
        return {
            ...config,
            keyId: config.keyId ? EncryptionUtil.decrypt(config.keyId) : '',
            keySecret: config.keySecret ? EncryptionUtil.decrypt(config.keySecret) : '',
            webhookSecret: config.webhookSecret ? EncryptionUtil.decrypt(config.webhookSecret) : '',
        };
    }

    private createProvider(config: any): PaymentProvider {
        return this.paymentFactory.createProvider(config.provider, {
            keyId: config.keyId,
            keySecret: config.keySecret,
            webhookSecret: config.webhookSecret,
            isProduction: process.env.NODE_ENV === 'production',
        });
    }

    private async createTransaction(data: {
        orgId: string;
        provider: string;
        orderId: string;
        amount: number;
        currency: string;
        customerEmail?: string;
        customerPhone?: string;
        customerName?: string;
        paymentMethod?: string;
        status: string;
    }) {
        return this.prisma.paymentTransaction.create({
            data: {
                orgId: data.orgId,
                provider: data.provider,
                providerOrderId: data.orderId,
                amount: data.amount,
                currency: data.currency,
                customerEmail: data.customerEmail,
                customerPhone: data.customerPhone,
                customerName: data.customerName,
                paymentMethod: data.paymentMethod,
                status: data.status as any,
            },
        });
    }

    private async createRecurringPayment(data: {
        orgId: string;
        provider: string;
        providerMandateId: string;
        frequency: string;
        amount: number;
        customerEmail: string;
        customerPhone: string;
        customerName: string;
        upiVpa?: string;
        startDate: Date;
        endDate?: Date;
        status: string;
    }) {
        return this.prisma.recurringPayment.create({
            data: {
                orgId: data.orgId,
                provider: data.provider,
                providerMandateId: data.providerMandateId,
                frequency: data.frequency as any,
                amount: data.amount,
                currency: 'INR',
                customerEmail: data.customerEmail,
                customerPhone: data.customerPhone,
                customerName: data.customerName,
                upiVpa: data.upiVpa,
                startDate: data.startDate,
                endDate: data.endDate,
                status: data.status as any,
            },
        });
    }

    private async handleWebhookAction(action: string, transactionId: string, data: any) {
        const statusMap: Record<string, string> = {
            'PAYMENT_SUCCESS': 'SUCCESS',
            'PAYMENT_FAILED': 'FAILED',
            'REFUND_PROCESSED': 'REFUNDED',
        };

        const newStatus = statusMap[action];

        if (newStatus) {
            await this.prisma.paymentTransaction.updateMany({
                where: {
                    OR: [
                        { providerOrderId: transactionId },
                        { providerPaymentId: transactionId },
                    ],
                },
                data: { status: newStatus as any },
            });
        }
    }
}
