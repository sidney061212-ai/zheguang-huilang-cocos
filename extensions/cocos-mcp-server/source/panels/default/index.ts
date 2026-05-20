/* eslint-disable vue/one-component-per-file */

import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { createApp, App, defineComponent, ref, computed, onMounted, watch } from 'vue';

const panelDataMap = new WeakMap<any, App>();

interface ToolConfig {
    category: string;
    name: string;
    enabled: boolean;
    description: string;
}

interface ServerSettings {
    port: number;
    autoStart: boolean;
    debugLog: boolean;
    maxConnections: number;
}

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
    scene: 'Scene Tools',
    node: 'Node Tools',
    component: 'Component Tools',
    prefab: 'Prefab Tools',
    project: 'Project Tools',
    debug: 'Debug Tools',
    preferences: 'Preferences Tools',
    server: 'Server Tools',
    broadcast: 'Broadcast Tools',
    sceneAdvanced: 'Advanced Scene Tools',
    sceneView: 'Scene View Tools',
    referenceImage: 'Reference Image Tools',
    assetAdvanced: 'Advanced Asset Tools',
    validation: 'Validation Tools'
};

module.exports = Editor.Panel.define({
    listeners: {
        show() { },
        hide() { },
    },
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
        panelTitle: '#panelTitle',
    },
    ready() {
        if (!this.$.app) return;

        const app = createApp({});
        app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');

        app.component('McpServerApp', defineComponent({
            setup() {
                const activeTab = ref('server');
                const serverRunning = ref(false);
                const serverStatusText = ref('Stopped');
                const connectedClients = ref(0);
                const httpUrl = ref('');
                const isProcessing = ref(false);
                const settingsChanged = ref(false);

                const settings = ref<ServerSettings>({
                    port: 3000,
                    autoStart: false,
                    debugLog: false,
                    maxConnections: 10
                });

                const availableTools = ref<ToolConfig[]>([]);
                const toolCategories = ref<string[]>([]);

                const statusClass = computed(() => ({
                    'status-running': serverRunning.value,
                    'status-stopped': !serverRunning.value
                }));

                const totalTools = computed(() => availableTools.value.length);
                const enabledToolCount = computed(() => availableTools.value.filter(t => t.enabled).length);
                const disabledToolCount = computed(() => totalTools.value - enabledToolCount.value);

                const switchTab = (tabName: string) => {
                    activeTab.value = tabName;
                    if (tabName === 'tools') {
                        loadToolManagerState();
                    }
                };

                const toggleServer = async () => {
                    try {
                        if (serverRunning.value) {
                            await Editor.Message.request('cocos-mcp-server', 'stop-server');
                        } else {
                            const currentSettings = {
                                port: settings.value.port,
                                autoStart: settings.value.autoStart,
                                enableDebugLog: settings.value.debugLog,
                                maxConnections: settings.value.maxConnections
                            };
                            await Editor.Message.request('cocos-mcp-server', 'update-settings', currentSettings);
                            await Editor.Message.request('cocos-mcp-server', 'start-server');
                        }
                    } catch (error) {
                        console.error('[MCP Panel] Failed to toggle server:', error);
                    }
                };

                const saveSettings = async () => {
                    try {
                        const settingsData = {
                            port: settings.value.port,
                            autoStart: settings.value.autoStart,
                            enableDebugLog: settings.value.debugLog,
                            maxConnections: settings.value.maxConnections
                        };
                        await Editor.Message.request('cocos-mcp-server', 'update-settings', settingsData);
                        settingsChanged.value = false;
                    } catch (error) {
                        console.error('[MCP Panel] Failed to save settings:', error);
                    }
                };

                const copyUrl = async () => {
                    try {
                        await navigator.clipboard.writeText(httpUrl.value);
                    } catch (error) {
                        console.error('[MCP Panel] Failed to copy URL:', error);
                    }
                };

                const loadToolManagerState = async () => {
                    try {
                        const result = await Editor.Message.request('cocos-mcp-server', 'getToolManagerState');
                        if (result?.success) {
                            availableTools.value = result.availableTools ?? [];
                            const categories = new Set(availableTools.value.map(t => t.category));
                            toolCategories.value = Array.from(categories);
                        }
                    } catch (error) {
                        console.error('[MCP Panel] Failed to load tool manager state:', error);
                    }
                };

                const updateToolStatus = async (category: string, name: string, enabled: boolean) => {
                    // Optimistic update
                    const toolIndex = availableTools.value.findIndex(t => t.category === category && t.name === name);
                    if (toolIndex !== -1) {
                        availableTools.value[toolIndex].enabled = enabled;
                        availableTools.value = [...availableTools.value];
                    }
                    try {
                        const result = await Editor.Message.request('cocos-mcp-server', 'updateToolStatus', category, name, enabled);
                        if (!result?.success && toolIndex !== -1) {
                            // Roll back on failure
                            availableTools.value[toolIndex].enabled = !enabled;
                            availableTools.value = [...availableTools.value];
                        }
                    } catch (error) {
                        // Roll back on error
                        if (toolIndex !== -1) {
                            availableTools.value[toolIndex].enabled = !enabled;
                            availableTools.value = [...availableTools.value];
                        }
                        console.error('[MCP Panel] Failed to update tool status:', error);
                    }
                };

                const saveChanges = async () => {
                    try {
                        const updates = availableTools.value.map(tool => ({
                            category: String(tool.category),
                            name: String(tool.name),
                            enabled: Boolean(tool.enabled)
                        }));
                        await Editor.Message.request('cocos-mcp-server', 'updateToolStatusBatch', updates);
                    } catch (error) {
                        console.error('[MCP Panel] Failed to save tool changes:', error);
                    }
                };

                const selectAllTools = async () => {
                    availableTools.value.forEach(t => { t.enabled = true; });
                    await saveChanges();
                };

                const deselectAllTools = async () => {
                    availableTools.value.forEach(t => { t.enabled = false; });
                    await saveChanges();
                };

                const toggleCategoryTools = async (category: string, enabled: boolean) => {
                    availableTools.value.forEach(t => {
                        if (t.category === category) t.enabled = enabled;
                    });
                    await saveChanges();
                };

                const getToolsByCategory = (category: string) => {
                    return availableTools.value.filter(t => t.category === category);
                };

                const getCategoryDisplayName = (category: string): string => {
                    return CATEGORY_DISPLAY_NAMES[category] ?? category;
                };

                watch(settings, () => { settingsChanged.value = true; }, { deep: true });

                onMounted(async () => {
                    await loadToolManagerState();

                    try {
                        const status = await Editor.Message.request('cocos-mcp-server', 'get-server-status');
                        if (status?.settings) {
                            settings.value = {
                                port: status.settings.port ?? 3000,
                                autoStart: status.settings.autoStart ?? false,
                                debugLog: status.settings.enableDebugLog ?? false,
                                maxConnections: status.settings.maxConnections ?? 10
                            };
                        }
                    } catch (error) {
                        console.error('[MCP Panel] Failed to load server settings:', error);
                    }

                    setInterval(async () => {
                        try {
                            const result = await Editor.Message.request('cocos-mcp-server', 'get-server-status');
                            if (result) {
                                serverRunning.value = result.running;
                                serverStatusText.value = result.running ? 'Running' : 'Stopped';
                                connectedClients.value = result.clients ?? 0;
                                httpUrl.value = result.running ? `http://localhost:${result.port}` : '';
                                isProcessing.value = false;
                            }
                        } catch (error) {
                            console.error('[MCP Panel] Failed to poll server status:', error);
                        }
                    }, 2000);
                });

                return {
                    activeTab,
                    serverRunning,
                    serverStatusText,
                    connectedClients,
                    httpUrl,
                    isProcessing,
                    settings,
                    availableTools,
                    toolCategories,
                    settingsChanged,
                    statusClass,
                    totalTools,
                    enabledToolCount,
                    disabledToolCount,
                    switchTab,
                    toggleServer,
                    saveSettings,
                    copyUrl,
                    loadToolManagerState,
                    updateToolStatus,
                    selectAllTools,
                    deselectAllTools,
                    saveChanges,
                    toggleCategoryTools,
                    getToolsByCategory,
                    getCategoryDisplayName
                };
            },
            template: readFileSync(join(__dirname, '../../../static/template/vue/mcp-server-app.html'), 'utf-8'),
        }));

        app.mount(this.$.app);
        panelDataMap.set(this, app);
    },
    beforeClose() { },
    close() {
        panelDataMap.get(this)?.unmount();
    },
});
