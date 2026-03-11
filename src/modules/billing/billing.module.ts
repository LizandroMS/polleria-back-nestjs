import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { ApisunatProvider } from './providers/apisunat.provider';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [HttpModule, forwardRef(() => OrdersModule)],
  controllers: [BillingController],
  providers: [BillingService, ApisunatProvider],
  exports: [BillingService],
})
export class BillingModule {}