import { Test, TestingModule } from '@nestjs/testing';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';

describe('AddressesController', () => {
    let controller: AddressesController;
    let addressesService: {
        create: jest.Mock;
    };

    const mockAddress = {
        id: 'addr_123',
        contactId: 'contact_123',
        label: 'HOME',
        street: 'Jl. Merdeka No. 1',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
        countryCode: 'ID',
        isPrimary: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    beforeEach(async () => {
        addressesService = {
            create: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AddressesController],
            providers: [
                {
                    provide: AddressesService,
                    useValue: addressesService,
                },
            ],
        }).compile();

        controller = module.get<AddressesController>(AddressesController);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should call addressesService.create with current user id, contact id, and dto', async () => {
            const dto: CreateAddressDto = {
                label: 'WORK',
                street: 'Jl. Sudirman No. 10',
                city: 'Jakarta',
                province: 'DKI Jakarta',
                postalCode: '10220',
                countryCode: 'ID',
                isPrimary: true,
            };

            const createdAddress = {
                ...mockAddress,
                label: 'WORK',
                street: 'Jl. Sudirman No. 10',
                postalCode: '10220',
            };

            addressesService.create.mockResolvedValue(createdAddress);

            const result = await controller.create({ userId: 'user_123' }, 'contact_123', dto);

            expect(addressesService.create).toHaveBeenCalledWith('user_123', 'contact_123', dto);
            expect(addressesService.create).toHaveBeenCalledTimes(1);
            expect(result).toEqual(createdAddress);
        });

        it('should support dto with required fields only', async () => {
            const dto: CreateAddressDto = {
                street: 'Jl. Merdeka No. 1',
                city: 'Jakarta',
                province: 'DKI Jakarta',
                postalCode: '12345',
                countryCode: 'ID',
            };

            const createdAddress = {
                ...mockAddress,
                label: 'HOME',
                isPrimary: false,
            };

            addressesService.create.mockResolvedValue(createdAddress);

            const result = await controller.create({ userId: 'user_123' }, 'contact_123', dto);

            expect(addressesService.create).toHaveBeenCalledWith('user_123', 'contact_123', dto);
            expect(result).toEqual(createdAddress);
        });

        it('should propagate errors from addressesService.create', async () => {
            const dto: CreateAddressDto = {
                street: 'Jl. Merdeka No. 1',
                city: 'Jakarta',
                province: 'DKI Jakarta',
                postalCode: '12345',
                countryCode: 'ID',
            };

            addressesService.create.mockRejectedValue(new Error('Service error'));

            await expect(controller.create({ userId: 'user_123' }, 'contact_123', dto)).rejects.toThrow('Service error');
        });
    });
});
