export const STRATEGY_COST = 60;  // 30-day strategy (API cost is roughly $0.20)
export const RESEARCH_COST = 25;  // competitor research with live web search (about $0.10)
export const EXTRA_COST = { ads: 15, whatsapp: 10, emails: 20, outreach: 15 }; // each is one AI call (about $0.03-0.06)
export const EXTRA_LABEL = { ads: 'Ad copy', whatsapp: 'WhatsApp broadcasts', emails: 'Email sequence', outreach: 'Influencer outreach' };
export const RETENTION_DAYS = 90; // results are deleted after this many days (override with the RETENTION_DAYS env var in the sweep job)
// Fill these in: they appear on the legal pages.
export const COMPANY = {
  name: '[Company legal name]',
  brand: 'Pllulai Studio',
  email: '[support email address]',
  address: '[Company address, United Arab Emirates]',
  jurisdiction: '[Emirate], United Arab Emirates',
};
export const LEAD_SEARCH_COST = 90; // one verified lead search: up to 12 companies (planning, 4-8 web searches, website checks, scoring; about $0.25-0.65)
export const LEAD_EMAIL_COST = 3;   // personalized email sequence + DM for one lead (about $0.015)
