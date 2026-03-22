import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(30)
    @Matches(/^[a-zA-Z0-9_]+$/, {
        message: 'username can only contain letters, numbers, and underscores',
    })
    @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
    username?: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(254)
    @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    email?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(50)
    @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
    firstName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
    lastName?: string;
}
