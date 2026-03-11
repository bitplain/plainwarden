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

export default async function NotesPage(input?: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const searchParams = input?.searchParams ? await input.searchParams : undefined;
  return <Calendar2 initialSearch={toUrlSearchParams(searchParams).toString()} section="notes" />;
}
