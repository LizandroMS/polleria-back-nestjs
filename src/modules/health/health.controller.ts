import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../../database/kysely/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get()
  async check() {
    await this.databaseService.db.executeQuery(
      this.databaseService.db.selectFrom('users').select((eb) => eb.val(1).as('ok')).limit(1).compile(),
    );

    return {
      message: 'API operativa',
      data: {
        status: 'ok',
      },
    };
  }
}