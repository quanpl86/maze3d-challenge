// src/types/custom.d.ts

/**
 * This declaration file tells TypeScript that the 'js-interpreter' module exists,
 * even though it doesn't have its own .d.ts typings.
 * This effectively types the module as 'any', suppressing import errors.
 */
declare module 'js-interpreter';