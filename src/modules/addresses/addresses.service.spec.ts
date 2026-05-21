import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { AddressesService } from './addresses.service';

describe('AddressesService', () => {
    let service: AddressesService;
    let prisma: {
        contact: {
            findFirst: jest.Mock;
        };
        address: {
            findFirst: jest.Mock;
            findMany: jest.Mock;
        };
        $transaction: jest.Mock;
    };
    let tx: {
        address: {
            updateMany: jest.Mock;
            findFirst: jest.Mock;
            create: jest.Mock;
            update: jest.Mock;
        };
    };

    const baseInput = {
        street: 'Jl. Merdeka No. 1',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
        countryCode: 'ID',
    };

    const mockAddress = {
        id: 'addr_123',
        contactId: 'contact_123',
        label: 'HOME',
        street: baseInput.street,
        city: baseInput.city,
        province: baseInput.province,
        postalCode: baseInput.postalCode,
        countryCode: baseInput.countryCode,
        isPrimary: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    beforeEach(async () => {
        tx = {
            address: {
                updateMany: jest.fn(),
                findFirst: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
        };

        prisma = {
            contact: {
                findFirst: jest.fn(),
            },
            address: {
                findFirst: jest.fn(),
                findMany: jest.fn(),
            },
            $transaction: jest.fn((callback: (txParam: typeof tx) => unknown) => callback(tx)),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AddressesService,
                {
                    provide: PrismaService,
                    useValue: prisma,
                },
            ],
        }).compile();

        service = module.get<AddressesService>(AddressesService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should throw NotFoundException when contact is not found', async () => {
            prisma.contact.findFirst.mockResolvedValue(null);

            let caughtError: unknown;

            try {
                await service.create('user_123', 'contact_123', {
                    ...baseInput,
                });
            } catch (error) {
                caughtError = error;
            }

            expect(prisma.contact.findFirst).toHaveBeenCalledWith({
                where: { id: 'contact_123', ownerId: 'user_123', deletedAt: null },
                select: { id: true },
            });
            expect(caughtError).toBeInstanceOf(NotFoundException);
            expect((caughtError as NotFoundException).getResponse()).toEqual({
                i18nKey: I18N_KEYS.contacts.error.notFound,
            });
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('should create primary address and set others non-primary when isPrimary is true', async () => {
            prisma.contact.findFirst.mockResolvedValue({ id: 'contact_123' });
            tx.address.updateMany.mockResolvedValue({ count: 1 });
            tx.address.create.mockResolvedValue({
                ...mockAddress,
                label: 'WORK',
                isPrimary: true,
            });

            const result = await service.create('user_123', 'contact_123', {
                ...baseInput,
                label: 'WORK',
                isPrimary: true,
            });

            expect(prisma.contact.findFirst).toHaveBeenCalledWith({
                where: { id: 'contact_123', ownerId: 'user_123', deletedAt: null },
                select: { id: true },
            });

            expect(prisma.$transaction).toHaveBeenCalledTimes(1);
            expect(tx.address.updateMany).toHaveBeenCalledWith({
                where: { contactId: 'contact_123', isPrimary: true },
                data: { isPrimary: false },
            });
            expect(tx.address.findFirst).not.toHaveBeenCalled();
            expect(tx.address.create).toHaveBeenCalledWith({
                data: {
                    contactId: 'contact_123',
                    label: 'WORK',
                    street: baseInput.street,
                    city: baseInput.city,
                    province: baseInput.province,
                    postalCode: baseInput.postalCode,
                    countryCode: baseInput.countryCode,
                    isPrimary: true,
                },
            });

            expect(result).toEqual({
                ...mockAddress,
                label: 'WORK',
                isPrimary: true,
            });
        });

        it('should set address as primary when no primary exists and isPrimary is omitted', async () => {
            prisma.contact.findFirst.mockResolvedValue({ id: 'contact_123' });
            tx.address.findFirst.mockResolvedValue(null);
            tx.address.create.mockResolvedValue({
                ...mockAddress,
                label: 'HOME',
                isPrimary: true,
            });

            const result = await service.create('user_123', 'contact_123', {
                ...baseInput,
            });

            expect(tx.address.updateMany).not.toHaveBeenCalled();
            expect(tx.address.findFirst).toHaveBeenCalledWith({
                where: { contactId: 'contact_123', isPrimary: true },
                select: { id: true },
            });
            expect(tx.address.create).toHaveBeenCalledWith({
                data: {
                    contactId: 'contact_123',
                    label: 'HOME',
                    street: baseInput.street,
                    city: baseInput.city,
                    province: baseInput.province,
                    postalCode: baseInput.postalCode,
                    countryCode: baseInput.countryCode,
                    isPrimary: true,
                },
            });

            expect(result).toEqual({
                ...mockAddress,
                label: 'HOME',
                isPrimary: true,
            });
        });

        it('should keep isPrimary false when another primary exists and isPrimary is omitted', async () => {
            prisma.contact.findFirst.mockResolvedValue({ id: 'contact_123' });
            tx.address.findFirst.mockResolvedValue({ id: 'addr_primary' });
            tx.address.create.mockResolvedValue({
                ...mockAddress,
                label: 'HOME',
                isPrimary: false,
            });

            const result = await service.create('user_123', 'contact_123', {
                ...baseInput,
            });

            expect(tx.address.updateMany).not.toHaveBeenCalled();
            expect(tx.address.findFirst).toHaveBeenCalledWith({
                where: { contactId: 'contact_123', isPrimary: true },
                select: { id: true },
            });
            expect(tx.address.create).toHaveBeenCalledWith({
                data: {
                    contactId: 'contact_123',
                    label: 'HOME',
                    street: baseInput.street,
                    city: baseInput.city,
                    province: baseInput.province,
                    postalCode: baseInput.postalCode,
                    countryCode: baseInput.countryCode,
                    isPrimary: false,
                },
            });

            expect(result).toEqual({
                ...mockAddress,
                label: 'HOME',
                isPrimary: false,
            });
        });

        it('should propagate errors from address creation inside transaction', async () => {
            prisma.contact.findFirst.mockResolvedValue({ id: 'contact_123' });
            tx.address.updateMany.mockResolvedValue({ count: 0 });
            tx.address.create.mockRejectedValue(new Error('Database error'));

            await expect(
                service.create('user_123', 'contact_123', {
                    ...baseInput,
                    isPrimary: true,
                }),
            ).rejects.toThrow('Database error');

            expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        });
    });

    describe('getById', () => {
        it('should return address when it exists and belongs to the contact owner', async () => {
            prisma.address.findFirst.mockResolvedValue(mockAddress);

            const result = await service.getById('user_123', 'contact_123', 'addr_123');

            expect(prisma.address.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 'addr_123',
                    contactId: 'contact_123',
                    contact: { ownerId: 'user_123', deletedAt: null },
                },
            });
            expect(result).toEqual(mockAddress);
        });

        it('should throw NotFoundException when address is not found', async () => {
            prisma.address.findFirst.mockResolvedValue(null);

            let caughtError: unknown;

            try {
                await service.getById('user_123', 'contact_123', 'missing_addr');
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeInstanceOf(NotFoundException);
            expect((caughtError as NotFoundException).getResponse()).toEqual({
                i18nKey: I18N_KEYS.addresses.error.notFound,
            });
        });
    });

    describe('list', () => {
        it('should return list of addresses ordered by primary and createdAt desc', async () => {
            prisma.contact.findFirst.mockResolvedValue({ id: 'contact_123' });
            prisma.address.findMany.mockResolvedValue([
                { ...mockAddress, id: 'addr_1', isPrimary: true },
                { ...mockAddress, id: 'addr_2', isPrimary: false },
            ]);

            const result = await service.list('user_123', 'contact_123');

            expect(prisma.contact.findFirst).toHaveBeenCalledWith({
                where: { id: 'contact_123', ownerId: 'user_123', deletedAt: null },
                select: { id: true },
            });
            expect(prisma.address.findMany).toHaveBeenCalledWith({
                where: { contactId: 'contact_123' },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
            });

            expect(result).toEqual([
                { ...mockAddress, id: 'addr_1', isPrimary: true },
                { ...mockAddress, id: 'addr_2', isPrimary: false },
            ]);
        });

        it('should throw NotFoundException when contact is not found', async () => {
            prisma.contact.findFirst.mockResolvedValue(null);

            let caughtError: unknown;

            try {
                await service.list('user_123', 'contact_123');
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeInstanceOf(NotFoundException);
            expect((caughtError as NotFoundException).getResponse()).toEqual({
                i18nKey: I18N_KEYS.contacts.error.notFound,
            });
            expect(prisma.address.findMany).not.toHaveBeenCalled();
        });

        it('should propagate errors from prisma.address.findMany', async () => {
            prisma.contact.findFirst.mockResolvedValue({ id: 'contact_123' });
            prisma.address.findMany.mockRejectedValue(new Error('Database error'));

            await expect(service.list('user_123', 'contact_123')).rejects.toThrow('Database error');
        });
    });

    describe('update', () => {
        it('should update address and set other primary to false when isPrimary is true', async () => {
            prisma.address.findFirst.mockResolvedValue(mockAddress);
            tx.address.updateMany.mockResolvedValue({ count: 1 });

            const updatedAddress = {
                ...mockAddress,
                label: 'WORK',
                isPrimary: true,
            };

            tx.address.update.mockResolvedValue(updatedAddress);

            const result = await service.update('user_123', 'contact_123', 'addr_123', {
                label: 'WORK',
                isPrimary: true,
            });

            expect(prisma.address.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 'addr_123',
                    contactId: 'contact_123',
                    contact: { ownerId: 'user_123', deletedAt: null },
                },
            });

            expect(prisma.$transaction).toHaveBeenCalledTimes(1);
            expect(tx.address.updateMany).toHaveBeenCalledWith({
                where: {
                    contactId: 'contact_123',
                    isPrimary: true,
                    NOT: { id: 'addr_123' },
                },
                data: { isPrimary: false },
            });

            expect(tx.address.update).toHaveBeenCalledWith({
                where: { id: 'addr_123' },
                data: {
                    label: 'WORK',
                    street: undefined,
                    city: undefined,
                    province: undefined,
                    postalCode: undefined,
                    countryCode: undefined,
                    isPrimary: true,
                },
            });

            expect(result).toEqual(updatedAddress);
        });

        it('should update only provided fields and skip updateMany when isPrimary is not true', async () => {
            prisma.address.findFirst.mockResolvedValue(mockAddress);

            const updatedAddress = {
                ...mockAddress,
                city: 'Bandung',
            };

            tx.address.update.mockResolvedValue(updatedAddress);

            const result = await service.update('user_123', 'contact_123', 'addr_123', {
                city: 'Bandung',
            });

            expect(tx.address.updateMany).not.toHaveBeenCalled();
            expect(tx.address.update).toHaveBeenCalledWith({
                where: { id: 'addr_123' },
                data: {
                    label: undefined,
                    street: undefined,
                    city: 'Bandung',
                    province: undefined,
                    postalCode: undefined,
                    countryCode: undefined,
                    isPrimary: undefined,
                },
            });

            expect(result).toEqual(updatedAddress);
        });

        it('should throw NotFoundException when address is not found', async () => {
            prisma.address.findFirst.mockResolvedValue(null);

            let caughtError: unknown;

            try {
                await service.update('user_123', 'contact_123', 'missing_addr', {
                    city: 'Bandung',
                });
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeInstanceOf(NotFoundException);
            expect((caughtError as NotFoundException).getResponse()).toEqual({
                i18nKey: I18N_KEYS.addresses.error.notFound,
            });
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('should propagate errors from address update inside transaction', async () => {
            prisma.address.findFirst.mockResolvedValue(mockAddress);
            tx.address.update.mockRejectedValue(new Error('Database error'));

            await expect(
                service.update('user_123', 'contact_123', 'addr_123', {
                    city: 'Bandung',
                }),
            ).rejects.toThrow('Database error');

            expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        });
    });
});
