import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListRopProductsDto } from './dto/list-rop-products.dto';
import { RopaService } from './ropa.service';

@ApiTags('Ropa - Tienda')
@Controller('rop-store')
export class RopaStoreController {
  constructor(private readonly ropaService: RopaService) {}

  @Get('categories')
  listCategories() {
    return this.ropaService.listPublicCategories();
  }

  @Get('products')
  listProducts(@Query() filters: ListRopProductsDto) {
    return this.ropaService.listPublicProducts(filters);
  }

  @Get('products/:slug')
  getProductBySlug(@Param('slug') slug: string) {
    return this.ropaService.getPublicProductBySlug(slug);
  }
}
