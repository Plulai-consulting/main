import Tool from '@/components/site/pages/Tool'
import { getDict } from '@/content'
import { pageMetadata } from '@/lib/site/seo'

const d = getDict('en').tool
export const metadata = pageMetadata('en', 'tool', d.title, d.desc)
export default function Page() {
  return <Tool locale="en" />
}
