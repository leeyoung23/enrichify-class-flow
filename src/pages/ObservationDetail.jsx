import React from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import ObservationDetail from '@/components/observations/ObservationDetail';
import { ClipboardPen } from 'lucide-react';
import { listObservations } from '@/services/dataService';

export default function ObservationDetailPage() {
  const { user } = useOutletContext();
  const { id } = useParams();

  const { data: observations = [] } = useQuery({
    queryKey: ['observation-detail', user?.role, user?.branch_id],
    queryFn: () => listObservations(user),
    enabled: !!user,
  });

  const observation = observations.find((item) => item.id === id);

  return (
    <div>
      <PageHeader
        title="Observation Detail"
        description="View recorded teaching quality feedback and follow-up notes."
      />
      {observation ? (
        <ObservationDetail observation={observation} />
      ) : (
        <EmptyState
          icon={ClipboardPen}
          title="Observation not found"
          description="This observation is not available for your role or could not be found."
        />
      )}
    </div>
  );
}