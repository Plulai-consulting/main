// Industry templates: safe for the browser (labels and the opening question only).
const HI = "Hi, I'm Maya, your marketing strategist. I'll ask a few quick questions, then build your 30-day plan with ready-to-post content.";
export const TEMPLATES = {
  general: { icon: '✦', label: 'Other business', greeting: `${HI} To start: what's your brand called, and what do you sell?` },
  restaurant: { icon: '🍽️', label: 'Restaurant & cafe', greeting: `${HI} Let's start with your place: what's it called, and what kind of food do you serve?\nOPTIONS: Casual dining | Cafe | Fine dining | Fast food | Cloud kitchen (delivery only)` },
  salon: { icon: '💇', label: 'Salon & beauty', greeting: `${HI} Let's start: what's your salon or studio called, and which services bring in most of your income?\nOPTIONS: Hair | Nails | Skin and facials | Makeup and bridal | Barber | Full-service salon` },
  clinic: { icon: '🩺', label: 'Clinic & health', greeting: `${HI} Let's start: what's your clinic called, and what type of care do you offer?\nOPTIONS: Dental | Dermatology and aesthetics | General practice | Physiotherapy | Other specialty` },
  ecommerce: { icon: '🛍️', label: 'E-commerce', greeting: `${HI} Let's start: what's your store called, and what do you sell?\nOPTIONS: Fashion | Beauty and perfume | Home and decor | Food and gifts | Electronics | Other` },
  realestate: { icon: '🏠', label: 'Real estate', greeting: `${HI} Let's start: what's your company called, and what's your role in the market?\nOPTIONS: Developer | Brokerage or agency | Independent agent | Property management` },
};
