import { describe, expect, it } from "vitest";
import { parseCommandLine } from "@/modules/terminal/shell/parse";

describe("parseCommandLine", () => {
  it("splits command and arguments", () => {
    expect(parseCommandLine("docker compose logs api")).toEqual({
      cmd: "docker",
      args: ["compose", "logs", "api"],
    });
  });

  it("returns empty command for whitespace input", () => {
    expect(parseCommandLine("   \n  ")).toEqual({ cmd: "", args: [] });
  });
});
