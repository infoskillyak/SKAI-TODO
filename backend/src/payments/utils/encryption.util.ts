import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.PAYMENT_ENCRYPTION_KEY || 'default-key-change-in-production-32ch';
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

export class EncryptionUtil {
    /**
     * Encrypt sensitive data using AES-256-CBC
     */
    static encrypt(text: string): string {
        if (!text) return '';

        const iv = crypto.randomBytes(IV_LENGTH);
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Return IV + encrypted data
        return iv.toString('hex') + ':' + encrypted;
    }

    /**
     * Decrypt encrypted data
     */
    static decrypt(encryptedText: string): string {
        if (!encryptedText) return '';

        try {
            const parts = encryptedText.split(':');
            if (parts.length !== 2) {
                throw new Error('Invalid encrypted format');
            }

            const iv = Buffer.from(parts[0], 'hex');
            const encryptedData = parts[1];
            const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('Decryption failed:', error);
            return '';
        }
    }

    /**
     * Hash sensitive data (one-way) - useful for verification
     */
    static hash(data: string): string {
        return crypto.createHmac('sha256', ENCRYPTION_KEY).update(data).digest('hex');
    }

    /**
     * Generate a secure random string
     */
    static generateSecureId(length: number = 32): string {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Mask sensitive data for display
     */
    static maskAccountNumber(accountNumber: string): string {
        if (!accountNumber || accountNumber.length < 4) return '****';
        return '****' + accountNumber.slice(-4);
    }

    /**
     * Mask UPI VPA
     */
    static maskUpiVpa(vpa: string): string {
        if (!vpa) return '****';
        const parts = vpa.split('@');
        if (parts.length === 2) {
            const name = parts[0];
            const domain = parts[1];
            const maskedName = name.length > 2
                ? name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
                : '**';
            return `${maskedName}@${domain}`;
        }
        return '****@****';
    }
}
