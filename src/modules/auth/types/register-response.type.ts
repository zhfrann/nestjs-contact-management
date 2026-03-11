import { UserStatus } from 'src/generated/prisma/enums';

export type RegisterResponse = {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string | null;
    photoUrl: string | null;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
};
