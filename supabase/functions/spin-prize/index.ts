import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const origin = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173';
const headers = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json'}});
async function sha256(value:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function prizeMessage(amount:number){if(amount===0)return 'Một nụ hôn lốc xoáy từ Huutri đang chờ ní nhận nè 💋';if(amount===6868)return 'Chúc mừng “Lộc phát lộc phát” nha ní! 🍀';if(amount===2205)return 'Chúc mừng ní quay trúng số ngày sinh nhật của Huutri. Hãy nhớ kĩ nhé :3';if(amount===9999)return 'Coi bộ hôm nay hên đó ní, mua vé số điiiii :)))';if(amount===8386)return '8386 nha ní! ✨';return 'Kết quả đã được lưu lại. Cảm ơn ní nha!';}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const {spin_token}=await req.json();if(typeof spin_token!=='string'||!/^[a-f0-9]{64}$/.test(spin_token))return json({error:'Mã lượt quay không hợp lệ.'},400);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}}),tokenHash=await sha256(spin_token);
  const {data:p,error:pe}=await db.from('participants').select('id').eq('spin_token_hash',tokenHash).maybeSingle();if(pe)throw pe;if(!p)return json({error:'Mã lượt quay không hợp lệ.'},401);
  const {data:prior,error:pr}=await db.from('prize_results').select('amount_vnd,prize_label,status').eq('participant_id',p.id).maybeSingle();if(pr)throw pr;if(prior)return json({amount_vnd:prior.amount_vnd,prize_label:prior.prize_label,message:prizeMessage(prior.amount_vnd),status:prior.status,already_spun:true});
  const {data:settings,error:se}=await db.from('prize_settings').select('enabled,budget_cap_vnd').eq('id',true).single();if(se)throw se;
  if(!settings.enabled)return json({error:'Vòng quay quà thật chưa được mở.'},403);if(settings.budget_cap_vnd===null)return json({error:'Chủ website cần đặt ngân sách trước khi mở vòng quay.'},503);
  const {data:prizes,error:qe}=await db.from('prize_wheel_config').select('id,label,amount_vnd,weight').eq('active',true);if(qe)throw qe;if(!prizes?.length)return json({error:'Chưa có phần thưởng hoạt động.'},503);
  const {data:result,error:re}=await db.rpc('allocate_prize',{p_participant_id:p.id,p_budget_cap_vnd:settings.budget_cap_vnd,p_prizes:prizes});
  if(re){if(re.message?.includes('BUDGET_EXCEEDED'))return json({error:'Ngân sách quà đã dùng hết.'},409);throw re;}
  return json({amount_vnd:result[0].amount_vnd,prize_label:result[0].prize_label,message:prizeMessage(result[0].amount_vnd),status:result[0].status,already_spun:false});
 }catch(e){console.error(e);return json({error:'Không thể hoàn tất vòng quay lúc này.'},500);}
});
