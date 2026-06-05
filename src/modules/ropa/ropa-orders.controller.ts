import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../common/constants/roles.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRopOrderDto } from './dto/create-rop-order.dto';
import { UpdateRopOrderStatusDto } from './dto/update-rop-order-status.dto';
import { UpdateRopPaymentStatusDto } from './dto/update-rop-payment-status.dto';
import { RopaOrdersService } from './ropa-orders.service';

@ApiTags('Ropa - Pedidos')
@ApiBearerAuth()
@Controller('rop-orders')
export class RopaOrdersController {
  constructor(private readonly ropaOrdersService: RopaOrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createOrder(
    @Body() dto: CreateRopOrderDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.ropaOrdersService.createOrder(dto, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  listMyOrders(@CurrentUser() user: { id: string }) {
    return this.ropaOrdersService.listMyOrders(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.WORKER)
  @Get('admin')
  listAdminOrders() {
    return this.ropaOrdersService.listAdminOrders();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.WORKER)
  @Patch(':id/status')
  updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRopOrderStatusDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.ropaOrdersService.updateOrderStatus(id, dto, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.WORKER)
  @Patch(':id/payment-status')
  updatePaymentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRopPaymentStatusDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.ropaOrdersService.updatePaymentStatus(id, dto, user.id);
  }
}
