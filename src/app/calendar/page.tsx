import { redirect } from "next/navigation";
import Calendar2 from "@/components/calendar2/Calendar2";

function readRedirectTarget(input?: string | string[]): string | null {
  const value = Array.isArray(input) ? input[0] : input;
  if (value === "inbox" || value === "ai") {
    return `/ai?segment=${value}`;
  }
  if (value === "ai-i") {
    return "/";
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

  const initialSearchParams = new URLSearchParams();
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      const normalized = Array.isArray(value) ? value[0] : value;
      if (typeof normalized === "string") {
        initialSearchParams.set(key, normalized);
      }
    });
  }

  return <Calendar2 initialSearch={initialSearchParams.toString()} />;
}
