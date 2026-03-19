import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import * as argon2 from 'argon2';
import { LoginRequest, RegisterRequest } from './types/auth-request.type';
import { LoginResponse, RegisterResponse } from './types/auth-response.type';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { computeExpiryDate, sha256 } from './utils/auth.util';
import { AccessTokenPayload, RefreshTokenPayload } from './types/jwt-payload.type';
import type { StringValue } from 'ms';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
    ) {}

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

    async login(params: LoginRequest): Promise<LoginResponse> {
        const user = await this.usersService.findByIdentifier(params.identifier);

        // Will return invalid credentials if user not found or password does not match
        if (!user || !(await argon2.verify(user.passwordHash, params.password))) {
            throw new UnauthorizedException({ i18nKey: I18N_KEYS.auth.error.invalidCredentials });
        }

        // Make auth_sessions
        const refreshExpiresIn = (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as StringValue;
        const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET')!;

        const expiresAt = computeExpiryDate(refreshExpiresIn);
        const session = await this.prisma.authSession.create({
            data: {
                userId: user.id,
                refreshTokenHash: 'TEMP', // will be updated with actual token after session creation
                userAgent: params.userAgent ?? null,
                ipAddress: params.ipAddress ?? null,
                expiresAt: expiresAt,
            },
        });

        const refreshTokenPayload: RefreshTokenPayload = { sub: user.id, sid: session.id };
        const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
            secret: refreshSecret,
            expiresIn: refreshExpiresIn,
        });

        // save hash token to session
        await this.prisma.authSession.update({
            where: { id: session.id },
            data: { refreshTokenHash: sha256(refreshToken) },
        });

        const accessTokenPayload: AccessTokenPayload = { sub: user.id };
        const accessToken = await this.jwtService.signAsync(accessTokenPayload);

        return {
            accessToken: accessToken,
            refreshToken: refreshToken, // Auth Controller that will set the cookie
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                photoUrl: user.photoUrl,
                status: user.status,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        };
    }
}
