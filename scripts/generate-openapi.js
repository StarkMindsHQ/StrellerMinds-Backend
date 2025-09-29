// Script to export OpenAPI spec for SDK generation
require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');
const { AppModule } = require('../dist/app.module');
const fs = require('fs');

async function generateOpenAPISpec() {
  const app = await NestFactory.create(AppModule);
  const pkg = require('../package.json');
  const config = new DocumentBuilder()
    .setTitle('Mentor Grading API')
    .setDescription('APIs for mentors to grade student assignments and provide feedback. Admin API for course management.')
    .setVersion(pkg.version)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  fs.writeFileSync('openapi.json', JSON.stringify(document, null, 2));
  await app.close();
  console.log(`OpenAPI spec generated at openapi.json (version ${pkg.version})`);
}

generateOpenAPISpec();
