import { ConflictException, Injectable } from '@nestjs/common';
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
}
