import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRopCategoryDto {
  @ApiProperty({ example: 'Polos' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'polos' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ example: 'Polos urbanos y básicos premium.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
