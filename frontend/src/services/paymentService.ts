import api from './api';

export interface PaymentConfig {
    id?: string;
    orgId: string;
    provider: string;
    isActive: boolean;
    enabledMethods: string[];
    lastTestedAt?: string;
    lastTestStatus?: string;
}

export interface BankConfig {
    id?: string;
    orgId: string;
    bankName: string;
    accountNumber: string; // masked
    accountHolderName: string;
    ifscCode: string;
    branchName?: string;
    isActive: boolean;
    instructions?: string;
    isVerified: boolean;
}

export interface PaymentTransaction {
    id: string;
    orgId: string;
    provider: string;
    providerOrderId?: string;
    providerPaymentId?: string;
    amount: number;
    currency: string;
    status: string;
    customerEmail?: string;
    customerPhone?: string;
    customerName?: string;
    paymentMethod?: string;
    createdAt: string;
}

export interface GlobalPaymentProvider {
    id: string;
    name: string;
    displayName: string;
    isEnabled: boolean;
    isActive: boolean;
    supportedMethods: string[];
}

export interface CreateOrderRequest {
    amount: number;
    currency?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerName?: string;
    description?: string;
    paymentMethod?: string;
    metadata?: Record<string, any>;
}

export interface CreateOrderResponse {
    success: boolean;
    orderId?: string;
    checkoutUrl?: string;
    qrCode?: string;
    message?: string;
    error?: string;
}

const paymentService = {
    // ==================== Payment Configuration ====================

    /**
     * Get tenant payment configuration (Admin only)
     */
    getPaymentConfig: async (): Promise<PaymentConfig | null> => {
        const response = await api.get('/payments/config');
        return response.data;
    },

    /**
     * Get enabled payment methods for checkout
     */
    getPaymentMethods: async (): Promise<{ enabledMethods: string[]; provider: string }> => {
        const response = await api.get('/payments/methods');
        return response.data;
    },

    /**
     * Update tenant payment configuration
     */
    updatePaymentConfig: async (data: {
        provider?: string;
        keyId?: string;
        keySecret?: string;
        webhookSecret?: string;
        isActive?: boolean;
        enabledMethods?: string[];
        settings?: Record<string, any>;
    }): Promise<PaymentConfig> => {
        const response = await api.put('/payments/config', data);
        return response.data;
    },

    /**
     * Test payment configuration
     */
    testPaymentConfig: async (): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/payments/config/test');
        return response.data;
    },

    // ==================== Payments ====================

    /**
     * Create a payment order
     */
    createOrder: async (data: CreateOrderRequest): Promise<CreateOrderResponse> => {
        const response = await api.post('/payments/create-order', data);
        return response.data;
    },

    /**
     * Verify payment
     */
    verifyPayment: async (data: {
        orderId: string;
        paymentId: string;
        signature: string;
    }): Promise<{ valid: boolean }> => {
        const response = await api.post('/payments/verify', data);
        return response.data;
    },

    /**
     * Get payment status
     */
    getPaymentStatus: async (paymentId: string): Promise<any> => {
        const response = await api.get(`/payments/status/${paymentId}`);
        return response.data;
    },

    /**
     * Get payment transactions
     */
    getTransactions: async (limit?: number, offset?: number): Promise<PaymentTransaction[]> => {
        const params = new URLSearchParams();
        if (limit) params.append('limit', limit.toString());
        if (offset) params.append('offset', offset.toString());
        const response = await api.get(`/payments/transactions?${params.toString()}`);
        return response.data;
    },

    /**
     * Process refund
     */
    refund: async (data: {
        paymentId: string;
        amount?: number;
        reason?: string;
    }): Promise<any> => {
        const response = await api.post('/payments/refund', data);
        return response.data;
    },

    // ==================== Recurring Payments ====================

    /**
     * Create recurring payment mandate
     */
    createMandate: async (data: {
        customerEmail: string;
        customerPhone: string;
        customerName: string;
        amount: number;
        frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
        startDate: string;
        endDate?: string;
        upiVpa?: string;
        description?: string;
    }): Promise<any> => {
        const response = await api.post('/payments/mandate', data);
        return response.data;
    },

    // ==================== Bank Transfer ====================

    /**
     * Get bank transfer configuration
     */
    getBankConfig: async (): Promise<BankConfig | null> => {
        const response = await api.get('/payments/bank/config');
        return response.data;
    },

    /**
     * Update bank transfer configuration
     */
    updateBankConfig: async (data: {
        bankName: string;
        accountNumber: string;
        accountHolderName: string;
        ifscCode: string;
        branchName?: string;
        isActive?: boolean;
        instructions?: string;
    }): Promise<BankConfig> => {
        const response = await api.put('/payments/bank/config', data);
        return response.data;
    },

    // ==================== Super Admin ====================

    /**
     * Get global payment providers
     */
    getGlobalProviders: async (): Promise<GlobalPaymentProvider[]> => {
        const response = await api.get('/payments/admin/providers');
        return response.data;
    },

    /**
     * Update global payment provider
     */
    updateGlobalProvider: async (name: string, data: {
        isEnabled?: boolean;
        isActive?: boolean;
        supportedMethods?: string[];
    }): Promise<GlobalPaymentProvider> => {
        const response = await api.put(`/payments/admin/providers/${name}`, data);
        return response.data;
    },

    /**
     * Initialize default global providers
     */
    initializeProviders: async (): Promise<void> => {
        const response = await api.post('/payments/admin/providers/init');
        return response.data;
    },

    /**
     * Get all bank transfer configurations (Super Admin)
     */
    getAllBankConfigs: async (): Promise<BankConfig[]> => {
        const response = await api.get('/payments/admin/bank-configs');
        return response.data;
    },
};

export default paymentService;
