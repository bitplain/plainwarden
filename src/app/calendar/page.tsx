import { redirect } from "next/navigation";
import Calendar2 from "@/components/calendar2/Calendar2";

function readLegacyTab(input?: string | string[]): "inbox" | "ai" | null {
  const value = Array.isArray(input) ? input[0] : input;
  return value === "inbox" || value === "ai" ? value : null;
}

export default async function CalendarPage(input?: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const searchParams = input?.searchParams ? await input.searchParams : undefined;
  const legacyTab = readLegacyTab(searchParams?.tab);

  if (legacyTab) {
    redirect(`/?segment=${legacyTab}`);
  }

  return <Calendar2 />;
}
