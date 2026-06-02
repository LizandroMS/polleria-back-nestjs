import { PartialType } from '@nestjs/swagger';
import { CreateRopCategoryDto } from './create-rop-category.dto';

export class UpdateRopCategoryDto extends PartialType(CreateRopCategoryDto) {}
