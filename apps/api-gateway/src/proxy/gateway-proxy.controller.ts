import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { GatewayProxyService } from './gateway-proxy.service';

@ApiExcludeController()
@Controller('api')
export class GatewayProxyController {
  constructor(private readonly proxy: GatewayProxyService) {}

  @All('{*path}')
  async forward(@Req() request: Request, @Res() response: Response): Promise<void> {
    await this.proxy.forward(request, response);
  }
}
