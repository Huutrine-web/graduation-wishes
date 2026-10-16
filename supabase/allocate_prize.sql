-- Run after schema.sql. Called only by the Edge Function using service_role.
drop function if exists public.allocate_prize(uuid,bigint,jsonb);
create or replace function public.allocate_prize(p_participant_id uuid,p_budget_cap_vnd bigint,p_prizes jsonb)
returns table(amount_vnd integer,status text,prize_label text) language plpgsql security definer set search_path=public as $$
declare v_existing public.prize_results%rowtype; v_total bigint; v_total_weight bigint:=0; v_weight integer; v_roll bigint; v_cursor bigint:=0; v_prize jsonb; v_amount integer; v_label text;
begin
 perform pg_advisory_xact_lock(hashtext('graduation_wishes_prize_budget'));
 select * into v_existing from public.prize_results where participant_id=p_participant_id;
 if found then return query select v_existing.amount_vnd,v_existing.status,v_existing.prize_label; return; end if;
 select coalesce(sum(amount_vnd),0) into v_total from public.prize_results where status in('pending','paid');
 for v_prize in select value from jsonb_array_elements(p_prizes) loop
   v_weight:=(v_prize->>'weight')::integer;
   if v_weight<=0 then raise exception 'INVALID_PRIZE_WEIGHTS'; end if;
   v_total_weight:=v_total_weight+v_weight;
 end loop;
 if v_total_weight<=0 then raise exception 'INVALID_PRIZE_WEIGHTS'; end if;
 v_roll:=floor(random()*v_total_weight)::bigint+1;
 for v_prize in select value from jsonb_array_elements(p_prizes) loop
   v_weight:=(v_prize->>'weight')::integer; v_cursor:=v_cursor+v_weight;
   if v_roll<=v_cursor then v_amount:=(v_prize->>'amount_vnd')::integer; v_label:=v_prize->>'label'; exit; end if;
 end loop;
 if v_amount is null or v_amount<0 then raise exception 'INVALID_PRIZE_AMOUNT'; end if;
 if v_total+v_amount>p_budget_cap_vnd then raise exception 'BUDGET_EXCEEDED'; end if;
 insert into public.prize_results(participant_id,amount_vnd,prize_label,status) values(p_participant_id,v_amount,v_label,'pending') on conflict(participant_id) do nothing;
 select * into v_existing from public.prize_results where participant_id=p_participant_id;
 return query select v_existing.amount_vnd,v_existing.status,v_existing.prize_label;
end $$;
revoke all on function public.allocate_prize(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.allocate_prize(uuid,bigint,jsonb) to service_role;
