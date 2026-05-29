import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { DocumentSeriesController } from './document-series.controller';
import { DocumentSeriesService } from './document-series.service';
import { ApisunatProvider } from './providers/apisunat.provider';

@Module({
  imports: [HttpModule],
  controllers: [BillingController, DocumentSeriesController],
  providers: [BillingService, ApisunatProvider, DocumentSeriesService],
  exports: [BillingService],
})
export class BillingModule {}
