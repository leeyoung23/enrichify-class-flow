# Student Profile / Learning Notes Foundation Plan

Date: 2026-05-06
Type: small safe UAT foundation (no SQL/RLS changes)

## Product ownership model

### 1) Core student profile (official record)

- name
- branch
- class
- programme
- enrolment status
- guardian/parent link

Owner:
- HQ / Branch Supervisor

Teacher access:
- view only

### 2) Learning profile / teacher notes (internal learning context)

- strengths
- areas for improvement
- behaviour and engagement notes
- learning goals
- support needs

Owner:
- teacher can add/update only through approved scoped internal paths
- supervisor/HQ can review

Parent visibility:
- internal by default
- only parent-visible when explicitly released via approved communication/report flows

### 3) Evidence history (existing modules)

- attendance
- homework
- observations
- parent communication
- class memories

### 4) Sensitive/admin profile fields

- medical notes
- pickup authorisation
- billing
- legal consent

Owner:
- HQ / Branch Supervisor only

Teacher access:
- limited view only if policy-approved in future

## Current foundation implemented

- `/students` now has a safe student profile detail foundation opened from each card.
- Student detail panel includes:
  - student identity summary,
  - class/programme/branch display,
  - attendance/homework summary counts,
  - links to existing modules (`/attendance`, `/homework`, `/observations`, `/parent-updates`).
- Learning notes section is internal-facing and includes clear placeholder copy for teacher workflow:
  - "Learning notes are internal staff evidence. Parents will not see these notes unless they are later included in an approved report or released parent communication."
- Official ownership boundary is explicitly stated in UI copy:
  - "Official profile, class, branch, and guardian links are managed by HQ or Branch Supervisors."
  - teacher read-only for those official profile fields.
- Quick-link guidance in student detail panel:
  - "Use the tools below to record evidence through the existing workflows."

## Test posture for this polish pass

- No existing lightweight UI smoke/unit pattern was found for route-level `/students` copy assertions.
- Validation remains build/lint/typecheck for this copy-only update.

## Parent linking and class assignment boundary

- Parent links to an existing student record.
- HQ/Branch Supervisor remains source of truth for branch/class assignment.
- Parents do not self-assign class membership.
- `guardian_student_links` remains the relationship boundary.

## Deferred items

- Dedicated teacher-writeable learning-notes table/workflow with explicit release controls.
- Additional role-specific guardrails at DB layer for fine-grained teacher note writes.
- Parent-facing exposure controls for any future learning-notes release mechanism.
