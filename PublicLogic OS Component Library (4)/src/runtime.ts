export const IS_FIGMA =
  typeof window !== 'undefined' &&
  window.location.hostname.includes('figma');

export const IS_LOCALHOST =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const FORCE_LOCAL_AUTH = import.meta.env.VITE_FORCE_AUTH_LOCAL === 'true';

export const IS_DEMO =
  import.meta.env.VITE_DEMO_MODE === 'true' || IS_FIGMA || (IS_LOCALHOST && !FORCE_LOCAL_AUTH);
