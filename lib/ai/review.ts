// Rebuilds a reviewable plan from the saved check logs.
// Strategy checks are attempts 1-3 (draft = the strategy). Post checks are attempts 11-13 (draft = {posts}).
// Older single-step plans saved the whole {strategy,posts} object.
export function assemble(audits){
  const a=(audits||[]).filter(x=>x.draft).sort((x,y)=>y.attempt-x.attempt)
  const post=a.find(x=>Array.isArray(x.draft.posts)&&x.draft.posts.length)
  if(!post)return null
  if(post.draft.strategy)return {strategy:post.draft.strategy,posts:post.draft.posts}
  const strat=a.find(x=>x.attempt<10&&x.draft.pillars)
  return strat?{strategy:strat.draft,posts:post.draft.posts}:null
}
