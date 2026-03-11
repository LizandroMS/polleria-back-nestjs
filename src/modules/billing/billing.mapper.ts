type OrderEntity = any;
type OrderItemEntity = any;

function nowDateParts() {
  const now = new Date();
  const fecha = now.toISOString().slice(0, 10);
  const hora = now.toTimeString().slice(0, 8);

  return { fecha, hora };
}

export function mapOrderToApisunatDocument(input: {
  order: OrderEntity;
  items: OrderItemEntity[];
  series: string;
  correlative: number;
}) {
  const { order, items, series, correlative } = input;
  const { fecha, hora } = nowDateParts();

  const documento = order.invoice_type === 'FACTURA' ? 'factura' : 'boleta';

  const clienteTipoDocumento =
    order.invoice_type === 'FACTURA'
      ? '6'
      : order.customer_document_type_snapshot || '1';

  return {
    documento,
    serie: series,
    numero: correlative,
    fecha_de_emision: fecha,
    hora_de_emision: hora,
    moneda: 'PEN',
    tipo_operacion: '0101',
    cliente_tipo_de_documento: clienteTipoDocumento,
    cliente_numero_de_documento:
      order.customer_document_number_snapshot ||
      (order.invoice_type === 'FACTURA' ? '' : '00000000'),
    cliente_denominacion:
      order.customer_business_name_snapshot || order.customer_name_snapshot,
    cliente_direccion:
      order.customer_address_snapshot || '',
    items: items.map((item) => {
      const unitPrice = Number(item.unit_price_snapshot);
      const grossPrice = unitPrice;
      const netValue = Number((grossPrice / 1.18).toFixed(6));

      return {
        unidad_de_medida: item.unit_of_measure || 'NIU',
        descripcion: item.product_name_snapshot,
        cantidad: String(item.quantity),
        valor_unitario: String(netValue),
        precio_unitario: String(grossPrice),
        porcentaje_igv: String(item.igv_percentage ?? '18'),
        codigo_tipo_afectacion_igv: '10',
      };
    }),
  };
}

export function mapDocumentStatusPayload(input: {
  documentType: 'BOLETA_SIMPLE' | 'FACTURA';
  series: string;
  correlative: number;
}) {
  return {
    documento: input.documentType === 'FACTURA' ? 'factura' : 'boleta',
    serie: input.series,
    numero: input.correlative,
  };
}

export function mapVoidFacturaPayload(input: {
  series: string;
  correlative: number;
  reason?: string;
}) {
  return {
    documento: 'comunicacion_baja',
    motivo: input.reason || 'ANULACIÓN DE OPERACIÓN',
    documento_afectado: {
      documento: 'factura',
      serie: input.series,
      numero: String(input.correlative),
    },
  };
}

export function mapVoidBoletaPayload(input: {
  series: string;
  correlative: number;
  reason?: string;
}) {
  return {
    documento: 'resumen_diario',
    motivo: input.reason || 'ANULACIÓN DE OPERACIÓN',
    documento_afectado: {
      documento: 'boleta',
      serie: input.series,
      numero: String(input.correlative),
    },
  };
}