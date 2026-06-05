import { Module } from '@nestjs/common';
import { RopaAdminController } from './ropa-admin.controller';
import { RopaStoreController } from './ropa-store.controller';
import { RopaOrdersController } from './ropa-orders.controller';
import { RopaOrdersService } from './ropa-orders.service';
import { RopaService } from './ropa.service';
import { RopaStorageService } from './ropa-storage.service';

@Module({
  controllers: [RopaAdminController, RopaStoreController, RopaOrdersController],
  providers: [RopaService, RopaStorageService, RopaOrdersService],
  exports: [RopaService, RopaStorageService, RopaOrdersService],
})
export class RopaModule {}
