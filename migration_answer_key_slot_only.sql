-- ============================================================
-- Run this ONCE in the Supabase SQL Editor. Safe to run again.
--
-- correct_option stores the TEXT of the right option. So editing that option's
-- wording (LaTeX pass, typo fix, Excel re-upload) changed correct_option too,
-- and the Answer Keys page logged it as a "key change" needing a re-grade even
-- though the same option (1/2/3/4) was still correct.
--
-- From now on a change is logged only when the correct option NUMBER changes
-- (or when the key matches no option, so it can't be told apart).
-- ============================================================

create or replace function answer_slot(opt1 text, opt2 text, opt3 text, opt4 text, key text)
returns int language sql immutable as $$
  select case
    when key is null then null
    when key in ('option1', 'option2', 'option3', 'option4') then substr(key, 7, 1)::int
    when key <> '' and key = opt1 then 1
    when key <> '' and key = opt2 then 2
    when key <> '' and key = opt3 then 3
    when key <> '' and key = opt4 then 4
    else null
  end
$$;

create or replace function log_answer_key_change() returns trigger as $$
declare
  old_slot int := answer_slot(old.option1, old.option2, old.option3, old.option4, old.correct_option);
  new_slot int := answer_slot(new.option1, new.option2, new.option3, new.option4, new.correct_option);
begin
  if new.correct_option is distinct from old.correct_option
     and (old_slot is null or new_slot is null or old_slot <> new_slot) then
    insert into answer_key_changes (question_id, qid, old_correct_option, new_correct_option)
    values (new.id, new.qid, old.correct_option, new.correct_option);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_log_answer_key_change on questions;
create trigger trg_log_answer_key_change
  after update of correct_option on questions
  for each row execute function log_answer_key_change();
