import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { comparePassword, hashPassword } from '../../common/utils/password.util';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailerService } from '../mailer/mailer.service';
import { DatabaseService } from 'src/database/kysely/database.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly databaseService: DatabaseService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new BadRequestException('El email ya está registrado');
    }

    const passwordHash = await hashPassword(registerDto.password);

    const createdUser = await this.usersService.createCustomer({
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      email: registerDto.email,
      phone: registerDto.phone,
      passwordHash,
    });

    const accessToken = await this.signToken({
      sub: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
    });

    return {
      message: 'Registro exitoso',
      data: {
        user: {
          id: createdUser.id,
          role: createdUser.role,
          first_name: createdUser.first_name,
          last_name: createdUser.last_name,
          email: createdUser.email,
          phone: createdUser.phone,
        },
        accessToken,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await comparePassword(loginDto.password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accessToken = await this.signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Login exitoso',
      data: {
        user: {
          id: user.id,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
        },
        accessToken,
      },
    };
  }

  async me(userId: string) {
    const result = await this.usersService.findById(userId);

    return {
      message: 'Perfil obtenido correctamente',
      data: result.data,
    };
  }

  private async signToken(payload: { sub: string; email: string; role: string }) {
    return this.jwtService.signAsync(payload);
  }
  async forgotPassword(dto: ForgotPasswordDto) {
  const user = await this.databaseService.db
    .selectFrom('users')
    .selectAll()
    .where('email', '=', dto.email)
    .executeTakeFirst();

  // responder siempre igual por seguridad
  if (!user) {
    return {
      message: 'Si el correo existe, se enviará un enlace de recuperación.',
      data: null,
    };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await this.databaseService.db
    .insertInto('password_reset_tokens')
    .values({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      used_at: undefined,
    })
    .execute();

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

  await this.mailerService.sendPasswordResetEmail(user.email, resetUrl);

  return {
    message: 'Si el correo existe, se enviará un enlace de recuperación.',
    data: null,
  };
}

async resetPassword(dto: ResetPasswordDto) {
  const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

  const resetToken = await this.databaseService.db
    .selectFrom('password_reset_tokens')
    .selectAll()
    .where('token_hash', '=', tokenHash)
    .where('used_at', 'is', null)
    .where('expires_at', '>', new Date())
    .orderBy('created_at desc')
    .executeTakeFirst();

  if (!resetToken) {
    throw new BadRequestException('El enlace es inválido o ha expirado');
  }

  const passwordHash = await bcrypt.hash(dto.password, 10);

  await this.databaseService.db
    .updateTable('users')
    .set({
      password_hash: passwordHash,
    })
    .where('id', '=', resetToken.user_id)
    .execute();

  await this.databaseService.db
    .updateTable('password_reset_tokens')
    .set({
      used_at: new Date(),
    })
    .where('id', '=', resetToken.id)
    .execute();

  return {
    message: 'Contraseña actualizada correctamente',
    data: null,
  };
}
}