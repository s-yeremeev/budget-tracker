/// <reference types="vitest/globals" />
// Справжній public/sw.js у фейковому середовищі service worker (кеші, мережа, події).
import fs from "node:fs";
import path from "node:path";

const SW_SOURCE = fs.readFileSync(path.resolve(__dirname, "../../../public/sw.js"), "utf8");
const ORIGIN = "https://app.test";

type Req = { url: string; mode: string; method: string };
type Keyable = Req | { url: string } | string;
interface FakeEvent {
  request?: Req;
  preloadResponse?: Promise<Response | undefined>;
  respondWith?: (p: Promise<Response>) => void;
  waitUntil: (p: Promise<unknown>) => void;
}
type Handler = (event: FakeEvent) => void;

const keyOf = (r: Keyable) => new URL(typeof r === "string" ? r : r.url, ORIGIN).href;

/** Cache: порядок ключів — порядок збереження; повторний put переносить запис у кінець (як у браузері). */
class FakeCache {
  entries = new Map<string, Response>();
  async put(r: Keyable, res: Response) {
    this.entries.delete(keyOf(r));
    this.entries.set(keyOf(r), res);
  }
  async match(r: Keyable) {
    return this.entries.get(keyOf(r))?.clone(); // як браузер: щоразу нова відповідь
  }
  async keys() {
    return [...this.entries.keys()].map((url) => ({ url }));
  }
  async delete(r: Keyable) {
    return this.entries.delete(keyOf(r));
  }
}

class FakeCaches {
  stores = new Map<string, FakeCache>();
  async open(name: string) {
    if (!this.stores.has(name)) this.stores.set(name, new FakeCache());
    return this.stores.get(name)!;
  }
  async keys() {
    return [...this.stores.keys()];
  }
  async delete(name: string) {
    return this.stores.delete(name);
  }
  async match(r: Keyable) {
    for (const c of this.stores.values()) {
      const hit = await c.match(r);
      if (hit) return hit;
    }
    return undefined;
  }
  /** Скільки записів у всіх кешах разом. */
  get size() {
    return [...this.stores.values()].reduce((s, c) => s + c.entries.size, 0);
  }
}

/**
 * Відповідь «як із мережі»: new Response у Node має type "default", а не "basic",
 * і не дозволяє status 0 (у браузері так виглядає opaqueredirect) — підміняємо поля.
 */
function netResponse(body: string, { status = 200, type = "basic" }: { status?: number; type?: string } = {}) {
  const res = new Response(body, { status: status >= 200 && status <= 599 ? status : 200 });
  Object.defineProperty(res, "type", { value: type });
  Object.defineProperty(res, "status", { value: status });
  return res;
}

const offline = () => Promise.reject(new TypeError("Failed to fetch"));
const nav = (p: string): Req => ({ url: ORIGIN + p, mode: "navigate", method: "GET" });

function loadSw(net: (req: Req) => Promise<Response> = (req) => Promise.resolve(netResponse(new URL(req.url).pathname))) {
  const handlers: Record<string, Handler> = {};
  const caches = new FakeCaches();
  const fetchCalls: Req[] = [];
  const state = { preloadEnabled: false, claimed: false, skippedWaiting: false };
  const self = {
    addEventListener: (type: string, fn: Handler) => {
      handlers[type] = fn;
    },
    skipWaiting: () => {
      state.skippedWaiting = true;
    },
    registration: {
      navigationPreload: {
        enable: async () => {
          state.preloadEnabled = true;
        },
      },
    },
    clients: {
      claim: async () => {
        state.claimed = true;
      },
    },
  };
  const fetch = (req: Req) => {
    fetchCalls.push(req);
    return net(req);
  };
  new Function("self", "caches", "fetch", SW_SOURCE)(self, caches, fetch);

  /** Подія fetch. null — SW не перехопив запит (браузер робить його сам). */
  async function request(req: Req, preloadResponse: Promise<Response | undefined> = Promise.resolve(undefined)) {
    const out: { res?: Promise<Response> } = {};
    const waits: Promise<unknown>[] = [];
    handlers.fetch({
      request: req,
      preloadResponse,
      respondWith: (p) => {
        out.res = p;
      },
      waitUntil: (p) => waits.push(p),
    });
    if (!out.res) return null;
    const res = await out.res;
    await Promise.all(waits);
    return res;
  }

  async function activate() {
    const waits: Promise<unknown>[] = [];
    handlers.activate({ waitUntil: (p) => waits.push(p) });
    await Promise.all(waits);
  }

  const pageCache = () => caches.open("budget-tracker-v2");
  return { handlers, caches, fetchCalls, state, request, activate, pageCache };
}

describe("service worker", () => {
  it("встановлення й активація: одразу активний, navigation preload увімкнено, старі кеші видалено", async () => {
    const sw = loadSw();
    const v1 = await sw.caches.open("budget-tracker-v1");
    await v1.put(ORIGIN + "/_next/static/chunks/old.js", netResponse("old"));
    await v1.put(ORIGIN + "/expenses?_rsc=abc", netResponse("rsc"));
    await sw.caches.open("something-else");

    sw.handlers.install({ waitUntil: () => {} });
    await sw.activate();

    expect(sw.state.skippedWaiting).toBe(true);
    expect(sw.state.preloadEnabled).toBe(true);
    expect(sw.state.claimed).toBe(true);
    expect(await sw.caches.keys()).not.toContain("budget-tracker-v1");
    expect(await sw.caches.keys()).not.toContain("something-else");
    expect(sw.caches.size).toBe(0);
  });

  it("статику, дані сторінок (RSC), POST і запити до Supabase не перехоплює і не кешує", async () => {
    const sw = loadSw();
    const passThrough: Req[] = [
      { url: ORIGIN + "/_next/static/chunks/app.js", mode: "no-cors", method: "GET" },
      { url: ORIGIN + "/_next/static/css/app.css", mode: "no-cors", method: "GET" },
      { url: ORIGIN + "/expenses?_rsc=1x2y3", mode: "cors", method: "GET" },
      { url: ORIGIN + "/expenses", mode: "cors", method: "POST" }, // server action
      { url: ORIGIN + "/expenses", mode: "navigate", method: "POST" }, // відправка форми
      { url: "https://x.supabase.co/rest/v1/expenses?select=*", mode: "cors", method: "GET" },
    ];
    for (const req of passThrough) expect(await sw.request(req), req.url).toBeNull();
    expect(sw.fetchCalls).toHaveLength(0);
    expect(sw.caches.size).toBe(0);
  });

  it("перехід онлайн: бере відповідь navigation preload без другого запиту й зберігає офлайн-копію", async () => {
    const sw = loadSw();
    const res = await sw.request(nav("/dashboard"), Promise.resolve(netResponse("свіжий дашборд")));
    expect(await res!.text()).toBe("свіжий дашборд");
    expect(sw.fetchCalls).toHaveLength(0);
    expect(await (await (await sw.pageCache()).match(nav("/dashboard")))!.text()).toBe("свіжий дашборд");
  });

  it("перехід онлайн без preload (браузер не підтримує) — звичайний запит у мережу", async () => {
    const sw = loadSw();
    const res = await sw.request(nav("/goals"));
    expect(await res!.text()).toBe("/goals");
    expect(sw.fetchCalls.map((r) => r.url)).toEqual([ORIGIN + "/goals"]);
    expect(await (await sw.pageCache()).match(nav("/goals"))).toBeDefined();
  });

  it("редірект і помилку сервера віддає як є, але не кешує", async () => {
    const sw = loadSw();
    const redirect = await sw.request(nav("/"), Promise.resolve(netResponse("", { status: 0, type: "opaqueredirect" })));
    expect(redirect!.type).toBe("opaqueredirect");
    const failed = await sw.request(nav("/assets"), Promise.resolve(netResponse("boom", { status: 500 })));
    expect(failed!.status).toBe(500);
    expect(sw.caches.size).toBe(0);
  });

  it("офлайн: відкрита раніше сторінка — з кешу, невідома — дашборд, без кешу — помилка мережі", async () => {
    let online = true;
    const sw = loadSw((req) => (online ? Promise.resolve(netResponse(new URL(req.url).pathname)) : offline()));
    await sw.request(nav("/dashboard"));
    await sw.request(nav("/expenses"));
    online = false;

    // Мережі немає: падає і preload, і звичайний запит.
    expect(await (await sw.request(nav("/expenses"), offline()))!.text()).toBe("/expenses");
    expect(await (await sw.request(nav("/expenses")))!.text()).toBe("/expenses");
    expect(await (await sw.request(nav("/goals")))!.text()).toBe("/dashboard");

    const empty = loadSw(() => offline());
    expect((await empty.request(nav("/goals")))!.type).toBe("error");
  });

  it("зберігає не більше 30 сторінок; повторно відкрита стає найновішою", async () => {
    const sw = loadSw();
    for (let i = 0; i < 30; i++) await sw.request(nav(`/p${i}`));
    await sw.request(nav("/p0")); // відкрили знову — тепер найновіша
    for (let i = 30; i < 34; i++) await sw.request(nav(`/p${i}`));

    const urls = (await (await sw.pageCache()).keys()).map((k) => new URL(k.url).pathname);
    expect(urls).toHaveLength(30);
    expect(urls).toContain("/p0");
    for (const gone of ["/p1", "/p2", "/p3", "/p4"]) expect(urls).not.toContain(gone);
    expect(urls).toContain("/p5");
    expect(urls[urls.length - 1]).toBe("/p33");
  });
});
