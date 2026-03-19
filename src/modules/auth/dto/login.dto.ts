import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
    @IsString()
    @MinLength(3)
    @MaxLength(254)
    @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
    identifier!: string; // username or email

    @IsString()
    @MinLength(8)
    @MaxLength(72)
    password!: string;
}
