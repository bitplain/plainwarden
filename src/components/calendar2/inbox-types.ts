import type {
  InboxAiAnalysis,
  InboxItem,
  StatsDaily,
  StatsWeekly,
  Subtask,
  Task,
} from "@/lib/types";

export interface InboxBuckets {
  newItems: InboxItem[];
  processedItems: InboxItem[];
  archivedItems: InboxItem[];
}

export interface InboxTasksState {
  loading: boolean;
  error: string | null;
  inbox: InboxBuckets;
  tasks: Task[];
  subtasksByTaskId: Record<string, Subtask[]>;
  dailyStats: StatsDaily | null;
  weeklyStats: StatsWeekly | null;
  analysisByItemId: Record<string, InboxAiAnalysis>;
  analysisErrorByItemId: Record<string, string>;
  analysisLoadingItemId: string | null;
}
