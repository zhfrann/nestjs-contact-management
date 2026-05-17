import { Injectable, NotFoundException } from '@nestjs/common';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class AddressesService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Helper function to assert that the user is the owner of the contact
     * @param userId The ID of the user
     * @param contactId The ID of the contact
     * @returns The found contact
     * @throws `NotFoundException` if the contact is not found or not owned by the user
     */
    private async assertContactOwner(userId: string, contactId: string) {
        const contact = await this.prisma.contact.findFirst({
            where: { id: contactId, ownerId: userId, deletedAt: null },
            select: { id: true },
        });

        if (!contact) {
            throw new NotFoundException({ i18nKey: I18N_KEYS.contacts.error.notFound });
        }
    }

    /**
     * Helper function to find an address or throw a NotFoundException
     * @param userId The ID of the user
     * @param contactId The ID of the contact
     * @param addressId The ID of the address
     * @returns The found address
     * @throws `NotFoundException` if the address is not found
     */
    private async findAddressOrThrow(userId: string, contactId: string, addressId: string) {
        // Ownership check via join: address -> contact(ownerId)
        const address = await this.prisma.address.findFirst({
            where: {
                id: addressId,
                contactId: contactId,
                contact: { ownerId: userId, deletedAt: null },
            },
        });

        if (!address) {
            throw new NotFoundException({ i18nKey: I18N_KEYS.addresses.error.notFound });
        }

        return address;
    }

    async create(
        userId: string,
        contactId: string,
        input: {
            label?: 'HOME' | 'WORK' | 'OTHER';
            street: string;
            city: string;
            province: string;
            postalCode: string;
            countryCode: string; // ISO 3166-1 alpha-2 code, ex: ID, US, SG
            isPrimary?: boolean;
        },
    ) {
        await this.assertContactOwner(userId, contactId);

        const wantPrimary = input.isPrimary === true;

        // Transaction to ensure atomicity of primary address update and address creation
        return this.prisma.$transaction(async (tx) => {
            // If wantPrimary is true, set all other addresses to non-primary
            if (wantPrimary) {
                await tx.address.updateMany({
                    where: {
                        contactId: contactId,
                        isPrimary: true,
                    },
                    data: { isPrimary: false },
                });
            } else {
                // If no primary address exists, set this one to be primary
                const hasAtlestOnePrimary = await tx.address.findFirst({
                    where: {
                        contactId: contactId,
                        isPrimary: true,
                    },
                    select: { id: true },
                });

                if (!hasAtlestOnePrimary) {
                    input.isPrimary = true;
                }
            }

            return tx.address.create({
                data: {
                    contactId: contactId,
                    label: input.label ?? 'HOME',
                    street: input.street,
                    city: input.city,
                    province: input.province,
                    postalCode: input.postalCode,
                    countryCode: input.countryCode,
                    isPrimary: input.isPrimary ?? false,
                },
            });
        });
    }
}
