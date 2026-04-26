import React from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import RoadmapCard from '@/components/shared/RoadmapCard';
import EmptyState from '@/components/shared/EmptyState';
import { Bot } from 'lucide-react';
import { getFutureArchitectureSpec, getFutureDataModelBlueprint, getFutureModuleRoadmap } from '@/services/dataService';

function SpecSection({ title, items }) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-lg border border-border bg-accent/20 px-3 py-2 text-sm">
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function FutureAiLearningEngine() {
  const { user } = useOutletContext();
  const role = user?.role;
  const canAccess = role === 'hq_admin' || role === 'branch_supervisor';
  const roadmap = getFutureModuleRoadmap();
  const architecture = getFutureArchitectureSpec();
  const blueprint = getFutureDataModelBlueprint();

  if (!canAccess) {
    return (
      <EmptyState
        icon={Bot}
        title="Access restricted"
        description="This page is not available for the current demo role."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Future AI Learning Engine"
        description="Roadmap and product specification only — no OCR, real AI marking, or textbook ingestion is being built yet."
      />

      <Card className="p-6 mb-6 bg-accent/20 border-dashed">
        <h3 className="font-semibold mb-3">Long-Term Learning Loop</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            'Parent uploads scanned homework or learning material',
            'Attachment record is saved first',
            'Future AI creates a marking draft',
            'Teacher reviews original file and AI draft',
            'Teacher approves or edits feedback',
            'Parent sees approved feedback only',
            'HQ tracks inbox and release progress',
          ].map((item) => (
            <div key={item} className="rounded-full border border-border bg-background px-3 py-1.5">
              {item}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {roadmap.map((section) => (
          <RoadmapCard
            key={section.id}
            title={section.title}
            description={section.description}
            items={section.items}
            badge="Future roadmap"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <SpecSection title="Architecture Layers" items={[
          ...architecture.ingestionLayer,
          ...architecture.intelligenceLayer,
          ...architecture.operationsLayer,
          ...architecture.engagementLayer,
          ...architecture.governanceRules,
        ]} />
        <SpecSection title="Planned Data Blueprint" items={[
          `Homework Scans: ${blueprint.homeworkScans.join(', ')}`,
          `Curriculum Knowledge Base: ${blueprint.curriculumKnowledgeBase.join(', ')}`,
          `AI Marking Diagnoses: ${blueprint.aiMarkingDiagnoses.join(', ')}`,
          `Teacher Follow-Up Tasks: ${blueprint.teacherFollowUpTasks.join(', ')}`,
          `Student Reminders: ${blueprint.studentReminders.join(', ')}`,
        ]} />
      </div>

      <Card className="p-6 mb-6">
        <h3 className="font-semibold mb-4">Future AI Marking Plan</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">Recommended MVP model:</span> OpenAI GPT-5.5 vision for scanned homework understanding and draft marking.</p>
          <p><span className="font-medium text-foreground">Possible later comparison:</span> Gemini multimodal model for cost and speed comparison.</p>
          <div className="rounded-lg border border-border bg-accent/20 p-4">
            <p className="font-medium text-foreground mb-2">Planned structured marking output</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {['question detected', 'student answer', 'correct / partially correct / incorrect', 'score', 'mistake explanation', 'weak skill tag', 'recommended revision', 'AI confidence', 'teacher review status'].map((item) => (
                <div key={item} className="rounded-md border border-border bg-background px-3 py-2">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Important Notes</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>This page is a future roadmap/specification only.</p>
          <p>OCR, AI marking, and automated diagnosis are not implemented yet.</p>
          <p>No real textbook uploads or copyrighted textbook ingestion should be done at this stage.</p>
          <p>Copyrighted textbook content must be handled carefully, with permission, licensing, or approved limited-use workflows before any future implementation.</p>
          <p>Teacher review and approval should remain part of the workflow before any parent-facing output is shown.</p>
        </div>
      </Card>
    </div>
  );
}