import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { UserStatus } from 'src/generated/prisma/enums';
import { UsersService } from './users.service';

describe('UsersService', () => {
    let service: UsersService;
    let prisma: {
        user: {
            findFirst: jest.Mock;
            findUnique: jest.Mock;
            create: jest.Mock;
            update: jest.Mock;
        };
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
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    beforeEach(async () => {
        prisma = {
            user: {
                findFirst: jest.fn(),
                findUnique: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: PrismaService,
                    useValue: prisma,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findByEmailOrUsername', () => {
        it('should find user by email', async () => {
            prisma.user.findFirst.mockResolvedValue(mockUser);

            const result = await service.findByEmailOrUsername({
                email: 'john@example.com',
                username: 'differentuser',
            });

            expect(prisma.user.findFirst).toHaveBeenCalledWith({
                where: {
                    OR: [{ email: 'john@example.com' }, { username: 'differentuser' }],
                },
            });
            expect(result).toEqual(mockUser);
        });

        it('should find user by username', async () => {
            prisma.user.findFirst.mockResolvedValue(mockUser);

            const result = await service.findByEmailOrUsername({
                email: 'different@example.com',
                username: 'johndoe',
            });

            expect(result).toEqual(mockUser);
        });

        it('should return null when user not found', async () => {
            prisma.user.findFirst.mockResolvedValue(null);

            const result = await service.findByEmailOrUsername({
                email: 'notfound@example.com',
                username: 'notfound',
            });

            expect(result).toBeNull();
        });
    });

    describe('findByIdentifier', () => {
        it('should normalize email identifier by trimming and lowercasing', async () => {
            prisma.user.findFirst.mockResolvedValue(mockUser);

            const result = await service.findByIdentifier('  John@Example.COM  ');

            expect(prisma.user.findFirst).toHaveBeenCalledWith({
                where: {
                    OR: [{ email: 'john@example.com' }, { username: 'john@example.com' }],
                },
            });
            expect(result).toEqual(mockUser);
        });

        it('should normalize username identifier by trimming only', async () => {
            prisma.user.findFirst.mockResolvedValue(mockUser);

            const result = await service.findByIdentifier('  JohnDoe  ');

            expect(prisma.user.findFirst).toHaveBeenCalledWith({
                where: {
                    OR: [{ email: 'JohnDoe' }, { username: 'JohnDoe' }],
                },
            });
            expect(result).toEqual(mockUser);
        });

        it('should return null when identifier is not found', async () => {
            prisma.user.findFirst.mockResolvedValue(null);

            const result = await service.findByIdentifier('unknown_user');

            expect(result).toBeNull();
        });
    });

    describe('findById', () => {
        it('should find user by id', async () => {
            prisma.user.findUnique.mockResolvedValue(mockUser);

            const result = await service.findById('cuid_123');

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 'cuid_123' },
            });
            expect(result).toEqual(mockUser);
        });

        it('should return null when id is not found', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            const result = await service.findById('unknown_id');

            expect(result).toBeNull();
        });
    });

    describe('createUser', () => {
        it('should create user with all fields', async () => {
            prisma.user.create.mockResolvedValue(mockUser);

            const result = await service.createUser({
                username: 'johndoe',
                email: 'john@example.com',
                passwordHash: 'hashed_password',
                firstName: 'John',
                lastName: 'Doe',
            });

            expect(prisma.user.create).toHaveBeenCalledWith({
                data: {
                    username: 'johndoe',
                    email: 'john@example.com',
                    passwordHash: 'hashed_password',
                    firstName: 'John',
                    lastName: 'Doe',
                },
            });
            expect(result).toEqual(mockUser);
        });

        it('should create user without lastName', async () => {
            const userWithoutLastName = { ...mockUser, lastName: null };
            prisma.user.create.mockResolvedValue(userWithoutLastName);

            const result = await service.createUser({
                username: 'johndoe',
                email: 'john@example.com',
                passwordHash: 'hashed_password',
                firstName: 'John',
            });

            expect(prisma.user.create).toHaveBeenCalledWith({
                data: {
                    username: 'johndoe',
                    email: 'john@example.com',
                    passwordHash: 'hashed_password',
                    firstName: 'John',
                    lastName: null,
                },
            });
            expect(result.lastName).toBeNull();
        });

        it('should propagate database errors', async () => {
            prisma.user.create.mockRejectedValue(new Error('Unique constraint failed'));

            await expect(
                service.createUser({
                    username: 'johndoe',
                    email: 'john@example.com',
                    passwordHash: 'hashed_password',
                    firstName: 'John',
                }),
            ).rejects.toThrow('Unique constraint failed');
        });
    });

    describe('getMe', () => {
        it('should return mapped user profile when user exists', async () => {
            prisma.user.findUnique.mockResolvedValue(mockUser);

            const result = await service.getMe('cuid_123');

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 'cuid_123' },
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

        it('should throw NotFoundException when user does not exist', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await expect(service.getMe('unknown_id')).rejects.toThrow(NotFoundException);

            try {
                await service.getMe('unknown_id');
            } catch (error) {
                expect(error).toBeInstanceOf(NotFoundException);
                expect((error as NotFoundException).getResponse()).toEqual({
                    i18nKey: I18N_KEYS.error.notFound,
                });
            }
        });
    });

    describe('updateMe', () => {
        it('should update profile successfully when input is valid', async () => {
            const updatedUser = {
                ...mockUser,
                username: 'johnny',
                email: 'johnny@example.com',
                firstName: 'Johnny',
                lastName: 'Doel',
                updatedAt: new Date('2024-02-01T00:00:00.000Z'),
            };

            prisma.user.findUnique
                .mockResolvedValueOnce(mockUser) // existing user by id
                .mockResolvedValueOnce(null) // email conflict check
                .mockResolvedValueOnce(null); // username conflict check

            prisma.user.update.mockResolvedValue(updatedUser);

            const result = await service.updateMe('cuid_123', {
                username: 'johnny',
                email: 'johnny@example.com',
                firstName: 'Johnny',
                lastName: 'Doel',
            });

            expect(prisma.user.findUnique).toHaveBeenNthCalledWith(1, {
                where: { id: 'cuid_123' },
            });
            expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, {
                where: { email: 'johnny@example.com' },
            });
            expect(prisma.user.findUnique).toHaveBeenNthCalledWith(3, {
                where: { username: 'johnny' },
            });

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'cuid_123' },
                data: {
                    username: 'johnny',
                    email: 'johnny@example.com',
                    firstName: 'Johnny',
                    lastName: 'Doel',
                },
            });

            expect(result).toEqual({
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                photoUrl: updatedUser.photoUrl,
                status: updatedUser.status,
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt,
            });
            expect(result).not.toHaveProperty('passwordHash');
        });

        it('should throw NotFoundException when existing user is not found', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await expect(
                service.updateMe('unknown_id', {
                    firstName: 'John',
                }),
            ).rejects.toThrow(NotFoundException);

            expect(prisma.user.update).not.toHaveBeenCalled();
        });

        it('should throw ConflictException when email is already used by another user', async () => {
            prisma.user.findUnique
                .mockResolvedValueOnce(mockUser) // existing user by id
                .mockResolvedValueOnce({
                    ...mockUser,
                    id: 'cuid_other',
                    email: 'taken@example.com',
                }); // email already used

            let caughtError: unknown;

            try {
                await service.updateMe('cuid_123', {
                    email: 'taken@example.com',
                });
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeInstanceOf(ConflictException);
            expect((caughtError as ConflictException).getResponse()).toEqual({
                i18nKey: I18N_KEYS.users.error.emailTaken,
            });

            expect(prisma.user.update).not.toHaveBeenCalled();
        });

        it('should throw ConflictException when username is already used by another user', async () => {
            prisma.user.findUnique
                .mockResolvedValueOnce(mockUser) // existing user by id
                .mockResolvedValueOnce({
                    ...mockUser,
                    id: 'cuid_other',
                    username: 'taken_username',
                }); // username already used

            let caughtError: unknown;

            try {
                await service.updateMe('cuid_123', {
                    username: 'taken_username',
                });
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeInstanceOf(ConflictException);
            expect((caughtError as ConflictException).getResponse()).toEqual({
                i18nKey: I18N_KEYS.users.error.usernameTaken,
            });

            expect(prisma.user.update).not.toHaveBeenCalled();
        });

        it('should skip conflict checks when username and email are unchanged', async () => {
            const updatedUser = {
                ...mockUser,
                firstName: 'Updated John',
            };

            prisma.user.findUnique.mockResolvedValueOnce(mockUser);
            prisma.user.update.mockResolvedValue(updatedUser);

            const result = await service.updateMe('cuid_123', {
                email: mockUser.email,
                username: mockUser.username,
                firstName: 'Updated John',
            });

            expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'cuid_123' },
                data: {
                    username: mockUser.username,
                    email: mockUser.email,
                    firstName: 'Updated John',
                    lastName: undefined,
                },
            });
            expect(result.firstName).toBe('Updated John');
        });

        it('should allow partial update with only one field', async () => {
            const updatedUser = {
                ...mockUser,
                firstName: 'Only First Name Updated',
            };

            prisma.user.findUnique.mockResolvedValueOnce(mockUser);
            prisma.user.update.mockResolvedValue(updatedUser);

            const result = await service.updateMe('cuid_123', {
                firstName: 'Only First Name Updated',
            });

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'cuid_123' },
                data: {
                    username: undefined,
                    email: undefined,
                    firstName: 'Only First Name Updated',
                    lastName: undefined,
                },
            });
            expect(result.firstName).toBe('Only First Name Updated');
        });
    });
});
