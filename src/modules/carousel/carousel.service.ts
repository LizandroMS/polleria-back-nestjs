import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/kysely/database.service';
import { CreateCarouselItemDto } from './dto/create-carousel-item.dto';
import { UpdateCarouselItemDto } from './dto/update-carousel-item.dto';

@Injectable()
export class CarouselService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateCarouselItemDto) {
    const item = await this.databaseService.db
      .insertInto('carousel_items')
      .values({
        title: dto.title,
        subtitle: dto.subtitle ?? null,
        image_url: dto.imageUrl,
        link_type: dto.linkType,
        link_value: dto.linkValue ?? null,
        sort_order: dto.sortOrder ?? 0,
        starts_at: dto.startsAt ? new Date(dto.startsAt) : null,
        ends_at: dto.endsAt ? new Date(dto.endsAt) : null,
        is_active: dto.isActive ?? true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Item del carrusel creado correctamente', data: item };
  }

  async listPublic() {
    const now = new Date();

    const items = await this.databaseService.db
      .selectFrom('carousel_items')
      .selectAll()
      .where('is_active', '=', true)
      .where((eb) =>
        eb.and([
          eb.or([eb('starts_at', 'is', null), eb('starts_at', '<=', now)]),
          eb.or([eb('ends_at', 'is', null), eb('ends_at', '>=', now)]),
        ]),
      )
      .orderBy('sort_order asc')
      .execute();

    return { message: 'Carrusel público listado', data: items };
  }

  async listAdmin() {
    const items = await this.databaseService.db
      .selectFrom('carousel_items')
      .selectAll()
      .orderBy('sort_order asc')
      .execute();

    return { message: 'Carrusel listado', data: items };
  }

  async update(id: string, dto: UpdateCarouselItemDto) {
    const existing = await this.databaseService.db
      .selectFrom('carousel_items')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('Item no encontrado');
    }

    const updated = await this.databaseService.db
      .updateTable('carousel_items')
      .set({
        title: dto.title ?? existing.title,
        subtitle: dto.subtitle ?? existing.subtitle,
        image_url: dto.imageUrl ?? existing.image_url,
        link_type: dto.linkType ?? existing.link_type,
        link_value: dto.linkValue ?? existing.link_value,
        sort_order: dto.sortOrder ?? existing.sort_order,
        starts_at: dto.startsAt ? new Date(dto.startsAt) : existing.starts_at,
        ends_at: dto.endsAt ? new Date(dto.endsAt) : existing.ends_at,
        is_active: dto.isActive ?? existing.is_active,
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Item del carrusel actualizado', data: updated };
  }
}