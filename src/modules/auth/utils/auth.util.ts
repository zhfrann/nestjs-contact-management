import { createHash } from 'node:crypto';

const DURATION_MS = {
    s: 1_000, // 1 second
    m: 60_000, // 1 minute
    h: 3_600_000, // 1 hour
    d: 86_400_000, //1 day
} as const;

type DurationUnit = keyof typeof DURATION_MS;

/**
 * Computes the expiry date used for auth sessions based on the given expiresIn string
 * @param expiresIn String value representing the duration (e.g. '15m', '7d', '12h'). The permitted units are 's' (seconds), 'm' (minutes), 'h' (hours), 'd' (days).
 * @returns the expiry date on Date object
 * @throws Error if the expiresIn value is invalid
 */
export function computeExpiryDate(expiresIn: string): Date {
    // simple parser: '15m', '7d', '12h'
    const match = /^(\d+)(s|m|h|d)$/.exec(expiresIn.trim());
    if (!match) {
        // fallback to 7 day
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    const value = Number(match[1]);
    const unit = match[2] as DurationUnit;

    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`Invalid expiresIn value: "${expiresIn}"`);
    }

    return new Date(Date.now() + value * DURATION_MS[unit]);
}

export function sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
}
