import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals:     true,
    environment: "node",
    setupFiles:  ["./src/tests/setup.ts"],
    env: {
      NODE_ENV: "test",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude:  ["src/generated/**", "src/tests/**", "dist/**", "*.config.*"],
    },
    pool:       "forks",
    singleFork: true,
  },
});
