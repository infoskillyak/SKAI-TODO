export class CreateOrderDto {
    amount: number;
    currency?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerName?: string;
    description?: string;
    paymentMethod?: string;
    metadata?: Record<string, any>;
}

export class RefundDto {
    paymentId: string;
    amount?: number;
    reason?: string;
}

export class CreateMandateDto {
    customerEmail: string;
    customerPhone: string;
    customerName: string;
    amount: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    startDate: string;
    endDate?: string;
    upiVpa?: string;
    description?: string;
}

export class UpdatePaymentConfigDto {
    provider?: string;
    keyId?: string;
    keySecret?: string;
    webhookSecret?: string;
    isActive?: boolean;
    enabledMethods?: string[];
    settings?: Record<string, any>;
}

export class UpdateGlobalProviderDto {
    isEnabled?: boolean;
    isActive?: boolean;
    supportedMethods?: string[];
}
