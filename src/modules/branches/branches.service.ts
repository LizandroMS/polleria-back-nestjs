import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/kysely/database.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateBranchDto) {
    const branch = await this.databaseService.db
      .insertInto('branches')
      .values({
        name: dto.name,
        address: dto.address,
        phone: dto.phone ?? null,
        district: dto.district ?? null,
        reference: dto.reference ?? null,
        opens_at: dto.opensAt ?? null,
        closes_at: dto.closesAt ?? null,
        is_active: dto.isActive ?? true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Sucursal creada correctamente', data: branch };
  }

  async listPublic() {
    const branches = await this.databaseService.db
      .selectFrom('branches')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('name asc')
      .execute();

    return { message: 'Sucursales públicas listadas', data: branches };
  }

  async listAdmin() {
    const branches = await this.databaseService.db
      .selectFrom('branches')
      .selectAll()
      .orderBy('created_at desc')
      .execute();

    return { message: 'Sucursales listadas', data: branches };
  }

  async update(id: string, dto: UpdateBranchDto) {
    const existing = await this.databaseService.db
      .selectFrom('branches')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    const updated = await this.databaseService.db
      .updateTable('branches')
      .set({
        name: dto.name ?? existing.name,
        address: dto.address ?? existing.address,
        phone: dto.phone ?? existing.phone,
        district: dto.district ?? existing.district,
        reference: dto.reference ?? existing.reference,
        opens_at: dto.opensAt ?? existing.opens_at,
        closes_at: dto.closesAt ?? existing.closes_at,
        is_active: dto.isActive ?? existing.is_active,
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Sucursal actualizada correctamente', data: updated };
  }
}