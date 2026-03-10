import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignWorkerBranchDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  branchId: string;
}