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
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-customer-address.dto';
import { CustomerAddressesService } from './customer-addresses.service';

@ApiTags('Customer Addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customer-addresses')
export class CustomerAddressesController {
  constructor(private readonly service: CustomerAddressesService) {}

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.service.listByUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateCustomerAddressDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateCustomerAddressDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Patch(':id/default')
  setDefault(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.setDefault(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}