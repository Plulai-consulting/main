import SignOut from './SignOut'
export default function Bar({label,name}){return <div className="bar"><a className="brand" href="/">PlulAI <span className="muted">/ {label}</span></a><div style={{display:'flex',gap:14,alignItems:'center'}}><span className="muted">{name}</span><SignOut/></div></div>}
