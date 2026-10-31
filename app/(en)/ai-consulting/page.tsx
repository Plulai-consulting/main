import Ai from '@/components/site/pages/Ai'
import { getDict } from '@/content'
import { pageMetadata } from '@/lib/site/seo'

const d = getDict('en').ai
export const metadata = pageMetadata('en', 'ai', d.title, d.desc)
export default function Page() {
  return <Ai locale="en" />
}
