import { defineConfig } from "vitest/config";

// Unit-тести чистої логіки (src/**/*.test.ts). UI перевіряється вручну / E2E.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // describe/it/expect — глобальні, без `import from "vitest"` у тестах.
    // На Windows, якщо термінал відкрито як `c:\…`, імпорт vitest з тесту
    // вантажить другий екземпляр модуля (шлях `C:/…`) і тести падають.
    globals: true,
  },
});
