import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum ReclamationDocumentType {
  DNI = 'DNI',
  CE = 'CE',
  PASSPORT = 'PASSPORT',
  RUC = 'RUC',
}

export enum ReclamationGoodType {
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
}

export enum ReclamationClaimType {
  RECLAMO = 'RECLAMO',
  QUEJA = 'QUEJA',
}

export class CreateReclamationDto {
  @ApiProperty({ example: 'Juan Pérez Ramos' })
  @IsString()
  @MaxLength(180)
  consumerFullName: string;

  @ApiProperty({ enum: ReclamationDocumentType, example: ReclamationDocumentType.DNI })
  @IsEnum(ReclamationDocumentType)
  consumerDocumentType: ReclamationDocumentType;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @MaxLength(20)
  consumerDocumentNumber: string;

  @ApiProperty({ example: 'cliente@correo.com' })
  @IsEmail()
  @MaxLength(180)
  consumerEmail: string;

  @ApiPropertyOptional({ example: '999999999' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  consumerPhone?: string;

  @ApiPropertyOptional({ example: 'Av. Principal 123, Lima' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  consumerAddress?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isMinor?: boolean;

  @ApiPropertyOptional({ example: 'María Ramos' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  guardianFullName?: string;

  @ApiPropertyOptional({ example: '87654321' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  guardianDocumentNumber?: string;

  @ApiPropertyOptional({ description: 'ID de sucursal relacionada al reclamo' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: 'ORD-20260529-123456' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  orderNumber?: string;

  @ApiProperty({ enum: ReclamationGoodType, example: ReclamationGoodType.PRODUCT })
  @IsEnum(ReclamationGoodType)
  goodType: ReclamationGoodType;

  @ApiPropertyOptional({ example: 59.9 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ example: 'Pedido de pollo a la brasa familiar' })
  @IsString()
  @MaxLength(1000)
  description: string;

  @ApiProperty({ enum: ReclamationClaimType, example: ReclamationClaimType.RECLAMO })
  @IsEnum(ReclamationClaimType)
  claimType: ReclamationClaimType;

  @ApiProperty({ example: 'El producto llegó incompleto.' })
  @IsString()
  @MaxLength(2500)
  detail: string;

  @ApiProperty({ example: 'Solicito la reposición del producto.' })
  @IsString()
  @MaxLength(1500)
  requestedSolution: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  consumerAcceptsTerms: boolean;
}
