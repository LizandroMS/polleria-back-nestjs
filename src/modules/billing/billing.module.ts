import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { ApisunatProvider } from './providers/apisunat.provider';

@Module({
  imports: [HttpModule],
  controllers: [BillingController],
  providers: [BillingService, ApisunatProvider],
  exports: [BillingService],
})
export class BillingModule {}
