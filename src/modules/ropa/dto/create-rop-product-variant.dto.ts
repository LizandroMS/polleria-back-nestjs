import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateRopProductVariantDto {
  @ApiPropertyOptional({ example: 'ROP-POLO-NEG-M' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 'M' })
  @IsString()
  size: string;

  @ApiProperty({ example: 'Negro' })
  @IsString()
  colorName: string;

  @ApiPropertyOptional({ example: '#111827' })
  @IsOptional()
  @IsString()
  colorHex?: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalPrice?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
