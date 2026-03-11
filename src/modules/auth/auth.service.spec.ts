import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterRequest } from './types/register-request.type';
import { UserStatus } from 'src/generated/prisma/enums';

// Mock argon2
jest.mock('argon2', () => ({
    hash: jest.fn(),
    argon2id: 2,
}));

describe('AuthService', () => {
    let service: AuthService;
    let usersService: jest.Mocked<UsersService>;

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
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        usersService = module.get(UsersService);

        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should successfully register a new user', async () => {
            // Arrange
            usersService.findByEmailOrUsername.mockResolvedValue(null);
            usersService.createUser.mockResolvedValue(mockUser);
            (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');

            // Act
            const result = await service.register(mockRegisterInput);

            // Assert
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

            // Ensure passwordHash is not exposed
            expect(result).not.toHaveProperty('passwordHash');
        });

        it('should register user without lastName', async () => {
            // Arrange
            const inputWithoutLastName: RegisterRequest = {
                ...mockRegisterInput,
                lastName: undefined,
            };
            const userWithoutLastName = { ...mockUser, lastName: null };

            usersService.findByEmailOrUsername.mockResolvedValue(null);
            usersService.createUser.mockResolvedValue(userWithoutLastName);
            (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');

            // Act
            const result = await service.register(inputWithoutLastName);

            // Assert
            expect(usersService.createUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    lastName: undefined,
                }),
            );
            expect(result.lastName).toBeNull();
        });

        it('should throw ConflictException when email is already taken', async () => {
            // Arrange
            const existingUserWithSameEmail = { ...mockUser };
            usersService.findByEmailOrUsername.mockResolvedValue(existingUserWithSameEmail);

            // Act & Assert
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
            // Arrange
            const existingUserWithDifferentEmail = {
                ...mockUser,
                email: 'different@example.com', // Different email
            };
            usersService.findByEmailOrUsername.mockResolvedValue(existingUserWithDifferentEmail);

            // Act & Assert
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
            // Arrange
            usersService.findByEmailOrUsername.mockResolvedValue(null);
            (argon2.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

            // Act & Assert
            await expect(service.register(mockRegisterInput)).rejects.toThrow('Hashing failed');
            expect(usersService.createUser).not.toHaveBeenCalled();
        });

        it('should propagate error when user creation fails', async () => {
            // Arrange
            usersService.findByEmailOrUsername.mockResolvedValue(null);
            (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');
            usersService.createUser.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(service.register(mockRegisterInput)).rejects.toThrow('Database error');
        });
    });
});
