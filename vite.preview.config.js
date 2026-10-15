import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const mock = path.resolve(__dirname, "preview/mockRepository.js");

// Preview config: same app, but the Supabase-backed repository is swapped
// for an in-memory mock so the dashboard renders with seeded demo data and
// never needs real credentials or a login.
function mockRepositoryPlugin() {
  return {
    name: "mock-task-repository",
    enforce: "pre",
    async resolveId(source, importer) {
      if (source.includes("taskRepository") && importer && !importer.includes("preview/")) {
        return mock;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [mockRepositoryPlugin(), react()],
  server: { port: 5174 },
});
