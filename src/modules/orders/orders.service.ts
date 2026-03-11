import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '../../common/constants/order-status.constant';
import { UserRole } from '../../common/constants/roles.constant';
import { generateOrderNumber } from '../../common/utils/order-number.util';
import { DatabaseService } from '../../database/kysely/database.service';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly billingService: BillingService
  ) { }

  async create(userId: string | null, dto: CreateOrderDto) {
    if (!dto.items.length) {
      throw new BadRequestException('La orden debe tener al menos un item');
    }

    if (dto.items.some((item) => item.branchId !== dto.branchId)) {
      throw new BadRequestException('Todos los items deben pertenecer a la misma sucursal');
    }

    if (dto.items.some((item) => item.branchId === 'pending-branch')) {
      throw new BadRequestException('Debes seleccionar una sucursal válida antes de confirmar');
    }

    if (dto.orderType === 'DELIVERY' && !dto.customer.addressText && !dto.addressId) {
      throw new BadRequestException('Para delivery debes indicar una dirección');
    }

    if (dto.invoiceType === 'BOLETA_SIMPLE' && !dto.customer.documentNumber) {
      throw new BadRequestException('Para boleta simple debes indicar número de documento');
    }

    if (dto.invoiceType === 'FACTURA') {
      if (!dto.customer.documentNumber) {
        throw new BadRequestException('Para factura debes indicar RUC');
      }

      if (!dto.customer.businessName) {
        throw new BadRequestException('Para factura debes indicar razón social');
      }

      if (!dto.customer.addressText) {
        throw new BadRequestException('Para factura debes indicar dirección fiscal');
      }
    }

    const branch = await this.databaseService.db
      .selectFrom('branches')
      .selectAll()
      .where('id', '=', dto.branchId)
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (!branch) {
      throw new BadRequestException('La sucursal no existe o no está activa');
    }

    if (dto.addressId && userId) {
      const address = await this.databaseService.db
        .selectFrom('customer_addresses')
        .selectAll()
        .where('id', '=', dto.addressId)
        .where('user_id', '=', userId)
        .executeTakeFirst();

      if (!address) {
        throw new BadRequestException('La dirección no existe o no pertenece al usuario');
      }
    }

    const resolvedItems: Array<{
      productId: string;
      promotionId: string | null;
      quantity: number;
      notes: string | null;
      name: string;
      description: string | null;
      unitPrice: number;
      discountAmount: number;
      subtotal: number;
    }> = [];

    for (const item of dto.items) {
      const product = await this.databaseService.db
        .selectFrom('products')
        .selectAll()
        .where('id', '=', item.productId)
        .where('is_active', '=', true)
        .executeTakeFirst();

      if (!product) {
        throw new BadRequestException(`Producto inválido: ${item.productId}`);
      }

      const branchPrice = await this.databaseService.db
        .selectFrom('product_branch_prices')
        .selectAll()
        .where('product_id', '=', item.productId)
        .where('branch_id', '=', dto.branchId)
        .executeTakeFirst();

      if (branchPrice && !branchPrice.is_available) {
        throw new BadRequestException(`El producto ${product.name} no está disponible en la sucursal`);
      }

      const unitPrice = Number(branchPrice?.price ?? product.base_price);
      let discountAmount = 0;

      if (item.promotionId) {
        const promotion = await this.databaseService.db
          .selectFrom('promotions as p')
          .innerJoin('promotion_products as pp', 'pp.promotion_id', 'p.id')
          .select([
            'p.id',
            'p.discount_type',
            'p.discount_value',
            'p.starts_at',
            'p.ends_at',
            'p.is_active',
          ])
          .where('p.id', '=', item.promotionId)
          .where('pp.product_id', '=', item.productId)
          .executeTakeFirst();

        if (promotion && promotion.is_active) {
          const now = new Date();
          const startsOk = !promotion.starts_at || new Date(promotion.starts_at) <= now;
          const endsOk = !promotion.ends_at || new Date(promotion.ends_at) >= now;

          if (startsOk && endsOk) {
            const value = Number(promotion.discount_value);

            if (promotion.discount_type === 'PERCENTAGE') {
              discountAmount = (unitPrice * value) / 100;
            } else if (promotion.discount_type === 'FIXED') {
              discountAmount = value;
            } else if (promotion.discount_type === 'SPECIAL_PRICE') {
              discountAmount = Math.max(0, unitPrice - value);
            }

            if (discountAmount > unitPrice) {
              discountAmount = unitPrice;
            }
          }
        }
      }

      const subtotal = (unitPrice - discountAmount) * item.quantity;

      resolvedItems.push({
        productId: item.productId,
        promotionId: item.promotionId ?? null,
        quantity: item.quantity,
        notes: item.notes ?? null,
        name: product.name,
        description: product.description ?? null,
        unitPrice,
        discountAmount,
        subtotal,
      });
    }

    const subtotal = resolvedItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
    const discountTotal = resolvedItems.reduce(
      (acc, item) => acc + item.discountAmount * item.quantity,
      0,
    );
    const deliveryFee = Number(dto.deliveryFee ?? 0);
    const total = subtotal - discountTotal + deliveryFee;

    const orderNumber = generateOrderNumber();

    const createdOrder = await this.databaseService.db
      .insertInto('orders')
      .values({
        order_number: orderNumber,
        customer_id: userId,
        guest_email: userId ? null : dto.customer.email ?? null,
        guest_phone: userId ? null : dto.customer.phone,
        branch_id: dto.branchId,
        address_id: dto.addressId ?? null,
        order_type: dto.orderType,
        status: OrderStatus.PENDING,
        payment_method: dto.paymentMethod,
        payment_status: 'PENDING',
        invoice_type: dto.invoiceType,
        invoice_emission_status: dto.invoiceType === 'NONE' ? 'NOT_REQUIRED' : 'PENDING',
        customer_name_snapshot: `${dto.customer.firstName}${dto.customer.lastName ? ` ${dto.customer.lastName}` : ''}`,
        customer_phone_snapshot: dto.customer.phone,
        customer_email_snapshot: dto.customer.email ?? null,
        customer_document_type_snapshot: dto.customer.documentType ?? null,
        customer_document_number_snapshot: dto.customer.documentNumber ?? null,
        customer_address_snapshot: dto.customer.addressText ?? null,
        customer_business_name_snapshot: dto.customer.businessName ?? null,
        subtotal: subtotal.toFixed(2),
        discount_total: discountTotal.toFixed(2),
        delivery_fee: deliveryFee.toFixed(2),
        total: total.toFixed(2),
        notes: dto.notes ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    for (const item of resolvedItems) {
      await this.databaseService.db
        .insertInto('order_items')
        .values({
          order_id: createdOrder.id,
          product_id: item.productId,
          promotion_id: item.promotionId,
          product_name_snapshot: item.name,
          product_description_snapshot: item.description,
          unit_of_measure: 'NIU',
          quantity: item.quantity,
          unit_price_snapshot: item.unitPrice.toFixed(2),
          igv_percentage: '18.00',
          discount_amount: item.discountAmount.toFixed(2),
          subtotal: item.subtotal.toFixed(2),
          notes: item.notes,
        })
        .execute();
    }

    await this.databaseService.db
      .insertInto('order_status_history')
      .values({
        order_id: createdOrder.id,
        status: OrderStatus.PENDING,
        changed_by: userId,
        comment: 'Pedido creado',
      })
      .execute();

    return {
      message: 'Pedido creado correctamente',
      data: {
        id: createdOrder.id,
        orderNumber: createdOrder.order_number,
        status: createdOrder.status,
        total: createdOrder.total,
      },
    };
  }

  async myOrders(userId: string, query?: ListOrdersDto) {
    let q = this.databaseService.db
      .selectFrom('orders')
      .selectAll()
      .where('customer_id', '=', userId);

    if (query?.status) {
      q = q.where('status', '=', query.status as any);
    }

    const orders = await q.orderBy('created_at desc').execute();

    return {
      message: 'Pedidos del usuario listados',
      data: orders,
    };
  }

  async getOrderById(orderId: string, user: { id: string; role: string }) {
    const order = await this.databaseService.db
      .selectFrom('orders')
      .selectAll()
      .where('id', '=', orderId)
      .executeTakeFirst();

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (user.role === UserRole.CUSTOMER && order.customer_id !== user.id) {
      throw new ForbiddenException('No tienes permiso para ver este pedido');
    }

    if (user.role === UserRole.WORKER) {
      const workerBranch = await this.databaseService.db
        .selectFrom('worker_branches')
        .selectAll()
        .where('user_id', '=', user.id)
        .where('branch_id', '=', order.branch_id)
        .executeTakeFirst();

      if (!workerBranch) {
        throw new ForbiddenException('No tienes acceso a esta sucursal');
      }
    }

    const items = await this.databaseService.db
      .selectFrom('order_items')
      .selectAll()
      .where('order_id', '=', orderId)
      .execute();

    const history = await this.databaseService.db
      .selectFrom('order_status_history')
      .selectAll()
      .where('order_id', '=', orderId)
      .orderBy('created_at asc')
      .execute();

    return {
      message: 'Detalle del pedido obtenido',
      data: {
        order,
        items,
        history,
      },
    };
  }

  async workerOrders(user: { id: string; role: string }, query?: ListOrdersDto) {
    if (user.role !== UserRole.WORKER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso');
    }

    let q = this.databaseService.db
      .selectFrom('orders as o')
      .innerJoin('branches as b', 'b.id', 'o.branch_id')
      .select([
        'o.id',
        'o.order_number',
        'o.customer_name_snapshot',
        'o.customer_phone_snapshot',
        'o.total',
        'o.status',
        'o.order_type',
        'o.payment_method',
        'o.invoice_type',
        'o.created_at',
        'o.branch_id',
        'b.name as branch_name',
      ]);

    if (user.role === UserRole.WORKER) {
      q = q
        .innerJoin('worker_branches as wb', 'wb.branch_id', 'o.branch_id')
        .where('wb.user_id', '=', user.id);
    }

    if (query?.status) {
      q = q.where('o.status', '=', query.status as any);
    }

    if (query?.branchId && user.role === UserRole.ADMIN) {
      q = q.where('o.branch_id', '=', query.branchId);
    }

    const orders = await q.orderBy('o.created_at desc').execute();

    return {
      message: 'Pedidos operativos listados',
      data: orders,
    };
  }

  async changeStatus(orderId: string, dto: ChangeOrderStatusDto, actor: { id: string; role: string }) {
    const order = await this.databaseService.db
      .selectFrom('orders')
      .selectAll()
      .where('id', '=', orderId)
      .executeTakeFirst();

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (actor.role === UserRole.WORKER) {
      const workerBranch = await this.databaseService.db
        .selectFrom('worker_branches')
        .selectAll()
        .where('user_id', '=', actor.id)
        .where('branch_id', '=', order.branch_id)
        .executeTakeFirst();

      if (!workerBranch) {
        throw new ForbiddenException('No tienes acceso a esta sucursal');
      }
    }

    const validTransitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY', 'CANCELLED'],
      READY: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
      OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!validTransitions[order.status]?.includes(dto.status)) {
      throw new BadRequestException(`No se puede cambiar de ${order.status} a ${dto.status}`);
    }

    const updated = await this.databaseService.db
      .updateTable('orders')
      .set({
        status: dto.status,
        delivered_at: dto.status === OrderStatus.DELIVERED ? new Date() : order.delivered_at,
      })
      .where('id', '=', orderId)
      .returningAll()
      .executeTakeFirstOrThrow();

    await this.databaseService.db
      .insertInto('order_status_history')
      .values({
        order_id: orderId,
        status: dto.status,
        changed_by: actor.id,
        comment: dto.comment ?? null,
      })
      .execute();

    if (dto.status === OrderStatus.DELIVERED) {
      await this.billingService.emitIfRequiredOnDelivered(orderId);
    }

    return {
      message: 'Estado del pedido actualizado correctamente',
      data: updated,
    };
  }
}