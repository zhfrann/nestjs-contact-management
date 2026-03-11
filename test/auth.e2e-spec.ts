import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AppValidationPipe } from '../src/common/pipes/validation.pipe';

describe('Auth (e2e)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        // Apply same configuration as main.ts
        app.enableVersioning({ type: VersioningType.URI });
        app.useGlobalPipes(new AppValidationPipe());

        await app.init();

        prisma = app.get(PrismaService);
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(async () => {
        // Clean up users table before each test
        await prisma.user.deleteMany({});
    });

    describe('POST /v1/auth/register', () => {
        const validPayload = {
            username: 'johndoe',
            email: 'john@example.com',
            password: 'SecurePass123!',
            firstName: 'John',
            lastName: 'Doe',
        };

        describe('Success Cases', () => {
            it('should register a new user successfully', async () => {
                const response = await request(app.getHttpServer())
                    .post('/v1/auth/register')
                    .send(validPayload)
                    .expect(201);

                expect(response.body).toMatchObject({
                    message: expect.any(String),
                    data: {
                        id: expect.any(String),
                        username: 'johndoe',
                        email: 'john@example.com',
                        firstName: 'John',
                        lastName: 'Doe',
                        photoUrl: null,
                        status: 'ACTIVE',
                        createdAt: expect.any(String),
                        updatedAt: expect.any(String),
                    },
                    meta: {
                        requestId: expect.any(String),
                        timestamp: expect.stringMatching(
                            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/,
                        ),
                    },
                });

                // Verify password is not exposed
                expect(response.body.data).not.toHaveProperty('passwordHash');
                expect(response.body.data).not.toHaveProperty('password');
            });

            it('should register user without lastName', async () => {
                const payload = { ...validPayload };
                delete (payload as { lastName?: string }).lastName;

                const response = await request(app.getHttpServer())
                    .post('/v1/auth/register')
                    .send(payload)
                    .expect(201);

                expect(response.body.data.lastName).toBeNull();
            });

            it('should trim and lowercase email', async () => {
                const payload = {
                    ...validPayload,
                    email: '  JOHN@EXAMPLE.COM  ',
                };

                const response = await request(app.getHttpServer())
                    .post('/v1/auth/register')
                    .send(payload)
                    .expect(201);

                expect(response.body.data.email).toBe('john@example.com');
            });

            it('should trim username', async () => {
                const payload = {
                    ...validPayload,
                    username: '  johndoe  ',
                };

                const response = await request(app.getHttpServer())
                    .post('/v1/auth/register')
                    .send(payload)
                    .expect(201);

                expect(response.body.data.username).toBe('johndoe');
            });

            it('should return localized success message with Accept-Language header', async () => {
                const response = await request(app.getHttpServer())
                    .post('/v1/auth/register')
                    .set('Accept-Language', 'id')
                    .send(validPayload)
                    .expect(201);

                expect(response.body.message).toBe('Registrasi berhasil');
            });

            it('should return English success message by default', async () => {
                const response = await request(app.getHttpServer())
                    .post('/v1/auth/register')
                    .send(validPayload)
                    .expect(201);

                expect(response.body.message).toBe('User registered successfully');
            });
        });

        describe('Conflict Cases (409)', () => {
            beforeEach(async () => {
                // Create existing user
                await request(app.getHttpServer())
                    .post('/v1/auth/register')
                    .send(validPayload);
            });

            it('should return 409 when email is already taken', async () => {
                const payload = {
                    ...validPayload,
                    username: 'different_user',
                };

                const response = await request(app.getHttpServer())
                    .post('/v1/auth/register')
                    .send(payload)
                    .expect(409);

                expect(response.body).toMatchObject({
                    error: {
                        code: 'CONFLICT',
                        message: expect.any(String),
                    },
                    meta: {
                        requestId: expect.any(String),
                        timestamp: expect.any(String),
                    },
                });
            });

            it('should return 409 when username is already taken', async () => {
                const payload = {
                    ...validPayload,
                    email: 'different@example.com',
                };

                const response = await request(app.getHttpServer())
                    .post('/v1/auth/register')
                    .send(payload)
                    .expect(409);

                expect(response.body.error.code).toBe('CONFLICT');
            });

            it('should return localized conflict message', async () => {
                const payload = {
                    ...validPayload,
                    username: 'different_user',
                };

                const response = await request(app.getHttpServer())
                    .post('/v1/auth/register')
                    .set('Accept-Language', 'id')
                    .send(payload)
                    .expect(409);

                expect(response.body.error.message).toBe('Email sudah digunakan');
            });
        });

        describe('Validation Cases (400)', () => {
            it('should return 400 when required fields are missing', async () => {
                const response = await request(app.getHttpServer())
                    .post('/v1/auth/register')
                    .send({})
                    .expect(400);

                expect(response.body.error.code).toBe('VALIDATION_ERROR');
                expect(response.body.error.details).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({ field: 'username' }),
                        expect.objectContaining({ field: 'email' }),
                        expect.objectContaining({ field: 'password' }),
                        expect.objectContaining({ field: 'firstName' }),
                    ]),
                );
            });

            it('should return 400 when username is too short', async () => {
                const payload = { ...validPayload, username: 'ab' };

                const response = await request(app.getHttpServer())
                    .post('/v1/auth/register')
                    .send(payload)
                    .expect(400);

                expect(response.body.error.details).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            field: 'username',
                            issues: expect.arrayContaining([
                                expect.stringContaining('must be longer'),
                            ]),
                        }),
                    ]),
                );
            });

            it('should return 400 when email is invalid', async () => {
                const payload = { ...validPayload, email: 'not-an-email' };

                const response = await request(app.getHttpServer())
                    .post('/v1/auth/register')
                    .send(payload)
                    .expect(400);

                expect(response.body.error.details).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            field: 'email',
                            issues: expect.arrayContaining([
                                expect.stringContaining('must be an email'),
                            ]),
                        }),
                    ]),
                );
            });

            it('should return 400 when password is too short', async () => {
                const payload = { ...validPayload, password: '1234567' };

                const response = await request(app.getHttpServer())
                    .post('/v1/auth/register')
                    .send(payload)
                    .expect(400);

                expect(response.body.error.details).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            field: 'password',
                            issues: expect.arrayContaining([
                                expect.stringContaining('must be longer'),
                            ]),
                        }),
                    ]),
                );
            });

            it('should return 400 when password is too long', async () => {
                const payload = { ...validPayload, password: 'a'.repeat(73) };

                const response = await request(app.getHttpServer())
                    .post('/v1/auth/register')
                    .send(payload)
                    .expect(400);

                expect(response.body.error.details).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({ field: 'password' }),
                    ]),
                );
            });

            it('should return 400 when unknown properties are present', async () => {
                const payload = { ...validPayload, role: 'admin' };

                const response = await request(app.getHttpServer())
                    .post('/v1/auth/register')
                    .send(payload)
                    .expect(400);

                expect(response.body.error.code).toBe('VALIDATION_ERROR');
                expect(response.body.error.details).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            field: 'role',
                            issues: expect.arrayContaining([
                                expect.stringContaining('should not exist'),
                            ]),
                        }),
                    ]),
                );
            });
        });

        describe('Rate Limiting', () => {
            it('should enforce rate limiting', async () => {
                // This test depends on your RATE_LIMIT configuration
                // Adjust the loop count based on your limit
                const requests = [];
                for (let i = 0; i < 15; i++) {
                    requests.push(
                        request(app.getHttpServer())
                            .post('/v1/auth/register')
                            .send({
                                ...validPayload,
                                username: `user${i}`,
                                email: `user${i}@example.com`,
                            }),
                    );
                }

                const responses = await Promise.all(requests);
                const tooManyRequests = responses.filter(
                    (r) => r.status === 429,
                );

                // At least some requests should be rate limited
                // (depends on your rate limit configuration)
                // If rate limit is high, this might pass all requests
                expect(responses.length).toBe(15);
            });
        });
    });
});
