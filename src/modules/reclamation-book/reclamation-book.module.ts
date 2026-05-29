import { Module } from '@nestjs/common';
import { ReclamationBookController } from './reclamation-book.controller';
import { ReclamationBookService } from './reclamation-book.service';

@Module({
  controllers: [ReclamationBookController],
  providers: [ReclamationBookService],
})
export class ReclamationBookModule {}
