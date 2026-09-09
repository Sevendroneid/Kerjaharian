const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const cors=origin=>({'access-control-allow-origin':origin||'*','access-control-allow-headers':'authorization, content-type','access-control-allow-methods':'POST, OPTIONS'});

async function auth(request,env){
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  const url=env.SUPABASE_URL||env.VITE_SUPABASE_URL;
  const anonKey=env.SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY;
  if(!token||!url||!anonKey)return null;
  const userRes=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anonKey,Authorization:`Bearer ${token}`}});
  if(!userRes.ok)return null;
  const user=await userRes.json().catch(()=>null);
  if(!user?.id)return null;

  // Authorize from the caller's own profile row. The profile RLS policy allows
  // auth.uid() = id, so this remains secure while avoiding RPC/schema-cache
  // dependency during a fresh deployment.
  const profileRes=await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role,is_admin&limit=1`,{
    headers:{apikey:anonKey,Authorization:`Bearer ${token}`}
  });
  if(!profileRes.ok)return null;
  const profiles=await profileRes.json().catch(()=>[]);
  const profile=Array.isArray(profiles)?profiles[0]:null;
  if(!(profile?.role==='admin'||profile?.is_admin===true))return null;
  return {url,anonKey,token,user};
}

function daysFromText(text){const m=text.toLowerCase().match(/(?:7|tujuh|14|empat belas|30|tiga puluh)\s*(?:hari|day)/);if(!m)return 7;const v=m[0];if(/30|tiga puluh/.test(v))return 30;if(/14|empat belas/.test(v))return 14;return 7;}
function criticalRequest(text){return /refund|pengembalian dana|suspend|ban|blokir permanen|hapus data|hapus akun|ubah harga massal|permission|hak akses|keputusan sengketa|putuskan sengketa|bayar pekerja|kompensasi/i.test(text);}
async function loadMessages(a,days){const r=await fetch(`${a.url}/rest/v1/rpc/admin_ai_recent_messages`,{method:'POST',headers:{apikey:a.anonKey,Authorization:`Bearer ${a.token}`,'content-type':'application/json'},body:JSON.stringify({p_days:days,p_limit:500})});if(!r.ok)throw new Error('Riwayat chat admin tidak dapat dimuat.');const data=await r.json();return Array.isArray(data)?data:[];}
async function analyze(text,messages,env){
  const compact=messages.slice(0,300).map(m=>({order_id:m.order_id,sender_id:m.sender_id,message:String(m.message||'').slice(0,500),created_at:m.created_at}));
  const system='Anda adalah KerjaHarian AI Operations Analyst untuk admin. Analisis hanya percakapan yang diberikan. Jangan mengarang fakta, keputusan, saldo, identitas, atau tindakan. Berikan: ringkasan, temuan utama, prioritas, beberapa alternatif solusi, risiko, rekomendasi, dan confidence. Jangan membuat keputusan final untuk dispute, refund, suspend, penghapusan data, finansial, atau permission. Untuk tindakan berdampak tinggi, tegaskan bahwa admin adalah final judgment. Jawab Bahasa Indonesia dan dapat dibacakan suara.';
  if(env.AI?.run){try{const r=await env.AI.run('@cf/meta/llama-3.1-8b-instruct',{messages:[{role:'system',content:system},{role:'user',content:`PERMINTAAN ADMIN: ${text}\nDATA CHAT: ${JSON.stringify(compact)}`}],max_tokens:1200});const answer=r?.response||r?.result?.response;if(typeof answer==='string'&&answer.trim())return answer.trim();}catch{/* safe fallback */}}
  if(!messages.length)return 'Tidak ada chat pada periode yang diminta.';
  const latest=messages.slice(0,5).map((m,i)=>`${i+1}. ${new Date(m.created_at).toLocaleString('id-ID')}: ${String(m.message).slice(0,180)}`).join('\n');
  return `Saya menemukan ${messages.length} pesan pada periode yang diminta. Berikut lima pesan terbaru:\n${latest}\n\nRekomendasi: gunakan pesan tersebut sebagai bahan triase awal dan periksa kasus terkait sebelum mengambil keputusan. Tidak ada tindakan otomatis.`;
}
async function logAnalysis(a,{text,days,messages,answer,critical}){try{await fetch(`${a.url}/rest/v1/ai_action_logs`,{method:'POST',headers:{apikey:a.anonKey,Authorization:`Bearer ${a.token}`,'content-type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({actor_id:a.user.id,role:'admin',request_text:text,intent:'admin_operations_analysis',action:'analyze_chat',permission_level:critical?'critical':'recommendation',status:critical?'blocked':'executed',evidence:{days,message_count:messages.length},recommendation:{summary:answer,final_judgment_required:critical},result:{writes_performed:false,critical_actions_blocked:critical}})})}catch{/* audit logging must not block read-only analysis */}}

export async function onRequest(context){const{request,env}=context;const headers=cors(request.headers.get('origin')||'*');if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(request.method!=='POST')return json({error:'Method Not Allowed'},405,headers);try{const a=await auth(request,env);if(!a)return json({error:'Akses hanya untuk admin yang terautentikasi.'},401,headers);const body=await request.json();const text=typeof body?.message==='string'?body.message.trim().slice(0,1200):'';if(!text)return json({error:'Perintah admin wajib diisi.'},400,headers);const days=daysFromText(text);const messages=await loadMessages(a,days);const answer=await analyze(text,messages,env);const critical=criticalRequest(text);const response={answer,days,message_count:messages.length,evidence:{source:'admin_ai_recent_messages',period_days:days,message_count:messages.length},analysis:{alternatives:['Periksa kasus terkait satu per satu berdasarkan bukti.','Prioritaskan kasus yang berisiko terhadap keselamatan, pembayaran, atau kepercayaan pengguna.','Jika perlu tindakan berdampak tinggi, minta keputusan admin setelah bukti diverifikasi.'],risk_level:critical?'high':'medium',confidence:messages.length?0.8:0.2,recommendation:'Gunakan hasil AI sebagai rekomendasi operasional, bukan keputusan final.'},advisory:true,writes_performed:false,requires_confirmation:critical,critical_actions_blocked:critical,permission_level:critical?'critical':'recommendation',provider:env.AI?.run?'workers-ai':'safe-fallback'};await logAnalysis(a,{text,days,messages,answer,critical});return json(response,200,headers);}catch(error){return json({error:error instanceof Error?error.message:'Gagal menjalankan AI Admin.'},500,headers);}}
