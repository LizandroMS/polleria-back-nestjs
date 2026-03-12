import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/kysely/database.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreatePromotionDto) {
    const promotion = await this.databaseService.db
      .insertInto('promotions')
      .values({
        title: dto.title,
        description: dto.description ?? null,
        discount_type: dto.discountType,
        discount_value: dto.discountValue.toFixed(2),
        starts_at: dto.startsAt ? new Date(dto.startsAt) : null,
        ends_at: dto.endsAt ? new Date(dto.endsAt) : null,
        is_active: dto.isActive ?? true,
        image_url: dto.imageUrl ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    if (dto.productIds?.length) {
      await this.databaseService.db
        .insertInto('promotion_products')
        .values(
          dto.productIds.map((productId) => ({
            promotion_id: promotion.id,
            product_id: productId,
          })),
        )
        .execute();
    }

    return { message: 'Promoción creada correctamente', data: promotion };
  }

  async listPublic() {
    const now = new Date();

    const promotions = await this.databaseService.db
      .selectFrom('promotions')
      .selectAll()
      .where('is_active', '=', true)
      .where((eb) =>
        eb.and([
          eb.or([eb('starts_at', 'is', null), eb('starts_at', '<=', now)]),
          eb.or([eb('ends_at', 'is', null), eb('ends_at', '>=', now)]),
        ]),
      )
      .orderBy('created_at desc')
      .execute();

    return { message: 'Promociones públicas listadas', data: promotions };
  }

  async listAdmin() {
    const promotions = await this.databaseService.db
      .selectFrom('promotions')
      .selectAll()
      .orderBy('created_at desc')
      .execute();

    return { message: 'Promociones listadas', data: promotions };
  }

  async getById(id: string) {
    const promotion = await this.databaseService.db
      .selectFrom('promotions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!promotion) {
      throw new NotFoundException('Promoción no encontrada');
    }

    const products = await this.databaseService.db
      .selectFrom('promotion_products')
      .select(['product_id'])
      .where('promotion_id', '=', id)
      .execute();

    return {
      message: 'Promoción obtenida',
      data: {
        ...promotion,
        product_ids: products.map((p) => p.product_id),
      },
    };
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const existing = await this.databaseService.db
      .selectFrom('promotions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('Promoción no encontrada');
    }

    const updated = await this.databaseService.db
      .updateTable('promotions')
      .set({
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        discount_type: dto.discountType ?? existing.discount_type,
        discount_value:
          dto.discountValue !== undefined ? dto.discountValue.toFixed(2) : existing.discount_value,
        starts_at: dto.startsAt ? new Date(dto.startsAt) : existing.starts_at,
        ends_at: dto.endsAt ? new Date(dto.endsAt) : existing.ends_at,
        is_active: dto.isActive ?? existing.is_active,
        image_url: dto.imageUrl ?? existing.image_url,
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    if (dto.productIds) {
      await this.databaseService.db
        .deleteFrom('promotion_products')
        .where('promotion_id', '=', id)
        .execute();

      if (dto.productIds.length) {
        await this.databaseService.db
          .insertInto('promotion_products')
          .values(
            dto.productIds.map((productId) => ({
              promotion_id: id,
              product_id: productId,
            })),
          )
          .execute();
      }
    }

    return { message: 'Promoción actualizada correctamente', data: updated };
  }

  async toggleActive(id: string) {
    const existing = await this.databaseService.db
      .selectFrom('promotions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('Promoción no encontrada');
    }

    const updated = await this.databaseService.db
      .updateTable('promotions')
      .set({
        is_active: !existing.is_active,
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Estado de promoción actualizado', data: updated };
  }
}