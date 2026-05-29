import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/kysely/database.service';
import { CreateReclamationDto } from './dto/create-reclamation.dto';

@Injectable()
export class ReclamationBookService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateReclamationDto, metadata?: { ipAddress?: string; userAgent?: string }) {
    if (!dto.consumerAcceptsTerms) {
      throw new BadRequestException('Debe aceptar la declaración antes de registrar la reclamación');
    }

    if (dto.isMinor && (!dto.guardianFullName || !dto.guardianDocumentNumber)) {
      throw new BadRequestException('Debe registrar los datos del apoderado para consumidores menores de edad');
    }

    const branch = dto.branchId
      ? await this.databaseService.db
          .selectFrom('branches')
          .select(['id', 'name'])
          .where('id', '=', dto.branchId)
          .executeTakeFirst()
      : null;

    if (dto.branchId && !branch) {
      throw new BadRequestException('La sucursal seleccionada no existe');
    }

    const claimCode = await this.generateClaimCode();

    const reclamation = await this.databaseService.db
      .insertInto('reclamation_book')
      .values({
        claim_code: claimCode,
        consumer_full_name: dto.consumerFullName.trim(),
        consumer_document_type: dto.consumerDocumentType,
        consumer_document_number: dto.consumerDocumentNumber.trim(),
        consumer_email: dto.consumerEmail.trim().toLowerCase(),
        consumer_phone: dto.consumerPhone?.trim() || null,
        consumer_address: dto.consumerAddress?.trim() || null,
        is_minor: dto.isMinor ?? false,
        guardian_full_name: dto.isMinor ? dto.guardianFullName?.trim() ?? null : null,
        guardian_document_number: dto.isMinor ? dto.guardianDocumentNumber?.trim() ?? null : null,
        branch_id: branch?.id ?? null,
        branch_name_snapshot: branch?.name ?? null,
        order_number: dto.orderNumber?.trim() || null,
        good_type: dto.goodType,
        amount: dto.amount !== undefined && dto.amount !== null ? dto.amount.toFixed(2) : null,
        description: dto.description.trim(),
        claim_type: dto.claimType,
        detail: dto.detail.trim(),
        requested_solution: dto.requestedSolution.trim(),
        status: 'RECEIVED',
        consumer_accepts_terms: dto.consumerAcceptsTerms,
        ip_address: metadata?.ipAddress ?? null,
        user_agent: metadata?.userAgent ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      message: 'Reclamación registrada correctamente',
      data: reclamation,
    };
  }

  private async generateClaimCode() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const random = Math.floor(Math.random() * 900000 + 100000);
      const code = `LR-${yyyy}${mm}${dd}-${random}`;

      const existing = await this.databaseService.db
        .selectFrom('reclamation_book')
        .select(['id'])
        .where('claim_code', '=', code)
        .executeTakeFirst();

      if (!existing) return code;
    }

    throw new BadRequestException('No se pudo generar un código único de reclamación');
  }
}
