import { admin, envOk, getUser, limited, tooMany } from '../../../../lib/server';
import { screenLead } from '../../../../lib/safety';

const str = (v, n) => String(v || '').trim().slice(0, n);

export async function POST(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing in .env.local.' }, { status: 500 });
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (await limited(user, 'campaign', 20, 86400)) return tooMany();

  const f = await req.json();
  const icp = {
    description: str(f.icpDesc, 600), industries: str(f.industries, 200), locations: str(f.locations, 200), roles: str(f.roles, 200),
    size: str(f.size, 100), signals: str(f.signals, 300), exclusions: str(f.exclusions, 300),
  };
  const row = {
    name: str(f.name, 80), offer: str(f.offer, 600), goal: str(f.goal, 200), tone: str(f.tone, 30) || 'friendly', language: str(f.language, 40) || 'English',
    sender: { name: str(f.senderName, 80), role: str(f.senderRole, 80), company: str(f.senderCompany, 120), website: str(f.senderWebsite, 200) },
    icp,
  };
  if (!row.name || row.offer.length < 10 || icp.description.length < 10 || !icp.locations) {
    return Response.json({ error: 'Please fill in the name, what you offer, who you want to reach, and where.' }, { status: 400 });
  }
  const verdict = await screenLead(`${row.offer}\n${JSON.stringify(icp)}`);
  if (!verdict.ok) {
    await admin.from('moderation_log').insert({ user_id: user.id, source: 'campaign', excerpt: row.offer.slice(0, 300), reason: verdict.reason });
    return Response.json({ error: 'This request goes against our acceptable use policy. Lead tools are for B2B prospecting using public business information.' }, { status: 400 });
  }
  let strategy_id = null;
  if (f.strategyId) {
    const { data: s } = await admin.from('strategies').select('id').eq('id', f.strategyId).eq('user_id', user.id).single();
    strategy_id = s?.id || null;
  }
  const { data, error } = await admin.from('campaigns').insert({ ...row, user_id: user.id, strategy_id }).select('id').single();
  if (error) return Response.json({ error: 'Could not create the campaign.' }, { status: 500 });
  return Response.json({ id: data.id });
}
