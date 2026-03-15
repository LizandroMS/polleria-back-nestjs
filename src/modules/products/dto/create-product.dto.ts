import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ nullable: true, description: 'Precio promocional del producto' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  promoPrice?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}