export type AccessTokenPayload = {
    sub: string; // userId
};

export type RefreshTokenPayload = {
    sub: string; // userId
    sid: string; // sessionId (auth_sessions.id)
};
