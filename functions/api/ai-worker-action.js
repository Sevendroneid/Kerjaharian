import { createClient } from '@supabase/supabase-js';

const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const cors=origin=>({'access-control-allow-origin':origin||'*','access-control-allow-headers':'authorization, content-type','access-control-allow-methods':'POST, OPTIONS'});

async function auth(request,env){
  const token=request.headers.get('authorization')||'';
  const url=env.SUPABASE_URL||env.VITE_SUPABASE_URL;
  const key=env.SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY;
  if(!token||!url||!key)return null;
  const client=createClient(url,key,{auth:{persistSession:false}});
  const {data,error}=await client.auth.getUser(token.replace(/^Bearer\s+/i,''));
  if(error||!data.user)return null;
  const {data:profile}=await client.from('profiles').select('id,role,full_name,is_online').eq('id',data.user.id).maybeSingle();
  if(profile?.role!=='worker')return null;
  return {client,user:data.user,profile};
}

async function listOffers(a){
  const {data,error}=await a.client.from('dispatch_offers').select('id,job_id,rank,distance_meters,score,status,expires_at,offered_at,job:jobs(id,title,category,location,wage,estimated_hours,status)').eq('worker_id',a.user.id).eq('status','offered').gt('expires_at',new Date().toISOString()).order('rank',{ascending:true}).limit(5);
  if(error)throw new Error('Penawaran kerja belum dapat dimuat.');
  return (data||[]).filter(x=>x.job);
}

async function writeAudit(a,{requestText,action,offerId,jobId,result}){
  const {error}=await a.client.from('ai_action_logs').insert({
    actor_id:a.user.id,
    role:a.profile.role,
    request_text:requestText,
    intent:'accept_offer',
    action,
    permission_level:'confirmation',
    status:'executed',
    evidence:{offer_id:offerId,job_id:jobId},
    recommendation:{source:'ai-worker-action',requires_confirmation:true},
    result:result??{}
  });
  return !error;
}

export async function onRequest({request,env}){
  const headers=cors(request.headers.get('origin')||'*');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return json({error:'Method Not Allowed'},405,headers);
  try{
    const a=await auth(request,env);
    if(!a)return json({error:'Akses hanya untuk pekerja yang terautentikasi.'},401,headers);
    const body=await request.json();
    const action=typeof body?.action==='string'?body.action:'';
    if(action==='list_offers'){
      const offers=await listOffers(a);
      return json({ok:true,offers,permission_level:'information',requires_confirmation:false,writes_performed:false},200,headers);
    }
    if(action!=='accept_offer')return json({error:'Tindakan AI pekerja tidak dikenal.'},400,headers);
    if(body?.confirmed!==true)return json({error:'Konfirmasi eksplisit diperlukan sebelum menerima pekerjaan.'},400,headers);
    const offerId=typeof body?.offer_id==='string'?body.offer_id:'';
    if(!offerId)return json({error:'Penawaran kerja belum dipilih.'},400,headers);
    const requestText=typeof body?.message==='string'?body.message.trim().slice(0,2000):`accept_offer:${offerId}`;
    const {data:offer,error:offerError}=await a.client.from('dispatch_offers').select('id,job_id,worker_id,status,expires_at').eq('id',offerId).eq('worker_id',a.user.id).maybeSingle();
    if(offerError||!offer)return json({error:'Penawaran tidak ditemukan atau bukan milik akun ini.'},404,headers);
    if(offer.status!=='offered'||new Date(offer.expires_at).getTime()<=Date.now())return json({error:'Penawaran sudah tidak aktif.'},409,headers);
    const {data:accepted,error:acceptError}=await a.client.rpc('accept_dispatch_offer',{p_offer_id:offerId});
    if(acceptError)return json({error:'Penawaran gagal diterima: '+acceptError.message},409,headers);
    const auditLogged=await writeAudit(a,{requestText,action,offerId,jobId:offer.job_id,result:accepted});
    return json({ok:true,accepted,action:'accept_offer',permission_level:'confirmation',requires_confirmation:false,writes_performed:true,audit_logged:auditLogged},200,headers);
  }catch(error){return json({error:error instanceof Error?error.message:'Gagal menjalankan tindakan AI pekerja.'},500,headers);}
}
