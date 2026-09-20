import { getDb, requireStaff } from "../../../utils/auth";
import {
  getRecentEvents,
  getActiveUsers,
  startOfMonth,
  endOfMonth,
  daysAgo,
  startOfDay,
} from "../../../utils/d1/analytics";
import ActivityFeed from "./ActivityFeed";
import ActivityFilters from "./ActivityFilters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  userId?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
}>;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireStaff("/admin/activity");
  const db = await getDb();
  const sp = await searchParams;

  const range = {
    from: sp.from ? new Date(sp.from).getTime() : daysAgo(30).getTime(),
    to: sp.to
      ? new Date(new Date(sp.to).getTime() + 86400_000).getTime()
      : Date.now() + 60_000,
  };

  const [events, users] = await Promise.all([
    getRecentEvents(db, {
      userId: sp.userId,
      action: sp.action,
      entityType: sp.entityType,
      range,
      limit: 200,
    }),
    getActiveUsers(db, range),
  ]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-sm text-gray-500 mt-1">
          Everything that happened, most recent first.
        </p>
      </div>

      <ActivityFilters
        users={users}
        currentUserId={sp.userId}
        currentAction={sp.action}
        currentEntityType={sp.entityType}
        currentFrom={sp.from}
        currentTo={sp.to}
      />

      <ActivityFeed events={events} />
    </div>
  );
}
