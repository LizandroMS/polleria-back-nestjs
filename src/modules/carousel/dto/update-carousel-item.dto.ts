import { PartialType } from '@nestjs/swagger';
import { CreateCarouselItemDto } from './create-carousel-item.dto';

export class UpdateCarouselItemDto extends PartialType(CreateCarouselItemDto) {}