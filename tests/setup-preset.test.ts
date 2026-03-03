import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSetupPreset } from "@/lib/server/setup";

describe("getSetupPreset", () => {
  const snapshot: Record<string, string | undefined> = {};

  beforeEach(() => {
    snapshot.POSTGRES_HOST = process.env.POSTGRES_HOST;
    snapshot.POSTGRES_PORT = process.env.POSTGRES_PORT;
    snapshot.POSTGRES_USER = process.env.POSTGRES_USER;
    snapshot.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD;
    snapshot.POSTGRES_DB = process.env.POSTGRES_DB;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("returns docker preset from env with generated app password", () => {
    process.env.POSTGRES_HOST = "db.internal";
    process.env.POSTGRES_PORT = "6543";
    process.env.POSTGRES_USER = "db_admin";
    process.env.POSTGRES_PASSWORD = "db_admin_password";
    process.env.POSTGRES_DB = "netden_prod";

    const preset = getSetupPreset("docker");

    expect(preset.mode).toBe("docker");
    expect(preset.pgAdmin).toMatchObject({
      host: "db.internal",
      port: 6543,
      user: "db_admin",
      password: "db_admin_password",
      sslMode: "disable",
    });
    expect(preset.provision.dbName).toBe("netden_prod");
    expect(preset.provision.appRole).toBe("netden_app");
    expect(preset.provision.appPassword).toMatch(/^[0-9a-f]{48}$/);
  });

  it("falls back to defaults for docker when env is empty", () => {
    delete process.env.POSTGRES_HOST;
    delete process.env.POSTGRES_PORT;
    delete process.env.POSTGRES_USER;
    delete process.env.POSTGRES_PASSWORD;
    delete process.env.POSTGRES_DB;

    const preset = getSetupPreset("docker");

    expect(preset.pgAdmin.host).toBe("postgres");
    expect(preset.pgAdmin.port).toBe(5432);
    expect(preset.pgAdmin.user).toBe("netden");
    expect(preset.pgAdmin.password).toBe("netdenpass");
    expect(preset.provision.dbName).toBe("netden");
  });

  it("returns manual remote preset", () => {
    const preset = getSetupPreset("remote");

    expect(preset.mode).toBe("remote");
    expect(preset.pgAdmin).toEqual({
      host: "",
      port: 5432,
      user: "",
      password: "",
      sslMode: "require",
    });
    expect(preset.provision).toEqual({
      dbName: "",
      appRole: "",
      appPassword: undefined,
    });
  });
});
