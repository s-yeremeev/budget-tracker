/// <reference types="vitest/globals" />
import fs from "node:fs";
import path from "node:path";
import { verifiedUserId, type SessionAuth } from "@/lib/supabase/claims";

const ID = "11111111-1111-1111-1111-111111111111";

/** Фейковий auth: лічить виклики; відповіді задаються функціями (можуть кидати). */
function fakeAuth(
  claims: () => ReturnType<SessionAuth["getClaims"]>,
  user: () => ReturnType<SessionAuth["getUser"]> = async () => ({ data: { user: { id: ID } } }),
) {
  const calls = { getClaims: 0, getUser: 0 };
  const auth: SessionAuth = {
    getClaims: () => {
      calls.getClaims++;
      return claims();
    },
    getUser: () => {
      calls.getUser++;
      return user();
    },
  };
  return { auth, calls };
}

describe("verifiedUserId — сесія без запиту до Supabase Auth", () => {
  it("підпис перевірено локально → id із claims, getUser (мережа) не викликається", async () => {
    const { auth, calls } = fakeAuth(async () => ({ data: { claims: { sub: ID } }, error: null }));
    expect(await verifiedUserId(auth)).toBe(ID);
    expect(calls).toEqual({ getClaims: 1, getUser: 0 });
  });

  it("getClaims повернув помилку (JWKS недоступний, чужий підпис) → рішення за getUser", async () => {
    const ok = fakeAuth(async () => ({ data: null, error: new Error("Invalid JWT signature") }));
    expect(await verifiedUserId(ok.auth)).toBe(ID);
    expect(ok.calls.getUser).toBe(1);

    const rejected = fakeAuth(
      async () => ({ data: null, error: new Error("Invalid JWT signature") }),
      async () => ({ data: { user: null } }),
    );
    expect(await verifiedUserId(rejected.auth)).toBeNull();
  });

  it("getClaims кинув виняток → фолбек на getUser", async () => {
    const { auth, calls } = fakeAuth(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await verifiedUserId(auth)).toBe(ID);
    expect(calls.getUser).toBe(1);
  });

  it("помилка разом із claims — claims не довіряємо", async () => {
    const { auth, calls } = fakeAuth(
      async () => ({ data: { claims: { sub: "attacker" } }, error: new Error("expired") }),
      async () => ({ data: { user: null } }),
    );
    expect(await verifiedUserId(auth)).toBeNull();
    expect(calls.getUser).toBe(1);
  });

  it("порожній або нерядковий sub → не вважаємо входом без getUser", async () => {
    for (const sub of ["", 42, null, undefined]) {
      const { auth, calls } = fakeAuth(
        async () => ({ data: { claims: { sub } }, error: null }),
        async () => ({ data: { user: null } }),
      );
      expect(await verifiedUserId(auth), String(sub)).toBeNull();
      expect(calls.getUser).toBe(1);
    }
  });

  it("немає сесії → null", async () => {
    const { auth } = fakeAuth(
      async () => ({ data: null, error: null }),
      async () => ({ data: { user: null } }),
    );
    expect(await verifiedUserId(auth)).toBeNull();
  });

  it("Supabase недоступний (getUser кидає) → null, а не падіння запиту", async () => {
    const { auth } = fakeAuth(
      async () => {
        throw new TypeError("fetch failed");
      },
      async () => {
        throw new TypeError("fetch failed");
      },
    );
    expect(await verifiedUserId(auth)).toBeNull();
  });

  it("у коді немає прямих auth.getUser() — уся перевірка сесії через verifiedUserId", () => {
    const root = path.resolve(__dirname, "../..");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(f) && !/\.test\.ts$/.test(f) && !p.endsWith(path.join("supabase", "claims.ts"))) {
          if (/auth\s*\.\s*getUser\s*\(/.test(fs.readFileSync(p, "utf8"))) offenders.push(path.relative(root, p));
        }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
