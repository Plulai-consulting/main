import Tool from '@/components/site/pages/Tool'
import { getDict } from '@/content'
import { pageMetadata } from '@/lib/site/seo'

const d = getDict('ar').tool
export const metadata = pageMetadata('ar', 'tool', d.title, d.desc)
export default function Page() {
  return <Tool locale="ar" />
}
