import { PageMark } from '@/components/SiteFooter'

// /admin is internal: no site footer (see PageMark in components/SiteFooter.tsx).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<PageMark noFooter /></>
}
