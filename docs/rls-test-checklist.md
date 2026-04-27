# RLS Test Checklist

This checklist is for future Supabase role testing using fake/demo data only.

Reminder: **Frontend filtering is not security. RLS must enforce access at database level.**

---

## HQ Admin

- Dashboard access works.
- Direct restricted URL checks still allow HQ-only routes.
- Can view all branches.
- Can view all students.
- Attendance visibility is global; edit rights match policy.
- Homework visibility is global; edit rights match policy.
- Parent comments visibility includes all statuses by policy.
- Weekly report visibility includes all statuses by policy.
- Fee records visibility is global.
- Teacher tasks visibility is global.
- Storage access is restricted to allowed admin scope.
- Negative test: HQ token should still fail for deleted/disabled account state.

## Branch Supervisor

- Dashboard access works.
- Direct restricted URL checks pass only for allowed branch-supervisor routes.
- Branch visibility limited to own branch.
- Student visibility limited to own branch students.
- Attendance visibility/edit limited to own branch.
- Homework visibility/edit limited to own branch.
- Parent comments visibility/release rights match branch scope policy.
- Weekly report visibility/release rights match branch scope policy.
- Fee records visibility limited to own branch.
- Teacher tasks visibility limited to own branch tasks.
- Storage access limited to own branch files/prefixes.
- Negative test: branch supervisor must not read another branch data by direct SQL/API call.

## Teacher

- Dashboard access works.
- Direct restricted URL checks block admin/supervisor-only routes.
- Branch visibility limited to assigned branch context only.
- Student visibility limited to assigned class students.
- Attendance visibility/edit limited to assigned classes.
- Homework visibility/edit limited to assigned classes.
- Parent comments visibility for assigned students; release rights by policy only.
- Weekly report visibility for assigned students; release rights by policy only.
- Fee records visibility should be blocked unless explicitly allowed.
- Teacher tasks visibility limited to own assignments.
- Storage access limited to assigned class/student files by policy.
- Negative test: teacher cannot query records for unassigned class/student.

## Parent

- Parent dashboard access works.
- Direct restricted URL checks block internal management pages.
- Branch visibility only through linked child context.
- Student visibility only linked child.
- Attendance visibility linked child only; no edit rights.
- Homework visibility linked child only; no edit rights.
- Parent comments visibility only approved/released linked-child items.
- Weekly report visibility only approved/released linked-child items.
- Fee records visibility limited to linked child records where policy allows.
- Teacher tasks visibility blocked.
- Storage access limited to linked child files where policy allows.
- Negative test: parent cannot query another child via modified URL/ID.

## Student

- Student portal access works.
- Direct restricted URL checks block internal management pages.
- Branch visibility only self context.
- Student visibility self only.
- Attendance visibility self only; no edit rights.
- Homework visibility self only; no edit rights.
- Parent comments visibility approved/released self-only items if policy allows.
- Weekly report visibility approved/released self-only items if policy allows.
- Fee records visibility blocked unless product explicitly allows.
- Teacher tasks visibility blocked.
- Storage access limited to self files where policy allows.
- Negative test: student cannot read sibling/peer data by changing IDs in requests.

---

## Cross-role Blocking Tests

- Teacher must not read branch-supervisor-only sales/lead/fee admin datasets.
- Parent must not read teacher draft comments or unapproved weekly reports.
- Student must not read parent-only contact details.
- Branch supervisor must not read HQ-global rows outside own branch.
- Any role must fail reads/writes when JWT role is mismatched to row scope.

## Storage Policy Checks

- Test upload: allowed role + allowed path succeeds.
- Test upload: allowed role + disallowed path fails.
- Test read: linked/assigned file succeeds.
- Test read: unlinked/unassigned file fails.
- Test delete/update metadata: only authorized roles succeed.

## Execution Notes

- Run tests with fake users for each role.
- Validate both UI behavior and direct API/database query behavior.
- Record pass/fail evidence before enabling real data onboarding.
