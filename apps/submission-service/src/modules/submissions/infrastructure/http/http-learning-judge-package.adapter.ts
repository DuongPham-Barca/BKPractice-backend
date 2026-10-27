import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import {
  JudgePackageUnavailableError,
  ProblemNotSubmittableError,
} from '../../domain/ports/learning-judge-package.port';
import type {
  JudgePackage,
  LearningJudgePackagePort,
} from '../../domain/ports/learning-judge-package.port';

@Injectable()
export class HttpLearningJudgePackageAdapter implements LearningJudgePackagePort {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  // Learning's response body is never forwarded, so hidden judge data cannot leak through errors.
  async getPackage(problemId: string, language: string): Promise<JudgePackage> {
    const baseUrl = this.config.getOrThrow<string>('LEARNING_INTERNAL_URL');
    try {
      const response = await firstValueFrom(
        this.http.get<JudgePackage>(
          `${baseUrl}/internal/problems/${encodeURIComponent(problemId)}/judge-package/${encodeURIComponent(language)}`,
          {
            headers: {
              'x-internal-service-secret':
                this.config.getOrThrow<string>('INTERNAL_SERVICE_SECRET'),
            },
            timeout: 5_000,
          },
        ),
      );
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 404) {
        throw new ProblemNotSubmittableError();
      }
      throw new JudgePackageUnavailableError();
    }
  }
}
