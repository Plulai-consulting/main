// Add your real clients here, with their permission. The "They trust us" section stays hidden until you add one.
// Logos go in public/assets/clients/ (SVG or PNG, about 36px tall works best).
export type Client = { name: string; nameAr?: string; logo?: string; href?: string }
export type Quote = { text: { en: string; ar: string }; name: string; role: { en: string; ar: string } }

// Heading and intro of the "They trust us" section. Edit the wording here.
export const trust = {
  en: { title: 'They <em>trust us.</em>', text: 'Businesses across the GCC work with us on marketing and AI.' },
  ar: { title: 'يثقون <em>بنا.</em>', text: 'أعمال في دول الخليج تعمل معنا في التسويق والذكاء الاصطناعي.' },
}

export const clients: Client[] = [
  // { name: 'Client name', nameAr: 'اسم العميل', logo: '/assets/clients/client.svg', href: 'https://client-site.com' },
]

// Only add a testimonial the client gave you and agreed to publish.
export const quotes: Quote[] = [
  // { text: { en: 'What they said.', ar: 'ما قاله العميل.' }, name: 'Full name', role: { en: 'Role, Company', ar: 'المنصب، الشركة' } },
]