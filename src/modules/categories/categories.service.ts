import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/kysely/database.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.databaseService.db
      .selectFrom('categories')
      .select(['id'])
      .where('slug', '=', dto.slug)
      .executeTakeFirst();

    if (existing) {
      throw new BadRequestException('El slug ya existe');
    }

    const category = await this.databaseService.db
      .insertInto('categories')
      .values({
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        sort_order: dto.sortOrder ?? 0,
        is_active: dto.isActive ?? true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Categoría creada correctamente', data: category };
  }

  async listPublic() {
    const categories = await this.databaseService.db
      .selectFrom('categories')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('sort_order asc')
      .orderBy('name asc')
      .execute();

    return { message: 'Categorías públicas listadas', data: categories };
  }

  async listAdmin() {
    const categories = await this.databaseService.db
      .selectFrom('categories')
      .selectAll()
      .orderBy('sort_order asc')
      .execute();

    return { message: 'Categorías listadas', data: categories };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.databaseService.db
      .selectFrom('categories')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugUsed = await this.databaseService.db
        .selectFrom('categories')
        .select(['id'])
        .where('slug', '=', dto.slug)
        .executeTakeFirst();

      if (slugUsed) {
        throw new BadRequestException('El slug ya existe');
      }
    }

    const updated = await this.databaseService.db
      .updateTable('categories')
      .set({
        name: dto.name ?? existing.name,
        slug: dto.slug ?? existing.slug,
        description: dto.description ?? existing.description,
        sort_order: dto.sortOrder ?? existing.sort_order,
        is_active: dto.isActive ?? existing.is_active,
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Categoría actualizada correctamente', data: updated };
  }
}