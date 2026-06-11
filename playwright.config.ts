import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, ".env.e2e") });

const E2E_BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3008";
const E2E_ENDPOINT = process.env.E2E_ENDPOINT ?? "";
const E2E_API_KEY = process.env.E2E_API_KEY ?? "";
const E2E_NAME = process.env.E2E_NAME ?? "Ada Lovelace";
const E2E_MODEL = process.env.E2E_MODEL ?? "chat";
// A fresh account per run so register always succeeds against the database.
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "flux-e2e-pass-1234";
const E2E_EMAIL = process.env.E2E_EMAIL ?? `e2e+${Date.now()}@flux.test`;

if (!E2E_ENDPOINT || !E2E_API_KEY) {
  throw new Error(
    "E2E env not configured. Copy .env.e2e.example to .env.e2e and fill in E2E_ENDPOINT + E2E_API_KEY.",
  );
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "tablet",
      use: { ...devices["iPad (gen 7)"] },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: E2E_BASE_URL,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});

export const E2E = {
  endpoint: E2E_ENDPOINT,
  apiKey: E2E_API_KEY,
  name: E2E_NAME,
  model: E2E_MODEL,
  email: E2E_EMAIL,
  password: E2E_PASSWORD,
  baseURL: E2E_BASE_URL,
} as const;
