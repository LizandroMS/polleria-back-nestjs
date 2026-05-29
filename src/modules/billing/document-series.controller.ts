import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../common/constants/roles.constant';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateDocumentSeriesDto } from './dto/create-document-series.dto';
import { UpdateDocumentSeriesDto } from './dto/update-document-series.dto';
import { DocumentSeriesService } from './document-series.service';

@ApiTags('Billing - Document Series')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('billing/series')
export class DocumentSeriesController {
  constructor(private readonly documentSeriesService: DocumentSeriesService) {}

  @Get()
  listAll() {
    return this.documentSeriesService.listAll();
  }

  @Get('branch/:branchId')
  getByBranch(@Param('branchId') branchId: string) {
    return this.documentSeriesService.getByBranch(branchId);
  }

  @Post()
  create(@Body() dto: CreateDocumentSeriesDto) {
    return this.documentSeriesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentSeriesDto) {
    return this.documentSeriesService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.documentSeriesService.toggleActive(id);
  }
}
