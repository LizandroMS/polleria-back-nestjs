import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ListRopProductsDto } from './dto/list-rop-products.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RedeemRopCouponDto } from './dto/redeem-rop-coupon.dto';
import { ValidateRopCouponDto } from './dto/validate-rop-coupon.dto';
import { RopaService } from './ropa.service';

@ApiTags('Ropa - Tienda')
@Controller('rop-store')
export class RopaStoreController {
  constructor(private readonly ropaService: RopaService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('coupons/validate')
  validateCoupon(
    @Body() dto: ValidateRopCouponDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.ropaService.validateCoupon(dto, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('coupons/redeem')
  redeemCoupon(
    @Body() dto: RedeemRopCouponDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.ropaService.redeemCoupon(dto, user.id);
  }

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
