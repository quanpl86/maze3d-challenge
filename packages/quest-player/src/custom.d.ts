// packages/quest-player/src/custom.d.ts

/**
 * This declaration file tells TypeScript that the 'js-interpreter' module exists,
 * even though it doesn't have its own .d.ts typings.
 * This effectively types the module as 'any', suppressing import errors.
 */
declare module 'js-interpreter';

/**
 * This tells TypeScript how to handle imports for various static assets.
 */
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';