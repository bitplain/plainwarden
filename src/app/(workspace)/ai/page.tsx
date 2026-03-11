import HomeWorkspace from "@/components/home/HomeWorkspace";
import { parseHomeUrlState } from "@/components/home/home-url-state";

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

export default async function AiPage(input?: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const searchParams = input?.searchParams ? await input.searchParams : undefined;
  const homeUrlState = parseHomeUrlState(toUrlSearchParams(searchParams));

  return (
    <HomeWorkspace
      initialInputMode={homeUrlState.initialInputMode}
      shouldCanonicalizeLegacyQuery={homeUrlState.shouldCanonicalize}
    />
  );
}
