import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentFactoryService } from './payment.factory';
import { BankTransferService } from './bank-transfer.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PaymentsController],
    providers: [PaymentsService, PaymentFactoryService, BankTransferService],
    exports: [PaymentsService, PaymentFactoryService, BankTransferService],
})
export class PaymentsModule { }
