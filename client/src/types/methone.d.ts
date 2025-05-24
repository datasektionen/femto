/**
 * Type declaration shim for the 'methone' module.
 *
 * The 'methone' package does not include its own TypeScript types.
 * Without this file, importing 'methone' will cause a TS7016 error: "Could not find a declaration file for module 'methone'."
 * This declaration avoids type errors by telling TypeScript to treat 'methone' as 'any'.
 * It enables us to import Methone components without strict typing.
 */
declare module 'methone';