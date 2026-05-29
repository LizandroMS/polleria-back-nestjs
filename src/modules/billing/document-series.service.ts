import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/kysely/database.service';
import { CreateDocumentSeriesDto } from './dto/create-document-series.dto';
import { UpdateDocumentSeriesDto } from './dto/update-document-series.dto';

@Injectable()
export class DocumentSeriesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listAll() {
    const rows = await this.databaseService.db
      .selectFrom('document_series as ds')
      .leftJoin('branches as b', 'b.id', 'ds.branch_id')
      .select([
        'ds.id as id',
        'ds.branch_id as branch_id',
        'b.name as branch_name',
        'ds.document_type as document_type',
        'ds.series as series',
        'ds.current_number as current_number',
        'ds.is_active as is_active',
        'ds.created_at as created_at',
        'ds.updated_at as updated_at',
      ])
      .orderBy('b.name asc')
      .orderBy('ds.document_type asc')
      .orderBy('ds.created_at desc')
      .execute();

    return { message: 'Series de comprobantes listadas', data: rows };
  }

  async getByBranch(branchId: string) {
    await this.ensureBranchExists(branchId);

    const rows = await this.databaseService.db
      .selectFrom('document_series as ds')
      .leftJoin('branches as b', 'b.id', 'ds.branch_id')
      .select([
        'ds.id as id',
        'ds.branch_id as branch_id',
        'b.name as branch_name',
        'ds.document_type as document_type',
        'ds.series as series',
        'ds.current_number as current_number',
        'ds.is_active as is_active',
        'ds.created_at as created_at',
        'ds.updated_at as updated_at',
      ])
      .where('ds.branch_id', '=', branchId)
      .orderBy('ds.document_type asc')
      .orderBy('ds.created_at desc')
      .execute();

    return { message: 'Series de comprobantes por sucursal listadas', data: rows };
  }

  async create(dto: CreateDocumentSeriesDto) {
    const normalized = this.normalizePayload(dto);

    await this.ensureBranchExists(normalized.branchId);

    if (normalized.isActive) {
      await this.ensureNoActiveSeries(
        normalized.branchId,
        normalized.documentType,
      );
    }

    const created = await this.databaseService.db
      .insertInto('document_series')
      .values({
        branch_id: normalized.branchId,
        document_type: normalized.documentType,
        series: normalized.series,
        current_number: normalized.currentNumber,
        is_active: normalized.isActive,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Serie de comprobante creada correctamente', data: created };
  }

  async update(id: string, dto: UpdateDocumentSeriesDto) {
    const existing = await this.getRawById(id);

    if (!existing) {
      throw new NotFoundException('Serie de comprobante no encontrada');
    }

    const branchId = dto.branchId ?? existing.branch_id;
    const documentType = dto.documentType ?? existing.document_type;
    const isActive = dto.isActive ?? existing.is_active;

    await this.ensureBranchExists(branchId);

    if (isActive) {
      await this.ensureNoActiveSeries(branchId, documentType, id);
    }

    const updated = await this.databaseService.db
      .updateTable('document_series')
      .set({
        branch_id: branchId,
        document_type: documentType,
        series: dto.series ? dto.series.trim().toUpperCase() : existing.series,
        current_number: dto.currentNumber ?? existing.current_number,
        is_active: isActive,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Serie de comprobante actualizada correctamente', data: updated };
  }

  async toggleActive(id: string) {
    const existing = await this.getRawById(id);

    if (!existing) {
      throw new NotFoundException('Serie de comprobante no encontrada');
    }

    const nextStatus = !existing.is_active;

    if (nextStatus) {
      await this.ensureNoActiveSeries(
        existing.branch_id,
        existing.document_type,
        id,
      );
    }

    const updated = await this.databaseService.db
      .updateTable('document_series')
      .set({
        is_active: nextStatus,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return { message: 'Estado de serie actualizado correctamente', data: updated };
  }

  private normalizePayload(dto: CreateDocumentSeriesDto) {
    const series = dto.series.trim().toUpperCase();

    if (!series) {
      throw new BadRequestException('La serie del comprobante es obligatoria');
    }

    return {
      branchId: dto.branchId,
      documentType: dto.documentType,
      series,
      currentNumber: dto.currentNumber ?? 0,
      isActive: dto.isActive ?? true,
    };
  }

  private async getRawById(id: string) {
    return this.databaseService.db
      .selectFrom('document_series')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  private async ensureBranchExists(branchId: string) {
    const branch = await this.databaseService.db
      .selectFrom('branches')
      .select(['id'])
      .where('id', '=', branchId)
      .executeTakeFirst();

    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }
  }

  private async ensureNoActiveSeries(
    branchId: string,
    documentType: 'BOLETA_SIMPLE' | 'FACTURA',
    ignoreId?: string,
  ) {
    let query = this.databaseService.db
      .selectFrom('document_series')
      .select(['id'])
      .where('branch_id', '=', branchId)
      .where('document_type', '=', documentType)
      .where('is_active', '=', true);

    if (ignoreId) {
      query = query.where('id', '!=', ignoreId);
    }

    const existing = await query.executeTakeFirst();

    if (existing) {
      throw new ConflictException(
        'Ya existe una serie activa para esa sucursal y tipo de documento',
      );
    }
  }
}
