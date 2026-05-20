import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

export class BroadcastTools implements ToolExecutor {
    private listenedTypes: Set<string> = new Set();
    private messageLog: Array<{ message: string; data: any; timestamp: number }> = [];

    constructor() {
        this.setupBroadcastListeners();
    }

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'get_broadcast_log',
                description: 'Get recent broadcast messages log',
                inputSchema: {
                    type: 'object',
                    properties: {
                        limit: {
                            type: 'number',
                            description: 'Number of recent messages to return',
                            default: 50
                        },
                        messageType: {
                            type: 'string',
                            description: 'Filter by message type (optional)'
                        }
                    }
                }
            },
            {
                name: 'listen_broadcast',
                description: 'Start listening for specific broadcast messages',
                inputSchema: {
                    type: 'object',
                    properties: {
                        messageType: {
                            type: 'string',
                            description: 'Message type to listen for'
                        }
                    },
                    required: ['messageType']
                }
            },
            {
                name: 'stop_listening',
                description: 'Stop listening for specific broadcast messages',
                inputSchema: {
                    type: 'object',
                    properties: {
                        messageType: {
                            type: 'string',
                            description: 'Message type to stop listening for'
                        }
                    },
                    required: ['messageType']
                }
            },
            {
                name: 'clear_broadcast_log',
                description: 'Clear the broadcast messages log',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'get_active_listeners',
                description: 'Get list of active broadcast listeners',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'get_broadcast_log':    return this.getBroadcastLog(args.limit, args.messageType);
            case 'listen_broadcast':     return this.listenBroadcast(args.messageType);
            case 'stop_listening':       return this.stopListening(args.messageType);
            case 'clear_broadcast_log':  return this.clearBroadcastLog();
            case 'get_active_listeners': return this.getActiveListeners();
            default: throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private setupBroadcastListeners(): void {
        // Pre-register listeners for key editor lifecycle events
        const importantMessages = [
            'build-worker:ready', 'build-worker:closed',
            'scene:ready', 'scene:close',
            'scene:light-probe-edit-mode-changed',
            'scene:light-probe-bounding-box-edit-mode-changed',
            'asset-db:ready', 'asset-db:close',
            'asset-db:asset-add', 'asset-db:asset-change', 'asset-db:asset-delete'
        ];
        importantMessages.forEach(t => this.registerListener(t));
    }

    private registerListener(messageType: string): void {
        this.listenedTypes.add(messageType);
        // Editor.Message.on is not universally available; message types are tracked for future use.
    }

    private getBroadcastLog(limit: number = 50, messageType?: string): ToolResponse {
        const filtered = messageType
            ? this.messageLog.filter(e => e.message === messageType)
            : this.messageLog;

        const recent = filtered.slice(-limit).map(e => ({
            ...e,
            timestamp: new Date(e.timestamp).toISOString()
        }));

        return {
            success: true,
            data: {
                log: recent,
                count: recent.length,
                totalCount: filtered.length,
                filter: messageType ?? 'all'
            }
        };
    }

    private listenBroadcast(messageType: string): ToolResponse {
        const alreadyRegistered = this.listenedTypes.has(messageType);
        if (!alreadyRegistered) {
            this.registerListener(messageType);
        }
        return {
            success: true,
            data: {
                messageType,
                message: alreadyRegistered
                    ? `Already listening for broadcast: ${messageType}`
                    : `Started listening for broadcast: ${messageType}`
            }
        };
    }

    private stopListening(messageType: string): ToolResponse {
        const wasRegistered = this.listenedTypes.delete(messageType);
        return {
            success: true,
            data: {
                messageType,
                message: wasRegistered
                    ? `Stopped listening for broadcast: ${messageType}`
                    : `Was not listening for broadcast: ${messageType}`
            }
        };
    }

    private clearBroadcastLog(): ToolResponse {
        const clearedCount = this.messageLog.length;
        this.messageLog = [];
        return { success: true, data: { clearedCount } };
    }

    private getActiveListeners(): ToolResponse {
        const listeners = Array.from(this.listenedTypes).map(messageType => ({ messageType }));
        return { success: true, data: { listeners, count: listeners.length } };
    }
}
