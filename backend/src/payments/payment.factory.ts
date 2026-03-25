import { Injectable } from '@nestjs/common';
import { PaymentProvider, PaymentProviderType, ProviderConfig } from './interfaces/payment-provider.interface';
import { RazorpayProvider } from './providers/razorpay.provider';
import { PhonePeProvider } from './providers/phonepe.provider';
import { CashfreeProvider } from './providers/cashfree.provider';
import { DirectUpiProvider } from './providers/direct-upi.provider';

/**
 * Payment Factory Service
 * Creates payment provider instances based on configuration
 */
@Injectable()
export class PaymentFactoryService {

    /**
     * Create a payment provider instance
     */
    createProvider(providerType: string, config: ProviderConfig): PaymentProvider {
        switch (providerType.toUpperCase()) {
            case PaymentProviderType.RAZORPAY:
                return new RazorpayProvider(config);

            case PaymentProviderType.PHONEPE:
                return new PhonePeProvider(config);

            case PaymentProviderType.CASHFREE:
                return new CashfreeProvider(config);

            case PaymentProviderType.UPI:
                return new DirectUpiProvider(config as ProviderConfig & { vpaEndpoint?: string });

            default:
                throw new Error(`Unsupported payment provider: ${providerType}`);
        }
    }

    /**
     * Get all supported payment providers
     */
    getSupportedProviders(): string[] {
        return Object.values(PaymentProviderType);
    }

    /**
     * Check if a provider is supported
     */
    isProviderSupported(providerType: string): boolean {
        return Object.values(PaymentProviderType).includes(providerType.toUpperCase() as PaymentProviderType);
    }

    /**
     * Get provider display name
     */
    getProviderDisplayName(providerType: string): string {
        const displayNames: Record<string, string> = {
            [PaymentProviderType.RAZORPAY]: 'Razorpay',
            [PaymentProviderType.PHONEPE]: 'PhonePe',
            [PaymentProviderType.CASHFREE]: 'Cashfree',
            [PaymentProviderType.UPI]: 'Direct UPI',
            [PaymentProviderType.BANK_TRANSFER]: 'Bank Transfer',
        };

        return displayNames[providerType.toUpperCase()] || providerType;
    }

    /**
     * Get supported payment methods for a provider
     */
    getSupportedMethods(providerType: string): string[] {
        const methods: Record<string, string[]> = {
            [PaymentProviderType.RAZORPAY]: ['UPI', 'CARD', 'WALLET', 'NETBANKING', 'EMI', 'BANK_TRANSFER'],
            [PaymentProviderType.PHONEPE]: ['UPI', 'CARD', 'WALLET', 'NETBANKING'],
            [PaymentProviderType.CASHFREE]: ['UPI', 'CARD', 'WALLET', 'NETBANKING', 'EMI', 'BANK_TRANSFER'],
            [PaymentProviderType.UPI]: ['UPI'],
            [PaymentProviderType.BANK_TRANSFER]: ['BANK_TRANSFER'],
        };

        return methods[providerType.toUpperCase()] || [];
    }

    /**
     * Check if provider supports recurring payments
     */
    supportsRecurring(providerType: string): boolean {
        const recurringProviders = [
            PaymentProviderType.RAZORPAY,
            PaymentProviderType.PHONEPE,
            PaymentProviderType.CASHFREE,
        ];

        return recurringProviders.includes(providerType.toUpperCase() as PaymentProviderType);
    }

    /**
     * Get provider webhook URL path
     */
    getWebhookPath(providerType: string): string {
        const paths: Record<string, string> = {
            [PaymentProviderType.RAZORPAY]: '/payments/webhooks/razorpay',
            [PaymentProviderType.PHONEPE]: '/payments/webhooks/phonepe',
            [PaymentProviderType.CASHFREE]: '/payments/webhooks/cashfree',
            [PaymentProviderType.UPI]: '/payments/webhooks/upi',
        };

        return paths[providerType.toUpperCase()] || '/payments/webhooks';
    }
}
