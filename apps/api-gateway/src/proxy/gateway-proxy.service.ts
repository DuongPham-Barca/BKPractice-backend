import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AxiosRequestConfig } from 'axios';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

interface RouteTarget {
  prefixes: string[];
  baseUrl: string;
}

const responseHeaders = ['content-type', 'content-length', 'etag', 'last-modified'];

@Injectable()
export class GatewayProxyService {
  private readonly targets: RouteTarget[];

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.targets = [
      {
        prefixes: ['/api/auth', '/api/users', '/api/profile', '/api/roles'],
        baseUrl: config.getOrThrow<string>('IDENTITY_SERVICE_URL'),
      },
      {
        prefixes: ['/api/problems', '/api/courses', '/api/assignments', '/api/classes'],
        baseUrl: config.getOrThrow<string>('LEARNING_SERVICE_URL'),
      },
      {
        prefixes: ['/api/submissions', '/api/run'],
        baseUrl: config.getOrThrow<string>('SUBMISSION_SERVICE_URL'),
      },
      {
        prefixes: ['/api/community'],
        baseUrl: config.getOrThrow<string>('COMMUNITY_SERVICE_URL'),
      },
    ];
  }

  async forward(request: Request, response: Response): Promise<void> {
    const target = this.targets.find((candidate) =>
      candidate.prefixes.some((prefix) => request.path.startsWith(prefix)),
    );
    if (!target) throw new BadGatewayException('No upstream route is configured');

    const headers = { ...request.headers };
    delete headers.host;
    delete headers['content-length'];

    const options: AxiosRequestConfig = {
      method: request.method,
      url: `${target.baseUrl}${request.originalUrl}`,
      headers,
      data: ['GET', 'HEAD'].includes(request.method) ? undefined : (request.body as unknown),
      maxRedirects: 0,
      timeout: 15_000,
      validateStatus: () => true,
    };

    try {
      const upstream = await firstValueFrom(this.http.request<unknown>(options));
      responseHeaders.forEach((header) => {
        const value = upstream.headers[header] as unknown;
        if (typeof value === 'string' || typeof value === 'number') {
          response.setHeader(header, String(value));
        }
      });
      response.status(upstream.status).send(upstream.data);
    } catch {
      throw new BadGatewayException('Upstream service is unavailable');
    }
  }
}
