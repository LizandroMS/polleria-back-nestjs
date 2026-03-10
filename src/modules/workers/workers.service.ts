import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '../../common/constants/roles.constant';
import { DatabaseService } from '../../database/kysely/database.service';
import { AssignWorkerBranchDto } from './dto/assign-worker-branch.dto';

@Injectable()
export class WorkersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async assignBranch(dto: AssignWorkerBranchDto) {
    const user = await this.databaseService.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', dto.userId)
      .executeTakeFirst();

    if (!user || user.role !== UserRole.WORKER) {
      throw new BadRequestException('El usuario no es un trabajador válido');
    }

    const branch = await this.databaseService.db
      .selectFrom('branches')
      .selectAll()
      .where('id', '=', dto.branchId)
      .executeTakeFirst();

    if (!branch) {
      throw new BadRequestException('La sucursal no existe');
    }

    const existing = await this.databaseService.db
      .selectFrom('worker_branches')
      .selectAll()
      .where('user_id', '=', dto.userId)
      .where('branch_id', '=', dto.branchId)
      .executeTakeFirst();

    if (existing) {
      return {
        message: 'El trabajador ya está asignado a esa sucursal',
        data: existing,
      };
    }

    const assigned = await this.databaseService.db
      .insertInto('worker_branches')
      .values({
        user_id: dto.userId,
        branch_id: dto.branchId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      message: 'Trabajador asignado correctamente',
      data: assigned,
    };
  }

  async unassignBranch(workerBranchId: string) {
    const existing = await this.databaseService.db
      .selectFrom('worker_branches')
      .selectAll()
      .where('id', '=', workerBranchId)
      .executeTakeFirst();

    if (!existing) {
      throw new BadRequestException('Asignación no encontrada');
    }

    await this.databaseService.db
      .deleteFrom('worker_branches')
      .where('id', '=', workerBranchId)
      .execute();

    return {
      message: 'Asignación eliminada correctamente',
      data: null,
    };
  }

  async myBranches(userId: string) {
    const rows = await this.databaseService.db
      .selectFrom('worker_branches as wb')
      .innerJoin('branches as b', 'b.id', 'wb.branch_id')
      .select(['wb.id', 'wb.user_id', 'wb.branch_id', 'b.name', 'b.address', 'b.district'])
      .where('wb.user_id', '=', userId)
      .execute();

    return {
      message: 'Sucursales del trabajador listadas',
      data: rows,
    };
  }

  async listAssignments() {
    const rows = await this.databaseService.db
      .selectFrom('worker_branches as wb')
      .innerJoin('users as u', 'u.id', 'wb.user_id')
      .innerJoin('branches as b', 'b.id', 'wb.branch_id')
      .select([
        'wb.id',
        'wb.user_id',
        'wb.branch_id',
        'u.first_name',
        'u.last_name',
        'u.email',
        'b.name as branch_name',
        'b.district as branch_district',
        'wb.created_at',
      ])
      .orderBy('wb.created_at desc')
      .execute();

    return {
      message: 'Asignaciones listadas',
      data: rows,
    };
  }
}