import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRopProductImageDto {
  @ApiProperty({ example: 'https://cdn.tienda.com/polo-negro-1.webp' })
  @IsString()
  imageUrl: string;

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
