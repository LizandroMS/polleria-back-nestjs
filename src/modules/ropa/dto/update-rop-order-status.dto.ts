import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { RopOrderStatus } from './create-rop-order.dto';

export class UpdateRopOrderStatusDto {
  @ApiPropertyOptional({ example: 'CONTACTED' })
  @IsIn([
    'PENDING_CONTACT',
    'CONTACTED',
    'PAYMENT_PENDING',
    'PAYMENT_CONFIRMED',
    'PREPARING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
  ])
  status: RopOrderStatus;

  @ApiPropertyOptional({ example: 'Cliente contactado por WhatsApp.' })
  @IsOptional()
  @IsString()
  comment?: string;
}
