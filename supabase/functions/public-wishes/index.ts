import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const origin = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173';
const headers = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  // Only public display fields are returned. Phone numbers and spin tokens are never exposed.
  const {data,error}=await db.from('wishes').select('id,message,visual_theme,created_at,participants(display_name)').order('created_at',{ascending:false}).limit(120);
  if(error)throw error;
  const wishes=(data||[]).map((w:any)=>({id:w.id,message:w.message,visual_theme:w.visual_theme,created_at:w.created_at,display_name:w.participants?.display_name||'Một người bạn'}));
  return json({wishes});
 }catch(e){console.error(e);return json({error:'Chưa tải được lời chúc lúc này.'},500);}
});
