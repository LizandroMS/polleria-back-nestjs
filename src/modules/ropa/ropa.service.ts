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
import { ListRopProductsDto } from './dto/list-rop-products.dto';
import { UpdateRopCategoryDto } from './dto/update-rop-category.dto';
import { UpdateRopProductImageDto } from './dto/update-rop-product-image.dto';
import { UpdateRopProductVariantDto } from './dto/update-rop-product-variant.dto';
import { UpdateRopProductDto } from './dto/update-rop-product.dto';

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
  is_featured: boolean;
  is_active: boolean;
  created_at?: Date;
  category_name: string;
  category_slug: string;
};

@Injectable()
export class RopaService {
  constructor(private readonly databaseService: DatabaseService) {}

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
      const key = `${variant.size.trim().toUpperCase()}-${variant.colorName.trim().toUpperCase()}`;
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
    let query = this.databaseService.db
      .selectFrom('rop_product_variants')
      .select(['id'])
      .where('product_id', '=', productId)
      .where('size', '=', size.trim())
      .where('color_name', '=', colorName.trim());

    if (excludedVariantId) {
      query = query.where('id', '!=', excludedVariantId);
    }

    const exists = await query.executeTakeFirst();
    if (exists) {
      throw new BadRequestException('Ya existe una variante con la misma talla y color');
    }
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
}
