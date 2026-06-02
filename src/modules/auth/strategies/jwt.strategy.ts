import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DEFAULT_PROJECT_CODE, ProjectCode } from '../../../common/constants/project-code.constant';
import { UserRole } from '../../../common/constants/roles.constant';
import { ProjectsService } from '../../projects/projects.service';
import { UsersService } from '../../users/users.service';

type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  projectCode?: ProjectCode;
  projectId?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    private readonly projectsService: ProjectsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findRawById(payload.sub);

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Usuario inválido');
    }

    const projectCode = this.projectsService.normalizeProjectCode(payload.projectCode);
    let projectAccess = await this.projectsService.findActiveUserAccess(user.id, projectCode);

    if (!projectAccess && projectCode === DEFAULT_PROJECT_CODE) {
      // Nota para mí:
      // Esta compatibilidad evita invalidar tokens/usuarios antiguos mientras se migra
      // producción hacia accesos por proyecto.
      projectAccess = await this.projectsService.ensureUserAccess(
        user.id,
        DEFAULT_PROJECT_CODE,
        user.role as UserRole,
      );
    }

    if (!projectAccess) {
      throw new UnauthorizedException('Usuario sin acceso activo al proyecto');
    }

    return {
      id: user.id,
      email: user.email,
      role: projectAccess.role,
      firstName: user.first_name,
      lastName: user.last_name,
      projectId: projectAccess.projectId,
      projectCode: projectAccess.projectCode,
      projectName: projectAccess.projectName,
    };
  }
}
