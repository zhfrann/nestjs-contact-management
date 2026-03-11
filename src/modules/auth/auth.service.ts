import { ConflictException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import * as argon2 from 'argon2';
import { RegisterRequest } from './types/register-request.type';
import { RegisterResponse } from './types/register-response.type';

@Injectable()
export class AuthService {
    constructor(private readonly usersService: UsersService) {}

    async register(request: RegisterRequest): Promise<RegisterResponse> {
        // Duplicate check
        const existingUser = await this.usersService.findByEmailOrUsername({
            email: request.email,
            username: request.username,
        });

        if (existingUser) {
            const i18nKey = existingUser.email === request.email ? I18N_KEYS.auth.error.emailTaken : I18N_KEYS.auth.error.usernameTaken;

            throw new ConflictException({
                i18nKey: i18nKey,
            });
        }

        // Password hashing with argon2
        const passwordHash = await argon2.hash(request.password, {
            type: argon2.argon2id,
        });

        // Create user
        const user = await this.usersService.createUser({
            username: request.username,
            email: request.email,
            passwordHash: passwordHash,
            firstName: request.firstName,
            lastName: request.lastName,
        });

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
}
