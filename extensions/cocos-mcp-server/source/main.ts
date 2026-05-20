import { MCPServer } from './mcp-server';
import { readSettings, saveSettings } from './settings';
import { MCPServerSettings } from './types';
import { ToolManager } from './tools/tool-manager';

let mcpServer: MCPServer | null = null;
let toolManager: ToolManager;

export const methods: { [key: string]: (...any: any) => any } = {
    openPanel() {
        Editor.Panel.open('cocos-mcp-server');
    },

    async startServer() {
        if (!mcpServer) {
            console.warn('[MCP] mcpServer is not initialized');
            return;
        }
        mcpServer.updateEnabledTools(toolManager.getEnabledTools());
        await mcpServer.start();
    },

    async stopServer() {
        if (!mcpServer) {
            console.warn('[MCP] mcpServer is not initialized');
            return;
        }
        mcpServer.stop();
    },

    getServerStatus() {
        const status = mcpServer ? mcpServer.getStatus() : { running: false, port: 0, clients: 0 };
        const settings = mcpServer ? mcpServer.getSettings() : readSettings();
        return { ...status, settings };
    },

    updateSettings(settings: MCPServerSettings) {
        saveSettings(settings);
        if (mcpServer) {
            mcpServer.stop();
        }
        mcpServer = new MCPServer(settings);
        mcpServer.start();
    },

    getToolsList() {
        return mcpServer ? mcpServer.getAvailableTools() : [];
    },

    getFilteredToolsList() {
        if (!mcpServer) return [];
        const enabledTools = toolManager.getEnabledTools();
        mcpServer.updateEnabledTools(enabledTools);
        return mcpServer.getFilteredTools(enabledTools);
    },

    async getServerSettings() {
        return mcpServer ? mcpServer.getSettings() : readSettings();
    },

    // Alias kept for backwards compatibility with panel messages
    async getSettings() {
        return mcpServer ? mcpServer.getSettings() : readSettings();
    },

    async getToolManagerState() {
        return toolManager.getToolManagerState();
    },

    async createToolConfiguration(name: string, description?: string) {
        try {
            const config = toolManager.createConfiguration(name, description);
            return { success: true, id: config.id, config };
        } catch (error: any) {
            throw new Error(`Failed to create configuration: ${error.message}`);
        }
    },

    async updateToolConfiguration(configId: string, updates: any) {
        try {
            return toolManager.updateConfiguration(configId, updates);
        } catch (error: any) {
            throw new Error(`Failed to update configuration: ${error.message}`);
        }
    },

    async deleteToolConfiguration(configId: string) {
        try {
            toolManager.deleteConfiguration(configId);
            return { success: true };
        } catch (error: any) {
            throw new Error(`Failed to delete configuration: ${error.message}`);
        }
    },

    async setCurrentToolConfiguration(configId: string) {
        try {
            toolManager.setCurrentConfiguration(configId);
            return { success: true };
        } catch (error: any) {
            throw new Error(`Failed to set current configuration: ${error.message}`);
        }
    },

    async updateToolStatus(category: string, toolName: string, enabled: boolean) {
        try {
            const currentConfig = toolManager.getCurrentConfiguration();
            if (!currentConfig) {
                throw new Error('No active configuration');
            }
            toolManager.updateToolStatus(currentConfig.id, category, toolName, enabled);
            if (mcpServer) {
                mcpServer.updateEnabledTools(toolManager.getEnabledTools());
            }
            return { success: true };
        } catch (error: any) {
            throw new Error(`Failed to update tool status: ${error.message}`);
        }
    },

    async updateToolStatusBatch(updates: any[]) {
        try {
            const currentConfig = toolManager.getCurrentConfiguration();
            if (!currentConfig) {
                throw new Error('No active configuration');
            }
            toolManager.updateToolStatusBatch(currentConfig.id, updates);
            if (mcpServer) {
                mcpServer.updateEnabledTools(toolManager.getEnabledTools());
            }
            return { success: true };
        } catch (error: any) {
            throw new Error(`Failed to batch update tool status: ${error.message}`);
        }
    },

    async exportToolConfiguration(configId: string) {
        try {
            return { configJson: toolManager.exportConfiguration(configId) };
        } catch (error: any) {
            throw new Error(`Failed to export configuration: ${error.message}`);
        }
    },

    async importToolConfiguration(configJson: string) {
        try {
            return toolManager.importConfiguration(configJson);
        } catch (error: any) {
            throw new Error(`Failed to import configuration: ${error.message}`);
        }
    },

    async getEnabledTools() {
        return toolManager.getEnabledTools();
    }
};

export function load() {
    console.log('[MCP] Extension loaded');

    toolManager = new ToolManager();

    const settings = readSettings();
    mcpServer = new MCPServer(settings);
    mcpServer.updateEnabledTools(toolManager.getEnabledTools());

    if (settings.autoStart) {
        mcpServer.start().catch(err => {
            console.error('[MCP] Auto-start failed:', err);
        });
    }
}

export function unload() {
    if (mcpServer) {
        mcpServer.stop();
        mcpServer = null;
    }
}
