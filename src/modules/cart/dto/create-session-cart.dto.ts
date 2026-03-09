import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateSessionCartDto {
  @ApiProperty()
  @IsString()
  sessionId: string;
}