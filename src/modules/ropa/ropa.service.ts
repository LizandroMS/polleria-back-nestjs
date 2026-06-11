import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Selectable } from 'kysely';
import { DatabaseService } from '../../database/kysely/database.service';
import {
  RopProductImagesTable,
  RopProductVariantsTable,
} from '../../database/kysely/database.types';
import { CreateRopCategoryDto } from './dto/create-rop-category.dto';
import { CreateRopProductImageDto } from './dto/create-rop-product-image.dto';
import { CreateRopProductVariantDto } from './dto/create-rop-product-variant.dto';
import { CreateRopProductDto } from './dto/create-rop-product.dto';
import { CreateRopCouponDto } from './dto/create-rop-coupon.dto';
import { ListRopProductsDto } from './dto/list-rop-products.dto';
import { UpdateRopCategoryDto } from './dto/update-rop-category.dto';
import { UpdateRopProductImageDto } from './dto/update-rop-product-image.dto';
import { UpdateRopProductVariantDto } from './dto/update-rop-product-variant.dto';
import { UpdateRopProductDto } from './dto/update-rop-product.dto';
import { UpdateRopCouponDto } from './dto/update-rop-coupon.dto';
import { ValidateRopCouponDto } from './dto/validate-rop-coupon.dto';
import { RedeemRopCouponDto } from './dto/redeem-rop-coupon.dto';
import { RopaStorageService } from './ropa-storage.service';

type RopVariant = Selectable<RopProductVariantsTable>;
type RopImage = Selectable<RopProductImagesTable>;

type RopProductListItem = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  fit: string | null;
  material: string | null;
  care_instructions: string | null;
  base_price: string;
  sale_price: string | null;
  main_image_url: string | null;
  main_image_storage_path: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at?: Date;
  category_name: string;
  category_slug: string;
};

@Injectable()
export class RopaService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly ropaStorageService: RopaStorageService,
  ) {}


  async listAdminCoupons() {
    const coupons = await this.databaseService.db
      .selectFrom('rop_coupons')
      .selectAll()
      .orderBy('created_at desc')
      .execute();

    const enriched = await this.attachCouponProducts(coupons);
    return { message: 'Cupones de ropa listados', data: enriched };
  }

  async createCoupon(dto: CreateRopCouponDto) {
    const code = this.normalizeCouponCode(dto.code);
    await this.ensureCouponCodeIsAvailable(code);
    await this.ensureProductsExist(dto.productIds);
    this.ensureCouponDatesAreValid(dto.startsAt, dto.endsAt);

    const created = await this.databaseService.db.transaction().execute(async (trx) => {
      const coupon = await trx
        .insertInto('rop_coupons')
        .values({
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() ?? null,
          discount_percentage: dto.discountPercentage.toFixed(2),
          starts_at: dto.startsAt ? new Date(dto.startsAt) : null,
          ends_at: dto.endsAt ? new Date(dto.endsAt) : null,
          max_uses_total: dto.maxUsesTotal ?? null,
          is_active: dto.isActive ?? true,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await trx
        .insertInto('rop_coupon_products')
        .values(this.uniqueIds(dto.productIds).map((productId) => ({ coupon_id: coupon.id, product_id: productId })))
        .execute();

      return coupon;
    });

    return this.getAdminCouponById(created.id);
  }

  async updateCoupon(id: string, dto: UpdateRopCouponDto) {
    const existing = await this.getCouponOrFail(id);

    const nextCode = dto.code ? this.normalizeCouponCode(dto.code) : existing.code;
    if (nextCode !== existing.code) {
      await this.ensureCouponCodeIsAvailable(nextCode, id);
    }

    if (dto.productIds) {
      await this.ensureProductsExist(dto.productIds);
    }

    this.ensureCouponDatesAreValid(
      dto.startsAt ?? existing.starts_at?.toISOString(),
      dto.endsAt ?? existing.ends_at?.toISOString(),
    );

    const updated = await this.databaseService.db.transaction().execute(async (trx) => {
      const coupon = await trx
        .updateTable('rop_coupons')
        .set({
          code: nextCode,
          name: dto.name?.trim() ?? existing.name,
          description: dto.description === undefined ? existing.description : dto.description?.trim() ?? null,
          discount_percentage:
            dto.discountPercentage !== undefined
              ? dto.discountPercentage.toFixed(2)
              : existing.discount_percentage,
          starts_at: dto.startsAt === undefined ? existing.starts_at : dto.startsAt ? new Date(dto.startsAt) : null,
          ends_at: dto.endsAt === undefined ? existing.ends_at : dto.endsAt ? new Date(dto.endsAt) : null,
          max_uses_total: dto.maxUsesTotal === undefined ? existing.max_uses_total : dto.maxUsesTotal ?? null,
          is_active: dto.isActive ?? existing.is_active,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirstOrThrow();

      if (dto.productIds) {
        await trx.deleteFrom('rop_coupon_products').where('coupon_id', '=', id).execute();
        await trx
          .insertInto('rop_coupon_products')
          .values(this.uniqueIds(dto.productIds).map((productId) => ({ coupon_id: id, product_id: productId })))
          .execute();
      }

      return coupon;
    });

    return this.getAdminCouponById(updated.id);
  }

  async toggleCouponActive(id: string) {
    const existing = await this.getCouponOrFail(id);

    const updated = await this.databaseService.db
      .updateTable('rop_coupons')
      .set({ is_active: !existing.is_active, updated_at: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Estado de cupón actualizado', data: updated };
  }

  async validateCoupon(dto: ValidateRopCouponDto, userId: string) {
    const coupon = await this.getCouponByCodeOrFail(dto.code);
    await this.ensureCouponCanBeUsed(coupon, userId);

    const applicableProductIds = await this.getCouponProductIds(coupon.id);
    const applicableItems = dto.items.filter((item) => applicableProductIds.has(item.productId));

    if (applicableItems.length === 0) {
      throw new BadRequestException('El cupón no aplica a los productos del carrito');
    }

    const eligibleSubtotal = applicableItems.reduce(
      (total, item) => total + Math.max(0, Number(item.unitPrice)) * Math.max(1, Math.trunc(Number(item.quantity))),
      0,
    );
    const discountAmount = this.roundMoney(eligibleSubtotal * (Number(coupon.discount_percentage) / 100));

    return {
      message: 'Cupón validado correctamente',
      data: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountPercentage: Number(coupon.discount_percentage),
        eligibleSubtotal,
        discountAmount,
        applicableProductIds: Array.from(applicableProductIds),
      },
    };
  }

  async redeemCoupon(dto: RedeemRopCouponDto, userId: string) {
    const coupon = await this.getCouponByCodeOrFail(dto.code);
    await this.ensureCouponCanBeUsed(coupon, userId);

    const redemption = await this.databaseService.db
      .insertInto('rop_coupon_redemptions')
      .values({
        coupon_id: coupon.id,
        user_id: userId,
        order_reference: dto.orderReference?.trim() ?? null,
        discount_amount: (dto.discountAmount ?? 0).toFixed(2),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Cupón marcado como usado correctamente', data: redemption };
  }

  async getAdminCouponById(id: string) {
    const coupon = await this.getCouponOrFail(id);
    const [enriched] = await this.attachCouponProducts([coupon]);
    return { message: 'Cupón de ropa obtenido', data: enriched };
  }

  async listPublicCategories() {
    const categories = await this.databaseService.db
      .selectFrom('rop_categories')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('sort_order asc')
      .orderBy('name asc')
      .execute();

    return { message: 'Categorías de ropa listadas', data: categories };
  }

  async listAdminCategories() {
    const categories = await this.databaseService.db
      .selectFrom('rop_categories')
      .selectAll()
      .orderBy('sort_order asc')
      .orderBy('created_at desc')
      .execute();

    return { message: 'Categorías de ropa listadas', data: categories };
  }

  async createCategory(dto: CreateRopCategoryDto) {
    await this.ensureCategorySlugIsAvailable(dto.slug);

    const category = await this.databaseService.db
      .insertInto('rop_categories')
      .values({
        name: dto.name.trim(),
        slug: dto.slug.trim(),
        description: dto.description?.trim() ?? null,
        sort_order: dto.sortOrder ?? 0,
        is_active: dto.isActive ?? true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Categoría de ropa creada correctamente', data: category };
  }

  async updateCategory(id: string, dto: UpdateRopCategoryDto) {
    const existing = await this.getCategoryOrFail(id);

    if (dto.slug && dto.slug !== existing.slug) {
      await this.ensureCategorySlugIsAvailable(dto.slug, id);
    }

    const updated = await this.databaseService.db
      .updateTable('rop_categories')
      .set({
        name: dto.name?.trim() ?? existing.name,
        slug: dto.slug?.trim() ?? existing.slug,
        description:
          dto.description === undefined ? existing.description : dto.description?.trim() ?? null,
        sort_order: dto.sortOrder ?? existing.sort_order,
        is_active: dto.isActive ?? existing.is_active,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Categoría de ropa actualizada correctamente', data: updated };
  }

  async toggleCategoryActive(id: string) {
    const existing = await this.getCategoryOrFail(id);

    const updated = await this.databaseService.db
      .updateTable('rop_categories')
      .set({ is_active: !existing.is_active, updated_at: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Estado de categoría actualizado', data: updated };
  }

  async listPublicProducts(filters: ListRopProductsDto = {}) {
    const products = await this.buildProductQuery(filters, true);
    const enriched = await this.attachProductDetails(products, true);

    return { message: 'Productos de ropa listados', data: enriched };
  }

  async listAdminProducts(filters: ListRopProductsDto = {}) {
    const products = await this.buildProductQuery(filters, false);
    const enriched = await this.attachProductDetails(products, false);

    return { message: 'Productos de ropa listados', data: enriched };
  }

  async getPublicProductBySlug(slug: string) {
    const product = await this.databaseService.db
      .selectFrom('rop_products as p')
      .innerJoin('rop_categories as c', 'c.id', 'p.category_id')
      .select([
        'p.id',
        'p.category_id',
        'p.name',
        'p.slug',
        'p.description',
        'p.brand',
        'p.fit',
        'p.material',
        'p.care_instructions',
        'p.base_price',
        'p.sale_price',
        'p.main_image_url',
        'p.main_image_storage_path',
        'p.is_featured',
        'p.is_active',
        'c.name as category_name',
        'c.slug as category_slug',
      ])
      .where('p.slug', '=', slug)
      .where('p.is_active', '=', true)
      .where('c.is_active', '=', true)
      .executeTakeFirst();

    if (!product) {
      throw new NotFoundException('Producto de ropa no encontrado');
    }

    const [enriched] = await this.attachProductDetails([product], true);
    return { message: 'Producto de ropa obtenido', data: enriched };
  }

  async getAdminProductById(id: string) {
    const product = await this.databaseService.db
      .selectFrom('rop_products as p')
      .innerJoin('rop_categories as c', 'c.id', 'p.category_id')
      .select([
        'p.id',
        'p.category_id',
        'p.name',
        'p.slug',
        'p.description',
        'p.brand',
        'p.fit',
        'p.material',
        'p.care_instructions',
        'p.base_price',
        'p.sale_price',
        'p.main_image_url',
        'p.main_image_storage_path',
        'p.is_featured',
        'p.is_active',
        'p.created_at',
        'c.name as category_name',
        'c.slug as category_slug',
      ])
      .where('p.id', '=', id)
      .executeTakeFirst();

    if (!product) {
      throw new NotFoundException('Producto de ropa no encontrado');
    }

    const [enriched] = await this.attachProductDetails([product], false);
    return { message: 'Producto de ropa obtenido', data: enriched };
  }

  async createProduct(dto: CreateRopProductDto) {
    await this.ensureCategoryExists(dto.categoryId);
    await this.ensureProductSlugIsAvailable(dto.slug);
    this.ensureUniqueVariants(dto.variants ?? []);

    const created = await this.databaseService.db.transaction().execute(async (trx) => {
      const product = await trx
        .insertInto('rop_products')
        .values({
          category_id: dto.categoryId,
          name: dto.name.trim(),
          slug: dto.slug.trim(),
          description: dto.description?.trim() ?? null,
          brand: dto.brand?.trim() ?? null,
          fit: dto.fit?.trim() ?? null,
          material: dto.material?.trim() ?? null,
          care_instructions: dto.careInstructions?.trim() ?? null,
          base_price: dto.basePrice.toFixed(2),
          sale_price:
            dto.salePrice !== undefined && dto.salePrice !== null
              ? dto.salePrice.toFixed(2)
              : null,
          main_image_url: dto.mainImageUrl?.trim() ?? null,
          main_image_storage_path: dto.mainImageStoragePath?.trim() ?? null,
          is_featured: dto.isFeatured ?? false,
          is_active: dto.isActive ?? true,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      if (dto.variants?.length) {
        // Nota para mí:
        // Las variantes son el inventario real vendible. Cada combinación talla/color
        // vive separada para controlar stock y SKU sin afectar el producto padre.
        await trx
          .insertInto('rop_product_variants')
          .values(
            dto.variants.map((variant) => ({
              product_id: product.id,
              sku: variant.sku?.trim() || null,
              size: variant.size.trim(),
              color_name: variant.colorName.trim(),
              color_hex: variant.colorHex?.trim() ?? null,
              stock: variant.stock,
              additional_price: (variant.additionalPrice ?? 0).toFixed(2),
              is_active: variant.isActive ?? true,
            })),
          )
          .execute();
      }

      if (dto.images?.length) {
        await this.insertImages(trx, product.id, dto.images);
      }

      return product;
    });

    return this.getAdminProductById(created.id);
  }

  async updateProduct(id: string, dto: UpdateRopProductDto) {
    const existing = await this.getProductOrFail(id);

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    if (dto.slug && dto.slug !== existing.slug) {
      await this.ensureProductSlugIsAvailable(dto.slug, id);
    }

    const updated = await this.databaseService.db
      .updateTable('rop_products')
      .set({
        category_id: dto.categoryId ?? existing.category_id,
        name: dto.name?.trim() ?? existing.name,
        slug: dto.slug?.trim() ?? existing.slug,
        description:
          dto.description === undefined ? existing.description : dto.description?.trim() ?? null,
        brand: dto.brand === undefined ? existing.brand : dto.brand?.trim() ?? null,
        fit: dto.fit === undefined ? existing.fit : dto.fit?.trim() ?? null,
        material: dto.material === undefined ? existing.material : dto.material?.trim() ?? null,
        care_instructions:
          dto.careInstructions === undefined
            ? existing.care_instructions
            : dto.careInstructions?.trim() ?? null,
        base_price: dto.basePrice !== undefined ? dto.basePrice.toFixed(2) : existing.base_price,
        sale_price:
          dto.salePrice === null
            ? null
            : dto.salePrice !== undefined
              ? dto.salePrice.toFixed(2)
              : existing.sale_price,
        main_image_url:
          dto.mainImageUrl === undefined ? existing.main_image_url : dto.mainImageUrl?.trim() ?? null,
        main_image_storage_path:
          dto.mainImageStoragePath === undefined
            ? existing.main_image_storage_path
            : dto.mainImageStoragePath?.trim() ?? null,
        is_featured: dto.isFeatured ?? existing.is_featured,
        is_active: dto.isActive ?? existing.is_active,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.getAdminProductById(updated.id);
  }

  async toggleProductActive(id: string) {
    const existing = await this.getProductOrFail(id);

    const updated = await this.databaseService.db
      .updateTable('rop_products')
      .set({ is_active: !existing.is_active, updated_at: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Estado de producto actualizado', data: updated };
  }

  async createVariant(productId: string, dto: CreateRopProductVariantDto) {
    await this.ensureProductExists(productId);
    await this.ensureVariantCombinationIsAvailable(productId, dto.size, dto.colorName);
    await this.ensureSkuIsAvailable(dto.sku);

    const variant = await this.databaseService.db
      .insertInto('rop_product_variants')
      .values({
        product_id: productId,
        sku: dto.sku?.trim() || null,
        size: dto.size.trim(),
        color_name: dto.colorName.trim(),
        color_hex: dto.colorHex?.trim() ?? null,
        stock: dto.stock,
        additional_price: (dto.additionalPrice ?? 0).toFixed(2),
        is_active: dto.isActive ?? true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Variante de ropa creada correctamente', data: variant };
  }

  async updateVariant(id: string, dto: UpdateRopProductVariantDto) {
    const existing = await this.getVariantOrFail(id);

    if (dto.sku !== undefined && dto.sku !== existing.sku) {
      await this.ensureSkuIsAvailable(dto.sku, id);
    }

    const nextSize = dto.size?.trim() ?? existing.size;
    const nextColor = dto.colorName?.trim() ?? existing.color_name;

    if (nextSize !== existing.size || nextColor !== existing.color_name) {
      await this.ensureVariantCombinationIsAvailable(existing.product_id, nextSize, nextColor, id);
    }

    const updated = await this.databaseService.db
      .updateTable('rop_product_variants')
      .set({
        sku: dto.sku === undefined ? existing.sku : dto.sku?.trim() || null,
        size: nextSize,
        color_name: nextColor,
        color_hex: dto.colorHex === undefined ? existing.color_hex : dto.colorHex?.trim() ?? null,
        stock: dto.stock ?? existing.stock,
        additional_price:
          dto.additionalPrice !== undefined
            ? dto.additionalPrice.toFixed(2)
            : existing.additional_price,
        is_active: dto.isActive ?? existing.is_active,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Variante de ropa actualizada correctamente', data: updated };
  }

  async toggleVariantActive(id: string) {
    const existing = await this.getVariantOrFail(id);

    const updated = await this.databaseService.db
      .updateTable('rop_product_variants')
      .set({ is_active: !existing.is_active, updated_at: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Estado de variante actualizado', data: updated };
  }

  async createImage(productId: string, dto: CreateRopProductImageDto) {
    await this.ensureProductExists(productId);

    const image = await this.databaseService.db.transaction().execute(async (trx) => {
      if (dto.isPrimary) {
        await trx
          .updateTable('rop_product_images')
          .set({ is_primary: false, updated_at: new Date() })
          .where('product_id', '=', productId)
          .execute();
      }

      return trx
        .insertInto('rop_product_images')
        .values({
          product_id: productId,
          image_url: dto.imageUrl.trim(),
          storage_path: dto.storagePath?.trim() ?? null,
          mime_type: dto.mimeType?.trim() ?? null,
          size_bytes: dto.sizeBytes ?? null,
          alt_text: dto.altText?.trim() ?? null,
          sort_order: dto.sortOrder ?? 0,
          is_primary: dto.isPrimary ?? false,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    });

    return { message: 'Imagen de ropa creada correctamente', data: image };
  }

  async updateImage(id: string, dto: UpdateRopProductImageDto) {
    const existing = await this.getImageOrFail(id);

    const updated = await this.databaseService.db.transaction().execute(async (trx) => {
      if (dto.isPrimary) {
        await trx
          .updateTable('rop_product_images')
          .set({ is_primary: false, updated_at: new Date() })
          .where('product_id', '=', existing.product_id)
          .execute();
      }

      return trx
        .updateTable('rop_product_images')
        .set({
          image_url: dto.imageUrl?.trim() ?? existing.image_url,
          storage_path: dto.storagePath === undefined ? existing.storage_path : dto.storagePath?.trim() ?? null,
          mime_type: dto.mimeType === undefined ? existing.mime_type : dto.mimeType?.trim() ?? null,
          size_bytes: dto.sizeBytes === undefined ? existing.size_bytes : dto.sizeBytes ?? null,
          alt_text: dto.altText === undefined ? existing.alt_text : dto.altText?.trim() ?? null,
          sort_order: dto.sortOrder ?? existing.sort_order,
          is_primary: dto.isPrimary ?? existing.is_primary,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirstOrThrow();
    });

    return { message: 'Imagen de ropa actualizada correctamente', data: updated };
  }

  async deleteImage(id: string) {
    const existing = await this.getImageOrFail(id);

    await this.ropaStorageService.deleteProductImageByPath(existing.storage_path);

    await this.databaseService.db
      .deleteFrom('rop_product_images')
      .where('id', '=', existing.id)
      .executeTakeFirst();

    return { message: 'Imagen de ropa eliminada correctamente', data: existing };
  }

  private async buildProductQuery(filters: ListRopProductsDto, onlyActive: boolean) {
    let query = this.databaseService.db
      .selectFrom('rop_products as p')
      .innerJoin('rop_categories as c', 'c.id', 'p.category_id')
      .select([
        'p.id',
        'p.category_id',
        'p.name',
        'p.slug',
        'p.description',
        'p.brand',
        'p.fit',
        'p.material',
        'p.care_instructions',
        'p.base_price',
        'p.sale_price',
        'p.main_image_url',
        'p.main_image_storage_path',
        'p.is_featured',
        'p.is_active',
        'p.created_at',
        'c.name as category_name',
        'c.slug as category_slug',
      ]);

    if (onlyActive) {
      query = query.where('p.is_active', '=', true).where('c.is_active', '=', true);
    }

    if (filters.categorySlug) {
      query = query.where('c.slug', '=', filters.categorySlug);
    }

    if (filters.featured === 'true') {
      query = query.where('p.is_featured', '=', true);
    }

    if (filters.search) {
      const term = `%${filters.search.trim()}%`;
      query = query.where((eb) =>
        eb.or([
          eb('p.name', 'ilike', term),
          eb('p.brand', 'ilike', term),
          eb('p.description', 'ilike', term),
        ]),
      );
    }

    if (filters.minPrice) {
      query = query.where('p.base_price', '>=', Number(filters.minPrice).toFixed(2));
    }

    if (filters.maxPrice) {
      query = query.where('p.base_price', '<=', Number(filters.maxPrice).toFixed(2));
    }

    let products = await query.orderBy('p.created_at desc').execute();

    if (filters.size || filters.color) {
      const productIds = products.map((product) => product.id);
      if (productIds.length === 0) return [];

      let variantQuery = this.databaseService.db
        .selectFrom('rop_product_variants')
        .select(['product_id'])
        .where('product_id', 'in', productIds)
        .where('is_active', '=', true)
        .where('stock', '>', 0);

      if (filters.size) {
        variantQuery = variantQuery.where('size', '=', filters.size.trim());
      }

      if (filters.color) {
        variantQuery = variantQuery.where('color_name', '=', filters.color.trim());
      }

      const matchedVariants = await variantQuery.execute();
      const matchedProductIds = new Set(matchedVariants.map((variant) => variant.product_id));
      products = products.filter((product) => matchedProductIds.has(product.id));
    }

    return products;
  }

  private async attachProductDetails(products: RopProductListItem[], onlyActive: boolean) {
    if (products.length === 0) return [];

    const productIds = products.map((product) => product.id);

    let variantsQuery = this.databaseService.db
      .selectFrom('rop_product_variants')
      .selectAll()
      .where('product_id', 'in', productIds)
      .orderBy('size asc')
      .orderBy('color_name asc');

    if (onlyActive) {
      variantsQuery = variantsQuery.where('is_active', '=', true);
    }

    const variants = await variantsQuery.execute();
    const images = await this.databaseService.db
      .selectFrom('rop_product_images')
      .selectAll()
      .where('product_id', 'in', productIds)
      .orderBy('sort_order asc')
      .execute();

    const variantsByProduct = this.groupByProductId(variants);
    const imagesByProduct = this.groupByProductId(images);

    return products.map((product) => {
      const productVariants = variantsByProduct.get(product.id) ?? [];
      const productImages = imagesByProduct.get(product.id) ?? [];
      const totalStock = productVariants.reduce((total, variant) => total + variant.stock, 0);

      return {
        ...product,
        display_price: product.sale_price ?? product.base_price,
        total_stock: totalStock,
        variants: productVariants,
        images: productImages,
      };
    });
  }

  private groupByProductId<T extends { product_id: string }>(items: T[]) {
    const grouped = new Map<string, T[]>();

    items.forEach((item) => {
      const current = grouped.get(item.product_id) ?? [];
      current.push(item);
      grouped.set(item.product_id, current);
    });

    return grouped;
  }

  private async insertImages(
    trx: any,
    productId: string,
    images: CreateRopProductImageDto[],
  ) {
    const normalizedImages = images.map((image, index) => ({
      product_id: productId,
      image_url: image.imageUrl.trim(),
      storage_path: image.storagePath?.trim() ?? null,
      mime_type: image.mimeType?.trim() ?? null,
      size_bytes: image.sizeBytes ?? null,
      alt_text: image.altText?.trim() ?? null,
      sort_order: image.sortOrder ?? index,
      is_primary: image.isPrimary ?? index === 0,
    }));

    const hasPrimary = normalizedImages.some((image) => image.is_primary);
    if (!hasPrimary && normalizedImages[0]) {
      normalizedImages[0].is_primary = true;
    }

    await trx.insertInto('rop_product_images').values(normalizedImages).execute();
  }

  private async getCategoryOrFail(id: string) {
    const category = await this.databaseService.db
      .selectFrom('rop_categories')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!category) {
      throw new NotFoundException('Categoría de ropa no encontrada');
    }

    return category;
  }

  private async getProductOrFail(id: string) {
    const product = await this.databaseService.db
      .selectFrom('rop_products')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!product) {
      throw new NotFoundException('Producto de ropa no encontrado');
    }

    return product;
  }

  private async getVariantOrFail(id: string) {
    const variant = await this.databaseService.db
      .selectFrom('rop_product_variants')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!variant) {
      throw new NotFoundException('Variante de ropa no encontrada');
    }

    return variant;
  }

  private async getImageOrFail(id: string) {
    const image = await this.databaseService.db
      .selectFrom('rop_product_images')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!image) {
      throw new NotFoundException('Imagen de ropa no encontrada');
    }

    return image;
  }

  private async ensureCategoryExists(id: string) {
    await this.getCategoryOrFail(id);
  }

  private async ensureProductExists(id: string) {
    await this.getProductOrFail(id);
  }

  private async ensureCategorySlugIsAvailable(slug: string, excludedId?: string) {
    let query = this.databaseService.db
      .selectFrom('rop_categories')
      .select(['id'])
      .where('slug', '=', slug.trim());

    if (excludedId) {
      query = query.where('id', '!=', excludedId);
    }

    const exists = await query.executeTakeFirst();
    if (exists) {
      throw new BadRequestException('El slug de categoría de ropa ya existe');
    }
  }

  private async ensureProductSlugIsAvailable(slug: string, excludedId?: string) {
    let query = this.databaseService.db
      .selectFrom('rop_products')
      .select(['id'])
      .where('slug', '=', slug.trim());

    if (excludedId) {
      query = query.where('id', '!=', excludedId);
    }

    const exists = await query.executeTakeFirst();
    if (exists) {
      throw new BadRequestException('El slug de producto de ropa ya existe');
    }
  }

  private ensureUniqueVariants(variants: CreateRopProductVariantDto[]) {
    const keys = new Set<string>();

    variants.forEach((variant) => {
      const key = this.getVariantCombinationKey(variant.size, variant.colorName);
      if (keys.has(key)) {
        throw new BadRequestException('No se puede repetir la misma talla y color en el producto');
      }
      keys.add(key);
    });
  }

  private async ensureVariantCombinationIsAvailable(
    productId: string,
    size: string,
    colorName: string,
    excludedVariantId?: string,
  ) {
    /**
     * Nota para mí:
     * El negocio sí permite que una misma talla tenga varios colores.
     * Lo único prohibido es duplicar exactamente la misma combinación talla/color
     * dentro del mismo producto. Comparo en memoria normalizando mayúsculas para
     * evitar duplicados como "Negro" y "negro".
     */
    const variants = await this.databaseService.db
      .selectFrom('rop_product_variants')
      .select(['id', 'size', 'color_name'])
      .where('product_id', '=', productId)
      .execute();

    const requestedKey = this.getVariantCombinationKey(size, colorName);
    const exists = variants.some(
      (variant) =>
        variant.id !== excludedVariantId &&
        this.getVariantCombinationKey(variant.size, variant.color_name) === requestedKey,
    );

    if (exists) {
      throw new BadRequestException('Ya existe una variante con la misma talla y color');
    }
  }

  private getVariantCombinationKey(size: string, colorName: string) {
    return `${size.trim().toUpperCase()}-${colorName.trim().toUpperCase()}`;
  }

  private async ensureSkuIsAvailable(sku?: string | null, excludedVariantId?: string) {
    if (!sku?.trim()) return;

    let query = this.databaseService.db
      .selectFrom('rop_product_variants')
      .select(['id'])
      .where('sku', '=', sku.trim());

    if (excludedVariantId) {
      query = query.where('id', '!=', excludedVariantId);
    }

    const exists = await query.executeTakeFirst();
    if (exists) {
      throw new BadRequestException('El SKU de variante ya existe');
    }
  }

  private normalizeCouponCode(code: string) {
    return code.trim().toUpperCase().replace(/\s+/g, '');
  }

  private uniqueIds(ids: string[]) {
    return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private ensureCouponDatesAreValid(startsAt?: string | null, endsAt?: string | null) {
    if (!startsAt || !endsAt) return;

    const starts = new Date(startsAt);
    const ends = new Date(endsAt);

    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) return;

    if (starts > ends) {
      throw new BadRequestException('La fecha de inicio no puede ser mayor que la fecha fin del cupón');
    }
  }

  private async ensureCouponCodeIsAvailable(code: string, excludedId?: string) {
    let query = this.databaseService.db
      .selectFrom('rop_coupons')
      .select(['id'])
      .where('code', '=', code);

    if (excludedId) {
      query = query.where('id', '!=', excludedId);
    }

    const exists = await query.executeTakeFirst();
    if (exists) {
      throw new BadRequestException('El código de cupón ya existe');
    }
  }

  private async ensureProductsExist(productIds: string[]) {
    const ids = this.uniqueIds(productIds);
    if (ids.length === 0) {
      throw new BadRequestException('Selecciona al menos un producto para el cupón');
    }

    const products = await this.databaseService.db
      .selectFrom('rop_products')
      .select(['id'])
      .where('id', 'in', ids)
      .execute();

    if (products.length !== ids.length) {
      throw new BadRequestException('Uno o más productos seleccionados no existen');
    }
  }

  private async getCouponOrFail(id: string) {
    const coupon = await this.databaseService.db
      .selectFrom('rop_coupons')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!coupon) {
      throw new NotFoundException('Cupón de ropa no encontrado');
    }

    return coupon;
  }

  private async getCouponByCodeOrFail(code: string) {
    const normalizedCode = this.normalizeCouponCode(code);
    const coupon = await this.databaseService.db
      .selectFrom('rop_coupons')
      .selectAll()
      .where('code', '=', normalizedCode)
      .executeTakeFirst();

    if (!coupon) {
      throw new NotFoundException('Cupón de ropa no encontrado');
    }

    return coupon;
  }

  private async getCouponProductIds(couponId: string) {
    const rows = await this.databaseService.db
      .selectFrom('rop_coupon_products')
      .select(['product_id'])
      .where('coupon_id', '=', couponId)
      .execute();

    return new Set(rows.map((row) => row.product_id));
  }

  private async ensureCouponCanBeUsed(coupon: any, userId: string) {
    const now = new Date();

    if (!coupon.is_active) {
      throw new BadRequestException('El cupón no está activo');
    }

    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      throw new BadRequestException('El cupón todavía no está vigente');
    }

    if (coupon.ends_at && new Date(coupon.ends_at) < now) {
      throw new BadRequestException('El cupón ya venció');
    }

    const previousUse = await this.databaseService.db
      .selectFrom('rop_coupon_redemptions')
      .select(['id'])
      .where('coupon_id', '=', coupon.id)
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (previousUse) {
      throw new BadRequestException('Este cupón ya fue usado por el usuario');
    }

    if (coupon.max_uses_total) {
      const uses = await this.databaseService.db
        .selectFrom('rop_coupon_redemptions')
        .select((eb) => eb.fn.countAll().as('total'))
        .where('coupon_id', '=', coupon.id)
        .executeTakeFirst();

      if (Number(uses?.total ?? 0) >= coupon.max_uses_total) {
        throw new BadRequestException('El cupón alcanzó su límite de uso');
      }
    }
  }

  private async attachCouponProducts(coupons: any[]) {
    if (coupons.length === 0) return [];

    const couponIds = coupons.map((coupon) => coupon.id);
    const rows = await this.databaseService.db
      .selectFrom('rop_coupon_products as cp')
      .innerJoin('rop_products as p', 'p.id', 'cp.product_id')
      .select([
        'cp.coupon_id',
        'p.id as product_id',
        'p.name as product_name',
        'p.slug as product_slug',
        'p.main_image_url as product_image_url',
      ])
      .where('cp.coupon_id', 'in', couponIds)
      .orderBy('p.name asc')
      .execute();

    const productsByCoupon = new Map<string, any[]>();
    rows.forEach((row) => {
      const current = productsByCoupon.get(row.coupon_id) ?? [];
      current.push({
        id: row.product_id,
        name: row.product_name,
        slug: row.product_slug,
        imageUrl: row.product_image_url,
      });
      productsByCoupon.set(row.coupon_id, current);
    });

    return coupons.map((coupon) => ({
      ...coupon,
      products: productsByCoupon.get(coupon.id) ?? [],
    }));
  }

}
