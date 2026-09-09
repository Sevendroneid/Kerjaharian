const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

async function isAdmin(request,env){
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  const url=env.SUPABASE_URL||env.VITE_SUPABASE_URL;
  const key=env.SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY;
  if(!token||!url||!key)return false;
  const userRes=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
  if(!userRes.ok)return false;
  const user=await userRes.json().catch(()=>null);
  if(!user?.id)return false;

  // Use the canonical SECURITY DEFINER authorization function. Do not read
  // profiles directly here: profiles has RLS and a missing service-role secret
  // must never turn a valid Admin session into a false 401.
  const adminRes=await fetch(`${url}/rest/v1/rpc/is_admin`,{
    method:'POST',
    headers:{apikey:key,Authorization:`Bearer ${token}`,'content-type':'application/json'},
    body:'{}'
  });
  if(!adminRes.ok)return false;
  const admin=await adminRes.json().catch(()=>false);
  return admin===true;
}

export async function onRequest({request,env}){
  if(request.method!=='POST')return json({error:'Method Not Allowed'},405);
  try{
    if(!(await isAdmin(request,env)))return json({error:'Akses hanya untuk admin yang terautentikasi.'},401);
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
