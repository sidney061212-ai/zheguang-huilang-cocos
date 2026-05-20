# Cocos MCP Server

An AI MCP (Model Context Protocol) server plugin for Cocos Creator 3.8.x, enabling AI assistants (Claude, Cursor, etc.) to directly control the Cocos Creator editor.

## Features

- **MCP Protocol**: Standard JSON-RPC 2.0 over HTTP transport
- **130+ Tools**: Full coverage of scene, node, component, prefab, asset, and project operations
- **Vue 3 Control Panel**: Built-in server control and tool management UI
- **Tool Configuration**: Enable/disable tools on demand and save custom configurations
- **Auto-start**: Optionally start the server automatically when the extension loads
- **Bilingual UI**: English and Chinese interface

## Compatibility

| Cocos Creator | Status |
|---|---|
| 3.8.x | Fully supported |
| 3.7.x | Untested |

## Installation

### Option 1: Project-level Extension

Copy the plugin folder into the `extensions` directory of your Cocos Creator project:

```
{your-project}/
└── extensions/
    └── cocos-mcp-server/    ← place the entire folder here
```

### Option 2: Global Extension

Copy the plugin folder to the global extensions directory:

```
~/.CocosCreator/extensions/cocos-mcp-server/
```

### Enable the Extension

1. Open Cocos Creator 3.8.x
2. Go to **Extension** → **Extension Manager** in the menu bar
3. Find `cocos-mcp-server` under the **Project** or **Global** tab
4. Click **Enable**

## Development Build

To build from source:

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Development mode (file watching)
npm run watch
```

Compiled output is placed in the `dist/` directory.

## Usage

### 1. Start the Server

After enabling the extension, open the control panel via **Extension → Cocos MCP Server** in the menu bar, then click **Start Server**.

Default server address: `http://127.0.0.1:3000/mcp`

### 2. Connect an AI Client

**Claude Code:**
```bash
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp
```

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "cocos-creator": {
      "url": "http://127.0.0.1:3000/mcp",
      "transport": "http"
    }
  }
}
```

**Cursor / VS Code:**
Add an HTTP-type MCP server in your MCP settings and set the URL to `http://127.0.0.1:3000/mcp`.

## Tool Reference

### Scene Tools (8)
| Tool | Description |
|---|---|
| `get_current_scene` | Get current scene information |
| `get_scene_list` | List all scenes in the project |
| `open_scene` | Open a scene by path |
| `save_scene` | Save the current scene |
| `create_scene` | Create a new scene |
| `save_scene_as` | Save the current scene to a new path |
| `close_scene` | Close the current scene |
| `get_scene_hierarchy` | Get the full scene node hierarchy |

### Node Tools (11)
| Tool | Description |
|---|---|
| `create_node` | Create a new node |
| `get_node_info` | Get detailed information about a node |
| `find_nodes` | Find nodes by filter criteria |
| `find_node_by_name` | Find a node by name |
| `get_all_nodes` | Get all nodes in the scene |
| `set_node_property` | Set a property on a node |
| `set_node_transform` | Set node position, rotation, and scale |
| `delete_node` | Delete a node |
| `move_node` | Move a node to a new parent |
| `duplicate_node` | Duplicate a node |
| `detect_node_type` | Detect the type of a node |

### Component Tools
| Tool | Description |
|---|---|
| `add_component` | Add a component to a node |
| `remove_component` | Remove a component from a node |
| `get_component_info` | Get component information |
| `set_component_property` | Set a component property value |
| `get_components` | Get all components on a node |
| `reset_node_property` | Reset a node property to its default |
| `reset_component` | Reset a component to its default values |
| `execute_component_method` | Call a method on a component |

### Prefab Tools
| Tool | Description |
|---|---|
| `create_prefab` | Create a prefab asset from a node |
| `instantiate_prefab` | Instantiate a prefab into the scene |
| `edit_prefab` | Enter prefab editing mode |
| `save_prefab` | Save the current prefab |
| `exit_prefab_edit` | Exit prefab editing mode |
| `revert_prefab` | Revert a prefab instance to the asset |
| `apply_prefab` | Apply node changes back to the prefab asset |

### Asset Tools
| Tool | Description |
|---|---|
| `import_asset` | Import an asset file |
| `get_asset_info` | Get information about an asset |
| `get_assets` | List assets in the project |
| `create_asset` | Create a new asset |
| `copy_asset` | Copy an asset to a new path |
| `move_asset` | Move an asset to a new path |
| `delete_asset` | Delete an asset |
| `refresh_assets` | Refresh the asset database |
| `query_asset_path` | Query an asset path by UUID |
| `query_asset_uuid` | Query an asset UUID by path |
| `find_asset_by_name` | Search for assets by name |

### Project Tools
| Tool | Description |
|---|---|
| `get_project_info` | Get basic project information |
| `get_project_settings` | Get project settings |
| `run_project` | Run the project preview |
| `build_project` | Build the project |
| `open_build_panel` | Open the build panel |
| `check_builder_status` | Check the builder worker status |

### Debug Tools (10)
| Tool | Description |
|---|---|
| `get_console_logs` | Retrieve console log entries |
| `clear_console` | Clear the editor console |
| `log_message` | Write a log message to the console |
| `get_editor_info` | Get editor version and environment info |

### Scene View Tools (18)
Control gizmo tools, coordinate systems, view modes, grid display, and other scene viewport settings.

### Advanced Scene Tools (18)
Undo recording, node copy/paste/cut, scene snapshots, soft reload, and other advanced operations.

### Reference Image Tools
Add, remove, and transform reference images in the scene viewport.

### Advanced Asset Tools
Batch asset operations and asset dependency analysis.

### Broadcast Tools (5)
Send custom event broadcasts to the editor.

### Server Tools (6)
Query server status, connection information, and the active tool list.

### Validation Tools (3)
Scene integrity validation, asset dependency validation, and MCP response format validation.

## Server Settings

| Setting | Default | Description |
|---|---|---|
| Port | `3000` | HTTP server listening port |
| Auto Start | `false` | Start the server automatically on extension load |
| Debug Log | `false` | Enable verbose debug logging |
| Max Connections | `10` | Maximum number of simultaneous client connections |

## Tool Management

The **Tool Management** tab in the control panel supports:

- **Per-category control**: Enable or disable tools by category
- **Bulk operations**: Select all / deselect all
- **Persistent config**: Save the enabled/disabled state across sessions

Disabling unused tools reduces the AI's tool context size and can improve response efficiency.

## Project Structure

```
cocos-mcp-server/
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript configuration
├── base.tsconfig.json        # Base TypeScript configuration
├── i18n/
│   ├── en.js                 # English localization
│   └── zh.js                 # Chinese localization
├── static/
│   ├── icon.png              # Extension icon
│   ├── style/default/        # Panel stylesheet
│   └── template/             # Panel HTML templates
├── source/
│   ├── main.ts               # Extension entry point
│   ├── mcp-server.ts         # HTTP MCP server core
│   ├── scene.ts              # Scene script (engine API access)
│   ├── settings.ts           # Settings persistence
│   ├── types/index.ts        # TypeScript type definitions
│   ├── panels/default/       # Vue 3 control panel
│   └── tools/                # Tool modules (14 categories)
└── dist/                     # Compiled JavaScript output
```

## Architecture

```
AI Client (Claude / Cursor)
       │  HTTP JSON-RPC 2.0
       ▼
MCP HTTP Server (localhost:3000)
       │  Editor.Message IPC
       ▼
Cocos Creator Editor Process
       │  execute-scene-script
       ▼
Scene Script (engine API: cc.*)
```

- **Main process** (`main.ts`): Manages the server lifecycle and handles extension messages
- **MCP server** (`mcp-server.ts`): Implements the JSON-RPC 2.0 protocol and routes tool calls
- **Tool modules** (`tools/*.ts`): Wrap specific `Editor.Message` calls for each operation
- **Scene script** (`scene.ts`): Runs in the engine context with direct access to `cc` APIs
- **Control panel** (`panels/default/index.ts`): Vue 3 UI that communicates with the main process via IPC

## Troubleshooting

**Q: The server fails to start with a "port in use" error.**
A: Change the port number in the control panel (default is 3000) and restart the server.

**Q: AI tool calls fail with "Scene not ready".**
A: Make sure a scene is open in Cocos Creator. The scene script requires an active scene context to operate.

**Q: The extension does not appear in the Extension Manager.**
A: Verify that the plugin folder name matches the `name` field in `package.json` (`cocos-mcp-server`).

**Q: How do I apply source code changes?**
A: Run `npm run build`, then disable and re-enable the extension in the Extension Manager.

## License

MIT
