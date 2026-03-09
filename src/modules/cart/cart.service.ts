import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/kysely/database.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getOrCreateSessionCart(sessionId: string) {
    let cart = await this.databaseService.db
      .selectFrom('carts')
      .selectAll()
      .where('session_id', '=', sessionId)
      .where('status', '=', 'ACTIVE')
      .executeTakeFirst();

    if (!cart) {
      cart = await this.databaseService.db
        .insertInto('carts')
        .values({
          session_id: sessionId,
          user_id: null,
          status: 'ACTIVE',
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    const items = await this.databaseService.db
      .selectFrom('cart_items')
      .selectAll()
      .where('cart_id', '=', cart.id)
      .execute();

    return {
      message: 'Carrito de sesión obtenido',
      data: {
        cart,
        items,
      },
    };
  }

  async getOrCreateUserCart(userId: string) {
    let cart = await this.databaseService.db
      .selectFrom('carts')
      .selectAll()
      .where('user_id', '=', userId)
      .where('status', '=', 'ACTIVE')
      .executeTakeFirst();

    if (!cart) {
      cart = await this.databaseService.db
        .insertInto('carts')
        .values({
          user_id: userId,
          session_id: null,
          status: 'ACTIVE',
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    const items = await this.databaseService.db
      .selectFrom('cart_items')
      .selectAll()
      .where('cart_id', '=', cart.id)
      .execute();

    return {
      message: 'Carrito del usuario obtenido',
      data: {
        cart,
        items,
      },
    };
  }

  async addItem(dto: AddCartItemDto) {
    const cart = await this.databaseService.db
      .selectFrom('carts')
      .selectAll()
      .where('id', '=', dto.cartId)
      .where('status', '=', 'ACTIVE')
      .executeTakeFirst();

    if (!cart) {
      throw new NotFoundException('Carrito no encontrado');
    }

    const existingItem = await this.databaseService.db
      .selectFrom('cart_items')
      .selectAll()
      .where('cart_id', '=', dto.cartId)
      .where('product_id', '=', dto.productId)
      .where('branch_id', '=', dto.branchId)
      .executeTakeFirst();

    if (existingItem) {
      const updated = await this.databaseService.db
        .updateTable('cart_items')
        .set({
          quantity: existingItem.quantity + dto.quantity,
        })
        .where('id', '=', existingItem.id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return {
        message: 'Cantidad del item actualizada',
        data: updated,
      };
    }

    const created = await this.databaseService.db
      .insertInto('cart_items')
      .values({
        cart_id: dto.cartId,
        product_id: dto.productId,
        branch_id: dto.branchId,
        quantity: dto.quantity,
        promotion_id: dto.promotionId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      message: 'Item agregado al carrito',
      data: created,
    };
  }

  async updateItem(itemId: string, dto: UpdateCartItemDto) {
    const item = await this.databaseService.db
      .selectFrom('cart_items')
      .selectAll()
      .where('id', '=', itemId)
      .executeTakeFirst();

    if (!item) {
      throw new NotFoundException('Item no encontrado');
    }

    const updated = await this.databaseService.db
      .updateTable('cart_items')
      .set({
        quantity: dto.quantity,
      })
      .where('id', '=', itemId)
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      message: 'Item actualizado',
      data: updated,
    };
  }

  async removeItem(itemId: string) {
    const item = await this.databaseService.db
      .selectFrom('cart_items')
      .selectAll()
      .where('id', '=', itemId)
      .executeTakeFirst();

    if (!item) {
      throw new NotFoundException('Item no encontrado');
    }

    await this.databaseService.db
      .deleteFrom('cart_items')
      .where('id', '=', itemId)
      .executeTakeFirst();

    return {
      message: 'Item eliminado del carrito',
      data: null,
    };
  }

  async mergeSessionCartToUser(sessionId: string, userId: string) {
    const sessionCart = await this.databaseService.db
      .selectFrom('carts')
      .selectAll()
      .where('session_id', '=', sessionId)
      .where('status', '=', 'ACTIVE')
      .executeTakeFirst();

    if (!sessionCart) {
      return {
        message: 'No existe carrito de sesión para fusionar',
        data: null,
      };
    }

    let userCart = await this.databaseService.db
      .selectFrom('carts')
      .selectAll()
      .where('user_id', '=', userId)
      .where('status', '=', 'ACTIVE')
      .executeTakeFirst();

    if (!userCart) {
      userCart = await this.databaseService.db
        .insertInto('carts')
        .values({
          user_id: userId,
          session_id: null,
          status: 'ACTIVE',
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    const sessionItems = await this.databaseService.db
      .selectFrom('cart_items')
      .selectAll()
      .where('cart_id', '=', sessionCart.id)
      .execute();

    for (const sessionItem of sessionItems) {
      const existingUserItem = await this.databaseService.db
        .selectFrom('cart_items')
        .selectAll()
        .where('cart_id', '=', userCart.id)
        .where('product_id', '=', sessionItem.product_id)
        .where('branch_id', '=', sessionItem.branch_id)
        .executeTakeFirst();

      if (existingUserItem) {
        await this.databaseService.db
          .updateTable('cart_items')
          .set({
            quantity: existingUserItem.quantity + sessionItem.quantity,
          })
          .where('id', '=', existingUserItem.id)
          .executeTakeFirst();
      } else {
        await this.databaseService.db
          .insertInto('cart_items')
          .values({
            cart_id: userCart.id,
            product_id: sessionItem.product_id,
            branch_id: sessionItem.branch_id,
            quantity: sessionItem.quantity,
            promotion_id: sessionItem.promotion_id,
          })
          .executeTakeFirst();
      }
    }

    await this.databaseService.db
      .updateTable('carts')
      .set({
        status: 'CONVERTED',
      })
      .where('id', '=', sessionCart.id)
      .executeTakeFirst();

    return {
      message: 'Carrito fusionado correctamente',
      data: {
        sessionCartId: sessionCart.id,
        userCartId: userCart.id,
      },
    };
  }
}