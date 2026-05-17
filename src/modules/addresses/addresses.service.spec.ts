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
        $transaction: jest.Mock;
    };
    let tx: {
        address: {
            updateMany: jest.Mock;
            findFirst: jest.Mock;
            create: jest.Mock;
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
            },
        };

        prisma = {
            contact: {
                findFirst: jest.fn(),
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
});
