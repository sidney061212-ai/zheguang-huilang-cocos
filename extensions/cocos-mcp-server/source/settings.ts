import * as fs from 'fs';
import * as path from 'path';
import { MCPServerSettings, ToolManagerSettings, ToolConfiguration } from './types';

export const DEFAULT_SETTINGS: MCPServerSettings = {
    port: 3000,
    autoStart: false,
    enableDebugLog: false,
    allowedOrigins: ['*'],
    maxConnections: 10
};

export const DEFAULT_TOOL_MANAGER_SETTINGS: ToolManagerSettings = {
    configurations: [],
    currentConfigId: '',
    maxConfigSlots: 5
};

function getSettingsDir(): string {
    return path.join(Editor.Project.path, 'settings');
}

function ensureSettingsDir(): void {
    const dir = getSettingsDir();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function getSettingsPath(): string {
    return path.join(getSettingsDir(), 'mcp-server.json');
}

function getToolManagerSettingsPath(): string {
    return path.join(getSettingsDir(), 'tool-manager.json');
}

export function readSettings(): MCPServerSettings {
    try {
        ensureSettingsDir();
        const filePath = getSettingsPath();
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
        }
    } catch (e) {
        console.error('[Settings] Failed to read server settings:', e);
    }
    return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: MCPServerSettings): void {
    try {
        ensureSettingsDir();
        fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
    } catch (e) {
        console.error('[Settings] Failed to save server settings:', e);
        throw e;
    }
}

export function readToolManagerSettings(): ToolManagerSettings {
    try {
        ensureSettingsDir();
        const filePath = getToolManagerSettingsPath();
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            return { ...DEFAULT_TOOL_MANAGER_SETTINGS, ...JSON.parse(content) };
        }
    } catch (e) {
        console.error('[Settings] Failed to read tool manager settings:', e);
    }
    return { ...DEFAULT_TOOL_MANAGER_SETTINGS };
}

export function saveToolManagerSettings(settings: ToolManagerSettings): void {
    try {
        ensureSettingsDir();
        fs.writeFileSync(getToolManagerSettingsPath(), JSON.stringify(settings, null, 2));
    } catch (e) {
        console.error('[Settings] Failed to save tool manager settings:', e);
        throw e;
    }
}

export function exportToolConfiguration(config: ToolConfiguration): string {
    return JSON.stringify(config, null, 2);
}

export function importToolConfiguration(configJson: string): ToolConfiguration {
    let config: any;
    try {
        config = JSON.parse(configJson);
    } catch (e) {
        throw new Error('Invalid JSON format');
    }
    if (!config.id || !config.name || !Array.isArray(config.tools)) {
        throw new Error('Invalid configuration structure: missing required fields (id, name, tools)');
    }
    return config as ToolConfiguration;
}
