import { getDict } from '@/content'
import { COUNTRIES, SITE, SLUG } from '@/lib/site/routes'

// A short plain-text summary of the site for AI search tools.
export function GET() {
  const c = getDict('en').countries
  const body = `# PlulAI Consulting
> Marketing, AI consulting and a social media strategy tool (in development) for businesses in the GCC: Qatar, UAE, Saudi Arabia, Kuwait, Bahrain and Oman. Content in English and Arabic.

## Services
- [Marketing](${SITE}/marketing): brand identity, social content and campaign direction.
- [AI solutions](${SITE}/ai-consulting): AI audits, custom AI tools and integrations.
- [Social media tool](${SITE}/social-tool): strategy and content tool in development; early access waitlist.

## Markets
${COUNTRIES.map((k) => `- [${c[k].title_n}](${SITE}/${SLUG[k]})`).join('\n')}

## Arabic version
- [العربية](${SITE}/ar)

## Contact
ceo@plulai.com, WhatsApp +974 5554 8407
`
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
