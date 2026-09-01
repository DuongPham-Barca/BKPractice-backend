import { Module } from '@nestjs/common';

import { JudgeConsumer } from './judge.consumer';
import { JudgeEngine } from './judge.engine';
import { CRunner } from './runners/c.runner';
import { CppRunner } from './runners/cpp.runner';
import { JavaRunner } from './runners/java.runner';
import { PythonRunner } from './runners/python.runner';
import { RunnerRegistry } from './runners/runner.registry';
import { DockerSandboxExecutor } from './sandbox/docker-sandbox.executor';

@Module({
  providers: [
    CRunner,
    CppRunner,
    JavaRunner,
    PythonRunner,
    RunnerRegistry,
    DockerSandboxExecutor,
    JudgeEngine,
    JudgeConsumer,
  ],
})
export class JudgeModule {}
