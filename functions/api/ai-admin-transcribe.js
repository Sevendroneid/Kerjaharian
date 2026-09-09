const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

async function isAdmin(request,env){
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  const url=env.SUPABASE_URL||env.VITE_SUPABASE_URL;
  const key=env.SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY;
  if(!token||!url||!key)return null;
  const userRes=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
  if(!userRes.ok)return null;
  const user=await userRes.json();
  if(!user?.id)return null;
  const service=env.SUPABASE_SERVICE_ROLE_KEY;
  const headers={apikey:service||key,Authorization:`Bearer ${service||token}`};
  const p=await fetch(`${url}/rest/v1/profiles?select=id,role&id=eq.${encodeURIComponent(user.id)}&limit=1`,{headers});
  if(!p.ok)return null;
  const rows=await p.json().catch(()=>[]);
  return Array.isArray(rows)&&rows[0]?.role==='admin'?user:null;
}

export async function onRequest({request,env}){
  if(request.method!=='POST')return json({error:'Method Not Allowed'},405);
  try{
    const user=await isAdmin(request,env);
    if(!user)return json({error:'Akses hanya untuk admin yang terautentikasi.'},401);
    if(!env.AI?.run)return json({error:'Layanan transkripsi suara Cloudflare AI belum tersedia.'},503);
    const form=await request.formData();
    const audio=form.get('audio');
    if(!(audio instanceof File))return json({error:'Audio rekaman tidak ditemukan.'},400);
    if(audio.size<1000)return json({error:'Rekaman terlalu pendek atau kosong.'},400);
    if(audio.size>10*1024*1024)return json({error:'Rekaman terlalu besar. Maksimal 10 MB per rekaman.'},413);
    const bytes=new Uint8Array(await audio.arrayBuffer());
    let binary='';
    const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
    const base64=btoa(binary);
    const result=await env.AI.run('@cf/openai/whisper-large-v3-turbo',{audio:base64,task:'transcribe',language:'id',vad_filter:true,condition_on_previous_text:false});
    const text=String(result?.text||result?.transcription_info?.text||'').replace(/\s+/g,' ').trim();
    if(!text)return json({error:'Suara tidak berhasil ditranskripsikan. Coba bicara lebih jelas.'},422);
    return json({ok:true,text,model:'@cf/openai/whisper-large-v3-turbo',language:'id',writes_performed:false});
  }catch(error){return json({error:error instanceof Error?error.message:'Transkripsi suara gagal.'},500);}
}
