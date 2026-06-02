import { PartialType } from '@nestjs/swagger';
import { CreateRopProductVariantDto } from './create-rop-product-variant.dto';

export class UpdateRopProductVariantDto extends PartialType(CreateRopProductVariantDto) {}
