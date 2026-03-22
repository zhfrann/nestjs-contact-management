import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Request, Response } from 'express';
import { REFRESH_COOKIE_NAME } from 'src/common/constants/refresh-cookie.constant';
import { ConfigService } from '@nestjs/config';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly config: ConfigService,
    ) {}

    @Post('register')
    @ResponseMessage(I18N_KEYS.auth.response.registerSuccess)
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @ResponseMessage(I18N_KEYS.auth.response.loginSuccess)
    async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.login({
            identifier: dto.identifier,
            password: dto.password,
            userAgent: req.get('user-agent') ?? undefined,
            ipAddress: req.ip,
        });

        // set refresh cookie
        res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
            httpOnly: true,
            secure: this.config.get<string>('NODE_ENV') === 'production',
            sameSite: 'lax',
            path: '/v1/auth', // Endpoint refresh + logout can also get cookies
        });

        return {
            accessToken: result.accessToken,
            user: result.user,
        };
    }

    @Post('refresh')
    @ResponseMessage(I18N_KEYS.auth.response.refreshSuccess)
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const cookieName = REFRESH_COOKIE_NAME;
        const refreshToken = req.cookies?.[cookieName] as string | undefined;

        if (!refreshToken) {
            throw new (await import('@nestjs/common')).UnauthorizedException({
                i18nKey: I18N_KEYS.auth.error.refreshTokenMissing,
            });
        }

        const result = await this.authService.refresh(refreshToken);

        // rotate cookie
        res.cookie(cookieName, result.refreshToken, {
            httpOnly: true,
            secure: this.config.get<string>('NODE_ENV') === 'production',
            sameSite: 'lax',
            path: '/v1/auth', // Endpoint refresh + logout can also get cookies
        });

        return { accessToken: result.accessToken };
    }

    @Post('logout')
    @ResponseMessage(I18N_KEYS.auth.response.logoutSuccess)
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const cookieName = REFRESH_COOKIE_NAME;
        const refreshToken = req.cookies?.[cookieName] as string | undefined;

        if (refreshToken) {
            await this.authService.logout(refreshToken);
        }

        // clear cookie
        res.clearCookie(cookieName, {
            httpOnly: true,
            secure: this.config.get<string>('NODE_ENV') === 'production',
            sameSite: 'lax',
            path: '/v1/auth',
        });

        return { ok: true };
    }
}
