import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export type CurrentUserData = { userId: string };

/**
 * Get current user from Express Request Object at request.user
 */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as CurrentUserData;
});
// export const CurrentUser = (...args: string[]) => SetMetadata('current-user', args);
