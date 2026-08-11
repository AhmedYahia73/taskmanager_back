// src/utils/tokenBlacklist.ts

const blacklistedTokens = new Set<string>();

export const addToBlacklist = (token: string) => {
    blacklistedTokens.add(token);
};

export const isBlacklisted = (token: string): boolean => {
    return blacklistedTokens.has(token);
};
