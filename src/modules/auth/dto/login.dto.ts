import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description:
      'Código corto del proyecto. Si no se envía, el backend usa POL para mantener compatible el login actual.',
    example: 'POL',
  })
  @IsOptional()
  @IsString()
  projectCode?: string;
}
