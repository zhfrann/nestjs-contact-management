import { Test, TestingModule } from '@nestjs/testing';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

describe('ContactsController', () => {
    let controller: ContactsController;
    let contactsService: {
        create: jest.Mock;
        get: jest.Mock;
        update: jest.Mock;
    };

    const mockCreatedContact = {
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
        contactsService = {
            create: jest.fn(),
            get: jest.fn(),
            update: jest.fn(),
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

    describe('get', () => {
        it('should call contactsService.get with current user id and contact id', async () => {
            contactsService.get.mockResolvedValue(mockCreatedContact);

            const result = await controller.get({ userId: 'user_123' }, 'contact_123');

            expect(contactsService.get).toHaveBeenCalledWith('user_123', 'contact_123');
            expect(contactsService.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockCreatedContact);
        });

        it('should propagate errors from contactsService.get', async () => {
            contactsService.get.mockRejectedValue(new Error('Service error'));

            await expect(controller.get({ userId: 'user_123' }, 'missing_contact')).rejects.toThrow('Service error');
        });
    });

    describe('update', () => {
        it('should call contactsService.update with current user id, contact id, and dto', async () => {
            const dto: UpdateContactDto = {
                firstName: 'Johnny',
                phone: '089999999999',
                isFavorite: true,
            };

            const updatedContact = {
                ...mockCreatedContact,
                firstName: 'Johnny',
                phone: '089999999999',
                isFavorite: true,
                updatedAt: new Date('2024-02-01T00:00:00.000Z'),
            };

            contactsService.update.mockResolvedValue(updatedContact);

            const result = await controller.update({ userId: 'user_123' }, 'contact_123', dto);

            expect(contactsService.update).toHaveBeenCalledWith('user_123', 'contact_123', dto);
            expect(contactsService.update).toHaveBeenCalledTimes(1);
            expect(result).toEqual(updatedContact);
        });

        it('should support partial update dto', async () => {
            const dto: UpdateContactDto = {
                isFavorite: true,
            };

            const updatedContact = {
                ...mockCreatedContact,
                isFavorite: true,
                updatedAt: new Date('2024-02-01T00:00:00.000Z'),
            };

            contactsService.update.mockResolvedValue(updatedContact);

            const result = await controller.update({ userId: 'user_123' }, 'contact_123', dto);

            expect(contactsService.update).toHaveBeenCalledWith('user_123', 'contact_123', dto);
            expect(result).toEqual(updatedContact);
        });

        it('should propagate errors from contactsService.update', async () => {
            const dto: UpdateContactDto = {
                phone: '089999999999',
            };

            contactsService.update.mockRejectedValue(new Error('Service error'));

            await expect(controller.update({ userId: 'user_123' }, 'contact_123', dto)).rejects.toThrow('Service error');
        });
    });
});
