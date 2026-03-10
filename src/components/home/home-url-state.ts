import type { HomeInputMode } from "./home-workspace-state";

export interface HomeUrlState {
  initialInputMode: HomeInputMode;
  shouldCanonicalize: boolean;
}

function readLegacySegment(value: string | null): "ai" | "inbox" | null {
  return value === "ai" || value === "inbox" ? value : null;
}

export function parseHomeUrlState(searchParams: URLSearchParams): HomeUrlState {
  const legacySegment = readLegacySegment(searchParams.get("segment"));

  return {
    initialInputMode: legacySegment === "inbox" ? "idea" : "ai",
    shouldCanonicalize: legacySegment !== null,
  };
}

export function buildCanonicalHomeUrl(input: {
  currentPathname: string;
  currentSearchParams: URLSearchParams;
  hash?: string;
}): string {
  const params = new URLSearchParams(input.currentSearchParams.toString());
  params.delete("segment");

  const query = params.toString();
  if (!query) {
    return `${input.currentPathname}${input.hash ?? ""}`;
  }

  return `${input.currentPathname}?${query}${input.hash ?? ""}`;
}

export function clearLegacyHomeUrlInWindow(): void {
  if (typeof window === "undefined") {
    return;
  }

  const currentSearchParams = new URLSearchParams(window.location.search);
  if (!currentSearchParams.has("segment")) {
    return;
  }

  const nextUrl = buildCanonicalHomeUrl({
    currentPathname: window.location.pathname,
    currentSearchParams,
    hash: window.location.hash,
  });

  window.history.replaceState(null, "", nextUrl);
}
