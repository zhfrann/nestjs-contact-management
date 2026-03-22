import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Finds a user by email or username.
     * Used mainly during registration to detect duplicate credentials.
     */
    async findByEmailOrUsername(params: { email: string; username: string }) {
        return await this.prisma.user.findFirst({
            where: { OR: [{ email: params.email }, { username: params.username }] },
        });
    }

    async findByIdentifier(identifier: string) {
        const normalizedIdentifier = identifier.includes('@') ? identifier.trim().toLowerCase() : identifier.trim();

        return await this.prisma.user.findFirst({
            where: { OR: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }] },
        });
    }

    async findById(id: string) {
        return await this.prisma.user.findUnique({ where: { id: id } });
    }

    async createUser(data: { username: string; email: string; passwordHash: string; firstName: string; lastName?: string }) {
        return await this.prisma.user.create({
            data: {
                username: data.username,
                email: data.email,
                passwordHash: data.passwordHash,
                firstName: data.firstName,
                lastName: data.lastName ?? null,
            },
        });
    }

    async getMe(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            throw new NotFoundException({ i18nKey: I18N_KEYS.error.notFound });
        }

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            photoUrl: user.photoUrl,
            status: user.status,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

    async updateMe(userId: string, input: { username?: string; email?: string; firstName?: string; lastName?: string }) {
        const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!existingUser) {
            throw new NotFoundException({ i18nKey: I18N_KEYS.error.notFound });
        }

        // check for conlifcting username or email
        if (input.email && input.email !== existingUser.email) {
            const emailUsed = await this.prisma.user.findUnique({ where: { email: input.email } });
            if (emailUsed) {
                throw new ConflictException({ i18nKey: I18N_KEYS.users.error.emailTaken });
            }
        }
        if (input.username && input.username !== existingUser.username) {
            const usernameUsed = await this.prisma.user.findUnique({ where: { username: input.username } });
            if (usernameUsed) {
                throw new ConflictException({ i18nKey: I18N_KEYS.users.error.usernameTaken });
            }
        }

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                username: input.username ?? undefined,
                email: input.email ?? undefined,
                firstName: input.firstName ?? undefined,
                lastName: input.lastName ?? undefined,
            },
        });

        return {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            photoUrl: updatedUser.photoUrl,
            status: updatedUser.status,
            createdAt: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt,
        };
    }
}
