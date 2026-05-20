# Cocos MCP Server

适用于 Cocos Creator 3.8.x 的 AI MCP (Model Context Protocol) 服务器插件，让 AI 助手（Claude、Cursor 等）能够直接控制 Cocos Creator 编辑器。

An AI MCP (Model Context Protocol) server plugin for Cocos Creator 3.8.x, enabling AI assistants (Claude, Cursor, etc.) to directly control the Cocos Creator editor.

---

## 功能特性 / Features

- **MCP 协议 / MCP Protocol**：基于 JSON-RPC 2.0 的标准 MCP 协议，通过 HTTP 传输 / Standard JSON-RPC 2.0 over HTTP transport
- **130+ 工具 / 130+ Tools**：覆盖场景、节点、组件、预制体、资源、项目等全方位编辑器操作 / Full coverage of scene, node, component, prefab, asset, and project operations
- **Vue 3 控制面板 / Vue 3 Control Panel**：内置服务器控制和工具管理界面 / Built-in server control and tool management UI
- **工具配置管理 / Tool Configuration**：按需启用/禁用工具，保存自定义配置 / Enable/disable tools on demand and save custom configurations
- **自动启动 / Auto-start**：可配置插件加载时自动启动服务器 / Optionally start the server automatically when the extension loads
- **双语支持 / Bilingual UI**：中文/英文界面 / English and Chinese interface

---

## 兼容性 / Compatibility

| Cocos Creator | 状态 / Status |
|---|---|
| 3.8.x | 完全支持 / Fully supported |
| 3.7.x | 未测试 / Untested |

---

## 安装方法 / Installation

### 方式一：项目级插件 / Option 1: Project-level Extension

将插件目录复制到 Cocos Creator 项目的 `extensions` 目录下：

Copy the plugin folder into the `extensions` directory of your Cocos Creator project:

```
{your-project}/
└── extensions/
    └── cocos-mcp-server/
```

### 方式二：全局插件 / Option 2: Global Extension

将插件目录复制到全局插件目录：

Copy the plugin folder to the global extensions directory:

```
~/.CocosCreator/extensions/cocos-mcp-server/
```

### 启用插件 / Enable the Extension

1. 打开 Cocos Creator 3.8.x / Open Cocos Creator 3.8.x
2. 菜单栏 → **扩展** → **扩展管理器** / Go to **Extension** → **Extension Manager**
3. 在 **项目** 或 **全局** 标签页找到 `cocos-mcp-server` / Find `cocos-mcp-server` under the **Project** or **Global** tab
4. 点击启用 / Click **Enable**

---

## 开发构建 / Development Build

```bash
# 安装依赖 / Install dependencies
npm install

# 编译 TypeScript / Compile TypeScript
npm run build

# 开发模式（文件监听）/ Development mode (file watching)
npm run watch
```

编译输出位于 `dist/` 目录。/ Compiled output is placed in the `dist/` directory.

---

## 使用方法 / Usage

### 1. 启动服务器 / Start the Server

插件启用后，通过菜单 **扩展 → Cocos MCP Server** 打开控制面板，点击"启动服务器"。

After enabling the extension, open the control panel via **Extension → Cocos MCP Server**, then click **Start Server**.

默认服务器地址 / Default server address：`http://127.0.0.1:3000/mcp`

### 2. 连接 AI 客户端 / Connect an AI Client

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
在 MCP 设置中添加 HTTP 类型服务器，URL 填写 `http://127.0.0.1:3000/mcp`。

Add an HTTP-type MCP server in your MCP settings and set the URL to `http://127.0.0.1:3000/mcp`.

---

## 工具列表 / Tool Reference

### 场景工具 / Scene Tools (8)
| 工具名 / Tool | 说明 / Description |
|---|---|
| `get_current_scene` | 获取当前场景信息 / Get current scene information |
| `get_scene_list` | 获取项目场景列表 / List all scenes in the project |
| `open_scene` | 打开指定场景 / Open a scene by path |
| `save_scene` | 保存当前场景 / Save the current scene |
| `create_scene` | 创建新场景 / Create a new scene |
| `save_scene_as` | 场景另存为 / Save the current scene to a new path |
| `close_scene` | 关闭当前场景 / Close the current scene |
| `get_scene_hierarchy` | 获取场景层级结构 / Get the full scene node hierarchy |

### 节点工具 / Node Tools (11)
| 工具名 / Tool | 说明 / Description |
|---|---|
| `create_node` | 创建新节点 / Create a new node |
| `get_node_info` | 获取节点详细信息 / Get detailed information about a node |
| `find_nodes` | 按条件查找节点 / Find nodes by filter criteria |
| `find_node_by_name` | 按名称查找节点 / Find a node by name |
| `get_all_nodes` | 获取场景所有节点 / Get all nodes in the scene |
| `set_node_property` | 设置节点属性 / Set a property on a node |
| `set_node_transform` | 设置节点变换（位置/旋转/缩放）/ Set node position, rotation, and scale |
| `delete_node` | 删除节点 / Delete a node |
| `move_node` | 移动节点到新父节点 / Move a node to a new parent |
| `duplicate_node` | 复制节点 / Duplicate a node |
| `detect_node_type` | 检测节点类型 / Detect the type of a node |

### 组件工具 / Component Tools
| 工具名 / Tool | 说明 / Description |
|---|---|
| `add_component` | 添加组件 / Add a component to a node |
| `remove_component` | 移除组件 / Remove a component from a node |
| `get_component_info` | 获取组件信息 / Get component information |
| `set_component_property` | 设置组件属性 / Set a component property value |
| `get_components` | 获取节点所有组件 / Get all components on a node |
| `reset_node_property` | 重置节点属性 / Reset a node property to its default |
| `reset_component` | 重置组件属性 / Reset a component to its default values |
| `execute_component_method` | 执行组件方法 / Call a method on a component |

### 预制体工具 / Prefab Tools
| 工具名 / Tool | 说明 / Description |
|---|---|
| `create_prefab` | 从节点创建预制体 / Create a prefab asset from a node |
| `instantiate_prefab` | 实例化预制体 / Instantiate a prefab into the scene |
| `edit_prefab` | 进入预制体编辑模式 / Enter prefab editing mode |
| `save_prefab` | 保存预制体 / Save the current prefab |
| `exit_prefab_edit` | 退出预制体编辑模式 / Exit prefab editing mode |
| `revert_prefab` | 从预制体还原节点 / Revert a prefab instance to the asset |
| `apply_prefab` | 将节点变更应用到预制体 / Apply node changes back to the prefab asset |

### 资源工具 / Asset Tools
| 工具名 / Tool | 说明 / Description |
|---|---|
| `import_asset` | 导入资源文件 / Import an asset file |
| `get_asset_info` | 获取资源信息 / Get information about an asset |
| `get_assets` | 获取资源列表 / List assets in the project |
| `create_asset` | 创建新资源 / Create a new asset |
| `copy_asset` | 复制资源 / Copy an asset to a new path |
| `move_asset` | 移动资源 / Move an asset to a new path |
| `delete_asset` | 删除资源 / Delete an asset |
| `refresh_assets` | 刷新资源数据库 / Refresh the asset database |
| `query_asset_path` | 按 UUID 查询资源路径 / Query an asset path by UUID |
| `query_asset_uuid` | 按路径查询资源 UUID / Query an asset UUID by path |
| `find_asset_by_name` | 按名称搜索资源 / Search for assets by name |

### 项目工具 / Project Tools
| 工具名 / Tool | 说明 / Description |
|---|---|
| `get_project_info` | 获取项目基本信息 / Get basic project information |
| `get_project_settings` | 获取项目设置 / Get project settings |
| `run_project` | 运行项目预览 / Run the project preview |
| `build_project` | 构建项目 / Build the project |
| `open_build_panel` | 打开构建面板 / Open the build panel |
| `check_builder_status` | 检查构建器状态 / Check the builder worker status |

### 调试工具 / Debug Tools (10)
| 工具名 / Tool | 说明 / Description |
|---|---|
| `get_console_logs` | 获取控制台日志 / Retrieve console log entries |
| `clear_console` | 清空控制台 / Clear the editor console |
| `log_message` | 输出日志信息 / Write a log message to the console |
| `get_editor_info` | 获取编辑器信息 / Get editor version and environment info |

### 场景视图工具 / Scene View Tools (18)
操控场景视图中的 Gizmo 工具、坐标系、视图模式、网格显示等。

Control gizmo tools, coordinate systems, view modes, grid display, and other scene viewport settings.

### 高级场景工具 / Advanced Scene Tools (18)
撤销录制、节点复制粘贴剪切、场景快照、软重载等高级操作。

Undo recording, node copy/paste/cut, scene snapshots, soft reload, and other advanced operations.

### 参考图工具 / Reference Image Tools
场景视图中参考图片的添加、移除、变换操作。

Add, remove, and transform reference images in the scene viewport.

### 高级资源工具 / Advanced Asset Tools
批量资源操作、资源依赖分析等。

Batch asset operations and asset dependency analysis.

### 广播工具 / Broadcast Tools (5)
向编辑器发送自定义事件广播。

Send custom event broadcasts to the editor.

### 服务器工具 / Server Tools (6)
查询服务器状态、连接信息、工具列表等。

Query server status, connection information, and the active tool list.

### 验证工具 / Validation Tools (3)
场景完整性验证、资源依赖验证、MCP 响应格式验证。

Scene integrity validation, asset dependency validation, and MCP response format validation.

---

## 服务器设置 / Server Settings

| 设置项 / Setting | 默认值 / Default | 说明 / Description |
|---|---|---|
| 端口 / Port | `3000` | HTTP 服务器监听端口 / HTTP server listening port |
| 自动启动 / Auto Start | `false` | 插件加载时自动启动服务器 / Start automatically on extension load |
| 调试日志 / Debug Log | `false` | 是否输出详细调试日志 / Enable verbose debug logging |
| 最大连接数 / Max Connections | `10` | 同时允许的最大客户端数量 / Maximum simultaneous client connections |

---

## 工具管理 / Tool Management

控制面板的"工具管理"标签页支持：

The **Tool Management** tab in the control panel supports:

- **按类别管理 / Per-category control**：每个工具类别独立控制 / Enable or disable tools by category
- **批量操作 / Bulk operations**：全选/全不选 / Select all / deselect all
- **保存配置 / Persistent config**：将工具启用状态持久化 / Save the enabled/disabled state across sessions

禁用不需要的工具可减小 AI 的工具上下文，提高响应效率。

Disabling unused tools reduces the AI's tool context size and can improve response efficiency.

---

## 项目结构 / Project Structure

```
cocos-mcp-server/
├── package.json              # 插件清单 / Extension manifest
├── tsconfig.json             # TypeScript 配置 / TypeScript configuration
├── base.tsconfig.json        # 基础 TS 配置 / Base TypeScript configuration
├── i18n/
│   ├── en.js                 # 英文本地化 / English localization
│   └── zh.js                 # 中文本地化 / Chinese localization
├── static/
│   ├── icon.png              # 插件图标 / Extension icon
│   ├── style/default/        # 面板样式 / Panel stylesheet
│   └── template/             # 面板 HTML 模板 / Panel HTML templates
├── source/
│   ├── main.ts               # 插件入口 / Extension entry point
│   ├── mcp-server.ts         # HTTP MCP 服务器核心 / HTTP MCP server core
│   ├── scene.ts              # 场景脚本（引擎 API）/ Scene script (engine API access)
│   ├── settings.ts           # 设置持久化 / Settings persistence
│   ├── types/index.ts        # TypeScript 类型定义 / TypeScript type definitions
│   ├── panels/default/       # Vue 3 控制面板 / Vue 3 control panel
│   └── tools/                # 工具模块（14个）/ Tool modules (14 categories)
└── dist/                     # 编译输出 / Compiled JavaScript output
```

---

## 架构说明 / Architecture

```
AI 客户端 / AI Client (Claude / Cursor)
       │  HTTP JSON-RPC 2.0
       ▼
MCP HTTP 服务器 / MCP HTTP Server (localhost:3000)
       │  Editor.Message IPC
       ▼
Cocos Creator 编辑器进程 / Editor Process
       │  execute-scene-script
       ▼
场景脚本 / Scene Script (engine API: cc.*)
```

- **主进程 / Main process** (`main.ts`)：管理服务器生命周期、插件消息处理 / Manages the server lifecycle and handles extension messages
- **MCP 服务器 / MCP server** (`mcp-server.ts`)：实现 JSON-RPC 2.0 协议，路由工具调用 / Implements the JSON-RPC 2.0 protocol and routes tool calls
- **工具模块 / Tool modules** (`tools/*.ts`)：封装具体的 `Editor.Message` 调用 / Wrap specific `Editor.Message` calls for each operation
- **场景脚本 / Scene script** (`scene.ts`)：在引擎上下文中运行，直接访问 `cc` API / Runs in the engine context with direct access to `cc` APIs
- **控制面板 / Control panel** (`panels/default/index.ts`)：Vue 3 UI，通过 IPC 与主进程通信 / Vue 3 UI that communicates with the main process via IPC

---

## 常见问题 / Troubleshooting

**Q: 服务器启动失败，提示端口被占用 / The server fails to start with a "port in use" error.**

在控制面板修改端口号（默认 3000），保存设置后重新启动。

Change the port number in the control panel (default is 3000) and restart the server.

---

**Q: AI 工具调用失败，返回 "Scene not ready" / AI tool calls fail with "Scene not ready".**

确保 Cocos Creator 中已打开一个场景。场景脚本需要活跃的场景上下文。

Make sure a scene is open in Cocos Creator. The scene script requires an active scene context to operate.

---

**Q: 插件在扩展管理器中不显示 / The extension does not appear in the Extension Manager.**

检查插件目录名是否与 `package.json` 中的 `name` 字段一致（`cocos-mcp-server`）。

Verify that the plugin folder name matches the `name` field in `package.json` (`cocos-mcp-server`).

---

**Q: 修改源码后如何更新 / How do I apply source code changes?**

运行 `npm run build`，然后在扩展管理器中禁用再重新启用插件。

Run `npm run build`, then disable and re-enable the extension in the Extension Manager.

---

## 许可证 / License

MIT
