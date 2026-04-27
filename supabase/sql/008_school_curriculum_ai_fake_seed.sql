-- 008_school_curriculum_ai_fake_seed.sql
-- Fake/demo seed additions for 007 foundation tables.
-- Do NOT auto-run. Manual review + execution only in fake/demo environment.
-- No real student/parent/teacher/school data.

-- Curriculum mapping (demo)
insert into public.curriculum_mappings (
  id, school_type, curriculum_pathway, grade_year, subject, textbook_module, unit_name, description
) values (
  '91919191-9191-9191-9191-919191919191',
  'demo_type',
  'Demo Pathway',
  'Year 4',
  'English',
  'Demo Book 1 - Unit 3',
  'Reading Comprehension Basics',
  'Demo mapping for fake seed validation only'
)
on conflict (id) do nothing;

-- Learning objectives (few demo rows)
insert into public.learning_objectives (
  id, curriculum_mapping_id, objective_code, objective_title, objective_description, skill_area, cefr_level, display_order
) values
(
  '92929292-9292-9292-9292-929292929291',
  '91919191-9191-9191-9191-919191919191',
  'ENG-Y4-READ-01',
  'Identify Main Idea',
  'Student identifies the main idea in short passages.',
  'reading_comprehension',
  'A1',
  1
),
(
  '92929292-9292-9292-9292-929292929292',
  '91919191-9191-9191-9191-919191919191',
  'ENG-Y4-VOC-02',
  'Use Context Clues',
  'Student infers unknown word meaning from context.',
  'vocabulary',
  'A1',
  2
),
(
  '92929292-9292-9292-9292-929292929293',
  '91919191-9191-9191-9191-919191919191',
  'ENG-Y4-RESP-03',
  'Construct Complete Responses',
  'Student responds with complete sentence answers.',
  'written_response',
  'A2',
  3
)
on conflict (id) do nothing;

-- Student subject enrolment (single demo row)
insert into public.student_subject_enrolments (
  id, student_id, class_id, subject, level, curriculum_mapping_id, status, start_date
) values (
  '93939393-9393-9393-9393-939393939391',
  '55555555-5555-5555-5555-555555555555',
  '33333333-3333-3333-3333-333333333331',
  'English',
  'Level 1',
  '91919191-9191-9191-9191-919191919191',
  'active',
  current_date - 30
)
on conflict (id) do nothing;

-- Student learning profile (single demo row)
insert into public.student_learning_profiles (
  id,
  student_id,
  branch_id,
  preferred_learning_style,
  strength_tags,
  weakness_tags,
  learning_goal_tags,
  teacher_notes_summary,
  ai_summary,
  updated_by_profile_id
) values (
  '94949494-9494-9494-9494-949494949491',
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  'visual_with_guided_prompting',
  array['vocabulary_recall', 'class_participation'],
  array['inference_skills'],
  array['main_idea_detection'],
  'Demo learner profile summary. Fake data only.',
  'Demo AI summary draft. Not for production.',
  (select id from auth.users where email = 'teacher.demo@example.test' limit 1)
)
on conflict (id) do nothing;

-- Homework marking result draft (single demo row)
insert into public.homework_marking_results (
  id,
  homework_record_id,
  student_id,
  class_id,
  marked_by_profile_id,
  marking_source,
  score_text,
  feedback_summary,
  strength_tags,
  weakness_tags,
  linked_objective_ids,
  teacher_approved
) values (
  '95959595-9595-9595-9595-959595959591',
  '20202020-2020-2020-2020-202020202020',
  '55555555-5555-5555-5555-555555555555',
  '33333333-3333-3333-3333-333333333331',
  (select id from auth.users where email = 'teacher.demo@example.test' limit 1),
  'ai_draft',
  '7/10',
  'Demo draft feedback only. Needs teacher validation.',
  array['vocabulary_recall'],
  array['inference_skills'],
  array['92929292-9292-9292-9292-929292929291'::uuid],
  false
)
on conflict (id) do nothing;

-- AI generation request + output draft (single demo pair)
insert into public.ai_generation_requests (
  id,
  student_id,
  requested_by_profile_id,
  request_type,
  source_context_summary,
  status
) values (
  '96969696-9696-9696-9696-969696969691',
  '55555555-5555-5555-5555-555555555555',
  (select id from auth.users where email = 'teacher.demo@example.test' limit 1),
  'weekly_progress_report_draft',
  'Demo context summary for fake seed only.',
  'draft'
)
on conflict (id) do nothing;

insert into public.ai_generation_outputs (
  id,
  request_id,
  output_type,
  draft_content,
  teacher_edited_content,
  approval_status
) values (
  '97979797-9797-9797-9797-979797979791',
  '96969696-9696-9696-9696-969696969691',
  'weekly_progress_report',
  'Demo AI draft output for fake seed only.',
  null,
  'draft'
)
on conflict (id) do nothing;
