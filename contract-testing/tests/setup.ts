import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { SwaggerModule } from '@nestjs/swagger';
import { ContractTestHelper } from '../src/contract-test-helper';

let app: any;
let contractHelper: ContractTestHelper;

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  
  // Set up Swagger the same way as main.ts
  const config = new (require('@nestjs/swagger').DocumentBuilder)()
    .setTitle('StrellerMinds Backend API')
    .setVersion('1.0.0')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  await app.init();
  
  contractHelper = new ContractTestHelper({
    app,
    openApiSpec: document,
    baseUrl: 'http://localhost:3000'
  });
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
});

export { app, contractHelper };
