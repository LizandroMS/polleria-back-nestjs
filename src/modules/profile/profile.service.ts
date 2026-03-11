import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/kysely/database.service';

@Injectable()
export class ProfileService {
  constructor(private readonly databaseService: DatabaseService) {}

  async me(userId: string) {
    const user = await this.databaseService.db
      .selectFrom('users')
      .select([
        'id',
        'role',
        'first_name',
        'last_name',
        'email',
        'phone',
        'is_active',
        'created_at',
        'updated_at',
      ])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const defaultAddress = await this.databaseService.db
      .selectFrom('customer_addresses')
      .selectAll()
      .where('user_id', '=', userId)
      .where('is_default', '=', true)
      .executeTakeFirst();

    const addressCountRow = await this.databaseService.db
      .selectFrom('customer_addresses')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('user_id', '=', userId)
      .executeTakeFirst();

    const orderCountRow = await this.databaseService.db
      .selectFrom('orders')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('customer_id', '=', userId)
      .executeTakeFirst();

    return {
      message: 'Perfil obtenido correctamente',
      data: {
        user,
        summary: {
          addressCount: Number(addressCountRow?.count ?? 0),
          orderCount: Number(orderCountRow?.count ?? 0),
        },
        defaultAddress: defaultAddress ?? null,
      },
    };
  }
}