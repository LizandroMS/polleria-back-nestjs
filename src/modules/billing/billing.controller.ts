import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../common/constants/roles.constant';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BillingService } from './billing.service';
import { VoidDocumentDto } from './dto/void-document.dto';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  listAll() {
    return this.billingService.listAll();
  }

  @Get('order/:orderId')
  getByOrder(@Param('orderId') orderId: string) {
    return this.billingService.getByOrder(orderId);
  }

  @Post('retry/:orderId')
  retry(@Param('orderId') orderId: string) {
    return this.billingService.retry(orderId);
  }

  @Post('status/:orderId')
  queryStatus(@Param('orderId') orderId: string) {
    return this.billingService.queryStatus(orderId);
  }

  @Patch('void')
  voidDocument(@Body() dto: VoidDocumentDto) {
    return this.billingService.void(dto.orderId, dto.reason);
  }
}