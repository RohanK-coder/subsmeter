import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
    isolate: false, // all test files share one module registry, so one Prisma client
    setupFiles: ["./tests/setup.ts"],
  },
});