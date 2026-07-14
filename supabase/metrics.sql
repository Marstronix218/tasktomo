-- Planning-loop metrics (testing stage — run by hand in the Supabase SQL editor).
--
-- The hypothesis under test: companion reactions only work if they drive the planning
-- loop, i.e. after finishing today's work the user creates tomorrow's task. Streaks and
-- XP can look healthy while this loop is broken, so measure it directly.
--
-- Data source: user_profiles.tasks (jsonb array). Each task carries created_at /
-- completed_at ISO timestamps and, for tasks added through the companion's post-completion
-- nudge, created_via = 'nudge'.
--
-- Caveats (fine for testing stage, revisit before trusting long-term):
--   * Deleted tasks vanish from the array, so history is a floor, not an exact count.
--   * Timestamps are client-local ISO strings; date() below truncates in UTC, which can
--     shift a day for non-UTC users. Directionally fine for a small test cohort.
--   * "Nudges shown" isn't persisted, so nudge conversion uses eligible days as the
--     denominator, not actual impressions.

-- Flatten every task with its owner. Reused by the queries below via CTE.
-- (Supabase SQL editor runs one statement at a time — paste a CTE + query together.)

-- ============================================================================
-- 1. PLANNING-LOOP RATE — the metric from the feedback.
-- For each user-day with at least one completion: did the user create a task
-- later that same day (after their last completion) or before noon the next day?
-- That's "tomorrow's task exists because of today's session".
-- ============================================================================
with tasks as (
  select
    p.user_id,
    p.username,
    (t ->> 'created_at')::timestamptz  as created_at,
    (t ->> 'completed_at')::timestamptz as completed_at,
    t ->> 'created_via'                 as created_via
  from public.user_profiles p,
       jsonb_array_elements(p.tasks) as t
),
completion_days as (
  select user_id, username,
         date(completed_at) as day,
         max(completed_at)  as last_completion_at
  from tasks
  where completed_at is not null
  group by 1, 2, 3
)
select
  cd.username,
  count(*)                                   as days_with_completions,
  count(*) filter (where planned.user_id is not null) as days_with_next_task_planned,
  round(
    count(*) filter (where planned.user_id is not null)::numeric / count(*), 2
  )                                          as planning_rate
from completion_days cd
left join lateral (
  select t.user_id
  from tasks t
  where t.user_id = cd.user_id
    and t.created_at > cd.last_completion_at
    and t.created_at < cd.day + interval '1 day 12 hours'
  limit 1
) planned on true
group by cd.username
order by planning_rate desc;

-- ============================================================================
-- 2. NUDGE CONVERSION — of the tasks created, how many came from the one-tap
-- nudge vs organic adds, per user. (Denominator caveat above.)
-- ============================================================================
with tasks as (
  select
    p.username,
    (t ->> 'created_at')::timestamptz as created_at,
    t ->> 'created_via'               as created_via
  from public.user_profiles p,
       jsonb_array_elements(p.tasks) as t
)
select
  username,
  count(*)                                          as tasks_created,
  count(*) filter (where created_via = 'nudge')     as via_nudge,
  round(count(*) filter (where created_via = 'nudge')::numeric / greatest(count(*), 1), 2)
                                                    as nudge_share
from tasks
group by username
order by tasks_created desc;

-- ============================================================================
-- 3. DID NUDGED TASKS ACTUALLY GET DONE? — a planned task that never completes
-- is planning theater. Compare completion rates of nudged vs organic tasks.
-- ============================================================================
with tasks as (
  select
    t ->> 'created_via'   as created_via,
    t ->> 'status'        as status
  from public.user_profiles p,
       jsonb_array_elements(p.tasks) as t
)
select
  coalesce(created_via, 'organic')                   as source,
  count(*)                                           as created,
  count(*) filter (where status = 'completed')       as completed,
  round(count(*) filter (where status = 'completed')::numeric / greatest(count(*), 1), 2)
                                                     as completion_rate
from tasks
group by 1;
