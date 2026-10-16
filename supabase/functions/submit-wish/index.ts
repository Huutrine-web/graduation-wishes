import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const origin = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173';
const headers = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json'}});
async function sha256(value:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers}); if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const b=await req.json(), name=String(b.name??'').trim(), phone=String(b.phone??'').trim(), message=String(b.message??'').trim(), theme=String(b.theme??'tree'), normalized=phone.replace(/\D/g,'');
  if(name.length<2||name.length>80)return json({error:'Tên cần từ 2 đến 80 ký tự.'},400);
  if(!/^[0-9+\s().-]{9,16}$/.test(phone)||normalized.length<9||normalized.length>15)return json({error:'Số điện thoại chưa đúng định dạng.'},400);
  if(message.length<3||message.length>1200)return json({error:'Lời chúc cần từ 3 đến 1200 ký tự.'},400);
  if(!['tree','trophy','stars'].includes(theme))return json({error:'Mẫu lời chúc không hợp lệ.'},400);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  const {data:existing}=await db.from('participants').select('id').eq('phone_normalized',normalized).maybeSingle();
  if(existing)return json({error:'Số điện thoại này đã gửi lời chúc rồi. Mỗi người chỉ có một lượt.'},409);
  const tokenBytes=crypto.getRandomValues(new Uint8Array(32)),token=[...tokenBytes].map(b=>b.toString(16).padStart(2,'0')).join(''),tokenHash=await sha256(token);
  const {data:p,error:pe}=await db.from('participants').insert({display_name:name,phone,phone_normalized:normalized,spin_token_hash:tokenHash}).select('id').single();
  if(pe){if(pe.code==='23505')return json({error:'Số điện thoại này đã được dùng để tham gia.'},409);throw pe;}
  const {error:we}=await db.from('wishes').insert({participant_id:p.id,message,visual_theme:theme});
  if(we){await db.from('participants').delete().eq('id',p.id);throw we;}
  return json({spin_token:token});
 }catch(e){console.error(e);return json({error:'Không thể lưu lời chúc lúc này. Vui lòng thử lại.'},500);}
});
