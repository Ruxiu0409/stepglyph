import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@stepglyph/core": "/Users/ruxiu0409/Project/stepglyph/packages/core/src/index.ts",
      "@stepglyph/recorder-server": "/Users/ruxiu0409/Project/stepglyph/packages/recorder-server/src/index.ts"
    }
  },
  test: {
    environment: "node",
    globals: true,
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.tsx",
      "tests/**/*.test.ts"
    ],
    testTimeout: 10000
  }
});
