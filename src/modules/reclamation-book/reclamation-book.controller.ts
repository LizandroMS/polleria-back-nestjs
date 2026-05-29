import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { ReclamationBookService } from './reclamation-book.service';

@ApiTags('Reclamation Book')
@Controller('reclamation-book')
export class ReclamationBookController {
  constructor(private readonly reclamationBookService: ReclamationBookService) {}

  @Post()
  create(@Body() dto: CreateReclamationDto, @Req() request: any) {
    return this.reclamationBookService.create(dto, {
      ipAddress: request.ip,
      userAgent: request.headers?.['user-agent'],
    });
  }
}
