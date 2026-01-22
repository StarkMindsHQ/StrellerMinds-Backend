import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

    .addBearerAuth()
    .addTag('Authentication')
    .addTag('Users')
    .addTag('Courses')
    .addTag('Blockchain')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);


