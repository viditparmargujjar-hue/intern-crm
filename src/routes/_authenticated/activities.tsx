import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { EmptyState, ErrorState, LoadingRows, Panel } from "@/components/crm/Surfaces";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchActivities } from "@/lib/crm-api";

export const Route = createFileRoute("/_authenticated/activities")({
  head: () => ({
    meta: [
      { title: "Activities — Pixel Infinite CRM" },
      { name: "description", content: "A full timeline of every call, email, note and status change." },
      { property: "og:title", content: "Activities — Pixel Infinite CRM" },
      { property: "og:description", content: "A full timeline of every call, email, note and status change." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const activities = useQuery({ queryKey: ["activities"], queryFn: fetchActivities });

  if (activities.isError) {
    return <ErrorState message="We couldn't load the activities. Please try again." />;
  }

  return (
    <div>
      <PageHeader
        title="Activities"
        description="Everything that happened across your leads and customers, newest first."
      />
      <Panel>
        {activities.isLoading ? (
          <LoadingRows />
        ) : (activities.data ?? []).length === 0 ? (
          <EmptyState
            title="No activities yet"
            description="Activities appear automatically when you add notes, change statuses or complete follow-ups."
          />
        ) : (
          <div className="p-4">
            <ActivityTimeline activities={activities.data ?? []} />
          </div>
        )}
      </Panel>
    </div>
  );
}
