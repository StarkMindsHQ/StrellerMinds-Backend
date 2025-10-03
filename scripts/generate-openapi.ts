import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { promises as fs } from 'fs';
import { AppModule } from '../src/app.module';

function validateOpenApi(document: OpenAPIObject): void {
  const allowedTags = ['Courses', 'Auth']; 
  let errorCount = 0;

  for (const path in document.paths) {
    for (const method in document.paths[path]) {
      const endpoint = document.paths[path][method];

    
      if (!endpoint.summary || endpoint.summary.trim() === '') {
        console.error(`❌ [Validation Error] Missing summary for endpoint: ${method.toUpperCase()} ${path}`);
        errorCount++;
      }

    
      const hasSuccessResponse = Object.keys(endpoint.responses).some(
        (code) => code.startsWith('2'),
      );
      if (!hasSuccessResponse) {
        console.error(`❌ [Validation Error] Missing success response (2xx) for endpoint: ${method.toUpperCase()} ${path}`);
        errorCount++;
      }
    }
  }

  if (errorCount > 0) {
    console.error(`\nFound ${errorCount} OpenAPI documentation error(s). Please fix them before committing.`);
    throw new Error('OpenAPI documentation is incomplete.');
  } else {
    console.log('✅ OpenAPI documentation validation passed.');
  }
}

async function generateOpenApiSpec() {
  const app: INestApplication = await NestFactory.create(AppModule, { logger: false });
  
  const config = new DocumentBuilder()
    .setTitle('My API Documentation')
    .setDescription('The official API documentation for my project.')
    .setVersion('1.0')
    .addBearerAuth() 
    .build();

  const document = SwaggerModule.createDocument(app, config);

  try {
    validateOpenApi(document);

    const outputPath = 'openapi.json';
    await fs.writeFile(outputPath, JSON.stringify(document, null, 2));
    console.log(`✅ OpenAPI specification successfully generated at ${outputPath}`);
  } catch (error) {

    throw error;
  } finally {
    await app.close();
  }
}

generateOpenApiSpec().catch(error => {
  console.error(error.message);
  process.exit(1); 
});