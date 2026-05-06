import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function trimString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function placeholderPreview(row) {
  if (!Array.isArray(row?.allowed_variables) || row.allowed_variables.length === 0) return 'None';
  const values = row.allowed_variables
    .map((item) => trimString(String(item || '')))
    .filter(Boolean);
  return values.length ? values.join(', ') : 'None';
}

export default function NotificationTemplateManager({
  templates = [],
  isLoading = false,
  isError = false,
  canEdit = false,
  onSaveTemplate,
  isSaving = false,
}) {
  const [selectedId, setSelectedId] = useState('');
  const selected = useMemo(() => {
    const rows = Array.isArray(templates) ? templates : [];
    if (rows.length === 0) return null;
    return rows.find((row) => row.id === selectedId) || rows[0];
  }, [templates, selectedId]);

  const [titleDraft, setTitleDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const [activeDraft, setActiveDraft] = useState(true);

  React.useEffect(() => {
    setTitleDraft(trimString(selected?.title_template || ''));
    setBodyDraft(trimString(selected?.body_template || ''));
    setActiveDraft(Boolean(selected?.is_active));
  }, [selected?.id]);

  const isDirty =
    selected &&
    (titleDraft !== trimString(selected.title_template || '')
      || bodyDraft !== trimString(selected.body_template || '')
      || activeDraft !== Boolean(selected.is_active));

  return (
    <div className="space-y-4">
      <Card className="p-4 border-dashed">
        <p className="text-sm font-medium">Automatic in-app message templates</p>
        <p className="text-xs text-muted-foreground mt-1">
          These templates control automatic in-app messages sent after approved system actions.
          Do not include private student details, payment amounts, internal notes, file links, or AI-generated report text.
        </p>
      </Card>

      {isLoading ? (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Loading message templates...</p>
        </Card>
      ) : null}
      {isError ? (
        <Card className="p-4">
          <p className="text-sm text-amber-700">Message templates are temporarily unavailable.</p>
        </Card>
      ) : null}
      {!isLoading && !isError && (!templates || templates.length === 0) ? (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">No templates found for this environment.</p>
        </Card>
      ) : null}

      {!isLoading && !isError && selected ? (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-2 space-y-3">
            {templates.map((row) => (
              <Card
                key={row.id}
                className={`p-3 cursor-pointer ${selected.id === row.id ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setSelectedId(row.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium break-words">{trimString(row.template_key || 'template')}</p>
                  <Badge variant={row.is_active ? 'default' : 'outline'}>
                    {row.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{trimString(row.event_type || 'event')}</p>
                <p className="text-xs text-muted-foreground">{trimString(row.channel || 'in_app')}</p>
              </Card>
            ))}
          </div>

          <div className="xl:col-span-3 space-y-4">
            <Card className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Template key</p>
                  <p className="text-sm font-medium break-words">{trimString(selected.template_key)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Event type</p>
                  <p className="text-sm font-medium break-words">{trimString(selected.event_type)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Channel</p>
                  <p className="text-sm">{trimString(selected.channel || 'in_app')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Allowed placeholders</p>
                  <p className="text-sm">{placeholderPreview(selected)}</p>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Title template</Label>
                <Input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  disabled={!canEdit || isSaving}
                />
              </div>

              <div className="space-y-1">
                <Label>Body template</Label>
                <Textarea
                  value={bodyDraft}
                  onChange={(e) => setBodyDraft(e.target.value)}
                  className="min-h-[120px]"
                  disabled={!canEdit || isSaving}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={activeDraft ? 'default' : 'outline'}
                  onClick={() => setActiveDraft((prev) => !prev)}
                  disabled={!canEdit || isSaving}
                >
                  {activeDraft ? 'Active' : 'Inactive'}
                </Button>
                {canEdit ? (
                  <Button
                    onClick={() => onSaveTemplate?.({ templateId: selected.id, titleTemplate: titleDraft, bodyTemplate: bodyDraft, isActive: activeDraft })}
                    disabled={!isDirty || isSaving || !trimString(titleDraft) || !trimString(bodyDraft)}
                  >
                    {isSaving ? 'Saving...' : 'Save template'}
                  </Button>
                ) : (
                  <Badge variant="outline">Read-only</Badge>
                )}
              </div>
            </Card>

            <Card className="p-4 border-dashed space-y-2">
              <p className="text-sm font-medium">Parent message preview</p>
              <p className="text-xs text-muted-foreground">
                Preview only. This screen does not send notifications.
              </p>
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <p className="text-sm font-semibold break-words">{trimString(titleDraft) || 'Untitled message'}</p>
                <p className="text-sm whitespace-pre-wrap break-words">{trimString(bodyDraft) || 'Body preview appears here.'}</p>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}

