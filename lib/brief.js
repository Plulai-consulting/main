// Shared (safe for the browser): what a usable marketing brief must contain.
export const REQUIRED = ['brand_name', 'offer', 'audience', 'customer_journey', 'goal', 'channels', 'voice'];
export const briefOK = (b) =>
  !!b && REQUIRED.every((k) => (Array.isArray(b[k]) ? b[k].length > 0 : String(b[k] || '').trim().length > 1));
