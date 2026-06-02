import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RedeemRopCouponDto {
  @ApiProperty({ example: 'URBANO20' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'ROP-20260602-1234' })
  @IsOptional()
  @IsString()
  orderReference?: string;

  @ApiPropertyOptional({ example: 15.98 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}
