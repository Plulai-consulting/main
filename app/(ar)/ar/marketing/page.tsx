import Marketing from '@/components/site/pages/Marketing'
import { getDict } from '@/content'
import { pageMetadata } from '@/lib/site/seo'

const d = getDict('ar').marketing
export const metadata = pageMetadata('ar', 'marketing', d.title, d.desc)
export default function Page() {
  return <Marketing locale="ar" />
}
