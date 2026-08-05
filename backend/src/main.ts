import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(cookieParser());
  // archivos estáticos desde la carpeta "uploads"
  const uploadsPath = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath, { recursive: true });
  }
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });

  // solicitudes CORS 
  app.enableCors({
    origin: 'http://localhost:5173', // puerto de Vite/React
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API de Productos')
    .setDescription('API para gestionar productos, categorías y clasificaciones')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT' 
    )
    .addApiKey(         
      { type: 'apiKey', in: 'header', name: 'x-api-key' },
      'x-api-key'
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    explorer: true, // Habilita el explorador de rutas
    swaggerOptions: {
      persistAuthorization: true, // Mantiene el token JWT en Swagger UI
      filter: true, // Habilita el filtrado de rutas
      showRequestDuration: true, // Muestra la duración de las solicitudes
    },
  });
  
  // Fix BigInt serialization
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  app.useGlobalPipes(new ValidationPipe({
    transform: true, // Transforma los datos entrantes a los tipos definidos en los DTOs
    whitelist: false, // Elimina propiedades no definidas en los DTOs
  }));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap();
