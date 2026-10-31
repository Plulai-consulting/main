import Home from '@/components/site/pages/Home'
import { getDict } from '@/content'
import { pageMetadata } from '@/lib/site/seo'

const d = getDict('ar').home
export const metadata = pageMetadata('ar', 'home', d.title, d.desc)
export default function Page() {
  return <Home locale="ar" />
}
