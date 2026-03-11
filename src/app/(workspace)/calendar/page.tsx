import { redirect } from "next/navigation";
import Calendar2 from "@/components/calendar2/Calendar2";

function toUrlSearchParams(
  input?: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();

  if (!input) {
    return params;
  }

  Object.entries(input).forEach(([key, value]) => {
    const normalized = Array.isArray(value) ? value[0] : value;
    if (typeof normalized === "string") {
      params.set(key, normalized);
    }
  });

  return params;
}

function readRedirectTarget(input?: string | string[]): string | null {
  const value = Array.isArray(input) ? input[0] : input;
  if (value === "inbox" || value === "ai") {
    return `/ai?segment=${value}`;
  }
  if (value === "ai-i") {
    return "/";
  }
  if (value === "kanban") {
    return "/kanban";
  }
  if (value === "notes") {
    return "/notes";
  }
  return null;
}

export default async function CalendarPage(input?: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const searchParams = input?.searchParams ? await input.searchParams : undefined;
  const redirectTarget = readRedirectTarget(searchParams?.tab);

  if (redirectTarget) {
    redirect(redirectTarget);
  }

  const initialSearchParams = toUrlSearchParams(searchParams);
  initialSearchParams.delete("tab");

  return <Calendar2 initialSearch={initialSearchParams.toString()} section="calendar" />;
}
