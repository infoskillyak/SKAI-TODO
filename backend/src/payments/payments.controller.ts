import {
    Controller,
    Post,
    Get,
    Put,
    Body,
    Param,
    Query,
    Headers,
    UseGuards,
    Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateOrderDto, RefundDto, CreateMandateDto, UpdatePaymentConfigDto } from './dto/payment.dto';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    /**
     * Create a payment order
     */
    @Post('create-order')
    @UseGuards(JwtAuthGuard)
    async createOrder(@Body() dto: CreateOrderDto, @Req() req) {
        return this.paymentsService.createOrder(req.user.orgId, {
            amount: dto.amount,
            currency: dto.currency,
            customerEmail: dto.customerEmail,
            customerPhone: dto.customerPhone,
            customerName: dto.customerName,
            description: dto.description,
            paymentMethod: dto.paymentMethod,
            metadata: dto.metadata,
        });
    }

    /**
     * Verify payment
     */
    @Post('verify')
    @UseGuards(JwtAuthGuard)
    async verifyPayment(
        @Body() dto: { orderId: string; paymentId: string; signature: string },
        @Req() req,
    ) {
        const isValid = await this.paymentsService.verifyPayment(
            req.user.orgId,
            dto.orderId,
            dto.paymentId,
            dto.signature,
        );
        return { valid: isValid };
    }

    /**
     * Get payment status
     */
    @Get('status/:paymentId')
    @UseGuards(JwtAuthGuard)
    async getPaymentStatus(@Param('paymentId') paymentId: string, @Req() req) {
        return this.paymentsService.getPaymentStatus(req.user.orgId, paymentId);
    }

    /**
     * Process refund
     */
    @Post('refund')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPERADMIN')
    async refund(@Body() dto: RefundDto, @Req() req) {
        return this.paymentsService.refund(req.user.orgId, {
            paymentId: dto.paymentId,
            amount: dto.amount,
            reason: dto.reason,
        });
    }

    /**
     * Create recurring payment mandate
     */
    @Post('mandate')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPERADMIN')
    async createMandate(@Body() dto: CreateMandateDto, @Req() req) {
        return this.paymentsService.createMandate(req.user.orgId, {
            customerEmail: dto.customerEmail,
            customerPhone: dto.customerPhone,
            customerName: dto.customerName,
            amount: dto.amount,
            frequency: dto.frequency,
            startDate: new Date(dto.startDate),
            endDate: dto.endDate ? new Date(dto.endDate) : undefined,
            upiVpa: dto.upiVpa,
            description: dto.description,
        });
    }

    /**
     * Get enabled payment methods for checkout (public for users)
     */
    @Get('methods')
    @UseGuards(JwtAuthGuard)
    async getPaymentMethods(@Req() req) {
        const config = await this.paymentsService.getTenantPaymentConfig(req.user.orgId);
        return {
            enabledMethods: config?.isActive ? config.enabledMethods : [],
            provider: config?.provider
        };
    }

    /**
     * Get tenant payment configuration
     */
    @Get('config')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPERADMIN')
    async getPaymentConfig(@Req() req) {
        return this.paymentsService.getTenantPaymentConfig(req.user.orgId);
    }

    /**
     * Update tenant payment configuration
     */
    @Put('config')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPERADMIN')
    async updatePaymentConfig(@Body() dto: UpdatePaymentConfigDto, @Req() req) {
        return this.paymentsService.updateTenantPaymentConfig(req.user.orgId, {
            provider: dto.provider,
            keyId: dto.keyId,
            keySecret: dto.keySecret,
            webhookSecret: dto.webhookSecret,
            isActive: dto.isActive,
            enabledMethods: dto.enabledMethods,
            settings: dto.settings,
        });
    }

    /**
     * Test payment configuration
     */
    @Post('config/test')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPERADMIN')
    async testPaymentConfig(@Req() req) {
        return this.paymentsService.testPaymentConfig(req.user.orgId);
    }

    /**
     * Get payment transactions
     */
    @Get('transactions')
    @UseGuards(JwtAuthGuard)
    async getTransactions(
        @Req() req,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.paymentsService.getTransactions(req.user.orgId, {
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0,
        });
    }

    // ==================== Super Admin Routes ====================

    /**
     * Get global payment providers (Super Admin only)
     */
    @Get('admin/providers')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPERADMIN')
    async getGlobalProviders() {
        return this.paymentsService.getGlobalPaymentProviders();
    }

    /**
     * Update global payment provider (Super Admin only)
     */
    @Put('admin/providers/:name')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPERADMIN')
    async updateGlobalProvider(
        @Param('name') name: string,
        @Body() dto: { isEnabled?: boolean; isActive?: boolean; supportedMethods?: string[] },
    ) {
        return this.paymentsService.updateGlobalProvider(name, dto);
    }

    /**
     * Initialize default global providers (Super Admin only)
     */
    @Post('admin/providers/init')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPERADMIN')
    async initializeProviders() {
        await this.paymentsService.initializeGlobalProviders();
        return { success: true, message: 'Global payment providers initialized' };
    }

    // ==================== Webhook Routes ====================

    /**
     * Razorpay webhook
     */
    @Post('webhooks/razorpay')
    async razorpayWebhook(
        @Body() payload: any,
        @Headers('x-razorpay-signature') signature: string,
    ) {
        return this.paymentsService.processWebhook('RAZORPAY', JSON.stringify(payload), signature);
    }

    /**
     * PhonePe webhook
     */
    @Post('webhooks/phonepe')
    async phonepeWebhook(
        @Body() payload: any,
        @Headers('x-phonepe-signature') signature: string,
    ) {
        return this.paymentsService.processWebhook('PHONEPE', JSON.stringify(payload), signature);
    }

    /**
     * Cashfree webhook
     */
    @Post('webhooks/cashfree')
    async cashfreeWebhook(
        @Body() payload: any,
        @Headers('x-cashfree-signature') signature: string,
    ) {
        return this.paymentsService.processWebhook('CASHFREE', JSON.stringify(payload), signature);
    }

    /**
     * UPI webhook (generic)
     */
    @Post('webhooks/upi')
    async upiWebhook(
        @Body() payload: any,
        @Headers('x-upi-signature') signature: string,
    ) {
        return this.paymentsService.processWebhook('UPI', JSON.stringify(payload), signature);
    }
}
