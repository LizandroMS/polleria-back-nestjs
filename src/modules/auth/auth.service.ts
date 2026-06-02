import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { DEFAULT_PROJECT_CODE, ProjectCode } from '../../common/constants/project-code.constant';
import { UserRole } from '../../common/constants/roles.constant';
import { comparePassword, hashPassword } from '../../common/utils/password.util';
import { DatabaseService } from '../../database/kysely/database.service';
import { MailerService } from '../mailer/mailer.service';
import { ProjectsService, UserProjectAccess } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  projectCode: ProjectCode;
  projectId: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly databaseService: DatabaseService,
    private readonly projectsService: ProjectsService,
  ) {}

  async register(registerDto: RegisterDto) {
    const projectCode = this.projectsService.normalizeProjectCode(registerDto.projectCode);
    await this.projectsService.getActiveProject(projectCode);

    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      const existingProjectAccess = await this.projectsService.findActiveUserAccess(
        existingUser.id,
        projectCode,
      );

      const isPasswordValid = await comparePassword(
        registerDto.password,
        existingUser.password_hash,
      );

      if (!isPasswordValid) {
        throw new BadRequestException(
          'El email ya existe. Ingresa la contraseña correcta para habilitar este proyecto.',
        );
      }

      if (existingProjectAccess) {
        const accessToken = await this.signToken({
          sub: existingUser.id,
          email: existingUser.email,
          role: existingProjectAccess.role,
          projectCode: existingProjectAccess.projectCode,
          projectId: existingProjectAccess.projectId,
        });

        return {
          message: 'La cuenta ya tenía acceso a este proyecto. Sesión iniciada correctamente.',
          data: {
            user: this.mapAuthUser(existingUser, existingProjectAccess),
            accessToken,
          },
        };
      }

      await this.syncExistingUserProfile(existingUser.id, {
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: registerDto.phone,
      });

      const createdProjectAccess = await this.projectsService.ensureUserAccess(
        existingUser.id,
        projectCode,
        UserRole.CUSTOMER,
      );

      const refreshedUser =
        (await this.usersService.findByEmail(existingUser.email)) ?? existingUser;

      const accessToken = await this.signToken({
        sub: refreshedUser.id,
        email: refreshedUser.email,
        role: createdProjectAccess.role,
        projectCode: createdProjectAccess.projectCode,
        projectId: createdProjectAccess.projectId,
      });

      return {
        message: 'Cuenta existente vinculada correctamente al nuevo proyecto.',
        data: {
          user: this.mapAuthUser(refreshedUser, createdProjectAccess),
          accessToken,
        },
      };
    }

    const passwordHash = await hashPassword(registerDto.password);

    const createdUser = await this.usersService.createCustomer({
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      email: registerDto.email,
      phone: registerDto.phone,
      passwordHash,
    });

    const projectAccess = await this.projectsService.ensureUserAccess(
      createdUser.id,
      projectCode,
      UserRole.CUSTOMER,
    );

    const accessToken = await this.signToken({
      sub: createdUser.id,
      email: createdUser.email,
      role: projectAccess.role,
      projectCode: projectAccess.projectCode,
      projectId: projectAccess.projectId,
    });

    return {
      message: 'Registro exitoso',
      data: {
        user: this.mapAuthUser(createdUser, projectAccess),
        accessToken,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const projectCode = this.projectsService.normalizeProjectCode(loginDto.projectCode);
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await comparePassword(loginDto.password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    let projectAccess = await this.projectsService.findActiveUserAccess(user.id, projectCode);

    if (!projectAccess && projectCode === DEFAULT_PROJECT_CODE) {
      // Nota para mí:
      // Mantengo compatibilidad con usuarios antiguos de producción. Si el usuario existe
      // antes de crear la tabla user_project_access, lo asocio automáticamente al proyecto POL
      // usando su rol actual de users.role.
      projectAccess = await this.projectsService.ensureUserAccess(
        user.id,
        DEFAULT_PROJECT_CODE,
        user.role as UserRole,
      );
    }

    if (!projectAccess) {
      throw new UnauthorizedException('El usuario no tiene acceso activo a este proyecto');
    }

    const accessToken = await this.signToken({
      sub: user.id,
      email: user.email,
      role: projectAccess.role,
      projectCode: projectAccess.projectCode,
      projectId: projectAccess.projectId,
    });

    return {
      message: 'Login exitoso',
      data: {
        user: this.mapAuthUser(user, projectAccess),
        accessToken,
      },
    };
  }

  async me(authUser: { id: string; projectCode?: ProjectCode; role?: UserRole }) {
    const result = await this.usersService.findById(authUser.id);
    const user = result.data;
    const projectCode = authUser.projectCode ?? DEFAULT_PROJECT_CODE;
    const projectAccess = await this.projectsService.findActiveUserAccess(user.id, projectCode);

    return {
      message: 'Perfil obtenido correctamente',
      data: this.mapAuthUser(user, projectAccess ?? {
        projectId: '',
        projectCode,
        projectName: 'Pollería',
        role: (authUser.role ?? user.role) as UserRole,
      }),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.databaseService.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', dto.email)
      .executeTakeFirst();

    // Responder siempre igual por seguridad.
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


  private async syncExistingUserProfile(
    userId: string,
    input: {
      firstName: string;
      lastName?: string;
      phone?: string;
    },
  ) {
    const user = await this.usersService.findRawById(userId);

    if (!user) {
      return;
    }

    // Nota para mí:
    // Cuando una cuenta ya existe por otro proyecto, no la duplico.
    // Solo completo datos faltantes y luego creo el acceso en user_project_access.
    // Así el mismo correo puede usar POL y ROP con el mismo password.
    await this.databaseService.db
      .updateTable('users')
      .set({
        first_name: user.first_name || input.firstName,
        last_name: user.last_name ?? input.lastName ?? null,
        phone: user.phone ?? input.phone ?? null,
        updated_at: new Date(),
      })
      .where('id', '=', userId)
      .execute();
  }

  private async signToken(payload: JwtPayload) {
    return this.jwtService.signAsync(payload);
  }

  private mapAuthUser(
    user: {
      id: string;
      role: string;
      first_name: string;
      last_name: string | null;
      email: string;
      phone: string | null;
    },
    projectAccess: UserProjectAccess,
  ) {
    return {
      id: user.id,
      role: projectAccess.role,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      projectCode: projectAccess.projectCode,
      projectName: projectAccess.projectName,
    };
  }
}
