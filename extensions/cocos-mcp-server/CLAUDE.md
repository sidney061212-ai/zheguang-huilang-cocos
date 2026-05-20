# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CocosMCPPlugin is a Cocos Creator 3.8.x editor extension that implements an MCP (Model Context Protocol) server, allowing AI assistants (Claude, Cursor, etc.) to control the Cocos Creator editor via JSON-RPC 2.0 over HTTP.

## Build Commands

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript → dist/
npm run watch        # Watch mode (auto-recompile on changes)
```

There is no test framework. Manual testing is done by installing the extension in Cocos Creator and connecting to `http://127.0.0.1:3000/mcp`. The `GET /api/tools` endpoint lists all available tools with curl examples.

## Architecture

The system has four distinct execution contexts that communicate via Cocos Creator's IPC:

```
AI Client (HTTP JSON-RPC 2.0)
    ↓ POST /mcp
MCPServer (mcp-server.ts)          ← runs in extension process
    ↓ Editor.Message IPC
main.ts (extension main process)   ← handles lifecycle & settings
    ↓ execute-scene-script
scene.ts (scene script context)    ← direct access to cc.* engine APIs
```

**Key constraint:** Engine APIs (`cc.*`) can only be called from `scene.ts` (the scene script context). Everything else runs in the extension process. Tools that need engine access must route through `Editor.Message` → `execute-scene-script`.

## Key Files

| File | Role |
|------|------|
| `source/main.ts` | Extension entry: `load`/`unload` lifecycle, message handler registration |
| `source/mcp-server.ts` | HTTP server, JSON-RPC 2.0 protocol, tool routing (~1200 lines) |
| `source/scene.ts` | Scene script: engine API calls, node/component manipulation |
| `source/settings.ts` | JSON settings persistence to `{project}/settings/` |
| `source/types/index.ts` | Shared TypeScript interfaces (`ToolDefinition`, `ToolResponse`, `ToolExecutor`) |
| `source/tools/tool-manager.ts` | Per-tool enable/disable configuration |
| `source/panels/default/index.ts` | Vue 3 control panel UI |

## Tool System

All tool categories implement the `ToolExecutor` interface:

```typescript
interface ToolExecutor {
    getTools(): ToolDefinition[];
    execute(toolName: string, args: any): Promise<ToolResponse>;
}
```

The 14 tool categories in `source/tools/` are instantiated once in the `MCPServer` constructor and registered by calling `getTools()` on each. When `tools/call` arrives, `MCPServer.executeToolCall()` routes to the appropriate category's `execute()` method.

**Tool categories:** `scene-tools`, `node-tools`, `component-tools`, `prefab-tools`, `project-tools`, `debug-tools`, `preferences-tools`, `server-tools`, `broadcast-tools`, `scene-advanced-tools`, `scene-view-tools`, `reference-image-tools`, `asset-advanced-tools`, `validation-tools`.

## HTTP Endpoints

- `POST /mcp` — MCP JSON-RPC 2.0 (primary interface)
- `GET /health` — Health check
- `POST /api/{category}/{tool}` — Simplified REST API
- `GET /api/tools` — List all tools with curl examples

## Settings

Stored as JSON in `{project}/settings/`:
- `mcp-server.json` — port (default: 3000), autoStart, enableDebugLog, maxConnections, allowedOrigins
- `tool-manager.json` — named configurations with per-tool enable/disable toggles

## TypeScript Configuration

`base.tsconfig.json` uses `strict: true`, `target: ES2017`, `module: CommonJS`. The compiled output goes to `dist/`. The extension runs on Node.js inside Cocos Creator's Electron environment.

## Adding a New Tool

1. Add the tool definition to an existing category file's `getTools()` return array, or create a new `ToolExecutor` class.
2. Add the `execute()` case for the tool name.
3. If the tool needs engine access, add a message handler in `main.ts` and a corresponding function in `scene.ts`.
4. Register a new category class in the `MCPServer` constructor (if creating a new category).
5. Add the tool to `package.json` under `contributions.messages` if it needs IPC.
