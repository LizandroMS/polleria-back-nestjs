import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCarouselItemDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiProperty()
  @IsString()
  imageUrl: string;

  @ApiProperty({ enum: ['NONE', 'PRODUCT', 'PROMOTION', 'CATEGORY', 'EXTERNAL'] })
  @IsIn(['NONE', 'PRODUCT', 'PROMOTION', 'CATEGORY', 'EXTERNAL'])
  linkType: 'NONE' | 'PRODUCT' | 'PROMOTION' | 'CATEGORY' | 'EXTERNAL';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}