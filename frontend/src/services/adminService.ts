import api from './api';

// Types
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'USER' | 'ADMIN' | 'VIEWER' | 'SUPERADMIN';
    plan: 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE';
    status: 'active' | 'inactive';
    tasksCompleted: number;
    createdAt: string;
    orgId: string | null;
}

export interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    usersByPlan: { plan: string; count: number }[];
    usersByRole: { role: string; count: number }[];
    mrr: number;
}

export interface PaymentConfig {
    gateway: 'razorpay' | 'stripe';
    razorpayKeyId: string;
    razorpayKeySecret: string;
    razorpayWebhookSecret: string;
    stripePublishableKey: string;
    stripeSecretKey: string;
    stripeWebhookSecret: string;
    testMode: boolean;
}

export interface N8nConfig {
    baseUrl: string;
    apiKey: string;
    webhookBaseUrl: string;
    openaiApiKey: string;
    whisperModel: string;
}

export interface DomainConfig {
    domain: string;
    sslEnabled: boolean;
    apiSubdomain: string;
    n8nSubdomain: string;
}

export interface SystemConfig {
    id: string;
    paymentGateway: string;
    razorpayKeyId?: string;
    razorpayKeySecret?: string;
    razorpayWebhookSecret?: string;
    stripePublishableKey?: string;
    stripeSecretKey?: string;
    stripeWebhookSecret?: string;
    testMode: boolean;
    n8nBaseUrl?: string;
    n8nApiKey?: string;
    n8nWebhookBaseUrl?: string;
    openaiApiKey?: string;
    whisperModel?: string;
    primaryDomain?: string;
    apiSubdomain?: string;
    n8nSubdomain?: string;
    sslEnabled?: boolean;
}

// Admin User Management
export const adminApi = {
    // Get all users with pagination
    getUsers: async (params?: {
        skip?: number;
        take?: number;
        role?: string;
        plan?: string;
        search?: string;
    }) => {
        const response = await api.get('/admin/users', { params });
        return response.data;
    },

    // Get single user
    getUser: async (id: string) => {
        const response = await api.get(`/admin/users/${id}`);
        return response.data;
    },

    // Update user
    updateUser: async (id: string, data: {
        name?: string;
        role?: string;
        plan?: string;
        orgId?: string | null;
    }) => {
        const response = await api.patch(`/admin/users/${id}`, data);
        return response.data;
    },

    // Delete user
    deleteUser: async (id: string) => {
        const response = await api.delete(`/admin/users/${id}`);
        return response.data;
    },

    // Create user
    createUser: async (data: any) => {
        const response = await api.post('/admin/users', data);
        return response.data;
    },

    // Get admin stats
    getStats: async (): Promise<AdminStats> => {
        const response = await api.get('/admin/stats');
        return response.data;
    },

    // Get system config
    getConfig: async (): Promise<SystemConfig> => {
        const response = await api.get('/admin/config');
        return response.data;
    },

    // Update system config
    updateConfig: async (data: Partial<SystemConfig>): Promise<SystemConfig> => {
        const response = await api.patch('/admin/config', data);
        return response.data;
    },

    // Test n8n connection
    testN8nConnection: async (data: { baseUrl: string; apiKey: string }) => {
        const response = await api.post('/admin/n8n/test-connection', data);
        return response.data;
    },

    // Test payment gateway connection
    testPaymentGateway: async (data: {
        gateway: 'stripe' | 'razorpay';
        credentials: any;
    }) => {
        const response = await api.post('/admin/n8n/test-payment-gateway', data);
        return response.data;
    },

    // Organization Management
    getOrganizations: async () => {
        const response = await api.get('/admin/organizations');
        return response.data;
    },

    createOrganization: async (data: { name: string; id?: string }) => {
        const response = await api.post('/admin/organizations', data);
        return response.data;
    },

    updateOrganization: async (id: string, data: { name?: string; billingPlan?: string }) => {
        const response = await api.patch(`/admin/organizations/${id}`, data);
        return response.data;
    },

    deleteOrganization: async (id: string) => {
        const response = await api.delete(`/admin/organizations/${id}`);
        return response.data;
    },

    // Billing Management
    getOrgBilling: async (orgId?: string) => {
        const url = orgId ? `/billing/org/${orgId}` : '/billing/my-org';
        const response = await api.get(url);
        return response.data;
    },

    updateOrgPlan: async (data: { orgId: string; plan: string }) => {
        const response = await api.post('/billing/update-plan', data);
        return response.data;
    },

    // Plan Pricing Management
    getPlanPricing: async () => {
        const response = await api.get('/admin/plans/pricing');
        return response.data;
    },
    updatePlanPricing: async (data: { plan: string; monthlyPrice?: number; yearlyPrice?: number; maxUsers?: number; maxTasks?: number; features?: string[] }) => {
        const response = await api.post('/admin/plans/pricing', data);
        return response.data;
    },
    deletePlanPricing: async (plan: string) => {
        const response = await api.delete(`/admin/plans/pricing/${plan}`);
        return response.data;
    },
};

export default adminApi;
