import Home from '@/components/site/pages/Home'
import { getDict } from '@/content'
import { pageMetadata } from '@/lib/site/seo'

const d = getDict('en').home
export const metadata = pageMetadata('en', 'home', d.title, d.desc)
export default function Page() {
  return <Home locale="en" />
}
