import { Injectable } from '@nestjs/common';
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
}
