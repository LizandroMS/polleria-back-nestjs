import { PartialType } from '@nestjs/swagger';
import { CreateRopCouponDto } from './create-rop-coupon.dto';

export class UpdateRopCouponDto extends PartialType(CreateRopCouponDto) {}
