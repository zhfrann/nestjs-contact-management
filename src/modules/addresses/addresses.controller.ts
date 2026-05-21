import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateAddressDto } from './dto/create-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { UpdateAddressDto } from './dto/update-address.dto';

@Controller({ path: 'contacts/:contactId/addresses', version: '1' })
@UseGuards(JwtAuthGuard)
export class AddressesController {
    constructor(private readonly addressesService: AddressesService) { }

    @Post()
    @ResponseMessage(I18N_KEYS.addresses.response.createSuccess)
    create(@CurrentUser() user: { userId: string }, @Param('contactId') contactId: string, @Body() dto: CreateAddressDto) {
        return this.addressesService.create(user.userId, contactId, dto);
    }

    @Get(':addressId')
    @ResponseMessage(I18N_KEYS.addresses.response.getAddressSuccess)
    getById(@CurrentUser() user: { userId: string }, @Param('contactId') contactId: string, @Param('addressId') addressId: string) {
        return this.addressesService.getById(user.userId, contactId, addressId);
    }

    @Get()
    @ResponseMessage(I18N_KEYS.addresses.response.getAllAddressesSuccess)
    list(@CurrentUser() user: { userId: string }, @Param('contactId') contactId: string) {
        return this.addressesService.list(user.userId, contactId);
    }

    @Patch(':addressId')
    @ResponseMessage(I18N_KEYS.addresses.response.updateSuccess)
    update(
        @CurrentUser() user: { userId: string },
        @Param('contactId') contactId: string,
        @Param('addressId') addressId: string,
        @Body() dto: UpdateAddressDto,
    ) {
        return this.addressesService.update(user.userId, contactId, addressId, dto);
    }
}
