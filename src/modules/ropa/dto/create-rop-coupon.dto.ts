import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateRopCouponDto {
  @ApiProperty({ example: 'URBANO20' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Descuento lanzamiento urbano' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Cupón válido para productos seleccionados.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(1)
  @Max(100)
  discountPercentage: number;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsesTotal?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: [String], description: 'Productos de ropa donde aplica el cupón.' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  productIds: string[];
}
