import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const apiBase = process.env.CONTRACTFLOW_API_BASE?.trim() || "http://127.0.0.1:3000";
const bearer = process.env.CONTRACTFLOW_BEARER_TOKEN?.trim() || "";

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (bearer) {
    headers.set("Authorization", `Bearer ${bearer}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${apiBase}${path}`, { ...init, headers });
}

const server = new McpServer({
  name: "contractflow",
  version: "0.1.0",
});

server.registerTool(
  "compare_contracts",
  {
    description: "Request an async contract comparison for a contract id",
    inputSchema: {
      contractId: z.string().min(1),
    },
  },
  async ({ contractId }) => {
    const response = await apiFetch(`/api/v1/contracts/${contractId}/comparisons`, {
      method: "POST",
    });
    const text = await response.text();
    if (!response.ok) {
      return {
        content: [{ type: "text" as const, text: `HTTP ${response.status}: ${text}` }],
        isError: true,
      };
    }
    return { content: [{ type: "text" as const, text }] };
  },
);

server.registerTool(
  "get_comparison_job",
  {
    description: "Fetch comparison job status by jobId",
    inputSchema: {
      jobId: z.string().min(1),
    },
  },
  async ({ jobId }) => {
    const response = await apiFetch(`/api/v1/jobs/${jobId}`);
    const text = await response.text();
    if (!response.ok) {
      return {
        content: [{ type: "text" as const, text: `HTTP ${response.status}: ${text}` }],
        isError: true,
      };
    }
    return { content: [{ type: "text" as const, text }] };
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
