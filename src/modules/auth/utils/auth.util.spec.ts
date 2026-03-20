import { computeExpiryDate, sha256 } from './auth.util';

describe('auth.util', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-03-20T00:00:00.000Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('computeExpiryDate', () => {
        it.each([
            ['15s', 15 * 1000],
            ['10m', 10 * 60 * 1000],
            ['2h', 2 * 60 * 60 * 1000],
            ['7d', 7 * 24 * 60 * 60 * 1000],
        ])('should compute correct expiry date for %s', (input, expectedMs) => {
            const result = computeExpiryDate(input);

            expect(result).toEqual(new Date(Date.now() + expectedMs));
        });

        it('should trim whitespace before parsing', () => {
            const result = computeExpiryDate(' 15m ');

            expect(result).toEqual(new Date(Date.now() + 15 * 60 * 1000));
        });

        it('should fallback to 7 days for invalid format', () => {
            const result = computeExpiryDate('invalid');

            expect(result).toEqual(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
        });

        it('should fallback to 7 days for unsupported unit', () => {
            const result = computeExpiryDate('10w');

            expect(result).toEqual(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
        });

        it('should throw error for zero value', () => {
            expect(() => computeExpiryDate('0d')).toThrow('Invalid expiresIn value: "0d"');
        });
    });

    describe('sha256', () => {
        it('should return correct sha256 hash for a standard string', () => {
            const result = sha256('hello');
            expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
        });

        it('should return correct sha256 hash for an empty string', () => {
            const result = sha256('');
            expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
        });

        it('should return same hash for same input', () => {
            expect(sha256('refresh-token')).toBe(sha256('refresh-token'));
        });

        it('should return different hash for different input', () => {
            expect(sha256('token-1')).not.toBe(sha256('token-2'));
        });
    });
});
