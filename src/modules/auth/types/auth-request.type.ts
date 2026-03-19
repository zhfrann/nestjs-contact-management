export type RegisterRequest = {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
};

export type LoginRequest = {
    identifier: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
};
