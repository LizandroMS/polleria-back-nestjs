import { Module } from '@nestjs/common';
import { RopaAdminController } from './ropa-admin.controller';
import { RopaStoreController } from './ropa-store.controller';
import { RopaService } from './ropa.service';

@Module({
  controllers: [RopaAdminController, RopaStoreController],
  providers: [RopaService],
  exports: [RopaService],
})
export class RopaModule {}
