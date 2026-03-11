import {
    BadRequestException,
    Injectable,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/kysely/database.service';
import {
    mapDocumentStatusPayload,
    mapOrderToApisunatDocument,
    mapVoidBoletaPayload,
    mapVoidFacturaPayload,
} from './billing.mapper';
import { ApisunatProvider } from './providers/apisunat.provider';

@Injectable()
export class BillingService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly apisunatProvider: ApisunatProvider,
        private readonly logger = new Logger(BillingService.name),
        
    ) { }

    async emitIfRequiredOnDelivered(orderId: string) {
        const order = await this.databaseService.db
            .selectFrom('orders')
            .selectAll()
            .where('id', '=', orderId)
            .executeTakeFirst();

        if (!order) {
            throw new NotFoundException('Pedido no encontrado');
        }

        if (order.invoice_type === 'NONE') {
            return {
                message: 'El pedido no requiere comprobante',
                data: null,
            };
        }

        if (order.status !== 'DELIVERED') {
            throw new BadRequestException('Solo se puede emitir cuando el pedido está entregado');
        }

        const existingDoc = await this.databaseService.db
            .selectFrom('electronic_documents')
            .selectAll()
            .where('order_id', '=', orderId)
            .executeTakeFirst();

        if (existingDoc) {
            return {
                message: 'El pedido ya tiene un documento electrónico asociado',
                data: existingDoc,
            };
        }

        const seriesRow = await this.databaseService.db
            .selectFrom('document_series')
            .selectAll()
            .where('branch_id', '=', order.branch_id)
            .where('document_type', '=', order.invoice_type as any)
            .where('is_active', '=', true)
            .executeTakeFirst();

        if (!seriesRow) {
            throw new BadRequestException('No existe serie activa para esa sucursal y tipo de documento');
        }

        const nextCorrelative = seriesRow.current_number + 1;

        await this.databaseService.db
            .updateTable('orders')
            .set({
                invoice_emission_status: 'PROCESSING',
            })
            .where('id', '=', orderId)
            .execute();

        const items = await this.databaseService.db
            .selectFrom('order_items')
            .selectAll()
            .where('order_id', '=', orderId)
            .execute();

        const payload = mapOrderToApisunatDocument({
            order,
            items,
            series: seriesRow.series,
            correlative: nextCorrelative,
        });

        try {
            const apiResponse = await this.apisunatProvider.emitDocument(payload);

            await this.databaseService.db
                .updateTable('document_series')
                .set({
                    current_number: nextCorrelative,
                })
                .where('id', '=', seriesRow.id)
                .execute();

            const emitted = await this.databaseService.db
                .insertInto('electronic_documents')
                .values({
                    order_id: orderId,
                    document_type: order.invoice_type as any,
                    series: seriesRow.series,
                    correlative: nextCorrelative,
                    external_status: apiResponse?.payload?.estado || 'PENDING',
                    sunat_status: apiResponse?.payload?.estado || null,
                    hash: apiResponse?.payload?.hash || null,
                    xml_url: apiResponse?.payload?.xml || null,
                    cdr_url: apiResponse?.payload?.cdr || null,
                    pdf_url: apiResponse?.payload?.pdf?.ticket || null,
                    api_response: apiResponse,
                    error_message: null,
                    emitted_at: new Date(),
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            await this.databaseService.db
                .updateTable('orders')
                .set({
                    invoice_emission_status: 'ISSUED',
                })
                .where('id', '=', orderId)
                .execute();

            return {
                message: 'Documento emitido correctamente',
                data: emitted,
            };
        } catch (error: any) {
            await this.databaseService.db
                .updateTable('orders')
                .set({
                    invoice_emission_status: 'FAILED',
                })
                .where('id', '=', orderId)
                .execute();

            const failed = await this.databaseService.db
                .insertInto('electronic_documents')
                .values({
                    order_id: orderId,
                    document_type: order.invoice_type as any,
                    series: seriesRow.series,
                    correlative: nextCorrelative,
                    external_status: 'FAILED',
                    sunat_status: null,
                    hash: null,
                    xml_url: null,
                    cdr_url: null,
                    pdf_url: null,
                    api_response: error?.response?.data || error?.message || null,
                    error_message:
                        error?.response?.data?.message ||
                        error?.message ||
                        'Error desconocido al emitir',
                    emitted_at: null,
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            return {
                message: 'La emisión falló y quedó pendiente de reintento',
                data: failed,
            };
        }
    }

    async retry(orderId: string) {
        const order = await this.databaseService.db
            .selectFrom('orders')
            .selectAll()
            .where('id', '=', orderId)
            .executeTakeFirst();

        if (!order) {
            throw new NotFoundException('Pedido no encontrado');
        }

        const existing = await this.databaseService.db
            .selectFrom('electronic_documents')
            .selectAll()
            .where('order_id', '=', orderId)
            .executeTakeFirst();

        if (existing && existing.external_status !== 'FAILED') {
            throw new BadRequestException('Solo se puede reintentar documentos fallidos');
        }

        if (existing) {
            await this.databaseService.db
                .deleteFrom('electronic_documents')
                .where('id', '=', existing.id)
                .execute();
        }

        return this.emitIfRequiredOnDelivered(orderId);
    }

    async getByOrder(orderId: string) {
        const doc = await this.databaseService.db
            .selectFrom('electronic_documents')
            .selectAll()
            .where('order_id', '=', orderId)
            .executeTakeFirst();

        if (!doc) {
            throw new NotFoundException('No existe documento electrónico para esta orden');
        }

        return {
            message: 'Documento electrónico obtenido',
            data: doc,
        };
    }

    async listAll() {
        const docs = await this.databaseService.db
            .selectFrom('electronic_documents as ed')
            .innerJoin('orders as o', 'o.id', 'ed.order_id')
            .select([
                'ed.id',
                'ed.order_id',
                'ed.document_type',
                'ed.series',
                'ed.correlative',
                'ed.external_status',
                'ed.sunat_status',
                'ed.hash',
                'ed.xml_url',
                'ed.cdr_url',
                'ed.pdf_url',
                'ed.error_message',
                'ed.emitted_at',
                'o.order_number',
                'o.customer_name_snapshot',
                'o.total',
            ])
            .orderBy('ed.created_at desc')
            .execute();

        return {
            message: 'Documentos electrónicos listados',
            data: docs,
        };
    }

    async queryStatus(orderId: string) {
        const doc = await this.databaseService.db
            .selectFrom('electronic_documents')
            .selectAll()
            .where('order_id', '=', orderId)
            .executeTakeFirst();

        if (!doc) {
            throw new NotFoundException('No existe documento electrónico para esta orden');
        }

        const payload = mapDocumentStatusPayload({
            documentType: doc.document_type as any,
            series: doc.series,
            correlative: doc.correlative,
        });

        const apiResponse = await this.apisunatProvider.getStatus(payload);

        await this.databaseService.db
            .updateTable('electronic_documents')
            .set({
                sunat_status: apiResponse?.payload ? 'REGISTRADO' : doc.sunat_status,
                hash: apiResponse?.payload?.hash || doc.hash,
                xml_url: apiResponse?.payload?.xml || doc.xml_url,
                cdr_url: apiResponse?.payload?.cdr || doc.cdr_url,
                api_response: apiResponse,
            })
            .where('id', '=', doc.id)
            .execute();

        const updated = await this.databaseService.db
            .selectFrom('electronic_documents')
            .selectAll()
            .where('id', '=', doc.id)
            .executeTakeFirstOrThrow();

        return {
            message: 'Estado consultado correctamente',
            data: updated,
        };
    }

    async void(orderId: string, reason?: string) {
        const doc = await this.databaseService.db
            .selectFrom('electronic_documents')
            .selectAll()
            .where('order_id', '=', orderId)
            .executeTakeFirst();

        if (!doc) {
            throw new NotFoundException('No existe documento electrónico para esta orden');
        }

        let apiResponse: any;

        if (doc.document_type === 'FACTURA') {
            apiResponse = await this.apisunatProvider.voidFactura(
                mapVoidFacturaPayload({
                    series: doc.series,
                    correlative: doc.correlative,
                    reason,
                }),
            );
        } else {
            apiResponse = await this.apisunatProvider.voidBoleta(
                mapVoidBoletaPayload({
                    series: doc.series,
                    correlative: doc.correlative,
                    reason,
                }),
            );
        }

        await this.databaseService.db
            .updateTable('electronic_documents')
            .set({
                external_status: 'VOIDED_REQUESTED',
                api_response: apiResponse,
            })
            .where('id', '=', doc.id)
            .execute();

        const updated = await this.databaseService.db
            .selectFrom('electronic_documents')
            .selectAll()
            .where('id', '=', doc.id)
            .executeTakeFirstOrThrow();

        return {
            message: 'Solicitud de anulación enviada correctamente',
            data: updated,
        };
    }
}