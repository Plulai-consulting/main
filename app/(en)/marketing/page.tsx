import Marketing from '@/components/site/pages/Marketing'
import { getDict } from '@/content'
import { pageMetadata } from '@/lib/site/seo'

const d = getDict('en').marketing
export const metadata = pageMetadata('en', 'marketing', d.title, d.desc)
export default function Page() {
  return <Marketing locale="en" />
}
