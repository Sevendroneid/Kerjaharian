const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const cors=origin=>({'access-control-allow-origin':origin||'*','access-control-allow-headers':'authorization, content-type, x-kh-diagnostic','access-control-allow-methods':'POST, OPTIONS'});
const DEFAULT_URL='https://cgulvtbyqkixpxxqzcet.supabase.co';
const DEFAULT_KEY='sb_publishable_37nHNxKCf60GiWedu90g9g_DDetNzb9';
function safeLog(event,data={}){try{console.log('[KH-AI-VOICE]',event,JSON.stringify(data));}catch{}}
async function auth(request,env){
  const raw=request.headers.get('authorization');
  const token=(raw||'').replace(/^Bearer\s+/i,'').trim();
  const url=env.SUPABASE_URL||env.VITE_SUPABASE_URL||DEFAULT_URL;
  const anonKey=env.SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY||DEFAULT_KEY;
  safeLog('auth_header',{authorization_present:raw!==null,token_received:!!token,token_length:token.length,supabase_url_configured:!!url,anon_key_configured:!!anonKey});
  if(!token)return {ok:false,stage:'missing_token'};
  let userRes;
  try{userRes=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anonKey,Authorization:`Bearer ${token}`}});}catch(error){safeLog('supabase_auth_fetch_error',{error:error instanceof Error?error.message:'unknown'});return {ok:false,stage:'supabase_auth_fetch'};}
  safeLog('supabase_auth_response',{status:userRes.status,ok:userRes.ok});
  if(!userRes.ok)return {ok:false,stage:'supabase_auth',status:userRes.status};
  const user=await userRes.json().catch(()=>null);
  if(!user?.id)return {ok:false,stage:'supabase_user_parse'};
  const profileUrl=`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`;
  let profileRes;
  try{profileRes=await fetch(profileUrl,{headers:{apikey:anonKey,Authorization:`Bearer ${token}`}});}catch(error){safeLog('supabase_profile_fetch_error',{error:error instanceof Error?error.message:'unknown'});return {ok:false,stage:'supabase_profile_fetch'};}
  safeLog('supabase_profile_response',{status:profileRes.status,ok:profileRes.ok});
  if(!profileRes.ok)return {ok:false,stage:'supabase_profile',status:profileRes.status};
  const rows=await profileRes.json().catch(()=>[]);const role=Array.isArray(rows)?rows[0]?.role:null;
  safeLog('profile_parsed',{profile_present:!!rows?.[0],role});
  if(role!=='admin')return {ok:false,stage:'profile_role',role};
  safeLog('auth_success',{admin:true});return {ok:true,url,anonKey,token,user};
}
function daysFromText(text){const m=text.toLowerCase().match(/(?:7|tujuh|14|empat belas|30|tiga puluh)\s*(?:hari|day)/);if(!m)return 7;const v=m[0];if(/30|tiga puluh/.test(v))return 30;if(/14|empat belas/.test(v))return 14;return 7;}
function criticalRequest(text){return /refund|pengembalian dana|suspend|ban|blokir permanen|hapus data|hapus akun|ubah harga massal|permission|hak akses|keputusan sengketa|putuskan sengketa|bayar pekerja|kompensasi/i.test(text);}
function normalize(text){return text.toLowerCase().replace(/[^a-z0-9\s-]/gi,' ').replace(/\s+/g,' ').trim();}
function detectCommand(text){
  const t=normalize(text);
  if(/\b(job|jobs|pekerjaan)\b/.test(t)&&/\b(aktif|sedang aktif|berlangsung)\b/.test(t))return 'list_active_jobs';
  if(/\b(job|jobs|pekerjaan)\b/.test(t)&&/\b(open|mencari pekerja|menunggu matching|belum ada pekerja)\b/.test(t))return 'list_open_jobs';
  if(/\b(job|jobs|pekerjaan)\b/.test(t)&&/\b(assigned|ditugaskan|sudah dapat pekerja)\b/.test(t))return 'list_assigned_jobs';
  if(/\b(berapa|jumlah|tampilkan|daftar|list)\b/.test(t)&&/\b(worker|workers|pekerja|mitra)\b/.test(t))return 'count_workers';
  if(/\b(berapa|jumlah|tampilkan|daftar|list)\b/.test(t)&&/\b(employer|employers|pemberi kerja)\b/.test(t))return 'count_employers';
  if(/\b(kyc|verifikasi identitas)\b/.test(t)&&/\b(pending|menunggu|review|belum)\b/.test(t))return 'list_pending_kyc';
  if(/\b(laporan|insiden|report|reports)\b/.test(t))return 'count_reports';
  if(/\b(ringkasan|summary|kondisi|status)\b/.test(t)&&/\b(operasional|operasi|marketplace|command center)\b/.test(t))return 'ops_summary';
  return null;
}
async function restGet(a,path){const r=await fetch(`${a.url}/rest/v1/${path}`,{headers:{apikey:a.anonKey,Authorization:`Bearer ${a.token}`}});const data=await r.json().catch(()=>[]);if(!r.ok)throw new Error(`Data operasional tidak dapat dimuat (${r.status}).`);return Array.isArray(data)?data:[];}
async function executeReadCommand(a,command){
  if(command==='list_active_jobs'){
    const rows=await restGet(a,'jobs?select=id,title,location,wage,status,workflow_status,created_at,started_at,worker_id,employer_id&is_deleted=eq.false&workflow_status=eq.active&order=created_at.desc&limit=50');
    return {answer:rows.length?`Ada ${rows.length} job aktif.\n\n${rows.map((j,i)=>`${i+1}. ${j.title||'Tanpa judul'} — ${j.location||'Lokasi tidak tersedia'} — Rp${Number(j.wage||0).toLocaleString('id-ID')} — ${j.workflow_status||j.status||'-'}`).join('\n')}`:'Saat ini tidak ada job aktif.',data:rows,action:'list_active_jobs'};
  }
  if(command==='list_open_jobs'){
    const rows=await restGet(a,'jobs?select=id,title,location,wage,status,workflow_status,created_at&is_deleted=eq.false&status=eq.open&order=created_at.desc&limit=50');
    return {answer:rows.length?`Ada ${rows.length} job open yang menunggu matching.\n\n${rows.map((j,i)=>`${i+1}. ${j.title||'Tanpa judul'} — ${j.location||'Lokasi tidak tersedia'} — Rp${Number(j.wage||0).toLocaleString('id-ID')}`).join('\n')}`:'Saat ini tidak ada job open.',data:rows,action:'list_open_jobs'};
  }
  if(command==='list_assigned_jobs'){
    const rows=await restGet(a,'jobs?select=id,title,location,wage,status,workflow_status,created_at,worker_id,employer_id&is_deleted=eq.false&status=eq.assigned&order=created_at.desc&limit=50');
    return {answer:rows.length?`Ada ${rows.length} job assigned.\n\n${rows.map((j,i)=>`${i+1}. ${j.title||'Tanpa judul'} — ${j.location||'Lokasi tidak tersedia'} — Rp${Number(j.wage||0).toLocaleString('id-ID')} — worker ${j.worker_id?'sudah ditetapkan':'belum terisi'}`).join('\n')}`:'Saat ini tidak ada job assigned.',data:rows,action:'list_assigned_jobs'};
  }
  if(command==='count_workers'){
    const rows=await restGet(a,'profiles?select=id&role=eq.worker');return {answer:`Total worker/mitra terdaftar: ${rows.length}.`,data:{count:rows.length},action:command};
  }
  if(command==='count_employers'){
    const rows=await restGet(a,'profiles?select=id&role=eq.employer');return {answer:`Total employer/pemberi kerja terdaftar: ${rows.length}.`,data:{count:rows.length},action:command};
  }
  if(command==='list_pending_kyc'){
    const rows=await restGet(a,'profiles?select=id,full_name,role,kyc_status,created_at&kyc_status=eq.pending&order=created_at.asc&limit=100');return {answer:rows.length?`Ada ${rows.length} pengajuan KYC menunggu review.\n\n${rows.map((p,i)=>`${i+1}. ${p.full_name||'Nama belum diisi'} — ${p.role||'-'} — ${p.kyc_status}`).join('\n')}`:'Tidak ada KYC yang menunggu review.',data:rows,action:command};
  }
  if(command==='count_reports'){
    const rows=await restGet(a,'job_reports?select=id&limit=1000');return {answer:`Jumlah laporan/insiden yang terbaca: ${rows.length}.`,data:{count:rows.length},action:command};
  }
  if(command==='ops_summary'){
    const [workers,employers,open,assigned,active,pendingKyc,reports]=await Promise.all([
      restGet(a,'profiles?select=id&role=eq.worker'),restGet(a,'profiles?select=id&role=eq.employer'),restGet(a,'jobs?select=id&status=eq.open&is_deleted=eq.false'),restGet(a,'jobs?select=id&status=eq.assigned&is_deleted=eq.false'),restGet(a,'jobs?select=id&workflow_status=eq.active&is_deleted=eq.false'),restGet(a,'profiles?select=id&kyc_status=eq.pending'),restGet(a,'job_reports?select=id&limit=1000')
    ]);
    const answer=`Ringkasan operasional saat ini:\n• Workers: ${workers.length}\n• Employers: ${employers.length}\n• Open jobs: ${open.length}\n• Assigned jobs: ${assigned.length}\n• Active jobs: ${active.length}\n• KYC pending: ${pendingKyc.length}\n• Laporan/insiden terbaca: ${reports.length}`;
    return {answer,data:{workers:workers.length,employers:employers.length,open:open.length,assigned:assigned.length,active:active.length,pendingKyc:pendingKyc.length,reports:reports.length},action:command};
  }
  return null;
}
async function loadMessages(a,days){const r=await fetch(`${a.url}/rest/v1/rpc/admin_ai_recent_messages`,{method:'POST',headers:{apikey:a.anonKey,Authorization:`Bearer ${a.token}`,'content-type':'application/json'},body:JSON.stringify({p_days:days,p_limit:500})});if(!r.ok)throw new Error('Riwayat chat admin tidak dapat dimuat.');const data=await r.json().catch(()=>[]);return Array.isArray(data)?data:[];}
async function analyze(text,messages,env){
  const compact=messages.slice(0,300).map(m=>({order_id:m.order_id,sender_id:m.sender_id,message:String(m.message||'').slice(0,500),created_at:m.created_at}));
  const system='Anda adalah KerjaHarian AI Operations Analyst untuk admin. Analisis hanya percakapan yang diberikan. Jangan mengarang fakta, keputusan, saldo, identitas, atau tindakan. Berikan ringkasan, temuan utama, prioritas, alternatif solusi, risiko, rekomendasi, dan confidence. Jangan membuat keputusan final untuk dispute, refund, suspend, penghapusan data, finansial, atau permission. Jawab Bahasa Indonesia.';
  if(env.AI?.run){try{const r=await env.AI.run('@cf/meta/llama-3.1-8b-instruct',{messages:[{role:'system',content:system},{role:'user',content:`PERMINTAAN ADMIN: ${text}\nDATA CHAT: ${JSON.stringify(compact)}`}],max_tokens:1200});const answer=r?.response||r?.result?.response;if(typeof answer==='string'&&answer.trim())return answer.trim();}catch{}}
  if(!messages.length)return 'Tidak ada chat pada periode yang diminta.';
  return `Saya menemukan ${messages.length} pesan pada periode yang diminta. Berikut lima pesan terbaru:\n${messages.slice(0,5).map((m,i)=>`${i+1}. ${new Date(m.created_at).toLocaleString('id-ID')}: ${String(m.message).slice(0,180)}`).join('\n')}\n\nRekomendasi: gunakan pesan tersebut sebagai bahan triase awal dan periksa kasus terkait sebelum mengambil keputusan. Tidak ada tindakan otomatis.`;
}
async function logAnalysis(a,{text,days,messages,answer,critical,action}){try{await fetch(`${a.url}/rest/v1/ai_action_logs`,{method:'POST',headers:{apikey:a.anonKey,Authorization:`Bearer ${a.token}`,'content-type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({actor_id:a.user.id,role:'admin',request_text:text,intent:action||'admin_operations_analysis',action:action||'analyze_chat',permission_level:critical?'critical':'recommendation',status:critical?'blocked':'executed',evidence:{days,message_count:messages?.length??0},recommendation:{summary:answer,final_judgment_required:critical},result:{writes_performed:false,critical_actions_blocked:critical}})})}catch(error){safeLog('audit_log_error',{error:error instanceof Error?error.message:'unknown'})}}
export async function onRequest(context){
  const{request,env}=context;const headers=cors(request.headers.get('origin')||'*');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(request.method!=='POST')return json({error:'Method Not Allowed'},405,headers);
  const requestId=crypto.randomUUID();safeLog('request_start',{request_id:requestId,method:request.method,path:new URL(request.url).pathname});
  try{const a=await auth(request,env);if(!a.ok){safeLog('request_auth_failed',{request_id:requestId,stage:a.stage,status:a.status??null,role:a.role??null});return json({error:'Akses hanya untuk admin yang terautentikasi.',request_id:requestId},401,{...headers,'x-kh-request-id':requestId});}
    const body=await request.json();const text=typeof body?.message==='string'?body.message.trim().slice(0,1200):'';if(!text)return json({error:'Perintah admin wajib diisi.'},400,{...headers,'x-kh-request-id':requestId});
    const critical=criticalRequest(text);const command=detectCommand(text);
    safeLog('command_detected',{request_id:requestId,command,critical});
    if(command&&!critical){
      const result=await executeReadCommand(a,command);
      await logAnalysis(a,{text,answer:result.answer,critical:false,action:result.action});
      return json({answer:result.answer,command:result.action,data:result.data,advisory:false,writes_performed:false,requires_confirmation:false,critical_actions_blocked:false,permission_level:'read',request_id:requestId},200,{...headers,'x-kh-request-id':requestId});
    }
    const days=daysFromText(text);const messages=await loadMessages(a,days);const answer=await analyze(text,messages,env);
    await logAnalysis(a,{text,days,messages,answer,critical,action:'analyze_chat'});
    return json({answer,days,message_count:messages.length,evidence:{source:'admin_ai_recent_messages',period_days:days,message_count:messages.length},analysis:{alternatives:['Periksa kasus terkait satu per satu berdasarkan bukti.','Prioritaskan kasus yang berisiko terhadap keselamatan, pembayaran, atau kepercayaan pengguna.','Jika perlu tindakan berdampak tinggi, minta keputusan admin setelah bukti diverifikasi.'],risk_level:critical?'high':'medium',confidence:messages.length?0.8:0.2,recommendation:'Gunakan hasil AI sebagai rekomendasi operasional, bukan keputusan final.'},advisory:true,writes_performed:false,requires_confirmation:critical,critical_actions_blocked:critical,permission_level:critical?'critical':'recommendation',provider:env.AI?.run?'workers-ai':'safe-fallback',request_id:requestId},200,{...headers,'x-kh-request-id':requestId});
  }catch(error){safeLog('request_exception',{request_id:requestId,error:error instanceof Error?error.message:'unknown'});return json({error:error instanceof Error?error.message:'Gagal menjalankan AI Admin.',request_id:requestId},500,{...headers,'x-kh-request-id':requestId});}
}
