import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
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

    const subtotal = toNumber(dto.subtotal);
    const discountTotal = toNumber(dto.discountTotal);
    const total = toNumber(dto.total);

    if (total < 0 || subtotal < 0 || discountTotal < 0) {
      throw new BadRequestException('Los importes del pedido no son válidos.');
    }

    const orderCode = createRopOrderCode();
    const now = new Date();

    const order = await this.databaseService.db
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
        coupon_discount_amount: dto.coupon ? toMoney(dto.coupon.discountAmount) : null,
        status: DEFAULT_ORDER_STATUS,
        created_at: now,
        updated_at: now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await this.databaseService.db
      .insertInto('rop_order_items')
      .values(
        dto.items.map((item) => ({
          order_id: order.id,
          product_id: item.productId ?? null,
          variant_id: item.variantId ?? null,
          sku: item.sku ?? null,
          product_name_snapshot: item.name,
          image_url_snapshot: item.imageUrl ?? null,
          size_snapshot: item.size ?? null,
          color_name_snapshot: item.color ?? null,
          quantity: Math.max(1, Math.trunc(Number(item.quantity) || 1)),
          unit_price_snapshot: toMoney(item.price),
          subtotal: toMoney(toNumber(item.price) * Math.max(1, Math.trunc(Number(item.quantity) || 1))),
        })),
      )
      .execute();

    await this.databaseService.db
      .insertInto('rop_order_status_history')
      .values({
        order_id: order.id,
        status: DEFAULT_ORDER_STATUS,
        payment_status: DEFAULT_PAYMENT_STATUS,
        changed_by: customerId,
        comment: 'Pedido creado por el cliente.',
      })
      .execute();

    return this.getOrderById(order.id);
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
      .select(['id', 'payment_status'])
      .where('id', '=', orderId)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('Pedido de ropa no encontrado.');
    }

    await this.databaseService.db
      .updateTable('rop_orders')
      .set({ status: dto.status, updated_at: new Date() })
      .where('id', '=', orderId)
      .execute();

    await this.databaseService.db
      .insertInto('rop_order_status_history')
      .values({
        order_id: orderId,
        status: dto.status,
        payment_status: existing.payment_status,
        changed_by: changedBy,
        comment: dto.comment ?? null,
      })
      .execute();

    return this.getOrderById(orderId);
  }

  async updatePaymentStatus(orderId: string, dto: UpdateRopPaymentStatusDto, changedBy: string) {
    const existing = await this.databaseService.db
      .selectFrom('rop_orders')
      .select(['id', 'status'])
      .where('id', '=', orderId)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('Pedido de ropa no encontrado.');
    }

    const nextStatus = dto.paymentStatus === 'CONFIRMED'
      ? 'PAYMENT_CONFIRMED'
      : dto.paymentStatus === 'REJECTED'
        ? 'PAYMENT_PENDING'
        : existing.status;

    await this.databaseService.db
      .updateTable('rop_orders')
      .set({
        payment_status: dto.paymentStatus,
        paid_at: dto.paymentStatus === 'CONFIRMED' ? new Date() : null,
        status: nextStatus,
        updated_at: new Date(),
      })
      .where('id', '=', orderId)
      .execute();

    await this.databaseService.db
      .insertInto('rop_order_status_history')
      .values({
        order_id: orderId,
        status: nextStatus,
        payment_status: dto.paymentStatus,
        changed_by: changedBy,
        comment: dto.comment ?? null,
      })
      .execute();

    return this.getOrderById(orderId);
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
