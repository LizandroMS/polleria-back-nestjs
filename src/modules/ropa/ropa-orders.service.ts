import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../database/kysely/database.service';
import { CreateRopOrderDto } from './dto/create-rop-order.dto';
import { UpdateRopOrderStatusDto } from './dto/update-rop-order-status.dto';
import { UpdateRopPaymentStatusDto } from './dto/update-rop-payment-status.dto';

const DEFAULT_ORDER_STATUS = 'PENDING_CONTACT' as const;
const DEFAULT_PAYMENT_STATUS = 'PENDING' as const;

function createRopOrderCode() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const date = formatter.format(now).replaceAll('-', '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ROP-${date}-${random}`;
}

function toMoney(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return (Number.isFinite(numeric) ? numeric : 0).toFixed(2);
}

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

@Injectable()
export class RopaOrdersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createOrder(dto: CreateRopOrderDto, customerId: string) {
    if (!dto.items?.length) {
      throw new BadRequestException('El pedido debe tener al menos un producto.');
    }

    /**
     * Nota para mí:
     * En ropa la variante es la unidad vendible real porque contiene talla, color y stock.
     * Por eso no permito crear pedidos sin variantId; así puedo descontar inventario
     * con precisión cuando el cliente finaliza su solicitud.
     */
    const itemsWithoutVariant = dto.items.filter((item) => !item.variantId);
    if (itemsWithoutVariant.length > 0) {
      throw new BadRequestException('Todos los productos del pedido deben tener una talla/color seleccionada.');
    }

    const requestedByVariant = dto.items.reduce<Map<string, number>>((acc, item) => {
      const variantId = item.variantId as string;
      const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));
      acc.set(variantId, (acc.get(variantId) ?? 0) + quantity);
      return acc;
    }, new Map<string, number>());

    const variantIds = Array.from(requestedByVariant.keys());

    const variants = await this.databaseService.db
      .selectFrom('rop_product_variants as v')
      .innerJoin('rop_products as p', 'p.id', 'v.product_id')
      .select([
        'v.id as variant_id',
        'v.product_id',
        'v.sku',
        'v.size',
        'v.color_name',
        'v.stock',
        'v.additional_price',
        'v.is_active as variant_is_active',
        'p.name as product_name',
        'p.base_price',
        'p.sale_price',
        'p.main_image_url',
        'p.is_active as product_is_active',
      ])
      .where('v.id', 'in', variantIds)
      .execute();

    const variantsById = new Map(variants.map((variant) => [variant.variant_id, variant]));

    for (const variantId of variantIds) {
      const variant = variantsById.get(variantId);
      const requestedQuantity = requestedByVariant.get(variantId) ?? 0;

      if (!variant) {
        throw new BadRequestException('Una de las tallas seleccionadas ya no existe. Actualiza tu carrito.');
      }

      if (!variant.product_is_active || !variant.variant_is_active) {
        throw new BadRequestException(`La talla ${variant.size} / ${variant.color_name} ya no está activa.`);
      }

      if (Number(variant.stock) < requestedQuantity) {
        throw new BadRequestException(
          `Stock insuficiente para ${variant.product_name} talla ${variant.size} color ${variant.color_name}. Disponible: ${variant.stock}.`,
        );
      }
    }

    const subtotalFromCatalog = dto.items.reduce((total, item) => {
      const variant = variantsById.get(item.variantId as string);
      if (!variant) return total;
      const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));
      const basePrice = toNumber(variant.sale_price ?? variant.base_price);
      const additionalPrice = toNumber(variant.additional_price);
      return total + (basePrice + additionalPrice) * quantity;
    }, 0);

    const subtotal = this.roundMoney(subtotalFromCatalog);
    const discountTotal = this.roundMoney(Math.min(toNumber(dto.discountTotal), subtotal));
    const total = this.roundMoney(Math.max(0, subtotal - discountTotal));

    if (total < 0 || subtotal < 0 || discountTotal < 0) {
      throw new BadRequestException('Los importes del pedido no son válidos.');
    }

    const orderCode = createRopOrderCode();
    const now = new Date();

    const createdOrderId = await this.databaseService.db.transaction().execute(async (trx) => {
      const order = await trx
        .insertInto('rop_orders')
        .values({
          order_code: orderCode,
          customer_id: customerId,
          customer_full_name: dto.customer.fullName,
          customer_phone: dto.customer.phone,
          customer_email: dto.customer.email,
          customer_document_number: dto.customer.documentNumber ?? null,
          contact_preference: dto.contactPreference,
          payment_method: dto.paymentMethod,
          payment_status: DEFAULT_PAYMENT_STATUS,
          payment_notes: dto.paymentNotes ?? null,
          paid_at: null,
          delivery_address_line: dto.deliveryLocation.addressLine,
          delivery_reference: dto.deliveryLocation.reference ?? null,
          delivery_district: dto.deliveryLocation.district ?? null,
          delivery_latitude: dto.deliveryLocation.latitude?.toString() ?? null,
          delivery_longitude: dto.deliveryLocation.longitude?.toString() ?? null,
          delivery_google_place_id: dto.deliveryLocation.googlePlaceId ?? null,
          subtotal: toMoney(subtotal),
          discount_total: toMoney(discountTotal),
          total: toMoney(total),
          coupon_code: dto.coupon?.code ?? null,
          coupon_name: dto.coupon?.name ?? null,
          coupon_discount_percentage: dto.coupon ? toMoney(dto.coupon.discountPercentage) : null,
          coupon_discount_amount: dto.coupon ? toMoney(discountTotal) : null,
          status: DEFAULT_ORDER_STATUS,
          created_at: now,
          updated_at: now,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await trx
        .insertInto('rop_order_items')
        .values(
          dto.items.map((item) => {
            const variant = variantsById.get(item.variantId as string);
            const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));
            const unitPrice = variant
              ? this.roundMoney(toNumber(variant.sale_price ?? variant.base_price) + toNumber(variant.additional_price))
              : toNumber(item.price);

            return {
              order_id: order.id,
              product_id: variant?.product_id ?? item.productId ?? null,
              variant_id: item.variantId ?? null,
              sku: variant?.sku ?? item.sku ?? null,
              product_name_snapshot: variant?.product_name ?? item.name,
              image_url_snapshot: variant?.main_image_url ?? item.imageUrl ?? null,
              size_snapshot: variant?.size ?? item.size ?? null,
              color_name_snapshot: variant?.color_name ?? item.color ?? null,
              quantity,
              unit_price_snapshot: toMoney(unitPrice),
              subtotal: toMoney(unitPrice * quantity),
            };
          }),
        )
        .execute();

      for (const [variantId, quantity] of requestedByVariant.entries()) {
        const updatedVariant = await trx
          .updateTable('rop_product_variants')
          .set({
            stock: sql<number>`stock - ${quantity}`,
            updated_at: now,
          })
          .where('id', '=', variantId)
          .where('is_active', '=', true)
          .where('stock', '>=', quantity)
          .returning(['id', 'stock'])
          .executeTakeFirst();

        if (!updatedVariant) {
          throw new BadRequestException('El stock cambió mientras se procesaba el pedido. Actualiza tu carrito e inténtalo nuevamente.');
        }
      }

      await trx
        .insertInto('rop_order_status_history')
        .values({
          order_id: order.id,
          status: DEFAULT_ORDER_STATUS,
          payment_status: DEFAULT_PAYMENT_STATUS,
          changed_by: customerId,
          comment: 'Pedido creado por el cliente y stock reservado automáticamente.',
        })
        .execute();

      return order.id;
    });

    return this.getOrderById(createdOrderId);
  }

  async listMyOrders(customerId: string) {
    return this.listOrders({ customerId });
  }

  async listAdminOrders() {
    return this.listOrders();
  }

  async getOrderById(orderId: string) {
    const order = await this.databaseService.db
      .selectFrom('rop_orders')
      .selectAll()
      .where('id', '=', orderId)
      .executeTakeFirst();

    if (!order) {
      throw new NotFoundException('Pedido de ropa no encontrado.');
    }

    const items = await this.databaseService.db
      .selectFrom('rop_order_items')
      .selectAll()
      .where('order_id', '=', orderId)
      .orderBy('created_at', 'asc')
      .execute();

    return this.mapOrder(order, items);
  }

  async updateOrderStatus(orderId: string, dto: UpdateRopOrderStatusDto, changedBy: string) {
    const existing = await this.databaseService.db
      .selectFrom('rop_orders')
      .select(['id', 'status', 'payment_status'])
      .where('id', '=', orderId)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('Pedido de ropa no encontrado.');
    }

    const now = new Date();
    const shouldRestoreStock =
      dto.status === 'CANCELLED' &&
      existing.status !== 'CANCELLED' &&
      existing.status !== 'DELIVERED';

    await this.databaseService.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('rop_orders')
        .set({ status: dto.status, updated_at: now })
        .where('id', '=', orderId)
        .execute();

      if (shouldRestoreStock) {
        await this.restoreStockForOrder(orderId, trx, now);
      }

      await trx
        .insertInto('rop_order_status_history')
        .values({
          order_id: orderId,
          status: dto.status,
          payment_status: existing.payment_status,
          changed_by: changedBy,
          comment:
            dto.comment ??
            (shouldRestoreStock
              ? 'Pedido cancelado. Stock devuelto automáticamente.'
              : null),
        })
        .execute();
    });

    return this.getOrderById(orderId);
  }

  async updatePaymentStatus(orderId: string, dto: UpdateRopPaymentStatusDto, changedBy: string) {
    const existing = await this.databaseService.db
      .selectFrom('rop_orders')
      .select(['id', 'status', 'payment_status'])
      .where('id', '=', orderId)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('Pedido de ropa no encontrado.');
    }

    const nextStatus = dto.paymentStatus === 'CONFIRMED'
      ? 'PAYMENT_CONFIRMED'
      : dto.paymentStatus === 'REJECTED'
        ? 'CANCELLED'
        : existing.status === 'PAYMENT_CONFIRMED'
          ? 'PAYMENT_PENDING'
          : existing.status;

    const now = new Date();
    const shouldRestoreStock =
      dto.paymentStatus === 'REJECTED' &&
      existing.status !== 'CANCELLED' &&
      existing.status !== 'DELIVERED';

    await this.databaseService.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('rop_orders')
        .set({
          payment_status: dto.paymentStatus,
          paid_at: dto.paymentStatus === 'CONFIRMED' ? now : null,
          status: nextStatus,
          updated_at: now,
        })
        .where('id', '=', orderId)
        .execute();

      if (shouldRestoreStock) {
        await this.restoreStockForOrder(orderId, trx, now);
      }

      await trx
        .insertInto('rop_order_status_history')
        .values({
          order_id: orderId,
          status: nextStatus,
          payment_status: dto.paymentStatus,
          changed_by: changedBy,
          comment:
            dto.comment ??
            (shouldRestoreStock
              ? 'Pago rechazado. Pedido cancelado y stock devuelto automáticamente.'
              : null),
        })
        .execute();
    });

    return this.getOrderById(orderId);
  }

  /**
   * Nota para mí:
   * Cuando un pedido se cancela o se rechaza el pago, devuelvo el stock reservado.
   * Algunos pedidos antiguos pueden no tener variant_id porque fueron creados antes
   * de la mejora de tallas/stock; esos items se omiten para evitar errores.
   */
  private async restoreStockForOrder(orderId: string, trx: any, now: Date) {
    const items = await trx
      .selectFrom('rop_order_items')
      .select(['variant_id', 'quantity'])
      .where('order_id', '=', orderId)
      .execute();

    for (const item of items) {
      if (!item.variant_id || !item.quantity || Number(item.quantity) <= 0) {
        continue;
      }

      await trx
        .updateTable('rop_product_variants')
        .set({
          stock: sql<number>`stock + ${Number(item.quantity)}`,
          updated_at: now,
        })
        .where('id', '=', item.variant_id)
        .execute();
    }
  }

  private roundMoney(value: number) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  private async listOrders(filters: { customerId?: string } = {}) {
    const orders = filters.customerId
      ? await this.databaseService.db
          .selectFrom('rop_orders')
          .selectAll()
          .where('customer_id', '=', filters.customerId)
          .orderBy('created_at', 'desc')
          .execute()
      : await this.databaseService.db
          .selectFrom('rop_orders')
          .selectAll()
          .orderBy('created_at', 'desc')
          .execute();
    const orderIds = orders.map((order) => order.id);

    if (orderIds.length === 0) return [];

    const items = await this.databaseService.db
      .selectFrom('rop_order_items')
      .selectAll()
      .where('order_id', 'in', orderIds)
      .orderBy('created_at', 'asc')
      .execute();

    const itemsByOrderId = items.reduce<Record<string, typeof items>>((acc, item) => {
      acc[item.order_id] = acc[item.order_id] ?? [];
      acc[item.order_id].push(item);
      return acc;
    }, {});

    return orders.map((order) => this.mapOrder(order, itemsByOrderId[order.id] ?? []));
  }

  private mapOrder(order: any, items: any[]) {
    return {
      id: order.id,
      code: order.order_code,
      customerId: order.customer_id,
      customer: {
        fullName: order.customer_full_name,
        phone: order.customer_phone,
        email: order.customer_email,
        documentNumber: order.customer_document_number ?? undefined,
      },
      contactPreference: order.contact_preference,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      paymentNotes: order.payment_notes ?? undefined,
      paidAt: order.paid_at,
      deliveryLocation: {
        addressLine: order.delivery_address_line,
        reference: order.delivery_reference ?? undefined,
        district: order.delivery_district ?? undefined,
        latitude: order.delivery_latitude ? Number(order.delivery_latitude) : undefined,
        longitude: order.delivery_longitude ? Number(order.delivery_longitude) : undefined,
        googlePlaceId: order.delivery_google_place_id ?? undefined,
      },
      items: items.map((item) => ({
        id: item.id,
        productId: item.product_id ?? undefined,
        variantId: item.variant_id ?? undefined,
        sku: item.sku ?? undefined,
        name: item.product_name_snapshot,
        price: Number(item.unit_price_snapshot),
        imageUrl: item.image_url_snapshot ?? undefined,
        size: item.size_snapshot ?? undefined,
        color: item.color_name_snapshot ?? undefined,
        quantity: item.quantity,
      })),
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discount_total),
      total: Number(order.total),
      coupon: order.coupon_code
        ? {
            code: order.coupon_code,
            name: order.coupon_name ?? order.coupon_code,
            discountPercentage: Number(order.coupon_discount_percentage ?? 0),
            discountAmount: Number(order.coupon_discount_amount ?? 0),
          }
        : undefined,
      status: order.status,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    };
  }
}
