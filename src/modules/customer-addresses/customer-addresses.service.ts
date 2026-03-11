import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/kysely/database.service';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-customer-address.dto';

@Injectable()
export class CustomerAddressesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listByUser(userId: string) {
    const rows = await this.databaseService.db
      .selectFrom('customer_addresses')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('is_default desc')
      .orderBy('created_at desc')
      .execute();

    return {
      message: 'Direcciones listadas correctamente',
      data: rows,
    };
  }

  async create(userId: string, dto: CreateCustomerAddressDto) {
    if (dto.isDefault) {
      await this.databaseService.db
        .updateTable('customer_addresses')
        .set({ is_default: false })
        .where('user_id', '=', userId)
        .execute();
    }

    const created = await this.databaseService.db
      .insertInto('customer_addresses')
      .values({
        user_id: userId,
        label: dto.label ?? null,
        address_line: dto.addressLine,
        district: dto.district ?? null,
        reference: dto.reference ?? null,
        latitude: dto.latitude?.toString() ?? null,
        longitude: dto.longitude?.toString() ?? null,
        is_default: dto.isDefault ?? false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      message: 'Dirección creada correctamente',
      data: created,
    };
  }

  async update(userId: string, id: string, dto: UpdateCustomerAddressDto) {
    const existing = await this.databaseService.db
      .selectFrom('customer_addresses')
      .selectAll()
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('Dirección no encontrada');
    }

    if (dto.isDefault) {
      await this.databaseService.db
        .updateTable('customer_addresses')
        .set({ is_default: false })
        .where('user_id', '=', userId)
        .execute();
    }

    const updated = await this.databaseService.db
      .updateTable('customer_addresses')
      .set({
        label: dto.label ?? existing.label,
        address_line: dto.addressLine ?? existing.address_line,
        district: dto.district ?? existing.district,
        reference: dto.reference ?? existing.reference,
        latitude: dto.latitude !== undefined ? dto.latitude.toString() : existing.latitude,
        longitude: dto.longitude !== undefined ? dto.longitude.toString() : existing.longitude,
        is_default: dto.isDefault ?? existing.is_default,
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      message: 'Dirección actualizada correctamente',
      data: updated,
    };
  }

  async remove(userId: string, id: string) {
    const existing = await this.databaseService.db
      .selectFrom('customer_addresses')
      .selectAll()
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('Dirección no encontrada');
    }

    await this.databaseService.db
      .deleteFrom('customer_addresses')
      .where('id', '=', id)
      .execute();

    return {
      message: 'Dirección eliminada correctamente',
      data: null,
    };
  }

  async setDefault(userId: string, id: string) {
    const existing = await this.databaseService.db
      .selectFrom('customer_addresses')
      .selectAll()
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('Dirección no encontrada');
    }

    await this.databaseService.db
      .updateTable('customer_addresses')
      .set({ is_default: false })
      .where('user_id', '=', userId)
      .execute();

    const updated = await this.databaseService.db
      .updateTable('customer_addresses')
      .set({ is_default: true })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      message: 'Dirección principal actualizada',
      data: updated,
    };
  }
}