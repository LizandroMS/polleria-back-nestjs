import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { RopPaymentStatus } from './create-rop-order.dto';

export class UpdateRopPaymentStatusDto {
  @ApiPropertyOptional({ example: 'CONFIRMED' })
  @IsIn(['PENDING', 'CONFIRMED', 'REJECTED'])
  paymentStatus: RopPaymentStatus;

  @ApiPropertyOptional({ example: 'Pago validado por Yape.' })
  @IsOptional()
  @IsString()
  comment?: string;
}
