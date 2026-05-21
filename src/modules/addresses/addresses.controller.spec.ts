import { Test, TestingModule } from '@nestjs/testing';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

describe('AddressesController', () => {
    let controller: AddressesController;
    let addressesService: {
        create: jest.Mock;
        getById: jest.Mock;
        list: jest.Mock;
        update: jest.Mock;
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
            getById: jest.fn(),
            list: jest.fn(),
            update: jest.fn(),
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

    describe('getById', () => {
        it('should call addressesService.getById with current user id, contact id, and address id', async () => {
            addressesService.getById.mockResolvedValue(mockAddress);

            const result = await controller.getById({ userId: 'user_123' }, 'contact_123', 'addr_123');

            expect(addressesService.getById).toHaveBeenCalledWith('user_123', 'contact_123', 'addr_123');
            expect(addressesService.getById).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockAddress);
        });

        it('should propagate errors from addressesService.getById', async () => {
            addressesService.getById.mockRejectedValue(new Error('Service error'));

            await expect(controller.getById({ userId: 'user_123' }, 'contact_123', 'missing_addr')).rejects.toThrow('Service error');
        });
    });

    describe('list', () => {
        it('should call addressesService.list with current user id and contact id', async () => {
            const listResult = [
                { ...mockAddress, id: 'addr_1', isPrimary: true },
                { ...mockAddress, id: 'addr_2', isPrimary: false },
            ];

            addressesService.list.mockResolvedValue(listResult);

            const result = await controller.list({ userId: 'user_123' }, 'contact_123');

            expect(addressesService.list).toHaveBeenCalledWith('user_123', 'contact_123');
            expect(addressesService.list).toHaveBeenCalledTimes(1);
            expect(result).toEqual(listResult);
        });

        it('should propagate errors from addressesService.list', async () => {
            addressesService.list.mockRejectedValue(new Error('Service error'));

            await expect(controller.list({ userId: 'user_123' }, 'contact_123')).rejects.toThrow('Service error');
        });
    });

    describe('update', () => {
        it('should call addressesService.update with current user id, contact id, address id, and dto', async () => {
            const dto: UpdateAddressDto = {
                label: 'WORK',
                isPrimary: true,
            };

            const updatedAddress = {
                ...mockAddress,
                label: 'WORK',
                isPrimary: true,
            };

            addressesService.update.mockResolvedValue(updatedAddress);

            const result = await controller.update({ userId: 'user_123' }, 'contact_123', 'addr_123', dto);

            expect(addressesService.update).toHaveBeenCalledWith('user_123', 'contact_123', 'addr_123', dto);
            expect(addressesService.update).toHaveBeenCalledTimes(1);
            expect(result).toEqual(updatedAddress);
        });

        it('should support partial dto update', async () => {
            const dto: UpdateAddressDto = {
                city: 'Bandung',
            };

            const updatedAddress = {
                ...mockAddress,
                city: 'Bandung',
            };

            addressesService.update.mockResolvedValue(updatedAddress);

            const result = await controller.update({ userId: 'user_123' }, 'contact_123', 'addr_123', dto);

            expect(addressesService.update).toHaveBeenCalledWith('user_123', 'contact_123', 'addr_123', dto);
            expect(result).toEqual(updatedAddress);
        });

        it('should propagate errors from addressesService.update', async () => {
            const dto: UpdateAddressDto = {
                city: 'Bandung',
            };

            addressesService.update.mockRejectedValue(new Error('Service error'));

            await expect(controller.update({ userId: 'user_123' }, 'contact_123', 'addr_123', dto)).rejects.toThrow('Service error');
        });
    });
});
