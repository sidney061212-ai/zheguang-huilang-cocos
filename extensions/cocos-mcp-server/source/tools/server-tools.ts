import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

export class ServerTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'query_server_ip_list',
                description: 'Query server IP list',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'query_sorted_server_ip_list',
                description: 'Get sorted server IP list',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'query_server_port',
                description: 'Query editor server current port',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'get_server_status',
                description: 'Get comprehensive server status information',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'check_server_connectivity',
                description: 'Check server connectivity and network status',
                inputSchema: {
                    type: 'object',
                    properties: {
                        timeout: {
                            type: 'number',
                            description: 'Timeout in milliseconds',
                            default: 5000
                        }
                    }
                }
            },
            {
                name: 'get_network_interfaces',
                description: 'Get available network interfaces',
                inputSchema: { type: 'object', properties: {} }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'query_server_ip_list':        return this.queryServerIPList();
            case 'query_sorted_server_ip_list': return this.querySortedServerIPList();
            case 'query_server_port':           return this.queryServerPort();
            case 'get_server_status':           return this.getServerStatus();
            case 'check_server_connectivity':   return this.checkServerConnectivity(args.timeout);
            case 'get_network_interfaces':      return this.getNetworkInterfaces();
            default: throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private async queryServerIPList(): Promise<ToolResponse> {
        try {
            const ipList: string[] = await Editor.Message.request('server', 'query-ip-list');
            return { success: true, data: { ipList, count: ipList.length } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async querySortedServerIPList(): Promise<ToolResponse> {
        try {
            const sortedIPList: string[] = await Editor.Message.request('server', 'query-sort-ip-list');
            return { success: true, data: { sortedIPList, count: sortedIPList.length } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async queryServerPort(): Promise<ToolResponse> {
        try {
            const port: number = await Editor.Message.request('server', 'query-port');
            return { success: true, data: { port } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async getServerStatus(): Promise<ToolResponse> {
        const [ipListResult, portResult] = await Promise.allSettled([
            this.queryServerIPList(),
            this.queryServerPort()
        ]);

        const status: any = {
            timestamp: new Date().toISOString(),
            editorVersion: (Editor as any).versions?.cocos ?? 'Unknown',
            platform: process.platform,
            nodeVersion: process.version
        };

        if (ipListResult.status === 'fulfilled' && ipListResult.value.success) {
            status.availableIPs = ipListResult.value.data.ipList;
            status.ipCount = ipListResult.value.data.count;
        } else {
            status.availableIPs = [];
            status.ipError = ipListResult.status === 'rejected' ? ipListResult.reason : ipListResult.value.error;
        }

        if (portResult.status === 'fulfilled' && portResult.value.success) {
            status.port = portResult.value.data.port;
        } else {
            status.portError = portResult.status === 'rejected' ? portResult.reason : portResult.value.error;
        }

        return { success: true, data: status };
    }

    private async checkServerConnectivity(timeout: number = 5000): Promise<ToolResponse> {
        const startTime = Date.now();
        try {
            await Promise.race([
                Editor.Message.request('server', 'query-port'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), timeout))
            ]);
            const responseTime = Date.now() - startTime;
            return { success: true, data: { connected: true, responseTime, timeout } };
        } catch (err: any) {
            return { success: false, data: { connected: false, responseTime: Date.now() - startTime, timeout, error: err.message } };
        }
    }

    private async getNetworkInterfaces(): Promise<ToolResponse> {
        try {
            const os = require('os');
            const interfaces = os.networkInterfaces();
            const networkInfo = Object.entries(interfaces).map(([name, addresses]: [string, any]) => ({
                name,
                addresses: addresses.map((addr: any) => ({
                    address: addr.address,
                    family: addr.family,
                    internal: addr.internal,
                    cidr: addr.cidr
                }))
            }));
            const serverIPResult = await this.queryServerIPList();
            return {
                success: true,
                data: {
                    networkInterfaces: networkInfo,
                    serverAvailableIPs: serverIPResult.success ? serverIPResult.data.ipList : []
                }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
