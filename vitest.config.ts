import { defineConfig } from "vitest/config";

// Root config — runs every workspace project in one process.
// `pnpm test` from the root, or `pnpm --filter @hisab/api test` for one package.
export default defineConfig({
  test: {
    projects: ["apps/api", "apps/web", "packages/shared"],
    coverage: {
      provider: "v8",
      include: ["apps/api/src/**", "apps/web/src/lib/**", "packages/shared/src/**"],
      exclude: ["**/*.test.ts", "apps/api/src/test/**", "apps/api/src/index.ts"],
    },
  },
});
