import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionUtil } from './utils/encryption.util';

@Injectable()
export class BankTransferService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get bank transfer configuration for an organization
     */
    async getBankConfig(orgId: string) {
        const config = await this.prisma.bankTransferConfig.findUnique({
            where: { orgId },
        });

        if (!config) {
            return null;
        }

        // Return masked sensitive data
        return {
            id: config.id,
            orgId: config.orgId,
            bankName: config.bankName,
            accountNumber: EncryptionUtil.maskAccountNumber(config.accountNumber),
            accountHolderName: config.accountHolderName,
            ifscCode: config.ifscCode,
            branchName: config.branchName,
            isActive: config.isActive,
            instructions: config.instructions,
            isVerified: config.isVerified,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
        };
    }

    /**
     * Create or update bank transfer configuration
     */
    async updateBankConfig(
        orgId: string,
        data: {
            bankName: string;
            accountNumber: string;
            accountHolderName: string;
            ifscCode: string;
            branchName?: string;
            isActive?: boolean;
            instructions?: string;
        },
    ) {
        // Encrypt account number
        const encryptedAccountNumber = EncryptionUtil.encrypt(data.accountNumber);

        const existing = await this.prisma.bankTransferConfig.findUnique({
            where: { orgId },
        });

        if (existing) {
            return this.prisma.bankTransferConfig.update({
                where: { orgId },
                data: {
                    bankName: data.bankName,
                    accountNumber: encryptedAccountNumber,
                    accountHolderName: data.accountHolderName,
                    ifscCode: data.ifscCode,
                    branchName: data.branchName,
                    isActive: data.isActive ?? existing.isActive,
                    instructions: data.instructions,
                    isVerified: false, // Reset verification on update
                },
            });
        } else {
            return this.prisma.bankTransferConfig.create({
                data: {
                    orgId,
                    bankName: data.bankName,
                    accountNumber: encryptedAccountNumber,
                    accountHolderName: data.accountHolderName,
                    ifscCode: data.ifscCode,
                    branchName: data.branchName,
                    isActive: data.isActive ?? true,
                    instructions: data.instructions,
                },
            });
        }
    }

    /**
     * Verify bank account (admin action)
     */
    async verifyBankAccount(
        orgId: string,
        verificationDocUrl?: string,
    ) {
        const config = await this.prisma.bankTransferConfig.findUnique({
            where: { orgId },
        });

        if (!config) {
            throw new NotFoundException('Bank configuration not found');
        }

        return this.prisma.bankTransferConfig.update({
            where: { orgId },
            data: {
                isVerified: true,
                verificationDocUrl,
            },
        });
    }

    /**
     * Get all bank transfer configurations (Super Admin)
     */
    async getAllBankConfigs() {
        const configs = await this.prisma.bankTransferConfig.findMany({
            orderBy: { createdAt: 'desc' },
        });

        // Return masked data
        return configs.map((config) => ({
            id: config.id,
            orgId: config.orgId,
            bankName: config.bankName,
            accountNumber: EncryptionUtil.maskAccountNumber(config.accountNumber),
            accountHolderName: config.accountHolderName,
            ifscCode: config.ifscCode,
            branchName: config.branchName,
            isActive: config.isActive,
            instructions: config.instructions,
            isVerified: config.isVerified,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
        }));
    }

    /**
     * Get decrypted account number (for internal use only)
     */
    async getDecryptedAccountNumber(orgId: string): Promise<string> {
        const config = await this.prisma.bankTransferConfig.findUnique({
            where: { orgId },
        });

        if (!config) {
            throw new NotFoundException('Bank configuration not found');
        }

        return EncryptionUtil.decrypt(config.accountNumber);
    }
}
