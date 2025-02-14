import { blacklist } from "./createBlacklist";

/**
 * Checks if link is blacklisted.
 * 
 * @param {string} link - The link to check.
 * @returns {boolean} - True if the link is in the blacklist, false otherwise.
 */
export function isBlacklisted(link: string): boolean {
    const host = new URL(link).host;
    if (
        blacklist[host] ||
        blacklist[`www.${host}`] ||
        blacklist[host.replace(/www[.]/, "")]
    ) { return true; }
    return false;
}
