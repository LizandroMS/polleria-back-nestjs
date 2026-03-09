import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/kysely/database.service';
import { CreateProductDto } from './dto/create-product.dto';
import { SetProductBranchPriceDto } from './dto/set-product-branch-price.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateProductDto) {
    const category = await this.databaseService.db
      .selectFrom('categories')
      .select(['id'])
      .where('id', '=', dto.categoryId)
      .executeTakeFirst();

    if (!category) {
      throw new BadRequestException('La categoría no existe');
    }

    const slugUsed = await this.databaseService.db
      .selectFrom('products')
      .select(['id'])
      .where('slug', '=', dto.slug)
      .executeTakeFirst();

    if (slugUsed) {
      throw new BadRequestException('El slug ya existe');
    }

    const product = await this.databaseService.db
      .insertInto('products')
      .values({
        category_id: dto.categoryId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        image_url: dto.imageUrl ?? null,
        base_price: dto.basePrice.toFixed(2),
        is_featured: dto.isFeatured ?? false,
        is_active: dto.isActive ?? true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Producto creado correctamente', data: product };
  }

  async listPublic(params?: { categorySlug?: string; branchId?: string }) {
    let query = this.databaseService.db
      .selectFrom('products as p')
      .innerJoin('categories as c', 'c.id', 'p.category_id')
      .select([
        'p.id',
        'p.category_id',
        'p.name',
        'p.slug',
        'p.description',
        'p.image_url',
        'p.base_price',
        'p.is_featured',
        'p.is_active',
        'c.name as category_name',
        'c.slug as category_slug',
      ])
      .where('p.is_active', '=', true)
      .where('c.is_active', '=', true);

    if (params?.categorySlug) {
      query = query.where('c.slug', '=', params.categorySlug);
    }

    const products = await query.orderBy('p.created_at desc').execute();

    if (!params?.branchId) {
      return { message: 'Productos públicos listados', data: products };
    }

    const enriched = await Promise.all(
      products.map(async (product) => {
        const branchPrice = await this.databaseService.db
          .selectFrom('product_branch_prices')
          .select(['price', 'is_available'])
          .where('product_id', '=', product.id)
          .where('branch_id', '=', params.branchId as string)
          .executeTakeFirst();

        return {
          ...product,
          display_price: branchPrice?.price ?? product.base_price,
          is_available: branchPrice?.is_available ?? true,
        };
      }),
    );

    return { message: 'Productos públicos listados', data: enriched };
  }

  async listAdmin() {
    const products = await this.databaseService.db
      .selectFrom('products as p')
      .innerJoin('categories as c', 'c.id', 'p.category_id')
      .select([
        'p.id',
        'p.category_id',
        'p.name',
        'p.slug',
        'p.description',
        'p.image_url',
        'p.base_price',
        'p.is_featured',
        'p.is_active',
        'p.created_at',
        'c.name as category_name',
      ])
      .orderBy('p.created_at desc')
      .execute();

    return { message: 'Productos listados', data: products };
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.databaseService.db
      .selectFrom('products')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (dto.categoryId) {
      const category = await this.databaseService.db
        .selectFrom('categories')
        .select(['id'])
        .where('id', '=', dto.categoryId)
        .executeTakeFirst();

      if (!category) {
        throw new BadRequestException('La categoría no existe');
      }
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugUsed = await this.databaseService.db
        .selectFrom('products')
        .select(['id'])
        .where('slug', '=', dto.slug)
        .executeTakeFirst();

      if (slugUsed) {
        throw new BadRequestException('El slug ya existe');
      }
    }

    const updated = await this.databaseService.db
      .updateTable('products')
      .set({
        category_id: dto.categoryId ?? existing.category_id,
        name: dto.name ?? existing.name,
        slug: dto.slug ?? existing.slug,
        description: dto.description ?? existing.description,
        image_url: dto.imageUrl ?? existing.image_url,
        base_price: dto.basePrice !== undefined ? dto.basePrice.toFixed(2) : existing.base_price,
        is_featured: dto.isFeatured ?? existing.is_featured,
        is_active: dto.isActive ?? existing.is_active,
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Producto actualizado correctamente', data: updated };
  }

  async setBranchPrice(productId: string, dto: SetProductBranchPriceDto) {
    const product = await this.databaseService.db
      .selectFrom('products')
      .select(['id'])
      .where('id', '=', productId)
      .executeTakeFirst();

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const existing = await this.databaseService.db
      .selectFrom('product_branch_prices')
      .selectAll()
      .where('product_id', '=', productId)
      .where('branch_id', '=', dto.branchId)
      .executeTakeFirst();

    if (existing) {
      const updated = await this.databaseService.db
        .updateTable('product_branch_prices')
        .set({
          price: dto.price.toFixed(2),
          is_available: dto.isAvailable ?? existing.is_available,
        })
        .where('id', '=', existing.id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return { message: 'Precio por sucursal actualizado', data: updated };
    }

    const created = await this.databaseService.db
      .insertInto('product_branch_prices')
      .values({
        product_id: productId,
        branch_id: dto.branchId,
        price: dto.price.toFixed(2),
        is_available: dto.isAvailable ?? true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Precio por sucursal creado', data: created };
  }
}