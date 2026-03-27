import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class ContactsService {
    constructor(private readonly prisma: PrismaService) {}

    async create(userId: string, input: { firstName: string; lastName?: string; email?: string; phone: string; notes?: string }) {
        // check for duplicate phone number per user
        const existingContact = await this.prisma.contact.findFirst({
            where: { ownerId: userId, phone: input.phone, deletedAt: null },
        });
        if (existingContact) {
            throw new ConflictException({ i18nKey: I18N_KEYS.contacts.error.conflict });
        }

        // Create and return the new contact
        const contact = await this.prisma.contact.create({
            data: {
                ownerId: userId,
                firstName: input.firstName,
                lastName: input.lastName ?? null,
                email: input.email ?? null,
                phone: input.phone,
                notes: input.notes ?? null,
            },
        });

        return contact;
    }

    /**
     * Find a contact by contactId and userId
     * @param userId Contact owner's userId
     * @param contactId
     * @returns the contact if found
     * @throws `NotFoundException` if contact is not found
     */
    async findByIdOrThrow(userId: string, contactId: string) {
        const contact = await this.prisma.contact.findFirst({
            where: { id: contactId, ownerId: userId, deletedAt: null },
        });

        if (!contact) {
            throw new NotFoundException({ i18nKey: I18N_KEYS.contacts.error.notFound });
        }
        return contact;
    }

    async get(userId: string, contactId: string) {
        return await this.findByIdOrThrow(userId, contactId);
    }

    async update(
        userId: string,
        contactId: string,
        input: Partial<{
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
            notes: string;
            isFavorite: boolean;
        }>,
    ) {
        await this.findByIdOrThrow(userId, contactId);

        // If a new phone number is provided, check for duplicate
        if (input.phone) {
            const duplicateNumber = await this.prisma.contact.findFirst({
                where: { ownerId: userId, phone: input.phone, deletedAt: null, NOT: { id: contactId } },
            });
            if (duplicateNumber) {
                throw new ConflictException({ i18nKey: I18N_KEYS.contacts.error.conflict });
            }
        }

        // Update the contact
        return this.prisma.contact.update({
            where: { id: contactId },
            data: {
                firstName: input.firstName ?? undefined,
                lastName: input.lastName ?? undefined,
                email: input.email ?? undefined,
                phone: input.phone ?? undefined,
                notes: input.notes ?? undefined,
                isFavorite: input.isFavorite ?? undefined,
            },
        });
    }
}
