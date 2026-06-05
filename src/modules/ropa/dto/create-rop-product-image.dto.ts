import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRopProductImageDto {
  @ApiProperty({ example: 'https://cdn.tienda.com/polo-negro-1.webp' })
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({ example: 'products/temp/2026/06/archivo.webp' })
  @IsOptional()
  @IsString()
  storagePath?: string;

  @ApiPropertyOptional({ example: 'image/webp' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ example: 245760 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional({ example: 'Polo negro vista frontal' })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
