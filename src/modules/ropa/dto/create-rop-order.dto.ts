import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export type RopOrderStatus =
  | 'PENDING_CONTACT'
  | 'CONTACTED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'PREPARING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type RopPaymentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export class CreateRopOrderCustomerDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '999999999' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'cliente@correo.com' })
  @IsString()
  email: string;

  @ApiPropertyOptional({ example: '12345678' })
  @IsOptional()
  @IsString()
  documentNumber?: string;
}

export class CreateRopOrderDeliveryLocationDto {
  @ApiProperty({ example: 'Av. Principal 123, Lima' })
  @IsString()
  addressLine: string;

  @ApiPropertyOptional({ example: 'Frente al parque' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'San Borja' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: -12.1001 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: -77.0211 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: 'ChIJ...' })
  @IsOptional()
  @IsString()
  googlePlaceId?: string;
}

export class CreateRopOrderItemDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 'Polo Oversize Essential' })
  @IsString()
  name: string;

  @ApiProperty({ example: 79.9 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'M' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ example: 'Negro' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateRopOrderCouponDto {
  @ApiProperty({ example: 'URBANO20' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Urbano 20%' })
  @IsString()
  name: string;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  discountPercentage: number;

  @ApiProperty({ example: 15.98 })
  @IsNumber()
  @Min(0)
  discountAmount: number;
}

export class CreateRopOrderDto {
  @ApiProperty({ type: CreateRopOrderCustomerDto })
  @ValidateNested()
  @Type(() => CreateRopOrderCustomerDto)
  customer: CreateRopOrderCustomerDto;

  @ApiProperty({ example: 'WHATSAPP', enum: ['WHATSAPP', 'EMAIL', 'PHONE'] })
  @IsIn(['WHATSAPP', 'EMAIL', 'PHONE'])
  contactPreference: 'WHATSAPP' | 'EMAIL' | 'PHONE';

  @ApiProperty({ example: 'YAPE', enum: ['YAPE', 'PLIN', 'BANK_TRANSFER'] })
  @IsIn(['YAPE', 'PLIN', 'BANK_TRANSFER'])
  paymentMethod: 'YAPE' | 'PLIN' | 'BANK_TRANSFER';

  @ApiPropertyOptional({ example: 'Enviar captura por WhatsApp.' })
  @IsOptional()
  @IsString()
  paymentNotes?: string;

  @ApiProperty({ type: CreateRopOrderDeliveryLocationDto })
  @ValidateNested()
  @Type(() => CreateRopOrderDeliveryLocationDto)
  deliveryLocation: CreateRopOrderDeliveryLocationDto;

  @ApiProperty({ type: [CreateRopOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRopOrderItemDto)
  items: CreateRopOrderItemDto[];

  @ApiProperty({ example: 189.9 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  discountTotal: number;

  @ApiProperty({ example: 169.9 })
  @IsNumber()
  @Min(0)
  total: number;

  @ApiPropertyOptional({ type: CreateRopOrderCouponDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateRopOrderCouponDto)
  coupon?: CreateRopOrderCouponDto;
}
