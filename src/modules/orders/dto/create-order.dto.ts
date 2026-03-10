import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateOrderCustomerDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressText?: string;
}

class CreateOrderItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsString()
  branchId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promotionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  branchId: string;

  @ApiProperty({ enum: ['DELIVERY', 'PICKUP', 'DINE_IN'] })
  @IsIn(['DELIVERY', 'PICKUP', 'DINE_IN'])
  orderType: 'DELIVERY' | 'PICKUP' | 'DINE_IN';

  @ApiProperty({ enum: ['CASH', 'YAPE', 'PLIN', 'CARD'] })
  @IsIn(['CASH', 'YAPE', 'PLIN', 'CARD'])
  paymentMethod: 'CASH' | 'YAPE' | 'PLIN' | 'CARD';

  @ApiProperty({ enum: ['NONE', 'BOLETA_SIMPLE', 'FACTURA'] })
  @IsIn(['NONE', 'BOLETA_SIMPLE', 'FACTURA'])
  invoiceType: 'NONE' | 'BOLETA_SIMPLE' | 'FACTURA';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  deliveryFee?: number;

  @ApiProperty({ type: CreateOrderCustomerDto })
  @ValidateNested()
  @Type(() => CreateOrderCustomerDto)
  customer: CreateOrderCustomerDto;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}