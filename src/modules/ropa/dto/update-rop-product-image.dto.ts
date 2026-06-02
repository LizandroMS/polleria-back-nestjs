import { PartialType } from '@nestjs/swagger';
import { CreateRopProductImageDto } from './create-rop-product-image.dto';

export class UpdateRopProductImageDto extends PartialType(CreateRopProductImageDto) {}
