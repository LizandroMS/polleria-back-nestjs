import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/kysely/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { hashPassword } from '../../common/utils/password.util';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.databaseService.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', createUserDto.email.toLowerCase())
      .executeTakeFirst();

    if (existingUser) {
      throw new BadRequestException('El email ya está registrado');
    }

    const passwordHash = await hashPassword(createUserDto.password);

    const user = await this.databaseService.db
      .insertInto('users')
      .values({
        role: createUserDto.role,
        first_name: createUserDto.firstName,
        last_name: createUserDto.lastName ?? null,
        email: createUserDto.email.toLowerCase(),
        phone: createUserDto.phone ?? null,
        password_hash: passwordHash,
        is_active: true,
      })
      .returning([
        'id',
        'role',
        'first_name',
        'last_name',
        'email',
        'phone',
        'is_active',
        'created_at',
      ])
      .executeTakeFirstOrThrow();

    return {
      message: 'Usuario creado correctamente',
      data: user,
    };
  }

  async findByEmail(email: string) {
    return this.databaseService.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email.toLowerCase())
      .executeTakeFirst();
  }

  async findById(id: string) {
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
      .where('id', '=', id)
      .executeTakeFirst();

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      message: 'Usuario encontrado',
      data: user,
    };
  }

  async findRawById(id: string) {
    return this.databaseService.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findRawById(id);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const updated = await this.databaseService.db
      .updateTable('users')
      .set({
        first_name: updateUserDto.firstName ?? user.first_name,
        last_name: updateUserDto.lastName ?? user.last_name,
        email: updateUserDto.email?.toLowerCase() ?? user.email,
        phone: updateUserDto.phone ?? user.phone,
      })
      .where('id', '=', id)
      .returning([
        'id',
        'role',
        'first_name',
        'last_name',
        'email',
        'phone',
        'is_active',
        'updated_at',
      ])
      .executeTakeFirstOrThrow();

    return {
      message: 'Usuario actualizado correctamente',
      data: updated,
    };
  }

  async list() {
    const users = await this.databaseService.db
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
      ])
      .orderBy('created_at desc')
      .execute();

    return {
      message: 'Usuarios listados correctamente',
      data: users,
    };
  }

  async createCustomer(input: {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  passwordHash: string;
}) {
  return this.databaseService.db
    .insertInto('users')
    .values({
      role: 'CUSTOMER',
      first_name: input.firstName,
      last_name: input.lastName ?? null,
      email: input.email.toLowerCase(),
      phone: input.phone ?? null,
      password_hash: input.passwordHash,
      is_active: true,
    })
    .returning([
      'id',
      'role',
      'first_name',
      'last_name',
      'email',
      'phone',
      'is_active',
    ])
    .executeTakeFirstOrThrow();
}
}