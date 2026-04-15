import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const SORT_FIELDS = ['firstName', 'lastName', 'email', 'createdAt'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export class SearchContactsDto {
    @IsOptional()
    @IsString()
    @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
    q?: string;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @IsOptional()
    @IsIn(SORT_FIELDS)
    sortBy?: SortField = 'createdAt';

    @IsOptional()
    @IsIn(['asc', 'desc'])
    order?: 'asc' | 'desc' = 'desc';
}
