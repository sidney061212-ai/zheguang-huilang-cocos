import * as http from 'http';
import * as url from 'url';
import { MCPServerSettings, ServerStatus, ToolDefinition } from './types';
import { SceneTools } from './tools/scene-tools';
import { NodeTools } from './tools/node-tools';
import { ComponentTools } from './tools/component-tools';
import { PrefabTools } from './tools/prefab-tools';
import { ProjectTools } from './tools/project-tools';
import { DebugTools } from './tools/debug-tools';
import { PreferencesTools } from './tools/preferences-tools';
import { ServerTools } from './tools/server-tools';
import { BroadcastTools } from './tools/broadcast-tools';
import { SceneAdvancedTools } from './tools/scene-advanced-tools';
import { SceneViewTools } from './tools/scene-view-tools';
import { ReferenceImageTools } from './tools/reference-image-tools';
import { AssetAdvancedTools } from './tools/asset-advanced-tools';
import { ValidationTools } from './tools/validation-tools';

export class MCPServer {
    private settings: MCPServerSettings;
    private httpServer: http.Server | null = null;
    private tools: Record<string, any> = {};
    private toolsList: ToolDefinition[] = [];
    private enabledTools: any[] = [];

    constructor(settings: MCPServerSettings) {
        this.settings = settings;
        this.initializeTools();
    }

    private initializeTools(): void {
        try {
            this.tools.scene = new SceneTools();
            this.tools.node = new NodeTools();
            this.tools.component = new ComponentTools();
            this.tools.prefab = new PrefabTools();
            this.tools.project = new ProjectTools();
            this.tools.debug = new DebugTools();
            this.tools.preferences = new PreferencesTools();
            this.tools.server = new ServerTools();
            this.tools.broadcast = new BroadcastTools();
            this.tools.sceneAdvanced = new SceneAdvancedTools();
            this.tools.sceneView = new SceneViewTools();
            this.tools.referenceImage = new ReferenceImageTools();
            this.tools.assetAdvanced = new AssetAdvancedTools();
            this.tools.validation = new ValidationTools();
        } catch (error) {
            console.error('[MCPServer] Failed to initialize tools:', error);
            throw error;
        }
    }

    public async start(): Promise<void> {
        if (this.httpServer) {
            return;
        }

        try {
            this.httpServer = http.createServer(this.handleHttpRequest.bind(this));

            await new Promise<void>((resolve, reject) => {
                this.httpServer!.listen(this.settings.port, '127.0.0.1', () => {
                    console.log(`[MCPServer] Started on http://127.0.0.1:${this.settings.port}`);
                    resolve();
                });
                this.httpServer!.on('error', (err: any) => {
                    if (err.code === 'EADDRINUSE') {
                        console.error(`[MCPServer] Port ${this.settings.port} is already in use`);
                    }
                    reject(err);
                });
            });

            this.rebuildToolsList();
        } catch (error) {
            this.httpServer = null;
            throw error;
        }
    }

    public stop(): void {
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
            console.log('[MCPServer] Stopped');
        }
    }

    public getStatus(): ServerStatus {
        return {
            running: !!this.httpServer,
            port: this.settings.port,
            clients: 0
        };
    }

    public getSettings(): MCPServerSettings {
        return this.settings;
    }

    public getAvailableTools(): ToolDefinition[] {
        return this.toolsList;
    }

    public getFilteredTools(enabledTools: any[]): ToolDefinition[] {
        if (!enabledTools || enabledTools.length === 0) {
            return this.toolsList;
        }
        const enabledSet = new Set(enabledTools.map(t => `${t.category}_${t.name}`));
        return this.toolsList.filter(tool => enabledSet.has(tool.name));
    }

    public updateEnabledTools(enabledTools: any[]): void {
        this.enabledTools = enabledTools;
        this.rebuildToolsList();
    }

    public async executeToolCall(toolName: string, args: any): Promise<any> {
        // Tool names are structured as "{category}_{toolMethodName}".
        // We split on the first underscore only to get the category key,
        // then rejoin the rest as the method name (method names may contain underscores).
        const underscoreIdx = toolName.indexOf('_');
        if (underscoreIdx === -1) {
            throw new Error(`Invalid tool name format: ${toolName}`);
        }
        const category = toolName.substring(0, underscoreIdx);
        const methodName = toolName.substring(underscoreIdx + 1);

        if (!this.tools[category]) {
            throw new Error(`Unknown tool category: ${category}`);
        }
        return await this.tools[category].execute(methodName, args);
    }

    private rebuildToolsList(): void {
        const enabledSet = this.enabledTools.length > 0
            ? new Set(this.enabledTools.map(t => `${t.category}_${t.name}`))
            : null;

        this.toolsList = [];
        for (const [category, toolSet] of Object.entries(this.tools)) {
            for (const tool of toolSet.getTools()) {
                const qualifiedName = `${category}_${tool.name}`;
                if (!enabledSet || enabledSet.has(qualifiedName)) {
                    this.toolsList.push({
                        name: qualifiedName,
                        description: tool.description,
                        inputSchema: tool.inputSchema
                    });
                }
            }
        }
    }

    private async readRequestBody(req: http.IncomingMessage): Promise<string> {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => resolve(body));
            req.on('error', reject);
        });
    }

    private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname;

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        try {
            if (pathname === '/mcp' && req.method === 'POST') {
                await this.handleMCPRequest(req, res);
            } else if (pathname === '/health' && req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify({ status: 'ok', tools: this.toolsList.length }));
            } else if (pathname === '/api/tools' && req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify({ tools: this.getSimplifiedToolsList() }));
            } else if (pathname?.startsWith('/api/') && req.method === 'POST') {
                await this.handleSimpleAPIRequest(req, res, pathname);
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        } catch (error) {
            console.error('[MCPServer] Unhandled request error:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }

    private async handleMCPRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const body = await this.readRequestBody(req);
        let message: any;
        try {
            message = JSON.parse(body);
        } catch (parseError: any) {
            res.writeHead(400);
            res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: { code: -32700, message: `Parse error: ${parseError.message}` }
            }));
            return;
        }

        const response = await this.handleMessage(message);
        res.writeHead(200);
        res.end(JSON.stringify(response));
    }

    private async handleMessage(message: any): Promise<any> {
        const { id, method, params } = message;
        try {
            let result: any;
            switch (method) {
                case 'initialize':
                    result = {
                        protocolVersion: '2024-11-05',
                        capabilities: { tools: {} },
                        serverInfo: { name: 'cocos-mcp-server', version: '1.0.0' }
                    };
                    break;
                case 'tools/list':
                    result = { tools: this.getAvailableTools() };
                    break;
                case 'tools/call': {
                    const { name, arguments: args } = params;
                    const toolResult = await this.executeToolCall(name, args);
                    result = { content: [{ type: 'text', text: JSON.stringify(toolResult) }] };
                    break;
                }
                default:
                    throw new Error(`Unknown method: ${method}`);
            }
            return { jsonrpc: '2.0', id, result };
        } catch (error: any) {
            return {
                jsonrpc: '2.0',
                id,
                error: { code: -32603, message: error.message }
            };
        }
    }

    private async handleSimpleAPIRequest(req: http.IncomingMessage, res: http.ServerResponse, pathname: string): Promise<void> {
        const body = await this.readRequestBody(req);

        const pathParts = pathname.split('/').filter(p => p);
        if (pathParts.length < 3) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid API path. Use /api/{category}/{tool_name}' }));
            return;
        }

        const category = pathParts[1];
        const toolName = pathParts[2];
        const fullToolName = `${category}_${toolName}`;

        let params: any;
        try {
            params = body ? JSON.parse(body) : {};
        } catch (parseError: any) {
            res.writeHead(400);
            res.end(JSON.stringify({
                error: 'Invalid JSON in request body',
                details: parseError.message
            }));
            return;
        }

        try {
            const result = await this.executeToolCall(fullToolName, params);
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, tool: fullToolName, result }));
        } catch (error: any) {
            res.writeHead(500);
            res.end(JSON.stringify({ success: false, error: error.message, tool: fullToolName }));
        }
    }

    private getSimplifiedToolsList(): any[] {
        return this.toolsList.map(tool => {
            const underscoreIdx = tool.name.indexOf('_');
            const category = tool.name.substring(0, underscoreIdx);
            const toolName = tool.name.substring(underscoreIdx + 1);
            return {
                name: tool.name,
                category,
                toolName,
                description: tool.description,
                apiPath: `/api/${category}/${toolName}`,
                curlExample: this.generateCurlExample(category, toolName, tool.inputSchema)
            };
        });
    }

    private generateCurlExample(category: string, toolName: string, schema: any): string {
        const sampleParams = this.generateSampleParams(schema);
        const jsonString = JSON.stringify(sampleParams, null, 2);
        return `curl -X POST http://127.0.0.1:${this.settings.port}/api/${category}/${toolName} \\\n  -H "Content-Type: application/json" \\\n  -d '${jsonString}'`;
    }

    private generateSampleParams(schema: any): any {
        if (!schema || !schema.properties) return {};
        const sample: any = {};
        for (const [key, prop] of Object.entries(schema.properties as Record<string, any>)) {
            switch (prop.type) {
                case 'string':  sample[key] = prop.default ?? 'example_string'; break;
                case 'number':  sample[key] = prop.default ?? 0; break;
                case 'boolean': sample[key] = prop.default ?? true; break;
                case 'object':  sample[key] = prop.default ?? { x: 0, y: 0, z: 0 }; break;
                default:        sample[key] = 'example_value';
            }
        }
        return sample;
    }
}
