import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, Min, ValidateNested } from 'class-validator';

export class ValidateRopCouponItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 79.9 })
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class ValidateRopCouponDto {
  @ApiProperty({ example: 'URBANO20' })
  @IsString()
  code: string;

  @ApiProperty({ type: [ValidateRopCouponItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidateRopCouponItemDto)
  items: ValidateRopCouponItemDto[];
}
