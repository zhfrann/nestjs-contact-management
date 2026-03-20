import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UserStatus } from 'src/generated/prisma/enums';

describe('UsersService', () => {
    let service: UsersService;
    let prisma: {
        user: {
            findFirst: jest.Mock;
            findUnique: jest.Mock;
            create: jest.Mock;
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
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    };

    beforeEach(async () => {
        prisma = {
            user: {
                findFirst: jest.fn(),
                findUnique: jest.fn(),
                create: jest.fn(),
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
            // Arrange
            prisma.user.findFirst.mockResolvedValue(mockUser);

            // Act
            const result = await service.findByEmailOrUsername({
                email: 'john@example.com',
                username: 'differentuser',
            });

            // Assert
            expect(prisma.user.findFirst).toHaveBeenCalledWith({
                where: {
                    OR: [{ email: 'john@example.com' }, { username: 'differentuser' }],
                },
            });
            expect(result).toEqual(mockUser);
        });

        it('should find user by username', async () => {
            // Arrange
            prisma.user.findFirst.mockResolvedValue(mockUser);

            // Act
            const result = await service.findByEmailOrUsername({
                email: 'different@example.com',
                username: 'johndoe',
            });

            // Assert
            expect(result).toEqual(mockUser);
        });

        it('should return null when user not found', async () => {
            // Arrange
            prisma.user.findFirst.mockResolvedValue(null);

            // Act
            const result = await service.findByEmailOrUsername({
                email: 'notfound@example.com',
                username: 'notfound',
            });

            // Assert
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
            // Arrange
            prisma.user.create.mockResolvedValue(mockUser);

            // Act
            const result = await service.createUser({
                username: 'johndoe',
                email: 'john@example.com',
                passwordHash: 'hashed_password',
                firstName: 'John',
                lastName: 'Doe',
            });

            // Assert
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
            // Arrange
            const userWithoutLastName = { ...mockUser, lastName: null };
            prisma.user.create.mockResolvedValue(userWithoutLastName);

            // Act
            const result = await service.createUser({
                username: 'johndoe',
                email: 'john@example.com',
                passwordHash: 'hashed_password',
                firstName: 'John',
            });

            // Assert
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
            // Arrange
            prisma.user.create.mockRejectedValue(new Error('Unique constraint failed'));

            // Act & Assert
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
});
