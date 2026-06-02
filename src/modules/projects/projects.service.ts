import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  DEFAULT_PROJECT_CODE,
  ProjectCode,
  SUPPORTED_PROJECT_CODES,
} from '../../common/constants/project-code.constant';
import { UserRole } from '../../common/constants/roles.constant';
import { DatabaseService } from '../../database/kysely/database.service';

export type UserProjectAccess = {
  projectId: string;
  projectCode: ProjectCode;
  projectName: string;
  role: UserRole;
};

@Injectable()
export class ProjectsService {
  constructor(private readonly databaseService: DatabaseService) {}

  normalizeProjectCode(projectCode?: string): ProjectCode {
    const normalized = (projectCode ?? DEFAULT_PROJECT_CODE).trim().toUpperCase();

    if (!SUPPORTED_PROJECT_CODES.includes(normalized as ProjectCode)) {
      throw new BadRequestException('Código de proyecto no soportado');
    }

    return normalized as ProjectCode;
  }

  async getActiveProject(projectCode: ProjectCode) {
    const project = await this.databaseService.db
      .selectFrom('projects')
      .selectAll()
      .where('code', '=', projectCode)
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (!project) {
      throw new UnauthorizedException('Proyecto no disponible');
    }

    return project;
  }

  async findActiveUserAccess(
    userId: string,
    projectCode: ProjectCode,
  ): Promise<UserProjectAccess | null> {
    const access = await this.databaseService.db
      .selectFrom('user_project_access as upa')
      .innerJoin('projects as p', 'p.id', 'upa.project_id')
      .select([
        'p.id as projectId',
        'p.code as projectCode',
        'p.name as projectName',
        'upa.role as role',
      ])
      .where('upa.user_id', '=', userId)
      .where('upa.is_active', '=', true)
      .where('p.code', '=', projectCode)
      .where('p.is_active', '=', true)
      .executeTakeFirst();

    if (!access) {
      return null;
    }

    return {
      projectId: access.projectId,
      projectCode: access.projectCode as ProjectCode,
      projectName: access.projectName,
      role: access.role as UserRole,
    };
  }

  async ensureUserAccess(
    userId: string,
    projectCode: ProjectCode,
    role: UserRole,
  ): Promise<UserProjectAccess> {
    const project = await this.getActiveProject(projectCode);

    const existingAccess = await this.databaseService.db
      .selectFrom('user_project_access')
      .selectAll()
      .where('user_id', '=', userId)
      .where('project_id', '=', project.id)
      .executeTakeFirst();

    if (existingAccess) {
      const updatedAccess = await this.databaseService.db
        .updateTable('user_project_access')
        .set({
          role,
          is_active: true,
          updated_at: new Date(),
        })
        .where('id', '=', existingAccess.id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return {
        projectId: project.id,
        projectCode: project.code as ProjectCode,
        projectName: project.name,
        role: updatedAccess.role as UserRole,
      };
    }

    await this.databaseService.db
      .insertInto('user_project_access')
      .values({
        user_id: userId,
        project_id: project.id,
        role,
        is_active: true,
      })
      .execute();

    return {
      projectId: project.id,
      projectCode: project.code as ProjectCode,
      projectName: project.name,
      role,
    };
  }
}
