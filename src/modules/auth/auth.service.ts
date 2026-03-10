import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { comparePassword, hashPassword } from '../../common/utils/password.util';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
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
}