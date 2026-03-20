import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterRequest } from './types/auth-request.type';
import { UserStatus } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { sha256 } from './utils/auth.util';

// Mock argon2
jest.mock('argon2', () => ({
    hash: jest.fn(),
    verify: jest.fn(),
    argon2id: 2,
}));

describe('AuthService', () => {
    let service: AuthService;
    let usersService: jest.Mocked<UsersService>;
    let prisma: {
        authSession: {
            create: jest.Mock;
            update: jest.Mock;
        };
    };
    let jwtService: {
        signAsync: jest.Mock;
    };
    let configService: {
        get: jest.Mock;
    };

    const mockUser = {
        id: 'cuid_123',
        username: 'johndoe',
        email: 'john@example.com',
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: null,
        photoKey: null,
        status: UserStatus.ACTIVE,
        lastLoginAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    };

    const mockRegisterInput: RegisterRequest = {
        username: 'johndoe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
    };

    beforeEach(async () => {
        const mockUsersService = {
            findByEmailOrUsername: jest.fn(),
            createUser: jest.fn(),
            findByIdentifier: jest.fn(),
        };

        prisma = {
            authSession: {
                create: jest.fn(),
                update: jest.fn(),
            },
        };

        jwtService = {
            signAsync: jest.fn(),
        };

        configService = {
            get: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UsersService, useValue: mockUsersService },
                { provide: PrismaService, useValue: prisma },
                { provide: JwtService, useValue: jwtService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        usersService = module.get(UsersService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('register', () => {
        it('should successfully register a new user', async () => {
            usersService.findByEmailOrUsername.mockResolvedValue(null);
            usersService.createUser.mockResolvedValue(mockUser);
            (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');

            const result = await service.register(mockRegisterInput);

            expect(usersService.findByEmailOrUsername).toHaveBeenCalledWith({
                email: mockRegisterInput.email,
                username: mockRegisterInput.username,
            });

            expect(argon2.hash).toHaveBeenCalledWith(mockRegisterInput.password, {
                type: argon2.argon2id,
            });

            expect(usersService.createUser).toHaveBeenCalledWith({
                username: mockRegisterInput.username,
                email: mockRegisterInput.email,
                passwordHash: 'hashed_password',
                firstName: mockRegisterInput.firstName,
                lastName: mockRegisterInput.lastName,
            });

            expect(result).toEqual({
                id: mockUser.id,
                username: mockUser.username,
                email: mockUser.email,
                firstName: mockUser.firstName,
                lastName: mockUser.lastName,
                photoUrl: mockUser.photoUrl,
                status: mockUser.status,
                createdAt: mockUser.createdAt,
                updatedAt: mockUser.updatedAt,
            });

            expect(result).not.toHaveProperty('passwordHash');
        });

        it('should register user without lastName', async () => {
            const inputWithoutLastName: RegisterRequest = {
                ...mockRegisterInput,
                lastName: undefined,
            };
            const userWithoutLastName = { ...mockUser, lastName: null };

            usersService.findByEmailOrUsername.mockResolvedValue(null);
            usersService.createUser.mockResolvedValue(userWithoutLastName);
            (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');

            const result = await service.register(inputWithoutLastName);

            expect(usersService.createUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    lastName: undefined,
                }),
            );
            expect(result.lastName).toBeNull();
        });

        it('should throw ConflictException when email is already taken', async () => {
            usersService.findByEmailOrUsername.mockResolvedValue({ ...mockUser });

            await expect(service.register(mockRegisterInput)).rejects.toThrow(ConflictException);

            try {
                await service.register(mockRegisterInput);
            } catch (error) {
                expect(error).toBeInstanceOf(ConflictException);
                const response = (error as ConflictException).getResponse();
                expect(response).toEqual({
                    i18nKey: I18N_KEYS.auth.error.emailTaken,
                });
            }

            expect(usersService.createUser).not.toHaveBeenCalled();
        });

        it('should throw ConflictException when username is already taken', async () => {
            usersService.findByEmailOrUsername.mockResolvedValue({
                ...mockUser,
                email: 'different@example.com',
            });

            await expect(service.register(mockRegisterInput)).rejects.toThrow(ConflictException);

            try {
                await service.register(mockRegisterInput);
            } catch (error) {
                expect(error).toBeInstanceOf(ConflictException);
                const response = (error as ConflictException).getResponse();
                expect(response).toEqual({
                    i18nKey: I18N_KEYS.auth.error.usernameTaken,
                });
            }

            expect(usersService.createUser).not.toHaveBeenCalled();
        });

        it('should propagate error when argon2 hashing fails', async () => {
            usersService.findByEmailOrUsername.mockResolvedValue(null);
            (argon2.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

            await expect(service.register(mockRegisterInput)).rejects.toThrow('Hashing failed');
            expect(usersService.createUser).not.toHaveBeenCalled();
        });

        it('should propagate error when user creation fails', async () => {
            usersService.findByEmailOrUsername.mockResolvedValue(null);
            (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');
            usersService.createUser.mockRejectedValue(new Error('Database error'));

            await expect(service.register(mockRegisterInput)).rejects.toThrow('Database error');
        });
    });

    describe('login', () => {
        const mockLoginInput = {
            identifier: 'john@example.com',
            password: 'SecurePass123!',
            userAgent: 'Mozilla/5.0',
            ipAddress: '127.0.0.1',
        };

        beforeEach(() => {
            configService.get.mockImplementation((key: string) => {
                switch (key) {
                    case 'JWT_REFRESH_EXPIRES_IN':
                        return '7d';
                    case 'JWT_REFRESH_SECRET':
                        return 'refresh-secret';
                    default:
                        return undefined;
                }
            });
        });

        it('should login successfully and create auth session', async () => {
            usersService.findByIdentifier.mockResolvedValue(mockUser);
            (argon2.verify as jest.Mock).mockResolvedValue(true);
            prisma.authSession.create.mockResolvedValue({ id: 'session_123' });
            prisma.authSession.update.mockResolvedValue({ id: 'session_123' });
            jwtService.signAsync.mockResolvedValueOnce('refresh-token').mockResolvedValueOnce('access-token');

            const result = await service.login(mockLoginInput);

            expect(usersService.findByIdentifier).toHaveBeenCalledWith(mockLoginInput.identifier);
            expect(argon2.verify).toHaveBeenCalledWith(mockUser.passwordHash, mockLoginInput.password);

            expect(prisma.authSession.create).toHaveBeenCalledWith({
                data: {
                    userId: mockUser.id,
                    refreshTokenHash: 'TEMP',
                    userAgent: mockLoginInput.userAgent,
                    ipAddress: mockLoginInput.ipAddress,
                    expiresAt: expect.any(Date),
                },
            });

            expect(jwtService.signAsync).toHaveBeenNthCalledWith(
                1,
                { sub: mockUser.id, sid: 'session_123' },
                {
                    secret: 'refresh-secret',
                    expiresIn: '7d',
                },
            );

            expect(prisma.authSession.update).toHaveBeenCalledWith({
                where: { id: 'session_123' },
                data: { refreshTokenHash: sha256('refresh-token') },
            });

            expect(jwtService.signAsync).toHaveBeenNthCalledWith(2, { sub: mockUser.id });

            expect(result).toEqual({
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                user: {
                    id: mockUser.id,
                    username: mockUser.username,
                    email: mockUser.email,
                    firstName: mockUser.firstName,
                    lastName: mockUser.lastName,
                    photoUrl: mockUser.photoUrl,
                    status: mockUser.status,
                    createdAt: mockUser.createdAt,
                    updatedAt: mockUser.updatedAt,
                },
            });

            expect(result.user).not.toHaveProperty('passwordHash');
        });

        it('should fallback to 7d when JWT_REFRESH_EXPIRES_IN is not set', async () => {
            configService.get.mockImplementation((key: string) => {
                switch (key) {
                    case 'JWT_REFRESH_EXPIRES_IN':
                        return undefined;
                    case 'JWT_REFRESH_SECRET':
                        return 'refresh-secret';
                    default:
                        return undefined;
                }
            });

            usersService.findByIdentifier.mockResolvedValue(mockUser);
            (argon2.verify as jest.Mock).mockResolvedValue(true);
            prisma.authSession.create.mockResolvedValue({ id: 'session_123' });
            prisma.authSession.update.mockResolvedValue({ id: 'session_123' });
            jwtService.signAsync.mockResolvedValueOnce('refresh-token').mockResolvedValueOnce('access-token');

            await service.login(mockLoginInput);

            expect(jwtService.signAsync).toHaveBeenNthCalledWith(
                1,
                { sub: mockUser.id, sid: 'session_123' },
                {
                    secret: 'refresh-secret',
                    expiresIn: '7d',
                },
            );
        });

        it('should throw UnauthorizedException when user is not found', async () => {
            usersService.findByIdentifier.mockResolvedValue(null);

            await expect(service.login(mockLoginInput)).rejects.toThrow(UnauthorizedException);

            try {
                await service.login(mockLoginInput);
            } catch (error) {
                expect(error).toBeInstanceOf(UnauthorizedException);
                const response = (error as UnauthorizedException).getResponse();
                expect(response).toEqual({
                    i18nKey: I18N_KEYS.auth.error.invalidCredentials,
                });
            }

            expect(argon2.verify).not.toHaveBeenCalled();
            expect(prisma.authSession.create).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException when password is invalid', async () => {
            usersService.findByIdentifier.mockResolvedValue(mockUser);
            (argon2.verify as jest.Mock).mockResolvedValue(false);

            await expect(service.login(mockLoginInput)).rejects.toThrow(UnauthorizedException);

            expect(argon2.verify).toHaveBeenCalledWith(mockUser.passwordHash, mockLoginInput.password);
            expect(prisma.authSession.create).not.toHaveBeenCalled();
        });

        it('should propagate error when session creation fails', async () => {
            usersService.findByIdentifier.mockResolvedValue(mockUser);
            (argon2.verify as jest.Mock).mockResolvedValue(true);
            prisma.authSession.create.mockRejectedValue(new Error('Session create failed'));

            await expect(service.login(mockLoginInput)).rejects.toThrow('Session create failed');
        });

        it('should propagate error when refresh token signing fails', async () => {
            usersService.findByIdentifier.mockResolvedValue(mockUser);
            (argon2.verify as jest.Mock).mockResolvedValue(true);
            prisma.authSession.create.mockResolvedValue({ id: 'session_123' });
            jwtService.signAsync.mockRejectedValue(new Error('JWT signing failed'));

            await expect(service.login(mockLoginInput)).rejects.toThrow('JWT signing failed');
            expect(prisma.authSession.update).not.toHaveBeenCalled();
        });
    });
});
