import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { UserStatus } from 'src/generated/prisma/enums';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: jest.Mocked<AuthService>;

    const mockRegisterResponse = {
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

    beforeEach(async () => {
        const mockAuthService = {
            register: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get(AuthService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('register', () => {
        it('should call authService.register with dto and return result', async () => {
            // Arrange
            const dto: RegisterDto = {
                username: 'johndoe',
                email: 'john@example.com',
                password: 'SecurePass123!',
                firstName: 'John',
                lastName: 'Doe',
            };
            authService.register.mockResolvedValue(mockRegisterResponse);

            // Act
            const result = await controller.register(dto);

            // Assert
            expect(authService.register).toHaveBeenCalledWith(dto);
            expect(authService.register).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockRegisterResponse);
        });

        it('should propagate errors from authService', async () => {
            // Arrange
            const dto: RegisterDto = {
                username: 'johndoe',
                email: 'john@example.com',
                password: 'SecurePass123!',
                firstName: 'John',
            };
            const error = new Error('Service error');
            authService.register.mockRejectedValue(error);

            // Act & Assert
            await expect(controller.register(dto)).rejects.toThrow('Service error');
        });
    });
});
