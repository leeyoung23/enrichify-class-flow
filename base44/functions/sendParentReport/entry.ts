import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId, appUrl } = await req.json();
    if (!studentId) {
      return Response.json({ error: 'studentId is required' }, { status: 400 });
    }

    const students = await base44.asServiceRole.entities.Student.filter({ id: studentId });
    if (!students || students.length === 0) {
      return Response.json({ error: 'Student not found' }, { status: 404 });
    }
    const student = students[0];

    if (!student.parent_email) {
      return Response.json({ error: 'No parent email on record for this student.' }, { status: 400 });
    }

    const baseUrl = appUrl || 'https://your-app.base44.app';
    const reportLink = `${baseUrl}/parent-view?student=${student.id}`;

    const emailBody = `
Dear ${student.parent_name || 'Parent/Guardian'},

Your child's latest progress report from EduCentre is now ready.

Click the link below to view ${student.name}'s report:

${reportLink}

On this page you can:
- Read the latest report from ${student.name}'s teacher
- View attendance and homework summaries
- Upload completed homework
- Access the Student Learning Portal

This is a private link — please do not share it.

Warm regards,
EduCentre Team
`.trim();

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: student.parent_email,
      subject: `${student.name}'s Progress Report — EduCentre`,
      body: emailBody,
    });

    return Response.json({ success: true, sentTo: student.parent_email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});