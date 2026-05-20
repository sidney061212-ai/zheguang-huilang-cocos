import { ToolDefinition, ToolResponse, ToolExecutor, SceneInfo } from '../types';

export class SceneTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'get_current_scene',
                description: 'Get current scene information',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'get_scene_list',
                description: 'Get all scenes in the project',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'open_scene',
                description: 'Open a scene by path',
                inputSchema: {
                    type: 'object',
                    properties: {
                        scenePath: { type: 'string', description: 'The scene file path' }
                    },
                    required: ['scenePath']
                }
            },
            {
                name: 'save_scene',
                description: 'Save current scene',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'create_scene',
                description: 'Create a new scene asset',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sceneName: { type: 'string', description: 'Name of the new scene' },
                        savePath: {
                            type: 'string',
                            description: 'Path to save the scene (e.g., db://assets/scenes/NewScene.scene)'
                        }
                    },
                    required: ['sceneName', 'savePath']
                }
            },
            {
                name: 'save_scene_as',
                description: 'Save scene as new file',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Path to save the scene' }
                    },
                    required: ['path']
                }
            },
            {
                name: 'close_scene',
                description: 'Close current scene',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'get_scene_hierarchy',
                description: 'Get the complete hierarchy of current scene',
                inputSchema: {
                    type: 'object',
                    properties: {
                        includeComponents: {
                            type: 'boolean',
                            description: 'Include component information',
                            default: false
                        }
                    }
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'get_current_scene':   return this.getCurrentScene();
            case 'get_scene_list':      return this.getSceneList();
            case 'open_scene':          return this.openScene(args.scenePath);
            case 'save_scene':          return this.saveScene();
            case 'create_scene':        return this.createScene(args.sceneName, args.savePath);
            case 'save_scene_as':       return this.saveSceneAs(args.path);
            case 'close_scene':         return this.closeScene();
            case 'get_scene_hierarchy': return this.getSceneHierarchy(args.includeComponents);
            default: throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private async getCurrentScene(): Promise<ToolResponse> {
        try {
            const tree: any = await Editor.Message.request('scene', 'query-node-tree');
            if (tree?.uuid) {
                return {
                    success: true,
                    data: {
                        name: tree.name ?? 'Current Scene',
                        uuid: tree.uuid,
                        type: tree.type ?? 'cc.Scene',
                        active: tree.active ?? true,
                        nodeCount: tree.children?.length ?? 0
                    }
                };
            }
            return { success: false, error: 'No scene data available' };
        } catch (err: any) {
            // Fallback: query via scene script
            try {
                const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: 'cocos-mcp-server',
                    method: 'getCurrentSceneInfo',
                    args: []
                });
                return result;
            } catch (err2: any) {
                return { success: false, error: `Editor API failed: ${err.message}; Scene script failed: ${err2.message}` };
            }
        }
    }

    private async getSceneList(): Promise<ToolResponse> {
        try {
            const results: any[] = await Editor.Message.request('asset-db', 'query-assets', {
                pattern: 'db://assets/**/*.scene'
            });
            const scenes: SceneInfo[] = results.map(asset => ({
                name: asset.name,
                path: asset.url,
                uuid: asset.uuid
            }));
            return { success: true, data: scenes };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async openScene(scenePath: string): Promise<ToolResponse> {
        try {
            const uuid: string | null = await Editor.Message.request('asset-db', 'query-uuid', scenePath);
            if (!uuid) throw new Error('Scene not found');
            await Editor.Message.request('scene', 'open-scene', uuid);
            return { success: true, message: `Scene opened: ${scenePath}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async saveScene(): Promise<ToolResponse> {
        try {
            await Editor.Message.request('scene', 'save-scene');
            return { success: true, message: 'Scene saved successfully' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async createScene(sceneName: string, savePath: string): Promise<ToolResponse> {
        const fullPath = savePath.endsWith('.scene') ? savePath : `${savePath}/${sceneName}.scene`;
        const sceneContent = JSON.stringify(this.buildSceneTemplate(sceneName), null, 2);
        try {
            const result: any = await Editor.Message.request('asset-db', 'create-asset', fullPath, sceneContent);
            const sceneList = await this.getSceneList();
            const created = sceneList.data?.find((s: any) => s.uuid === result.uuid);
            return {
                success: true,
                data: {
                    uuid: result.uuid,
                    url: result.url,
                    name: sceneName,
                    message: `Scene '${sceneName}' created successfully`,
                    sceneVerified: !!created
                },
                verificationData: created
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async getSceneHierarchy(includeComponents: boolean = false): Promise<ToolResponse> {
        try {
            const tree: any = await Editor.Message.request('scene', 'query-node-tree');
            if (tree) {
                return { success: true, data: this.buildHierarchy(tree, includeComponents) };
            }
            return { success: false, error: 'No scene hierarchy available' };
        } catch (err: any) {
            // Fallback: query via scene script
            try {
                const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: 'cocos-mcp-server',
                    method: 'getSceneHierarchy',
                    args: [includeComponents]
                });
                return result;
            } catch (err2: any) {
                return { success: false, error: `Editor API failed: ${err.message}; Scene script failed: ${err2.message}` };
            }
        }
    }

    private buildHierarchy(node: any, includeComponents: boolean): any {
        const result: any = {
            uuid: node.uuid,
            name: node.name,
            type: node.type,
            active: node.active,
            children: node.children?.map((child: any) => this.buildHierarchy(child, includeComponents)) ?? []
        };
        if (includeComponents && node.__comps__) {
            result.components = node.__comps__.map((comp: any) => ({
                type: comp.__type__ ?? 'Unknown',
                enabled: comp.enabled ?? true
            }));
        }
        return result;
    }

    private async saveSceneAs(path: string): Promise<ToolResponse> {
        try {
            await (Editor.Message.request as any)('scene', 'save-as-scene');
            return { success: true, data: { path, message: 'Scene save-as dialog opened' } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async closeScene(): Promise<ToolResponse> {
        try {
            await Editor.Message.request('scene', 'close-scene');
            return { success: true, message: 'Scene closed successfully' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private buildSceneTemplate(sceneName: string): any[] {
        return [
            {
                '__type__': 'cc.SceneAsset', '_name': sceneName, '_objFlags': 0,
                '__editorExtras__': {}, '_native': '', 'scene': { '__id__': 1 }
            },
            {
                '__type__': 'cc.Scene', '_name': sceneName, '_objFlags': 0,
                '__editorExtras__': {}, '_parent': null, '_children': [],
                '_active': true, '_components': [], '_prefab': null,
                '_lpos': { '__type__': 'cc.Vec3', 'x': 0, 'y': 0, 'z': 0 },
                '_lrot': { '__type__': 'cc.Quat', 'x': 0, 'y': 0, 'z': 0, 'w': 1 },
                '_lscale': { '__type__': 'cc.Vec3', 'x': 1, 'y': 1, 'z': 1 },
                '_mobility': 0, '_layer': 1073741824,
                '_euler': { '__type__': 'cc.Vec3', 'x': 0, 'y': 0, 'z': 0 },
                'autoReleaseAssets': false, '_globals': { '__id__': 2 }, '_id': 'scene'
            },
            {
                '__type__': 'cc.SceneGlobals',
                'ambient': { '__id__': 3 }, 'skybox': { '__id__': 4 },
                'fog': { '__id__': 5 }, 'octree': { '__id__': 6 }
            },
            {
                '__type__': 'cc.AmbientInfo',
                '_skyColorHDR': { '__type__': 'cc.Vec4', 'x': 0.2, 'y': 0.5, 'z': 0.8, 'w': 0.520833 },
                '_skyColor': { '__type__': 'cc.Vec4', 'x': 0.2, 'y': 0.5, 'z': 0.8, 'w': 0.520833 },
                '_skyIllumHDR': 20000, '_skyIllum': 20000,
                '_groundAlbedoHDR': { '__type__': 'cc.Vec4', 'x': 0.2, 'y': 0.2, 'z': 0.2, 'w': 1 },
                '_groundAlbedo': { '__type__': 'cc.Vec4', 'x': 0.2, 'y': 0.2, 'z': 0.2, 'w': 1 }
            },
            {
                '__type__': 'cc.SkyboxInfo',
                '_envLightingType': 0, '_envmapHDR': null, '_envmap': null,
                '_envmapLodCount': 0, '_diffuseMapHDR': null, '_diffuseMap': null,
                '_enabled': false, '_useHDR': true, '_editableMaterial': null,
                '_reflectionHDR': null, '_reflectionMap': null, '_rotationAngle': 0
            },
            {
                '__type__': 'cc.FogInfo', '_type': 0,
                '_fogColor': { '__type__': 'cc.Color', 'r': 200, 'g': 200, 'b': 200, 'a': 255 },
                '_enabled': false, '_fogDensity': 0.3, '_fogStart': 0.5, '_fogEnd': 300,
                '_fogAtten': 5, '_fogTop': 1.5, '_fogRange': 1.2, '_accurate': false
            },
            {
                '__type__': 'cc.OctreeInfo', '_enabled': false,
                '_minPos': { '__type__': 'cc.Vec3', 'x': -1024, 'y': -1024, 'z': -1024 },
                '_maxPos': { '__type__': 'cc.Vec3', 'x': 1024, 'y': 1024, 'z': 1024 },
                '_depth': 8
            }
        ];
    }
}
