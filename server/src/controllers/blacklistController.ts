import { Request, Response } from 'express';


/**
 * Adds a link to the blacklist.
 * 
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the link is added to the blacklist.
 */
export async function addLinkBlacklist(req: Request, res: Response): Promise<void> {
    // TODO: Implement function
};

/**
 * Removes a link from the blacklist.
 * 
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the link is removed from the blacklist.
 */
export async function removeLinkBlacklist(req: Request, res: Response): Promise<void> {
    // TODO: Implement function
};

/**
 * Retrieves all links from the blacklist.
 * 
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the links are retrieved from the blacklist.
 */
export async function getBlacklist(req: Request, res: Response): Promise<void> {
    // TODO: Implement function
};

/**
 * Checks if a link is in the blacklist.
 * 
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the link is checked against the blacklist.
 */
export async function checkLinkBlacklist(req: Request, res: Response): Promise<void> {
    // TODO: Implement function
};