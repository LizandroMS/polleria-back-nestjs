import { PartialType } from '@nestjs/swagger';
import { CreateDocumentSeriesDto } from './create-document-series.dto';

export class UpdateDocumentSeriesDto extends PartialType(CreateDocumentSeriesDto) {}
