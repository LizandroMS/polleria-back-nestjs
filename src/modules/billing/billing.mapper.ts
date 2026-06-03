type OrderEntity = any;
type OrderItemEntity = any;

function nowDateParts() {
  const limaFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });

  const parts = limaFormatter.formatToParts(new Date());
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const second = getPart('second');

  // Nota para mí: APISUNAT valida la fecha de emisión contra la fecha de Perú.
  // Railway trabaja en UTC; por eso nunca debo usar toISOString() para comprobantes.
  return {
    fecha: `${year}-${month}-${day}`,
    hora: `${hour}:${minute}:${second}`,
  };
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
      const discountAmount = Number(item.discount_amount ?? 0);

      // Nota para mí: para APISUNAT debo enviar el precio finalmente cobrado.
      // Si hubo promoción/descuento por item, uso el precio neto cobrado al cliente.
      const grossPrice = Math.max(0, unitPrice - discountAmount);
      const netValue = Number((grossPrice / 1.18).toFixed(6));

      return {
        unidad_de_medida: item.unit_of_measure || 'NIU',
        descripcion: item.product_name_snapshot,
        cantidad: String(item.quantity),
        valor_unitario: netValue.toFixed(6),
        precio_unitario: grossPrice.toFixed(2),
        porcentaje_igv: String(item.igv_percentage ?? '18'),
        codigo_tipo_afectacion_igv: '10',
        nombre_tributo: 'IGV',
      };
    }),
    total: Number(order.total ?? 0).toFixed(2),
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