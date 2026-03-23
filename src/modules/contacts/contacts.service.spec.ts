import { Test, TestingModule } from '@nestjs/testing';
import { ContactsService } from './contacts.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';

describe('ContactsService', () => {
    let service: ContactsService;
    let prisma: {
        contact: {
            findFirst: jest.Mock;
            create: jest.Mock;
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
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        deletedAt: null,
    };

    beforeEach(async () => {
        prisma = {
            contact: {
                findFirst: jest.fn(),
                create: jest.fn(),
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
});
