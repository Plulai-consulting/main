import Ai from '@/components/site/pages/Ai'
import { getDict } from '@/content'
import { pageMetadata } from '@/lib/site/seo'

const d = getDict('ar').ai
export const metadata = pageMetadata('ar', 'ai', d.title, d.desc)
export default function Page() {
  return <Ai locale="ar" />
}
