import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserStatus } from 'src/generated/prisma/enums';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { REFRESH_COOKIE_NAME } from 'src/common/constants/refresh-cookie.constant';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: {
        register: jest.Mock;
        login: jest.Mock;
        refresh: jest.Mock;
        logout: jest.Mock;
    };
    let configService: {
        get: jest.Mock;
    };

    const mockUser = {
        id: 'cuid_123',
        username: 'johndoe',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: null,
        status: UserStatus.ACTIVE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    };

    const mockRegisterResponse = {
        ...mockUser,
    };

    const mockLoginResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
    };

    const mockRefreshResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
    };

    beforeEach(async () => {
        authService = {
            register: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
        };

        configService = {
            get: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: authService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('register', () => {
        it('should call authService.register with dto and return result', async () => {
            const dto: RegisterDto = {
                username: 'johndoe',
                email: 'john@example.com',
                password: 'SecurePass123!',
                firstName: 'John',
                lastName: 'Doe',
            };
            authService.register.mockResolvedValue(mockRegisterResponse);

            const result = await controller.register(dto);

            expect(authService.register).toHaveBeenCalledWith(dto);
            expect(authService.register).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockRegisterResponse);
        });

        it('should propagate errors from authService', async () => {
            const dto: RegisterDto = {
                username: 'johndoe',
                email: 'john@example.com',
                password: 'SecurePass123!',
                firstName: 'John',
            };
            const error = new Error('Service error');
            authService.register.mockRejectedValue(error);

            await expect(controller.register(dto)).rejects.toThrow('Service error');
        });
    });

    describe('login', () => {
        const loginDto: LoginDto = {
            identifier: 'john@example.com',
            password: 'SecurePass123!',
        };

        function createMockRequest(userAgent?: string, ip = '127.0.0.1') {
            return {
                get: jest.fn().mockImplementation((header: string) => {
                    if (header === 'user-agent') return userAgent;
                    return undefined;
                }),
                ip,
            } as Partial<Request>;
        }

        function createMockResponse() {
            return {
                cookie: jest.fn(),
            } as Partial<Response>;
        }

        it('should call authService.login with request metadata and set cookie', async () => {
            const req = createMockRequest('Mozilla/5.0');
            const res = createMockResponse();

            authService.login.mockResolvedValue(mockLoginResponse);
            configService.get.mockReturnValue('production');

            const result = await controller.login(loginDto, req as Request, res as Response);

            expect(authService.login).toHaveBeenCalledWith({
                identifier: 'john@example.com',
                password: 'SecurePass123!',
                userAgent: 'Mozilla/5.0',
                ipAddress: '127.0.0.1',
            });

            expect(res.cookie as jest.Mock).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, 'refresh-token', {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                path: '/v1/auth',
            });

            expect(result).toEqual({
                accessToken: 'access-token',
                user: mockUser,
            });
        });

        it('should set secure=false when NODE_ENV is not production', async () => {
            const req = createMockRequest('Mozilla/5.0');
            const res = createMockResponse();

            authService.login.mockResolvedValue(mockLoginResponse);
            configService.get.mockReturnValue('development');

            await controller.login(loginDto, req as Request, res as Response);

            expect(res.cookie as jest.Mock).toHaveBeenCalledWith(
                REFRESH_COOKIE_NAME,
                'refresh-token',
                expect.objectContaining({
                    secure: false,
                }),
            );
        });

        it('should pass undefined userAgent when request header is missing', async () => {
            const req = createMockRequest(undefined);
            const res = createMockResponse();

            authService.login.mockResolvedValue(mockLoginResponse);
            configService.get.mockReturnValue('production');

            await controller.login(loginDto, req as Request, res as Response);

            expect(authService.login).toHaveBeenCalledWith({
                identifier: 'john@example.com',
                password: 'SecurePass123!',
                userAgent: undefined,
                ipAddress: '127.0.0.1',
            });
        });

        it('should propagate errors from authService.login', async () => {
            const req = createMockRequest('Mozilla/5.0');
            const res = createMockResponse();

            authService.login.mockRejectedValue(new Error('Login failed'));

            await expect(controller.login(loginDto, req as Request, res as Response)).rejects.toThrow('Login failed');
            expect(res.cookie as jest.Mock).not.toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        function createMockRequest(userAgent?: string, ip = '127.0.0.1', cookies: Record<string, string> = {}) {
            return {
                get: jest.fn().mockImplementation((header: string) => {
                    if (header === 'user-agent') return userAgent;
                    return undefined;
                }),
                ip,
                cookies,
            } as Partial<Request>;
        }

        function createMockResponse() {
            return {
                cookie: jest.fn(),
            } as Partial<Response>;
        }

        it('should throw UnauthorizedException when refresh token cookie is missing', async () => {
            const req = createMockRequest(undefined, '127.0.0.1', {});
            const res = createMockResponse();

            await expect(controller.refresh(req as Request, res as Response)).rejects.toThrow(UnauthorizedException);

            try {
                await controller.refresh(req as Request, res as Response);
            } catch (error) {
                expect(error).toBeInstanceOf(UnauthorizedException);
                const response = (error as UnauthorizedException).getResponse();
                expect(response).toEqual({
                    i18nKey: I18N_KEYS.auth.error.refreshTokenMissing,
                });
            }

            expect(authService.refresh).not.toHaveBeenCalled();
            expect(res.cookie as jest.Mock).not.toHaveBeenCalled();
        });

        it('should call authService.refresh, rotate cookie, and return access token', async () => {
            const req = createMockRequest(undefined, '127.0.0.1', {
                [REFRESH_COOKIE_NAME]: 'old-refresh-token',
            });
            const res = createMockResponse();

            authService.refresh.mockResolvedValue(mockRefreshResponse);
            configService.get.mockReturnValue('production');

            const result = await controller.refresh(req as Request, res as Response);

            expect(authService.refresh).toHaveBeenCalledWith('old-refresh-token');

            expect(res.cookie as jest.Mock).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, 'new-refresh-token', {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                path: '/v1/auth',
            });

            expect(result).toEqual({
                accessToken: 'new-access-token',
            });
        });

        it('should set secure=false when NODE_ENV is not production', async () => {
            const req = createMockRequest(undefined, '127.0.0.1', {
                [REFRESH_COOKIE_NAME]: 'old-refresh-token',
            });
            const res = createMockResponse();

            authService.refresh.mockResolvedValue(mockRefreshResponse);
            configService.get.mockReturnValue('development');

            await controller.refresh(req as Request, res as Response);

            expect(res.cookie as jest.Mock).toHaveBeenCalledWith(
                REFRESH_COOKIE_NAME,
                'new-refresh-token',
                expect.objectContaining({
                    secure: false,
                }),
            );
        });

        it('should propagate errors from authService.refresh', async () => {
            const req = createMockRequest(undefined, '127.0.0.1', {
                [REFRESH_COOKIE_NAME]: 'old-refresh-token',
            });
            const res = createMockResponse();

            authService.refresh.mockRejectedValue(new Error('Refresh failed'));

            await expect(controller.refresh(req as Request, res as Response)).rejects.toThrow('Refresh failed');
            expect(res.cookie as jest.Mock).not.toHaveBeenCalled();
        });
    });

    describe('logout', () => {
        function createMockRequest(userAgent?: string, ip = '127.0.0.1', cookies: Record<string, string> = {}) {
            return {
                get: jest.fn().mockImplementation((header: string) => {
                    if (header === 'user-agent') return userAgent;
                    return undefined;
                }),
                ip,
                cookies,
            } as Partial<Request>;
        }

        function createMockResponse() {
            return {
                cookie: jest.fn(),
                clearCookie: jest.fn(),
            } as Partial<Response>;
        }

        it('should call authService.logout, clear cookie, and return ok when refresh token exists', async () => {
            const req = createMockRequest(undefined, '127.0.0.1', {
                [REFRESH_COOKIE_NAME]: 'refresh-token',
            });
            const res = createMockResponse();

            authService.logout.mockResolvedValue(undefined);
            configService.get.mockReturnValue('production');

            const result = await controller.logout(req as Request, res as Response);

            expect(authService.logout).toHaveBeenCalledWith('refresh-token');
            expect(authService.logout).toHaveBeenCalledTimes(1);

            expect(res.clearCookie as jest.Mock).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                path: '/v1/auth',
            });

            expect(result).toEqual({ ok: true });
        });

        it('should not call authService.logout when refresh token cookie is missing', async () => {
            const req = createMockRequest(undefined, '127.0.0.1', {});
            const res = createMockResponse();

            configService.get.mockReturnValue('production');

            const result = await controller.logout(req as Request, res as Response);

            expect(authService.logout).not.toHaveBeenCalled();

            expect(res.clearCookie as jest.Mock).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                path: '/v1/auth',
            });

            expect(result).toEqual({ ok: true });
        });

        it('should set secure=false when NODE_ENV is not production', async () => {
            const req = createMockRequest(undefined, '127.0.0.1', {
                [REFRESH_COOKIE_NAME]: 'refresh-token',
            });
            const res = createMockResponse();

            authService.logout.mockResolvedValue(undefined);
            configService.get.mockReturnValue('development');

            await controller.logout(req as Request, res as Response);

            expect(res.clearCookie as jest.Mock).toHaveBeenCalledWith(
                REFRESH_COOKIE_NAME,
                expect.objectContaining({
                    secure: false,
                }),
            );
        });

        it('should propagate errors from authService.logout', async () => {
            const req = createMockRequest(undefined, '127.0.0.1', {
                [REFRESH_COOKIE_NAME]: 'refresh-token',
            });
            const res = createMockResponse();

            authService.logout.mockRejectedValue(new Error('Logout failed'));

            await expect(controller.logout(req as Request, res as Response)).rejects.toThrow('Logout failed');
            expect(res.clearCookie as jest.Mock).not.toHaveBeenCalled();
        });
    });
});
