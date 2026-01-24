import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
describe('API Versioning (e2e)', () => {
    let app;
    beforeEach(async () => {
        const moduleFixture = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
    });
    afterAll(async () => {
        await app.close();
    });
    describe('/version/info (GET)', () => {
        it('should return version information', () => {
            return request(app.getHttpServer())
                .get('/version/info')
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('current');
                expect(res.body).toHaveProperty('supported');
                expect(res.body).toHaveProperty('deprecated');
                expect(Array.isArray(res.body.supported)).toBe(true);
                expect(Array.isArray(res.body.deprecated)).toBe(true);
            });
        });
    });
    describe('/version/analytics (GET)', () => {
        it('should return version usage analytics', () => {
            return request(app.getHttpServer())
                .get('/version/analytics')
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('versionUsage');
                expect(res.body).toHaveProperty('deprecatedEndpoints');
                expect(Array.isArray(res.body.versionUsage)).toBe(true);
                expect(Array.isArray(res.body.deprecatedEndpoints)).toBe(true);
            });
        });
        it('should accept days parameter', () => {
            return request(app.getHttpServer())
                .get('/version/analytics?days=7')
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('versionUsage');
            });
        });
    });
    describe('/version/migration (GET)', () => {
        it('should return migration recommendations', () => {
            return request(app.getHttpServer())
                .get('/version/migration')
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('deprecatedEndpoints');
                expect(res.body).toHaveProperty('migrationGuides');
                expect(Array.isArray(res.body.deprecatedEndpoints)).toBe(true);
                expect(Array.isArray(res.body.migrationGuides)).toBe(true);
            });
        });
    });
    describe('/version/compatibility/:oldVersion/:newVersion (GET)', () => {
        it('should check backward compatibility', () => {
            return request(app.getHttpServer())
                .get('/version/compatibility/v1/v2')
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('compatible');
                expect(res.body).toHaveProperty('breakingChanges');
                expect(res.body).toHaveProperty('recommendations');
                expect(typeof res.body.compatible).toBe('boolean');
                expect(Array.isArray(res.body.breakingChanges)).toBe(true);
                expect(Array.isArray(res.body.recommendations)).toBe(true);
            });
        });
    });
    describe('/version/status (GET)', () => {
        it('should return API version status', () => {
            return request(app.getHttpServer())
                .get('/version/status')
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('currentVersion');
                expect(res.body).toHaveProperty('supportedVersions');
                expect(res.body).toHaveProperty('deprecatedVersions');
                expect(Array.isArray(res.body.supportedVersions)).toBe(true);
                expect(Array.isArray(res.body.deprecatedVersions)).toBe(true);
            });
        });
    });
    describe('/documentation/versions (GET)', () => {
        it('should return available documentation versions', () => {
            return request(app.getHttpServer())
                .get('/documentation/versions')
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('versions');
                expect(res.body).toHaveProperty('currentVersion');
                expect(res.body).toHaveProperty('deprecatedVersions');
                expect(Array.isArray(res.body.versions)).toBe(true);
                expect(Array.isArray(res.body.deprecatedVersions)).toBe(true);
            });
        });
    });
    describe('/documentation/:version (GET)', () => {
        it('should return documentation for v1', () => {
            return request(app.getHttpServer())
                .get('/documentation/v1')
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('version', 'v1');
                expect(res.body).toHaveProperty('title');
                expect(res.body).toHaveProperty('description');
                expect(res.body).toHaveProperty('baseUrl');
                expect(res.body).toHaveProperty('endpoints');
                expect(Array.isArray(res.body.endpoints)).toBe(true);
            });
        });
        it('should return documentation for v2', () => {
            return request(app.getHttpServer())
                .get('/documentation/v2')
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('version', 'v2');
                expect(res.body).toHaveProperty('title');
                expect(res.body).toHaveProperty('description');
                expect(res.body).toHaveProperty('baseUrl');
                expect(res.body).toHaveProperty('endpoints');
                expect(Array.isArray(res.body.endpoints)).toBe(true);
            });
        });
        it('should return 404 for non-existent version', () => {
            return request(app.getHttpServer())
                .get('/documentation/v3')
                .expect(404);
        });
    });
    describe('/documentation/:version/openapi (GET)', () => {
        it('should return OpenAPI specification for v1', () => {
            return request(app.getHttpServer())
                .get('/documentation/v1/openapi')
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('openapi', '3.0.0');
                expect(res.body).toHaveProperty('info');
                expect(res.body).toHaveProperty('servers');
                expect(res.body).toHaveProperty('paths');
                expect(res.body.info).toHaveProperty('title');
                expect(res.body.info).toHaveProperty('version', 'v1');
            });
        });
        it('should return OpenAPI specification for v2', () => {
            return request(app.getHttpServer())
                .get('/documentation/v2/openapi')
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('openapi', '3.0.0');
                expect(res.body).toHaveProperty('info');
                expect(res.body).toHaveProperty('servers');
                expect(res.body).toHaveProperty('paths');
                expect(res.body.info).toHaveProperty('title');
                expect(res.body.info).toHaveProperty('version', 'v2');
            });
        });
    });
    describe('/documentation/:version/changelog (GET)', () => {
        it('should return changelog for v1', () => {
            return request(app.getHttpServer())
                .get('/documentation/v1/changelog')
                .expect(200)
                .expect((res) => {
                expect(Array.isArray(res.body)).toBe(true);
                if (res.body.length > 0) {
                    expect(res.body[0]).toHaveProperty('version');
                    expect(res.body[0]).toHaveProperty('date');
                    expect(res.body[0]).toHaveProperty('type');
                    expect(res.body[0]).toHaveProperty('description');
                }
            });
        });
        it('should return changelog for v2', () => {
            return request(app.getHttpServer())
                .get('/documentation/v2/changelog')
                .expect(200)
                .expect((res) => {
                expect(Array.isArray(res.body)).toBe(true);
                if (res.body.length > 0) {
                    expect(res.body[0]).toHaveProperty('version');
                    expect(res.body[0]).toHaveProperty('date');
                    expect(res.body[0]).toHaveProperty('type');
                    expect(res.body[0]).toHaveProperty('description');
                }
            });
        });
    });
    describe('/documentation/migration/:fromVersion/:toVersion (GET)', () => {
        it('should return migration guide from v1 to v2', () => {
            return request(app.getHttpServer())
                .get('/documentation/migration/v1/v2')
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('fromVersion', 'v1');
                expect(res.body).toHaveProperty('toVersion', 'v2');
                expect(res.body).toHaveProperty('title');
                expect(res.body).toHaveProperty('description');
                expect(res.body).toHaveProperty('breakingChanges');
                expect(res.body).toHaveProperty('migrationSteps');
                expect(Array.isArray(res.body.breakingChanges)).toBe(true);
                expect(Array.isArray(res.body.migrationSteps)).toBe(true);
            });
        });
        it('should return 404 for non-existent migration guide', () => {
            return request(app.getHttpServer())
                .get('/documentation/migration/v2/v3')
                .expect(404);
        });
    });
    describe('/documentation/report (GET)', () => {
        it('should generate documentation report', () => {
            return request(app.getHttpServer())
                .get('/documentation/report')
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('summary');
                expect(res.body).toHaveProperty('versions');
                expect(res.body).toHaveProperty('recommendations');
                expect(res.body.summary).toHaveProperty('totalVersions');
                expect(res.body.summary).toHaveProperty('currentVersion');
                expect(Array.isArray(res.body.versions)).toBe(true);
                expect(Array.isArray(res.body.recommendations)).toBe(true);
            });
        });
    });
    describe('/documentation/compare/:version1/:version2 (GET)', () => {
        it('should compare v1 and v2', () => {
            return request(app.getHttpServer())
                .get('/documentation/compare/v1/v2')
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('version1', 'v1');
                expect(res.body).toHaveProperty('version2', 'v2');
                expect(res.body).toHaveProperty('comparison');
                expect(res.body.comparison).toHaveProperty('addedEndpoints');
                expect(res.body.comparison).toHaveProperty('removedEndpoints');
                expect(res.body.comparison).toHaveProperty('changedEndpoints');
                expect(res.body.comparison).toHaveProperty('breakingChanges');
                expect(Array.isArray(res.body.comparison.addedEndpoints)).toBe(true);
                expect(Array.isArray(res.body.comparison.removedEndpoints)).toBe(true);
                expect(Array.isArray(res.body.comparison.changedEndpoints)).toBe(true);
                expect(Array.isArray(res.body.comparison.breakingChanges)).toBe(true);
            });
        });
        it('should return 404 for non-existent version comparison', () => {
            return request(app.getHttpServer())
                .get('/documentation/compare/v1/v3')
                .expect(404);
        });
    });
    describe('Version Header Middleware', () => {
        it('should extract version from api-version header', () => {
            return request(app.getHttpServer())
                .get('/version/info')
                .set('api-version', 'v2')
                .expect(200)
                .expect((res) => {
                expect(res.headers).toHaveProperty('api-version', 'v2');
                expect(res.headers).toHaveProperty('supported-versions');
            });
        });
        it('should extract version from accept-version header', () => {
            return request(app.getHttpServer())
                .get('/version/info')
                .set('accept-version', 'v1')
                .expect(200)
                .expect((res) => {
                expect(res.headers).toHaveProperty('api-version', 'v1');
            });
        });
        it('should extract version from query parameter', () => {
            return request(app.getHttpServer())
                .get('/version/info?version=v2')
                .expect(200)
                .expect((res) => {
                expect(res.headers).toHaveProperty('api-version', 'v2');
            });
        });
        it('should use default version when no version specified', () => {
            return request(app.getHttpServer())
                .get('/version/info')
                .expect(200)
                .expect((res) => {
                expect(res.headers).toHaveProperty('api-version');
                expect(res.headers).toHaveProperty('default-version');
            });
        });
    });
    describe('Deprecation Headers', () => {
        it('should return deprecation headers for deprecated version', () => {
            return request(app.getHttpServer())
                .get('/version/info')
                .set('api-version', 'v1')
                .expect(200)
                .expect((res) => {
                expect(res.headers).toHaveProperty('deprecation', 'true');
                expect(res.headers).toHaveProperty('sunset');
                expect(res.headers).toHaveProperty('link');
                expect(res.headers).toHaveProperty('warning');
            });
        });
        it('should not return deprecation headers for current version', () => {
            return request(app.getHttpServer())
                .get('/version/info')
                .set('api-version', 'v2')
                .expect(200)
                .expect((res) => {
                expect(res.headers).not.toHaveProperty('deprecation');
                expect(res.headers).not.toHaveProperty('sunset');
            });
        });
    });
    describe('Error Handling', () => {
        it('should return 400 for unsupported version', () => {
            return request(app.getHttpServer())
                .get('/version/info')
                .set('api-version', 'v3')
                .expect(400)
                .expect((res) => {
                expect(res.body).toHaveProperty('message');
                expect(res.body).toHaveProperty('supportedVersions');
                expect(res.body).toHaveProperty('currentVersion');
                expect(res.body).toHaveProperty('documentation');
            });
        });
        it('should return 404 for non-existent documentation version', () => {
            return request(app.getHttpServer())
                .get('/documentation/v3')
                .expect(404);
        });
        it('should return 404 for non-existent migration guide', () => {
            return request(app.getHttpServer())
                .get('/documentation/migration/v2/v3')
                .expect(404);
        });
    });
    describe('Performance Tests', () => {
        it('should handle multiple concurrent version requests', async () => {
            const requests = Array.from({ length: 10 }, (_, i) => request(app.getHttpServer())
                .get('/version/info')
                .set('api-version', i % 2 === 0 ? 'v1' : 'v2'));
            const responses = await Promise.all(requests);
            responses.forEach((response) => {
                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('current');
                expect(response.body).toHaveProperty('supported');
            });
        });
        it('should handle version analytics with different time periods', async () => {
            const periods = [1, 7, 30, 90];
            for (const days of periods) {
                await request(app.getHttpServer())
                    .get(`/version/analytics?days=${days}`)
                    .expect(200)
                    .expect((res) => {
                    expect(res.body).toHaveProperty('versionUsage');
                    expect(Array.isArray(res.body.versionUsage)).toBe(true);
                });
            }
        });
    });
});
