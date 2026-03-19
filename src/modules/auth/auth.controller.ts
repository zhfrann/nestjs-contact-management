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
}
