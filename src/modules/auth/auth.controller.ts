import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { RegisterDto } from './dto/register.dto';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @ResponseMessage(I18N_KEYS.auth.response.registerSuccess)
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }
}
