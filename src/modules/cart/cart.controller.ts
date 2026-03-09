import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CreateSessionCartDto } from './dto/create-session-cart.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartService } from './cart.service';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('session')
  createOrGetSessionCart(@Body() dto: CreateSessionCartDto) {
    return this.cartService.getOrCreateSessionCart(dto.sessionId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyCart(@CurrentUser() user: { id: string }) {
    return this.cartService.getOrCreateUserCart(user.id);
  }

  @Post('items')
  addItem(@Body() dto: AddCartItemDto) {
    return this.cartService.addItem(dto);
  }

  @Patch('items/:itemId')
  updateItem(@Param('itemId') itemId: string, @Body() dto: UpdateCartItemDto) {
    return this.cartService.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  removeItem(@Param('itemId') itemId: string) {
    return this.cartService.removeItem(itemId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('merge')
  mergeCart(@Body() dto: MergeCartDto, @CurrentUser() user: { id: string }) {
    return this.cartService.mergeSessionCartToUser(dto.sessionId, user.id);
  }
}