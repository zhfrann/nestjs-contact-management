import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateMeDto } from './dto/update-me.dto';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';

@Controller({ path: 'users', version: '1' })
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMe(@CurrentUser() user: { userId: string }) {
        return this.usersService.getMe(user.userId);
    }

    @Patch('me')
    @UseGuards(JwtAuthGuard)
    @ResponseMessage(I18N_KEYS.users.response.profileUpdateSuccess)
    updateMe(@CurrentUser() user: { userId: string }, @Body() dto: UpdateMeDto) {
        return this.usersService.updateMe(user.userId, dto);
    }
}
