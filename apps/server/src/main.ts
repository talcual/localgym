import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const useTurso =
    Boolean(process.env.TURSO_DATABASE_URL) &&
    Boolean(process.env.TURSO_AUTH_TOKEN);

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(
    `localgym API corriendo en http://localhost:${port}/api (DB: ${
      useTurso ? 'Turso/libSQL' : 'SQLite local'
    })`,
  );
}
bootstrap();
