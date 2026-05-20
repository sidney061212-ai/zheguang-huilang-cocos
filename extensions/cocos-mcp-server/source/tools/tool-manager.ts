import { v4 as uuidv4 } from 'uuid';
import { ToolConfig, ToolConfiguration, ToolManagerSettings } from '../types';
import { readToolManagerSettings, saveToolManagerSettings, exportToolConfiguration, importToolConfiguration } from '../settings';
import { SceneTools } from './scene-tools';
import { NodeTools } from './node-tools';
import { ComponentTools } from './component-tools';
import { PrefabTools } from './prefab-tools';
import { ProjectTools } from './project-tools';
import { DebugTools } from './debug-tools';
import { PreferencesTools } from './preferences-tools';
import { ServerTools } from './server-tools';
import { BroadcastTools } from './broadcast-tools';
import { SceneAdvancedTools } from './scene-advanced-tools';
import { SceneViewTools } from './scene-view-tools';
import { ReferenceImageTools } from './reference-image-tools';
import { AssetAdvancedTools } from './asset-advanced-tools';
import { ValidationTools } from './validation-tools';

// All tool category instances are shared with MCPServer to avoid double instantiation.
// The same instances are reused here for tool discovery.
function createToolInstances(): Record<string, any> {
    return {
        scene: new SceneTools(),
        node: new NodeTools(),
        component: new ComponentTools(),
        prefab: new PrefabTools(),
        project: new ProjectTools(),
        debug: new DebugTools(),
        preferences: new PreferencesTools(),
        server: new ServerTools(),
        broadcast: new BroadcastTools(),
        sceneAdvanced: new SceneAdvancedTools(),
        sceneView: new SceneViewTools(),
        referenceImage: new ReferenceImageTools(),
        assetAdvanced: new AssetAdvancedTools(),
        validation: new ValidationTools()
    };
}

export class ToolManager {
    private settings: ToolManagerSettings;
    private availableTools: ToolConfig[] = [];

    constructor() {
        this.settings = readToolManagerSettings();
        this.availableTools = this.discoverTools();

        if (this.settings.configurations.length === 0) {
            this.createConfiguration('Default', 'Auto-created default tool configuration');
        }
    }

    private discoverTools(): ToolConfig[] {
        try {
            const instances = createToolInstances();
            const tools: ToolConfig[] = [];
            for (const [category, toolSet] of Object.entries(instances)) {
                for (const tool of toolSet.getTools()) {
                    tools.push({
                        category,
                        name: tool.name,
                        enabled: true,
                        description: tool.description
                    });
                }
            }
            console.log(`[ToolManager] Discovered ${tools.length} tools`);
            return tools;
        } catch (error) {
            console.error('[ToolManager] Failed to discover tools:', error);
            return [];
        }
    }

    public getAvailableTools(): ToolConfig[] {
        return [...this.availableTools];
    }

    public getConfigurations(): ToolConfiguration[] {
        return [...this.settings.configurations];
    }

    public getCurrentConfiguration(): ToolConfiguration | null {
        if (!this.settings.currentConfigId) return null;
        return this.settings.configurations.find(c => c.id === this.settings.currentConfigId) ?? null;
    }

    public createConfiguration(name: string, description?: string): ToolConfiguration {
        if (this.settings.configurations.length >= this.settings.maxConfigSlots) {
            throw new Error(`Maximum configuration slots reached (${this.settings.maxConfigSlots})`);
        }

        const now = new Date().toISOString();
        const config: ToolConfiguration = {
            id: uuidv4(),
            name,
            description,
            tools: this.availableTools.map(tool => ({ ...tool })),
            createdAt: now,
            updatedAt: now
        };

        this.settings.configurations.push(config);
        this.settings.currentConfigId = config.id;
        this.saveSettings();

        return config;
    }

    public updateConfiguration(configId: string, updates: Partial<ToolConfiguration>): ToolConfiguration {
        const idx = this.findConfigIndex(configId);
        const updated: ToolConfiguration = {
            ...this.settings.configurations[idx],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        this.settings.configurations[idx] = updated;
        this.saveSettings();
        return updated;
    }

    public deleteConfiguration(configId: string): void {
        const idx = this.findConfigIndex(configId);
        this.settings.configurations.splice(idx, 1);

        if (this.settings.currentConfigId === configId) {
            this.settings.currentConfigId = this.settings.configurations[0]?.id ?? '';
        }
        this.saveSettings();
    }

    public setCurrentConfiguration(configId: string): void {
        this.findConfigIndex(configId); // validates existence
        this.settings.currentConfigId = configId;
        this.saveSettings();
    }

    public updateToolStatus(configId: string, category: string, toolName: string, enabled: boolean): void {
        const config = this.getConfig(configId);
        const tool = config.tools.find(t => t.category === category && t.name === toolName);
        if (!tool) {
            throw new Error(`Tool not found: ${category}/${toolName}`);
        }
        tool.enabled = enabled;
        config.updatedAt = new Date().toISOString();
        this.saveSettings();
    }

    public updateToolStatusBatch(configId: string, updates: { category: string; name: string; enabled: boolean }[]): void {
        const config = this.getConfig(configId);
        for (const update of updates) {
            const tool = config.tools.find(t => t.category === update.category && t.name === update.name);
            if (tool) {
                tool.enabled = update.enabled;
            }
        }
        config.updatedAt = new Date().toISOString();
        this.saveSettings();
    }

    public exportConfiguration(configId: string): string {
        return exportToolConfiguration(this.getConfig(configId));
    }

    public importConfiguration(configJson: string): ToolConfiguration {
        const config = importToolConfiguration(configJson);
        config.id = uuidv4();
        const now = new Date().toISOString();
        config.createdAt = now;
        config.updatedAt = now;

        if (this.settings.configurations.length >= this.settings.maxConfigSlots) {
            throw new Error(`Maximum configuration slots reached (${this.settings.maxConfigSlots})`);
        }
        this.settings.configurations.push(config);
        this.saveSettings();
        return config;
    }

    public getEnabledTools(): ToolConfig[] {
        const current = this.getCurrentConfiguration();
        const source = current ? current.tools : this.availableTools;
        return source.filter(t => t.enabled);
    }

    public getToolManagerState() {
        const current = this.getCurrentConfiguration();
        return {
            success: true,
            availableTools: current ? current.tools : this.getAvailableTools(),
            selectedConfigId: this.settings.currentConfigId,
            configurations: this.getConfigurations(),
            maxConfigSlots: this.settings.maxConfigSlots
        };
    }

    private getConfig(configId: string): ToolConfiguration {
        const config = this.settings.configurations.find(c => c.id === configId);
        if (!config) throw new Error(`Configuration not found: ${configId}`);
        return config;
    }

    private findConfigIndex(configId: string): number {
        const idx = this.settings.configurations.findIndex(c => c.id === configId);
        if (idx === -1) throw new Error(`Configuration not found: ${configId}`);
        return idx;
    }

    private saveSettings(): void {
        saveToolManagerSettings(this.settings);
    }
}
