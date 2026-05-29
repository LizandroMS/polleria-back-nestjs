import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateDocumentSeriesDto {
  @ApiProperty({ description: 'ID de la sucursal a la que pertenece la serie.' })
  @IsString()
  branchId: string;

  @ApiProperty({ enum: ['BOLETA_SIMPLE', 'FACTURA'] })
  @IsIn(['BOLETA_SIMPLE', 'FACTURA'])
  documentType: 'BOLETA_SIMPLE' | 'FACTURA';

  @ApiProperty({ example: 'B001' })
  @IsString()
  series: string;

  @ApiPropertyOptional({ default: 0, description: 'Último correlativo usado. La siguiente emisión usará currentNumber + 1.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentNumber?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
