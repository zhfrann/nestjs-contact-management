import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateContactDto {
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

    @IsOptional()
    @IsEmail()
    @MaxLength(254)
    @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    email?: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    @MaxLength(30)
    @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
    notes?: string;

    @IsOptional()
    @IsBoolean()
    isFavorite?: boolean;
}
