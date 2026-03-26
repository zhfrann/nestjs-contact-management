import { Test, TestingModule } from '@nestjs/testing';
import { ContactsService } from './contacts.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';

describe('ContactsService', () => {
    let service: ContactsService;
    let prisma: {
        contact: {
            findFirst: jest.Mock;
            create: jest.Mock;
            update: jest.Mock;
        };
    };

    const mockContact = {
        id: 'contact_123',
        ownerId: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '081234567890',
        notes: 'School friend',
        isFavorite: false,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        deletedAt: null,
    };

    beforeEach(async () => {
        prisma = {
            contact: {
                findFirst: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContactsService,
                {
                    provide: PrismaService,
                    useValue: prisma,
                },
            ],
        }).compile();

        service = module.get<ContactsService>(ContactsService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create new contact successfully with all fields', async () => {
            prisma.contact.findFirst.mockResolvedValue(null);
            prisma.contact.create.mockResolvedValue(mockContact);

            const result = await service.create('user_123', {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phone: '081234567890',
                notes: 'School friend',
            });

            expect(prisma.contact.findFirst).toHaveBeenCalledWith({
                where: {
                    ownerId: 'user_123',
                    phone: '081234567890',
                    deletedAt: null,
                },
            });

            expect(prisma.contact.create).toHaveBeenCalledWith({
                data: {
                    ownerId: 'user_123',
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    phone: '081234567890',
                    notes: 'School friend',
                },
            });

            expect(result).toEqual(mockContact);
        });

        it('should create contact and map optional fields to null when omitted', async () => {
            const contactWithoutOptionalFields = {
                ...mockContact,
                lastName: null,
                email: null,
                notes: null,
            };

            prisma.contact.findFirst.mockResolvedValue(null);
            prisma.contact.create.mockResolvedValue(contactWithoutOptionalFields);

            const result = await service.create('user_123', {
                firstName: 'John',
                phone: '081234567890',
            });

            expect(prisma.contact.create).toHaveBeenCalledWith({
                data: {
                    ownerId: 'user_123',
                    firstName: 'John',
                    lastName: null,
                    email: null,
                    phone: '081234567890',
                    notes: null,
                },
            });

            expect(result).toEqual(contactWithoutOptionalFields);
        });

        it('should throw ConflictException when phone already exists for the same user', async () => {
            prisma.contact.findFirst.mockResolvedValue(mockContact);

            let caughtError: unknown;

            try {
                await service.create('user_123', {
                    firstName: 'John',
                    phone: '081234567890',
                });
            } catch (error) {
                caughtError = error;
            }

            expect(prisma.contact.findFirst).toHaveBeenCalledWith({
                where: {
                    ownerId: 'user_123',
                    phone: '081234567890',
                    deletedAt: null,
                },
            });
            expect(caughtError).toBeInstanceOf(ConflictException);
            expect((caughtError as ConflictException).getResponse()).toEqual({
                i18nKey: I18N_KEYS.contacts.error.conflict,
            });
            expect(prisma.contact.create).not.toHaveBeenCalled();
        });

        it('should propagate database errors from create', async () => {
            prisma.contact.findFirst.mockResolvedValue(null);
            prisma.contact.create.mockRejectedValue(new Error('Database error'));

            await expect(
                service.create('user_123', {
                    firstName: 'John',
                    phone: '081234567890',
                }),
            ).rejects.toThrow('Database error');
        });
    });

    describe('findByIdOrThrow', () => {
        it('should return contact when it exists and belongs to the user', async () => {
            prisma.contact.findFirst.mockResolvedValue(mockContact);

            const result = await service.findByIdOrThrow('user_123', 'contact_123');

            expect(prisma.contact.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 'contact_123',
                    ownerId: 'user_123',
                    deletedAt: null,
                },
            });
            expect(result).toEqual(mockContact);
        });

        it('should throw NotFoundException when contact is not found', async () => {
            prisma.contact.findFirst.mockResolvedValue(null);

            let caughtError: unknown;

            try {
                await service.findByIdOrThrow('user_123', 'missing_contact');
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeInstanceOf(NotFoundException);
            expect((caughtError as NotFoundException).getResponse()).toEqual({
                i18nKey: I18N_KEYS.contacts.error.notFound,
            });
        });
    });

    describe('update', () => {
        it('should update contact successfully when input is valid', async () => {
            const updatedContact = {
                ...mockContact,
                firstName: 'Johnny',
                lastName: 'Updated',
                email: 'johnny@example.com',
                phone: '089999999999',
                notes: 'Updated notes',
                isFavorite: true,
                updatedAt: new Date('2024-02-01T00:00:00.000Z'),
            };

            prisma.contact.findFirst
                .mockResolvedValueOnce(mockContact) // findByIdOrThrow
                .mockResolvedValueOnce(null); // duplicate phone check

            prisma.contact.update.mockResolvedValue(updatedContact);

            const result = await service.update('user_123', 'contact_123', {
                firstName: 'Johnny',
                lastName: 'Updated',
                email: 'johnny@example.com',
                phone: '089999999999',
                notes: 'Updated notes',
                isFavorite: true,
            });

            expect(prisma.contact.findFirst).toHaveBeenNthCalledWith(1, {
                where: {
                    id: 'contact_123',
                    ownerId: 'user_123',
                    deletedAt: null,
                },
            });

            expect(prisma.contact.findFirst).toHaveBeenNthCalledWith(2, {
                where: {
                    ownerId: 'user_123',
                    phone: '089999999999',
                    deletedAt: null,
                    NOT: { id: 'contact_123' },
                },
            });

            expect(prisma.contact.update).toHaveBeenCalledWith({
                where: { id: 'contact_123' },
                data: {
                    firstName: 'Johnny',
                    lastName: 'Updated',
                    email: 'johnny@example.com',
                    phone: '089999999999',
                    notes: 'Updated notes',
                    isFavorite: true,
                },
            });

            expect(result).toEqual(updatedContact);
        });

        it('should update partial fields and skip duplicate phone check when phone is not provided', async () => {
            const updatedContact = {
                ...mockContact,
                firstName: 'Only Name Updated',
                isFavorite: true,
                updatedAt: new Date('2024-02-01T00:00:00.000Z'),
            };

            prisma.contact.findFirst.mockResolvedValueOnce(mockContact); // only findByIdOrThrow
            prisma.contact.update.mockResolvedValue(updatedContact);

            const result = await service.update('user_123', 'contact_123', {
                firstName: 'Only Name Updated',
                isFavorite: true,
            });

            expect(prisma.contact.findFirst).toHaveBeenCalledTimes(1);
            expect(prisma.contact.update).toHaveBeenCalledWith({
                where: { id: 'contact_123' },
                data: {
                    firstName: 'Only Name Updated',
                    lastName: undefined,
                    email: undefined,
                    phone: undefined,
                    notes: undefined,
                    isFavorite: true,
                },
            });

            expect(result).toEqual(updatedContact);
        });

        it('should throw NotFoundException when contact does not exist', async () => {
            prisma.contact.findFirst.mockResolvedValue(null);

            let caughtError: unknown;

            try {
                await service.update('user_123', 'missing_contact', {
                    firstName: 'Updated',
                });
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeInstanceOf(NotFoundException);
            expect((caughtError as NotFoundException).getResponse()).toEqual({
                i18nKey: I18N_KEYS.contacts.error.notFound,
            });

            expect(prisma.contact.update).not.toHaveBeenCalled();
        });

        it('should throw ConflictException when phone is already used by another contact of the same user', async () => {
            prisma.contact.findFirst
                .mockResolvedValueOnce(mockContact) // findByIdOrThrow
                .mockResolvedValueOnce({
                    ...mockContact,
                    id: 'contact_other',
                    phone: '089999999999',
                }); // duplicate phone

            let caughtError: unknown;

            try {
                await service.update('user_123', 'contact_123', {
                    phone: '089999999999',
                });
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeInstanceOf(ConflictException);
            expect((caughtError as ConflictException).getResponse()).toEqual({
                i18nKey: I18N_KEYS.contacts.error.conflict,
            });

            expect(prisma.contact.update).not.toHaveBeenCalled();
        });
    });
});
