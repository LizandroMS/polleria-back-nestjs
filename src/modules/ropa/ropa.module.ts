import { Module } from '@nestjs/common';
import { RopaAdminController } from './ropa-admin.controller';
import { RopaStoreController } from './ropa-store.controller';
import { RopaService } from './ropa.service';
import { RopaStorageService } from './ropa-storage.service';

@Module({
  controllers: [RopaAdminController, RopaStoreController],
  providers: [RopaService, RopaStorageService],
  exports: [RopaService, RopaStorageService],
})
export class RopaModule {}
