import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateContactDto } from './dto/create-contact.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateContactDto } from './dto/update-contact.dto';

@Controller({ path: 'contacts', version: '1' })
@UseGuards(JwtAuthGuard)
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) {}

    @Post()
    @ResponseMessage(I18N_KEYS.contacts.response.createSuccess)
    create(@CurrentUser() user: { userId: string }, @Body() dto: CreateContactDto) {
        return this.contactsService.create(user.userId, dto);
    }

    @Patch(':id')
    @ResponseMessage(I18N_KEYS.contacts.response.updateSuccess)
    update(@CurrentUser() user: { userId: string }, @Param('id') id: string, @Body() dto: UpdateContactDto) {
        return this.contactsService.update(user.userId, id, dto);
    }
}
