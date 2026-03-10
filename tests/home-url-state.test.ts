import { describe, expect, it } from "vitest";
import {
  buildCanonicalHomeUrl,
  parseHomeUrlState,
} from "@/components/home/home-url-state";

describe("parseHomeUrlState", () => {
  it("uses ai mode by default without canonicalization", () => {
    expect(parseHomeUrlState(new URLSearchParams())).toEqual({
      initialInputMode: "ai",
      shouldCanonicalize: false,
    });
  });

  it("maps legacy inbox segment to idea mode and marks url for cleanup", () => {
    expect(parseHomeUrlState(new URLSearchParams("segment=inbox"))).toEqual({
      initialInputMode: "idea",
      shouldCanonicalize: true,
    });
  });

  it("accepts only legacy ai and inbox segments", () => {
    expect(parseHomeUrlState(new URLSearchParams("segment=ai"))).toEqual({
      initialInputMode: "ai",
      shouldCanonicalize: true,
    });

    expect(parseHomeUrlState(new URLSearchParams("segment=calendar"))).toEqual({
      initialInputMode: "ai",
      shouldCanonicalize: false,
    });
  });
});

describe("buildCanonicalHomeUrl", () => {
  it("drops the legacy segment and preserves unrelated params", () => {
    const url = buildCanonicalHomeUrl({
      currentPathname: "/",
      currentSearchParams: new URLSearchParams("segment=inbox&legacy=1"),
      hash: "#ideas",
    });

    expect(url).toBe("/?legacy=1#ideas");
  });

  it("returns a clean root url when segment was the only query", () => {
    const url = buildCanonicalHomeUrl({
      currentPathname: "/",
      currentSearchParams: new URLSearchParams("segment=inbox"),
    });

    expect(url).toBe("/");
  });
});
