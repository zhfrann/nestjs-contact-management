import { Test, TestingModule } from '@nestjs/testing';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';

describe('ContactsController', () => {
    let controller: ContactsController;
    let contactsService: {
        create: jest.Mock;
    };

    const mockCreatedContact = {
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
        contactsService = {
            create: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ContactsController],
            providers: [
                {
                    provide: ContactsService,
                    useValue: contactsService,
                },
            ],
        }).compile();

        controller = module.get<ContactsController>(ContactsController);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should call contactsService.create with current user id and dto', async () => {
            const dto: CreateContactDto = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phone: '081234567890',
                notes: 'School friend',
            };

            contactsService.create.mockResolvedValue(mockCreatedContact);

            const result = await controller.create({ userId: 'user_123' }, dto);

            expect(contactsService.create).toHaveBeenCalledWith('user_123', dto);
            expect(contactsService.create).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockCreatedContact);
        });

        it('should support dto with only required fields', async () => {
            const dto: CreateContactDto = {
                firstName: 'John',
                phone: '081234567890',
            };

            const createdContact = {
                ...mockCreatedContact,
                lastName: null,
                email: null,
                notes: null,
            };

            contactsService.create.mockResolvedValue(createdContact);

            const result = await controller.create({ userId: 'user_123' }, dto);

            expect(contactsService.create).toHaveBeenCalledWith('user_123', dto);
            expect(result).toEqual(createdContact);
        });

        it('should propagate errors from contactsService.create', async () => {
            const dto: CreateContactDto = {
                firstName: 'John',
                phone: '081234567890',
            };

            contactsService.create.mockRejectedValue(new Error('Service error'));

            await expect(controller.create({ userId: 'user_123' }, dto)).rejects.toThrow('Service error');
        });
    });
});
