import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

export class PreferencesTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'open_preferences_settings',
                description: 'Open preferences settings panel',
                inputSchema: {
                    type: 'object',
                    properties: {
                        tab: {
                            type: 'string',
                            description: 'Preferences tab to open (optional)',
                            enum: ['general', 'external-tools', 'data-editor', 'laboratory', 'extensions']
                        },
                        args: {
                            type: 'array',
                            description: 'Additional arguments to pass to the tab'
                        }
                    }
                }
            },
            {
                name: 'query_preferences_config',
                description: 'Query preferences configuration',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Plugin or category name',
                            default: 'general'
                        },
                        path: {
                            type: 'string',
                            description: 'Configuration path (optional)'
                        },
                        type: {
                            type: 'string',
                            description: 'Configuration type',
                            enum: ['default', 'global', 'local'],
                            default: 'global'
                        }
                    },
                    required: ['name']
                }
            },
            {
                name: 'set_preferences_config',
                description: 'Set preferences configuration',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Plugin name' },
                        path: { type: 'string', description: 'Configuration path' },
                        value: { description: 'Configuration value' },
                        type: {
                            type: 'string',
                            description: 'Configuration type',
                            enum: ['default', 'global', 'local'],
                            default: 'global'
                        }
                    },
                    required: ['name', 'path', 'value']
                }
            },
            {
                name: 'get_all_preferences',
                description: 'Get all available preferences categories',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'reset_preferences',
                description: 'Reset preferences to default values',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Specific preference category to reset (optional)'
                        },
                        type: {
                            type: 'string',
                            description: 'Configuration type to reset',
                            enum: ['global', 'local'],
                            default: 'global'
                        }
                    }
                }
            },
            {
                name: 'export_preferences',
                description: 'Export current preferences configuration',
                inputSchema: {
                    type: 'object',
                    properties: {
                        exportPath: {
                            type: 'string',
                            description: 'Path to export preferences file (optional)'
                        }
                    }
                }
            },
            {
                name: 'import_preferences',
                description: 'Import preferences configuration from file',
                inputSchema: {
                    type: 'object',
                    properties: {
                        importPath: { type: 'string', description: 'Path to import preferences file from' }
                    },
                    required: ['importPath']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'open_preferences_settings': return this.openPreferencesSettings(args.tab, args.args);
            case 'query_preferences_config':  return this.queryPreferencesConfig(args.name, args.path, args.type);
            case 'set_preferences_config':    return this.setPreferencesConfig(args.name, args.path, args.value, args.type);
            case 'get_all_preferences':       return this.getAllPreferences();
            case 'reset_preferences':         return this.resetPreferences(args.name, args.type);
            case 'export_preferences':        return this.exportPreferences(args.exportPath);
            case 'import_preferences':        return this.importPreferences();
            default: throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private async openPreferencesSettings(tab?: string, extraArgs?: any[]): Promise<ToolResponse> {
        try {
            const requestArgs: any[] = tab ? [tab, ...(extraArgs ?? [])] : [];
            await (Editor.Message.request as any)('preferences', 'open-settings', ...requestArgs);
            return { success: true, message: `Preferences opened${tab ? ` on tab: ${tab}` : ''}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async queryPreferencesConfig(name: string, configPath?: string, type: string = 'global'): Promise<ToolResponse> {
        try {
            const args: any[] = [name];
            if (configPath) args.push(configPath);
            args.push(type);
            const config = await (Editor.Message.request as any)('preferences', 'query-config', ...args);
            return { success: true, data: { name, path: configPath, type, config } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async setPreferencesConfig(name: string, configPath: string, value: any, type: string = 'global'): Promise<ToolResponse> {
        try {
            const success: boolean = await (Editor.Message.request as any)('preferences', 'set-config', name, configPath, value, type);
            if (success) {
                return { success: true, message: `Preference '${name}.${configPath}' updated successfully` };
            }
            return { success: false, error: `Failed to update preference '${name}.${configPath}'` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async getAllPreferences(): Promise<ToolResponse> {
        const categories = ['general', 'external-tools', 'data-editor', 'laboratory', 'extensions', 'preview', 'console', 'native', 'builder'];
        const results = await Promise.all(
            categories.map(cat =>
                Editor.Message.request('preferences', 'query-config', cat, undefined, 'global')
                    .then((config: any) => [cat, config] as const)
                    .catch(() => [cat, null] as const)
            )
        );
        const preferences = Object.fromEntries(results.filter(([, v]) => v !== null));
        return { success: true, data: { categories: Object.keys(preferences), preferences } };
    }

    private async resetPreferences(name?: string, type: string = 'global'): Promise<ToolResponse> {
        if (!name) {
            return { success: false, error: 'Specify a preference category to reset. Resetting all preferences is not supported via API.' };
        }
        try {
            const defaultConfig = await Editor.Message.request('preferences', 'query-config', name, undefined, 'default');
            const success: boolean = await (Editor.Message.request as any)('preferences', 'set-config', name, '', defaultConfig, type);
            if (success) {
                return { success: true, message: `Preference category '${name}' reset to default` };
            }
            return { success: false, error: `Failed to reset preference category '${name}'` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async exportPreferences(exportPath?: string): Promise<ToolResponse> {
        const prefsResult = await this.getAllPreferences();
        if (!prefsResult.success) return prefsResult;
        return {
            success: true,
            data: {
                exportPath: exportPath ?? `preferences_export_${Date.now()}.json`,
                preferences: prefsResult.data,
                jsonData: JSON.stringify(prefsResult.data, null, 2)
            }
        };
    }

    private importPreferences(): ToolResponse {
        return {
            success: false,
            error: 'Import preferences requires file system access. Please use the Editor UI to import preferences manually.'
        };
    }
}
