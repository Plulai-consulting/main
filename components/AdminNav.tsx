export default function AdminNav({current}){
  const l=[['/admin','Overview'],['/admin/projects','Projects'],['/admin/analytics','Analytics'],['/admin/tool','AI tool']]
  return <nav className="subnav" aria-label="Admin">{l.map(([h,t])=><a key={h} href={h} aria-current={current===h?'page':undefined}>{t}</a>)}</nav>
}
