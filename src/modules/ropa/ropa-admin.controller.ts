import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../common/constants/roles.constant';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRopCategoryDto } from './dto/create-rop-category.dto';
import { CreateRopCouponDto } from './dto/create-rop-coupon.dto';
import { CreateRopProductImageDto } from './dto/create-rop-product-image.dto';
import { CreateRopProductVariantDto } from './dto/create-rop-product-variant.dto';
import { CreateRopProductDto } from './dto/create-rop-product.dto';
import { ListRopProductsDto } from './dto/list-rop-products.dto';
import { UpdateRopCategoryDto } from './dto/update-rop-category.dto';
import { UpdateRopCouponDto } from './dto/update-rop-coupon.dto';
import { UpdateRopProductImageDto } from './dto/update-rop-product-image.dto';
import { UpdateRopProductVariantDto } from './dto/update-rop-product-variant.dto';
import { UpdateRopProductDto } from './dto/update-rop-product.dto';
import { RopaService } from './ropa.service';
import { RopaStorageService } from './ropa-storage.service';
import { UploadedImageFile } from './types.uploaded-image-file';

@ApiTags('Ropa - Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('rop-admin')
export class RopaAdminController {
  constructor(
    private readonly ropaService: RopaService,
    private readonly ropaStorageService: RopaStorageService,
  ) {}




  @Post('uploads/product-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Imagen de producto. Formatos permitidos: JPG, PNG o WEBP. Máximo 5 MB.',
        },
      },
      required: ['file'],
    },
  })
  uploadProductImage(
    @UploadedFile() file: UploadedImageFile,
    @Query('productId') productId?: string,
  ) {
    return this.ropaStorageService.uploadProductImage(file, { productId });
  }

  @Get('coupons')
  listCoupons() {
    return this.ropaService.listAdminCoupons();
  }

  @Post('coupons')
  createCoupon(@Body() dto: CreateRopCouponDto) {
    return this.ropaService.createCoupon(dto);
  }

  @Patch('coupons/:id')
  updateCoupon(@Param('id') id: string, @Body() dto: UpdateRopCouponDto) {
    return this.ropaService.updateCoupon(id, dto);
  }

  @Patch('coupons/:id/toggle-active')
  toggleCouponActive(@Param('id') id: string) {
    return this.ropaService.toggleCouponActive(id);
  }

  @Get('categories')
  listCategories() {
    return this.ropaService.listAdminCategories();
  }

  @Post('categories')
  createCategory(@Body() dto: CreateRopCategoryDto) {
    return this.ropaService.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateRopCategoryDto) {
    return this.ropaService.updateCategory(id, dto);
  }

  @Patch('categories/:id/toggle-active')
  toggleCategoryActive(@Param('id') id: string) {
    return this.ropaService.toggleCategoryActive(id);
  }

  @Get('products')
  listProducts(@Query() filters: ListRopProductsDto) {
    return this.ropaService.listAdminProducts(filters);
  }

  @Get('products/:id')
  getProductById(@Param('id') id: string) {
    return this.ropaService.getAdminProductById(id);
  }

  @Post('products')
  createProduct(@Body() dto: CreateRopProductDto) {
    return this.ropaService.createProduct(dto);
  }

  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateRopProductDto) {
    return this.ropaService.updateProduct(id, dto);
  }

  @Patch('products/:id/toggle-active')
  toggleProductActive(@Param('id') id: string) {
    return this.ropaService.toggleProductActive(id);
  }

  @Post('products/:id/variants')
  createVariant(@Param('id') id: string, @Body() dto: CreateRopProductVariantDto) {
    return this.ropaService.createVariant(id, dto);
  }

  @Patch('variants/:id')
  updateVariant(@Param('id') id: string, @Body() dto: UpdateRopProductVariantDto) {
    return this.ropaService.updateVariant(id, dto);
  }

  @Patch('variants/:id/toggle-active')
  toggleVariantActive(@Param('id') id: string) {
    return this.ropaService.toggleVariantActive(id);
  }

  @Post('products/:id/images')
  createImage(@Param('id') id: string, @Body() dto: CreateRopProductImageDto) {
    return this.ropaService.createImage(id, dto);
  }

  @Patch('images/:id')
  updateImage(@Param('id') id: string, @Body() dto: UpdateRopProductImageDto) {
    return this.ropaService.updateImage(id, dto);
  }

  @Delete('images/:id')
  deleteImage(@Param('id') id: string) {
    return this.ropaService.deleteImage(id);
  }
}
