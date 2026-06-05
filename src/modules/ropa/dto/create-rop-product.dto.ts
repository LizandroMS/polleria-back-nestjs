import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRopProductImageDto } from './create-rop-product-image.dto';
import { CreateRopProductVariantDto } from './create-rop-product-variant.dto';

export class CreateRopProductDto {
  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty({ example: 'Polo Oversize Essential' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'polo-oversize-essential' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ example: 'Polo urbano de algodón para uso diario.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Trendy' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'Oversize' })
  @IsOptional()
  @IsString()
  fit?: string;

  @ApiPropertyOptional({ example: 'Algodón 100%' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ example: 'Lavar con agua fría y secar a la sombra.' })
  @IsOptional()
  @IsString()
  careInstructions?: string;

  @ApiProperty({ example: 79.9 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ nullable: true, example: 69.9 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number | null;

  @ApiPropertyOptional({ example: 'https://cdn.tienda.com/polo-negro.webp' })
  @IsOptional()
  @IsString()
  mainImageUrl?: string;

  @ApiPropertyOptional({ example: 'products/temp/2026/06/archivo.webp' })
  @IsOptional()
  @IsString()
  mainImageStoragePath?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [CreateRopProductVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRopProductVariantDto)
  variants?: CreateRopProductVariantDto[];

  @ApiPropertyOptional({ type: [CreateRopProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRopProductImageDto)
  images?: CreateRopProductImageDto[];
}
