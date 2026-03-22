import { Test, TestingModule } from '@nestjs/testing';
import { UserStatus } from 'src/generated/prisma/enums';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
    let controller: UsersController;
    let usersService: {
        getMe: jest.Mock;
        updateMe: jest.Mock;
    };

    const mockUserProfile = {
        id: 'cuid_123',
        username: 'johndoe',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: null,
        status: UserStatus.ACTIVE,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    beforeEach(async () => {
        usersService = {
            getMe: jest.fn(),
            updateMe: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                {
                    provide: UsersService,
                    useValue: usersService,
                },
            ],
        }).compile();

        controller = module.get<UsersController>(UsersController);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getMe', () => {
        it('should call usersService.getMe with current user id and return result', async () => {
            usersService.getMe.mockResolvedValue(mockUserProfile);

            const result = await controller.getMe({ userId: 'cuid_123' });

            expect(usersService.getMe).toHaveBeenCalledWith('cuid_123');
            expect(usersService.getMe).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockUserProfile);
        });

        it('should propagate errors from usersService.getMe', async () => {
            usersService.getMe.mockRejectedValue(new Error('User not found'));

            await expect(controller.getMe({ userId: 'unknown_id' })).rejects.toThrow('User not found');
        });
    });

    describe('updateMe', () => {
        it('should call usersService.updateMe with current user id and dto', async () => {
            const dto: UpdateMeDto = {
                username: 'johnny',
                email: 'johnny@example.com',
                firstName: 'Johnny',
                lastName: 'Doel',
            };

            const updatedProfile = {
                ...mockUserProfile,
                ...dto,
                updatedAt: new Date('2024-02-01T00:00:00.000Z'),
            };

            usersService.updateMe.mockResolvedValue(updatedProfile);

            const result = await controller.updateMe({ userId: 'cuid_123' }, dto);

            expect(usersService.updateMe).toHaveBeenCalledWith('cuid_123', dto);
            expect(usersService.updateMe).toHaveBeenCalledTimes(1);
            expect(result).toEqual(updatedProfile);
        });

        it('should support partial dto update', async () => {
            const dto: UpdateMeDto = {
                firstName: 'Updated John',
            };

            const updatedProfile = {
                ...mockUserProfile,
                firstName: 'Updated John',
                updatedAt: new Date('2024-02-01T00:00:00.000Z'),
            };

            usersService.updateMe.mockResolvedValue(updatedProfile);

            const result = await controller.updateMe({ userId: 'cuid_123' }, dto);

            expect(usersService.updateMe).toHaveBeenCalledWith('cuid_123', dto);
            expect(result.firstName).toBe('Updated John');
        });

        it('should propagate errors from usersService.updateMe', async () => {
            const dto: UpdateMeDto = {
                email: 'taken@example.com',
            };

            usersService.updateMe.mockRejectedValue(new Error('Email already taken'));

            await expect(controller.updateMe({ userId: 'cuid_123' }, dto)).rejects.toThrow('Email already taken');
        });
    });
});
