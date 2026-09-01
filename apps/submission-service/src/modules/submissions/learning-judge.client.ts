import type { JudgeTestCase, ProblemType, SupportedLanguage } from '@app/contracts';
import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface JudgePackage {
  problemId: string;
  problemType: ProblemType;
  timeLimitMs: number;
  memoryLimitMb: number;
  hiddenHarness?: string;
  testCases: JudgeTestCase[];
}

@Injectable()
export class LearningJudgeClient {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async getPackage(problemId: string, language: SupportedLanguage): Promise<JudgePackage> {
    try {
      const response = await firstValueFrom(
        this.http.get<JudgePackage>(
          `${this.config.getOrThrow<string>('LEARNING_INTERNAL_URL')}/internal/problems/${problemId}/judge-package/${language}`,
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
    } catch {
      throw new ServiceUnavailableException('Unable to prepare the problem judge package');
    }
  }
}
