import { Controller, Get, Inject, Module } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

const SERVICE_NAME = Symbol('HEALTH_SERVICE_NAME');

@ApiTags('health')
@Controller('health')
class HealthController {
  constructor(@Inject(SERVICE_NAME) private readonly serviceName: string) {}

  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  check(): { status: 'ok'; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: this.serviceName,
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({})
export class HealthModule {
  static forService(serviceName: string) {
    return {
      module: HealthModule,
      controllers: [HealthController],
      providers: [{ provide: SERVICE_NAME, useValue: serviceName }],
    };
  }
}
