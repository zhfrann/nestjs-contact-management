import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

const LABELS = ['HOME', 'WORK', 'OTHER'] as const;

export class UpdateAddressDto {
    @IsOptional()
    @IsIn(LABELS)
    label?: (typeof LABELS)[number];

    @IsOptional()
    @IsString()
    @MaxLength(200)
    @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
    street?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
    city?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
    province?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
    postalCode?: string;

    // ISO 3166-1 alpha-2 code, ex: ID, US, SG
    @IsOptional()
    @IsString()
    @Length(2, 2) // minLength: 2, maxLength: 2
    @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim().toUpperCase() : value))
    countryCode?: string;

    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;
}
