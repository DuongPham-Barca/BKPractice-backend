import { Logger, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

interface BootstrapOptions {
  serviceName: string;
  port: number;
  swaggerTitle: string;
  globalPrefix?: string;
}

export async function configureHttpApp(
  app: INestApplication,
  options: BootstrapOptions,
): Promise<void> {
  app.use(helmet());
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (options.globalPrefix) {
    app.setGlobalPrefix(options.globalPrefix);
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle(options.swaggerTitle)
    .setDescription(`${options.serviceName} API`)
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(options.port, '0.0.0.0');
  Logger.log(`Listening on port ${options.port}`, options.serviceName);
}
