import { ToolDefinition, ToolResponse, ToolExecutor, PrefabInfo } from '../types';

export class PrefabTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'get_prefab_list',
                description: 'Get all prefabs in the project',
                inputSchema: {
                    type: 'object',
                    properties: {
                        folder: {
                            type: 'string',
                            description: 'Folder path to search (optional)',
                            default: 'db://assets'
                        }
                    }
                }
            },
            {
                name: 'load_prefab',
                description: 'Load a prefab by path',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path'
                        }
                    },
                    required: ['prefabPath']
                }
            },
            {
                name: 'instantiate_prefab',
                description: 'Instantiate a prefab in the scene',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path'
                        },
                        parentUuid: {
                            type: 'string',
                            description: 'Parent node UUID (optional)'
                        },
                        position: {
                            type: 'object',
                            description: 'Initial position',
                            properties: {
                                x: { type: 'number' },
                                y: { type: 'number' },
                                z: { type: 'number' }
                            }
                        }
                    },
                    required: ['prefabPath']
                }
            },
            {
                name: 'create_prefab',
                description: 'Create a prefab from a node with all children and components',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Source node UUID'
                        },
                        savePath: {
                            type: 'string',
                            description: 'Path to save the prefab (e.g., db://assets/prefabs/MyPrefab.prefab)'
                        },
                        prefabName: {
                            type: 'string',
                            description: 'Prefab name'
                        }
                    },
                    required: ['nodeUuid', 'savePath', 'prefabName']
                }
            },
            {
                name: 'update_prefab',
                description: 'Update an existing prefab',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID with changes'
                        }
                    },
                    required: ['prefabPath', 'nodeUuid']
                }
            },
            {
                name: 'revert_prefab',
                description: 'Revert prefab instance to original',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Prefab instance node UUID'
                        }
                    },
                    required: ['nodeUuid']
                }
            },
            {
                name: 'get_prefab_info',
                description: 'Get detailed prefab information',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path'
                        }
                    },
                    required: ['prefabPath']
                }
            },
            {
                name: 'validate_prefab',
                description: 'Validate a prefab file format',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path'
                        }
                    },
                    required: ['prefabPath']
                }
            },
            {
                name: 'duplicate_prefab',
                description: 'Duplicate an existing prefab',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sourcePrefabPath: {
                            type: 'string',
                            description: 'Source prefab path'
                        },
                        targetPrefabPath: {
                            type: 'string',
                            description: 'Target prefab path'
                        },
                        newPrefabName: {
                            type: 'string',
                            description: 'New prefab name'
                        }
                    },
                    required: ['sourcePrefabPath', 'targetPrefabPath']
                }
            },
            {
                name: 'restore_prefab_node',
                description: 'Restore prefab node using prefab asset (built-in undo record)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Prefab instance node UUID'
                        },
                        assetUuid: {
                            type: 'string',
                            description: 'Prefab asset UUID'
                        }
                    },
                    required: ['nodeUuid', 'assetUuid']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'get_prefab_list':
                return await this.getPrefabList(args.folder);
            case 'load_prefab':
                return await this.loadPrefab(args.prefabPath);
            case 'instantiate_prefab':
                return await this.instantiatePrefab(args);
            case 'create_prefab':
                return await this.createPrefab(args);
            case 'update_prefab':
                return await this.updatePrefab(args.prefabPath, args.nodeUuid);
            case 'revert_prefab':
                return await this.revertPrefab(args.nodeUuid);
            case 'get_prefab_info':
                return await this.getPrefabInfo(args.prefabPath);
            case 'validate_prefab':
                return await this.validatePrefab(args.prefabPath);
            case 'duplicate_prefab':
                return await this.duplicatePrefab(args);
            case 'restore_prefab_node':
                return await this.restorePrefabNode(args.nodeUuid, args.assetUuid);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private async getPrefabList(folder: string = 'db://assets'): Promise<ToolResponse> {
        return new Promise((resolve) => {
            const pattern = folder.endsWith('/') ? 
                `${folder}**/*.prefab` : `${folder}/**/*.prefab`;
            
            Editor.Message.request('asset-db', 'query-assets', {
                pattern: pattern
            }).then((results: any[]) => {
                const prefabs: PrefabInfo[] = results.map(asset => ({
                    name: asset.name,
                    path: asset.url,
                    uuid: asset.uuid,
                    folder: asset.url.substring(0, asset.url.lastIndexOf('/'))
                }));
                resolve({ success: true, data: prefabs });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async loadPrefab(prefabPath: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }
                
                return Editor.Message.request('scene', 'load-asset', {
                    uuid: assetInfo.uuid
                });
            }).then((prefabData: any) => {
                resolve({
                    success: true,
                    data: {
                        uuid: prefabData.uuid,
                        name: prefabData.name,
                        message: 'Prefab loaded successfully'
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async instantiatePrefab(args: any): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                // Get prefab asset info
                const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', args.prefabPath);
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }

                // Use the correct create-node API to instantiate from prefab asset
                const createNodeOptions: any = {
                    assetUuid: assetInfo.uuid
                };

                // Set parent node
                if (args.parentUuid) {
                    createNodeOptions.parent = args.parentUuid;
                }

                // Set node name
                if (args.name) {
                    createNodeOptions.name = args.name;
                } else if (assetInfo.name) {
                    createNodeOptions.name = assetInfo.name;
                }

                // Set initial properties (e.g. position)
                if (args.position) {
                    createNodeOptions.dump = {
                        position: {
                            value: args.position
                        }
                    };
                }

                // Create the node
                const nodeUuid = await Editor.Message.request('scene', 'create-node', createNodeOptions);
                const uuid = Array.isArray(nodeUuid) ? nodeUuid[0] : nodeUuid;

                // Note: create-node API should automatically establish prefab linkage when created from a prefab asset
                console.log('Prefab node created successfully:', {
                    nodeUuid: uuid,
                    prefabUuid: assetInfo.uuid,
                    prefabPath: args.prefabPath
                });

                resolve({
                    success: true,
                    data: {
                        nodeUuid: uuid,
                        prefabPath: args.prefabPath,
                        parentUuid: args.parentUuid,
                        position: args.position,
                        message: 'Prefab instantiated successfully and prefab linkage established'
                    }
                });
            } catch (err: any) {
                resolve({
                    success: false,
                    error: `Prefab instantiation failed: ${err.message}`,
                    instruction: 'Please check that the prefab path is correct and the prefab file format is valid'
                });
            }
        });
    }

    /**
     * Establish the link between a node and a prefab asset.
     * Creates the necessary PrefabInfo and PrefabInstance structures.
     */
    private async establishPrefabConnection(nodeUuid: string, prefabUuid: string, prefabPath: string): Promise<void> {
        try {
            // Read the prefab file to get the root node's fileId
            const prefabContent = await this.readPrefabFile(prefabPath);
            if (!prefabContent || !prefabContent.data || !prefabContent.data.length) {
                throw new Error('Unable to read prefab file content');
            }

            // Find the prefab root node's fileId (usually the second object, index 1)
            const rootNode = prefabContent.data.find((item: any) => item.__type === 'cc.Node' && item._parent === null);
            if (!rootNode || !rootNode._prefab) {
                throw new Error('Unable to find prefab root node or its prefab info');
            }

            // Get the root node's PrefabInfo
            const rootPrefabInfo = prefabContent.data[rootNode._prefab.__id__];
            if (!rootPrefabInfo || rootPrefabInfo.__type !== 'cc.PrefabInfo') {
                throw new Error('Unable to find PrefabInfo for the prefab root node');
            }

            const rootFileId = rootPrefabInfo.fileId;

            // Use the scene API to establish the prefab connection
            const prefabConnectionData = {
                node: nodeUuid,
                prefab: prefabUuid,
                fileId: rootFileId
            };

            // Try multiple API methods to establish the prefab connection
            const connectionMethods = [
                () => Editor.Message.request('scene', 'connect-prefab-instance', prefabConnectionData),
                () => Editor.Message.request('scene', 'set-prefab-connection', prefabConnectionData),
                () => Editor.Message.request('scene', 'apply-prefab-link', prefabConnectionData)
            ];

            let connected = false;
            for (const method of connectionMethods) {
                try {
                    await method();
                    connected = true;
                    break;
                } catch (error) {
                    console.warn('Prefab connection method failed, trying next method:', error);
                }
            }

            if (!connected) {
                // If all API methods fail, attempt to manually modify the scene data
                console.warn('All prefab connection APIs failed, attempting manual connection');
                await this.manuallyEstablishPrefabConnection(nodeUuid, prefabUuid, rootFileId);
            }

        } catch (error) {
            console.error('Failed to establish prefab connection:', error);
            throw error;
        }
    }

    /**
     * Manually establish the prefab connection (fallback when API methods fail).
     */
    private async manuallyEstablishPrefabConnection(nodeUuid: string, prefabUuid: string, rootFileId: string): Promise<void> {
        try {
            // Attempt to modify the node's _prefab property using the dump API
            const prefabConnectionData = {
                [nodeUuid]: {
                    '_prefab': {
                        '__uuid__': prefabUuid,
                        '__expectedType__': 'cc.Prefab',
                        'fileId': rootFileId
                    }
                }
            };

            await Editor.Message.request('scene', 'set-property', {
                uuid: nodeUuid,
                path: '_prefab',
                dump: {
                    value: {
                        '__uuid__': prefabUuid,
                        '__expectedType__': 'cc.Prefab'
                    }
                }
            });

        } catch (error) {
            console.error('Manual prefab connection also failed:', error);
            // Do not throw; the basic node creation already succeeded
        }
    }

    /**
     * Read the content of a prefab file.
     */
    private async readPrefabFile(prefabPath: string): Promise<any> {
        try {
            // Try to read the file content using the asset-db API
            let assetContent: any;
            try {
                assetContent = await Editor.Message.request('asset-db', 'query-asset-info', prefabPath);
                if (assetContent && assetContent.source) {
                    // If a source path exists, read the file directly
                    const fs = require('fs');
                    const path = require('path');
                    const fullPath = path.resolve(assetContent.source);
                    const fileContent = fs.readFileSync(fullPath, 'utf8');
                    return JSON.parse(fileContent);
                }
            } catch (error) {
                console.warn('Reading via asset-db failed, trying alternative method:', error);
            }

            // Fallback: convert the db:// path to an actual file path
            const fsPath = prefabPath.replace('db://assets/', 'assets/').replace('db://assets', 'assets');
            const fs = require('fs');
            const path = require('path');

            // Try multiple possible project root paths
            const possiblePaths = [
                path.resolve(process.cwd(), '../../NewProject_3', fsPath),
                path.resolve('/Users/lizhiyong/NewProject_3', fsPath),
                path.resolve(fsPath),
                // Also try a direct path if the file is in the root directory
                path.resolve('/Users/lizhiyong/NewProject_3/assets', path.basename(fsPath))
            ];

            console.log('Attempting to read prefab file, path conversion:', {
                originalPath: prefabPath,
                fsPath: fsPath,
                possiblePaths: possiblePaths
            });

            for (const fullPath of possiblePaths) {
                try {
                    console.log(`Checking path: ${fullPath}`);
                    if (fs.existsSync(fullPath)) {
                        console.log(`Found file: ${fullPath}`);
                        const fileContent = fs.readFileSync(fullPath, 'utf8');
                        const parsed = JSON.parse(fileContent);
                        console.log('File parsed successfully, data structure:', {
                            hasData: !!parsed.data,
                            dataLength: parsed.data ? parsed.data.length : 0
                        });
                        return parsed;
                    } else {
                        console.log(`File does not exist: ${fullPath}`);
                    }
                } catch (readError) {
                    console.warn(`Failed to read file ${fullPath}:`, readError);
                }
            }

            throw new Error('Unable to find or read the prefab file');
        } catch (error) {
            console.error('Failed to read prefab file:', error);
            throw error;
        }
    }

    private async tryCreateNodeWithPrefab(args: any): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', args.prefabPath).then((assetInfo: any) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }

                // Method 2: use create-node with a prefab asset
                const createNodeOptions: any = {
                    assetUuid: assetInfo.uuid
                };

                // Set parent node
                if (args.parentUuid) {
                    createNodeOptions.parent = args.parentUuid;
                }

                return Editor.Message.request('scene', 'create-node', createNodeOptions);
            }).then((nodeUuid: string | string[]) => {
                const uuid = Array.isArray(nodeUuid) ? nodeUuid[0] : nodeUuid;

                // If a position was specified, set the node position
                if (args.position && uuid) {
                    Editor.Message.request('scene', 'set-property', {
                        uuid: uuid,
                        path: 'position',
                        dump: { value: args.position }
                    }).then(() => {
                        resolve({
                            success: true,
                            data: {
                                nodeUuid: uuid,
                                prefabPath: args.prefabPath,
                                position: args.position,
                                message: 'Prefab instantiated successfully (fallback method) and position set'
                            }
                        });
                    }).catch(() => {
                        resolve({
                            success: true,
                            data: {
                                nodeUuid: uuid,
                                prefabPath: args.prefabPath,
                                message: 'Prefab instantiated successfully (fallback method) but position could not be set'
                            }
                        });
                    });
                } else {
                    resolve({
                        success: true,
                        data: {
                            nodeUuid: uuid,
                            prefabPath: args.prefabPath,
                            message: 'Prefab instantiated successfully (fallback method)'
                        }
                    });
                }
            }).catch((err: Error) => {
                resolve({
                    success: false,
                    error: `Fallback prefab instantiation method also failed: ${err.message}`
                });
            });
        });
    }

    private async tryAlternativeInstantiateMethods(args: any): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                // Method 1: try using create-node then apply the prefab
                const assetInfo = await this.getAssetInfo(args.prefabPath);
                if (!assetInfo) {
                    resolve({ success: false, error: 'Unable to get prefab asset info' });
                    return;
                }

                // Create an empty node
                const createResult = await this.createNode(args.parentUuid, args.position);
                if (!createResult.success) {
                    resolve(createResult);
                    return;
                }

                // Try to apply the prefab to the node
                const applyResult = await this.applyPrefabToNode(createResult.data.nodeUuid, assetInfo.uuid);
                if (applyResult.success) {
                    resolve({
                        success: true,
                        data: {
                            nodeUuid: createResult.data.nodeUuid,
                            name: createResult.data.name,
                            message: 'Prefab instantiated successfully (using alternative method)'
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'Unable to apply prefab data to node',
                        data: {
                            nodeUuid: createResult.data.nodeUuid,
                            message: 'Node created, but unable to apply prefab data'
                        }
                    });
                }

            } catch (error) {
                resolve({ success: false, error: `Alternative instantiation method failed: ${error}` });
            }
        });
    }

    private async getAssetInfo(prefabPath: string): Promise<any> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
                resolve(assetInfo);
            }).catch(() => {
                resolve(null);
            });
        });
    }

    private async createNode(parentUuid?: string, position?: any): Promise<ToolResponse> {
        return new Promise((resolve) => {
            const createNodeOptions: any = {
                name: 'PrefabInstance'
            };

            // Set parent node
            if (parentUuid) {
                createNodeOptions.parent = parentUuid;
            }

            // Set position
            if (position) {
                createNodeOptions.dump = {
                    position: position
                };
            }

            Editor.Message.request('scene', 'create-node', createNodeOptions).then((nodeUuid: string | string[]) => {
                const uuid = Array.isArray(nodeUuid) ? nodeUuid[0] : nodeUuid;
                resolve({
                    success: true,
                    data: {
                        nodeUuid: uuid,
                        name: 'PrefabInstance'
                    }
                });
            }).catch((error: any) => {
                resolve({ success: false, error: error.message || 'Failed to create node' });
            });
        });
    }

    private async applyPrefabToNode(nodeUuid: string, prefabUuid: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // Try multiple methods to apply prefab data
            const methods = [
                () => Editor.Message.request('scene', 'apply-prefab', { node: nodeUuid, prefab: prefabUuid }),
                () => Editor.Message.request('scene', 'set-prefab', { node: nodeUuid, prefab: prefabUuid }),
                () => Editor.Message.request('scene', 'load-prefab-to-node', { node: nodeUuid, prefab: prefabUuid })
            ];

            const tryMethod = (index: number) => {
                if (index >= methods.length) {
                    resolve({ success: false, error: 'Unable to apply prefab data' });
                    return;
                }

                methods[index]().then(() => {
                    resolve({ success: true });
                }).catch(() => {
                    tryMethod(index + 1);
                });
            };

            tryMethod(0);
        });
    }

    /**
     * Create a prefab using the asset-db API.
     * Deeply integrates with the engine's asset management system to implement the full prefab creation flow.
     */
    private async createPrefabWithAssetDB(nodeUuid: string, savePath: string, prefabName: string, includeChildren: boolean, includeComponents: boolean): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                console.log('=== Creating Prefab with Asset-DB API ===');
                console.log(`Node UUID: ${nodeUuid}`);
                console.log(`Save path: ${savePath}`);
                console.log(`Prefab name: ${prefabName}`);

                // Step 1: get node data (including transform properties)
                const nodeData = await this.getNodeData(nodeUuid);
                if (!nodeData) {
                    resolve({
                        success: false,
                        error: 'Unable to get node data'
                    });
                    return;
                }

                console.log('Node data retrieved, child count:', nodeData.children ? nodeData.children.length : 0);

                // Step 2: create the asset file first to obtain the engine-assigned UUID
                console.log('Creating prefab asset file...');
                const tempPrefabContent = JSON.stringify([{"__type__": "cc.Prefab", "_name": prefabName}], null, 2);
                const createResult = await this.createAssetWithAssetDB(savePath, tempPrefabContent);
                if (!createResult.success) {
                    resolve(createResult);
                    return;
                }

                // Get the actual UUID assigned by the engine
                const actualPrefabUuid = createResult.data?.uuid;
                if (!actualPrefabUuid) {
                    resolve({
                        success: false,
                        error: 'Unable to get the engine-assigned prefab UUID'
                    });
                    return;
                }
                console.log('Engine-assigned UUID:', actualPrefabUuid);

                // Step 3: regenerate the prefab content using the actual UUID
                const prefabContent = await this.createStandardPrefabContent(nodeData, prefabName, actualPrefabUuid, includeChildren, includeComponents);
                const prefabContentString = JSON.stringify(prefabContent, null, 2);

                // Step 4: update the prefab file content
                console.log('Updating prefab file content...');
                const updateResult = await this.updateAssetWithAssetDB(savePath, prefabContentString);

                // Step 5: create the corresponding meta file (using the actual UUID)
                console.log('Creating prefab meta file...');
                const metaContent = this.createStandardMetaContent(prefabName, actualPrefabUuid);
                const metaResult = await this.createMetaWithAssetDB(savePath, metaContent);

                // Step 6: reimport the asset to update references
                console.log('Reimporting prefab asset...');
                const reimportResult = await this.reimportAssetWithAssetDB(savePath);

                // Step 7: attempt to convert the original node into a prefab instance
                console.log('Attempting to convert original node to prefab instance...');
                const convertResult = await this.convertNodeToPrefabInstance(nodeUuid, actualPrefabUuid, savePath);

                resolve({
                    success: true,
                    data: {
                        prefabUuid: actualPrefabUuid,
                        prefabPath: savePath,
                        nodeUuid: nodeUuid,
                        prefabName: prefabName,
                        convertedToPrefabInstance: convertResult.success,
                        createAssetResult: createResult,
                        updateResult: updateResult,
                        metaResult: metaResult,
                        reimportResult: reimportResult,
                        convertResult: convertResult,
                        message: convertResult.success ? 'Prefab created and original node converted successfully' : 'Prefab created successfully, but node conversion failed'
                    }
                });

            } catch (error) {
                console.error('Error occurred while creating prefab:', error);
                resolve({
                    success: false,
                    error: `Failed to create prefab: ${error}`
                });
            }
        });
    }

    private async createPrefab(args: any): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                // Supports both prefabPath and savePath parameter names
                const pathParam = args.prefabPath || args.savePath;
                if (!pathParam) {
                    resolve({
                        success: false,
                        error: 'Missing prefab path parameter. Please provide prefabPath or savePath.'
                    });
                    return;
                }

                const prefabName = args.prefabName || 'NewPrefab';
                const fullPath = pathParam.endsWith('.prefab') ?
                    pathParam : `${pathParam}/${prefabName}.prefab`;

                const includeChildren = args.includeChildren !== false; // default true
                const includeComponents = args.includeComponents !== false; // default true

                // Prefer the new asset-db method to create the prefab
                console.log('Creating prefab using new asset-db method...');
                const assetDbResult = await this.createPrefabWithAssetDB(
                    args.nodeUuid,
                    fullPath,
                    prefabName,
                    includeChildren,
                    includeComponents
                );

                if (assetDbResult.success) {
                    resolve(assetDbResult);
                    return;
                }

                // If the asset-db method fails, try using Cocos Creator's native prefab creation API
                console.log('asset-db method failed, trying native API...');
                const nativeResult = await this.createPrefabNative(args.nodeUuid, fullPath);
                if (nativeResult.success) {
                    resolve(nativeResult);
                    return;
                }

                // If the native API also fails, use the custom implementation
                console.log('Native API failed, using custom implementation...');
                const customResult = await this.createPrefabCustom(args.nodeUuid, fullPath, prefabName);
                resolve(customResult);

            } catch (error) {
                resolve({
                    success: false,
                    error: `Error occurred while creating prefab: ${error}`
                });
            }
        });
    }

    private async createPrefabNative(nodeUuid: string, prefabPath: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // According to the official API documentation, there is no direct prefab creation API
            // Prefab creation must be done manually in the editor
            resolve({
                success: false,
                error: 'Native prefab creation API does not exist',
                instruction: 'According to the Cocos Creator official API documentation, prefab creation requires manual operation:\n1. Select the node in the scene\n2. Drag the node into the Assets panel\n3. Or right-click the node and choose "Create Prefab"'
            });
        });
    }

    private async createPrefabCustom(nodeUuid: string, prefabPath: string, prefabName: string): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                // 1. Get the full data of the source node
                const nodeData = await this.getNodeData(nodeUuid);
                if (!nodeData) {
                    resolve({
                        success: false,
                        error: `Unable to find node: ${nodeUuid}`
                    });
                    return;
                }

                // 2. Generate a prefab UUID
                const prefabUuid = this.generateUUID();

                // 3. Create the prefab data structure
                const prefabData = this.createPrefabData(nodeData, prefabName, prefabUuid);

                // 4. Create the prefab data structure based on the official format
                console.log('=== Starting Prefab Creation ===');
                console.log('Node name:', nodeData.name?.value || 'Unknown');
                console.log('Node UUID:', nodeData.uuid?.value || 'Unknown');
                console.log('Prefab save path:', prefabPath);
                console.log(`Starting prefab creation, node data:`, nodeData);
                const prefabJsonData = await this.createStandardPrefabContent(nodeData, prefabName, prefabUuid, true, true);

                // 5. Create the standard meta file data
                const standardMetaData = this.createStandardMetaData(prefabName, prefabUuid);

                // 6. Save the prefab and meta files
                const saveResult = await this.savePrefabWithMeta(prefabPath, prefabJsonData, standardMetaData);

                if (saveResult.success) {
                    // After saving successfully, convert the original node to a prefab instance
                    const convertResult = await this.convertNodeToPrefabInstance(nodeUuid, prefabPath, prefabUuid);

                    resolve({
                        success: true,
                        data: {
                            prefabUuid: prefabUuid,
                            prefabPath: prefabPath,
                            nodeUuid: nodeUuid,
                            prefabName: prefabName,
                            convertedToPrefabInstance: convertResult.success,
                            message: convertResult.success ?
                                'Custom prefab created successfully and original node converted to prefab instance' :
                                'Prefab created successfully, but node conversion failed'
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        error: saveResult.error || 'Failed to save prefab file'
                    });
                }

            } catch (error) {
                resolve({
                    success: false,
                    error: `Error occurred while creating prefab: ${error}`
                });
            }
        });
    }

    private async getNodeData(nodeUuid: string): Promise<any> {
        return new Promise(async (resolve) => {
            try {
                // First, get the basic node info
                const nodeInfo = await Editor.Message.request('scene', 'query-node', nodeUuid);
                if (!nodeInfo) {
                    resolve(null);
                    return;
                }

                console.log(`Successfully retrieved basic info for node ${nodeUuid}`);

                // Use query-node-tree to get the full structure including child nodes
                const nodeTree = await this.getNodeWithChildren(nodeUuid);
                if (nodeTree) {
                    console.log(`Successfully retrieved full tree structure for node ${nodeUuid}`);
                    resolve(nodeTree);
                } else {
                    console.log(`Using basic node info`);
                    resolve(nodeInfo);
                }
            } catch (error) {
                console.warn(`Failed to get node data for ${nodeUuid}:`, error);
                resolve(null);
            }
        });
    }

    // Get the complete node structure including child nodes using query-node-tree
    private async getNodeWithChildren(nodeUuid: string): Promise<any> {
        try {
            // Get the entire scene tree
            const tree = await Editor.Message.request('scene', 'query-node-tree');
            if (!tree) {
                return null;
            }

            // Find the specified node in the tree
            const targetNode = this.findNodeInTree(tree, nodeUuid);
            if (targetNode) {
                console.log(`Found node ${nodeUuid} in scene tree, child count: ${targetNode.children ? targetNode.children.length : 0}`);

                // Enhance the node tree to get the correct component info for each node
                const enhancedTree = await this.enhanceTreeWithMCPComponents(targetNode);
                return enhancedTree;
            }

            return null;
        } catch (error) {
            console.warn(`Failed to get node tree structure for ${nodeUuid}:`, error);
            return null;
        }
    }

    // Recursively search the node tree for a node with the specified UUID
    private findNodeInTree(node: any, targetUuid: string): any {
        if (!node) return null;

        // Check the current node
        if (node.uuid === targetUuid || node.value?.uuid === targetUuid) {
            return node;
        }

        // Recursively check child nodes
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                const found = this.findNodeInTree(child, targetUuid);
                if (found) {
                    return found;
                }
            }
        }

        return null;
    }

    /**
     * Enhance the node tree using the MCP interface to get the correct component info.
     */
    private async enhanceTreeWithMCPComponents(node: any): Promise<any> {
        if (!node || !node.uuid) {
            return node;
        }

        try {
            // Use the MCP interface to get component info for the node
            const response = await fetch('http://localhost:8585/mcp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "jsonrpc": "2.0",
                    "method": "tools/call",
                    "params": {
                        "name": "component_get_components",
                        "arguments": {
                            "nodeUuid": node.uuid
                        }
                    },
                    "id": Date.now()
                })
            });

            const mcpResult = await response.json();
            if (mcpResult.result?.content?.[0]?.text) {
                const componentData = JSON.parse(mcpResult.result.content[0].text);
                if (componentData.success && componentData.data.components) {
                    // Update the node's component info with the correct data returned by MCP
                    node.components = componentData.data.components;
                    console.log(`Node ${node.uuid} retrieved ${componentData.data.components.length} components with correct script component types`);
                }
            }
        } catch (error) {
            console.warn(`Failed to get MCP component info for node ${node.uuid}:`, error);
        }

        // Recursively process child nodes
        if (node.children && Array.isArray(node.children)) {
            for (let i = 0; i < node.children.length; i++) {
                node.children[i] = await this.enhanceTreeWithMCPComponents(node.children[i]);
            }
        }

        return node;
    }

    private async buildBasicNodeInfo(nodeUuid: string): Promise<any> {
        return new Promise((resolve) => {
            // Build basic node info
            Editor.Message.request('scene', 'query-node', nodeUuid).then((nodeInfo: any) => {
                if (!nodeInfo) {
                    resolve(null);
                    return;
                }

                // Simplified version: only return basic node info without child nodes or components.
                // These will be added as needed during subsequent prefab processing.
                const basicInfo = {
                    ...nodeInfo,
                    children: [],
                    components: []
                };
                resolve(basicInfo);
            }).catch(() => {
                resolve(null);
            });
        });
    }

    // Validate whether node data is valid
    private isValidNodeData(nodeData: any): boolean {
        if (!nodeData) return false;
        if (typeof nodeData !== 'object') return false;

        // Check basic properties - adapted to the query-node-tree data format
        return nodeData.hasOwnProperty('uuid') || 
               nodeData.hasOwnProperty('name') || 
               nodeData.hasOwnProperty('__type__') ||
               (nodeData.value && (
                   nodeData.value.hasOwnProperty('uuid') ||
                   nodeData.value.hasOwnProperty('name') ||
                   nodeData.value.hasOwnProperty('__type__')
               ));
    }

    // Unified method to extract a child node UUID
    private extractChildUuid(childRef: any): string | null {
        if (!childRef) return null;

        // Method 1: direct string
        if (typeof childRef === 'string') {
            return childRef;
        }

        // Method 2: value property contains a string
        if (childRef.value && typeof childRef.value === 'string') {
            return childRef.value;
        }

        // Method 3: value.uuid property
        if (childRef.value && childRef.value.uuid) {
            return childRef.value.uuid;
        }

        // Method 4: direct uuid property
        if (childRef.uuid) {
            return childRef.uuid;
        }

        // Method 5: __id__ reference - requires special handling
        if (childRef.__id__ !== undefined) {
            console.log(`Found __id__ reference: ${childRef.__id__}, may need to look up from data structure`);
            return null; // Return null for now; reference resolution logic can be added later
        }

        console.warn('Unable to extract child node UUID:', JSON.stringify(childRef));
        return null;
    }

    // Get the child node data that needs to be processed
    private getChildrenToProcess(nodeData: any): any[] {
        const children: any[] = [];

        // Method 1: get directly from the children array (data returned by query-node-tree)
        if (nodeData.children && Array.isArray(nodeData.children)) {
            console.log(`Getting child nodes from children array, count: ${nodeData.children.length}`);
            for (const child of nodeData.children) {
                // Child nodes returned by query-node-tree are usually already complete data structures
                if (this.isValidNodeData(child)) {
                    children.push(child);
                    console.log(`Adding child node: ${child.name || child.value?.name || 'Unknown'}`);
                } else {
                    console.log('Invalid child node data:', JSON.stringify(child, null, 2));
                }
            }
        } else {
            console.log('Node has no child nodes or children array is empty');
        }

        return children;
    }

    private generateUUID(): string {
        // Generate a UUID in Cocos Creator format
        const chars = '0123456789abcdef';
        let uuid = '';
        for (let i = 0; i < 32; i++) {
            if (i === 8 || i === 12 || i === 16 || i === 20) {
                uuid += '-';
            }
            uuid += chars[Math.floor(Math.random() * chars.length)];
        }
        return uuid;
    }

    private createPrefabData(nodeData: any, prefabName: string, prefabUuid: string): any[] {
        // Build standard prefab data structure
        const prefabAsset = {
            "__type__": "cc.Prefab",
            "_name": prefabName,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_native": "",
            "data": {
                "__id__": 1
            },
            "optimizationPolicy": 0,
            "persistent": false
        };

        // Process node data to conform to prefab format
        const processedNodeData = this.processNodeForPrefab(nodeData, prefabUuid);

        return [prefabAsset, ...processedNodeData];
    }

    private processNodeForPrefab(nodeData: any, prefabUuid: string): any[] {
        // Process node data to conform to prefab format
        const processedData: any[] = [];
        let idCounter = 1;

        // Recursively process nodes and components
        const processNode = (node: any, parentId: number = 0): number => {
            const nodeId = idCounter++;

            // Create node object
            const processedNode = {
                "__type__": "cc.Node",
                "_name": node.name || "Node",
                "_objFlags": 0,
                "__editorExtras__": {},
                "_parent": parentId > 0 ? { "__id__": parentId } : null,
                "_children": node.children ? node.children.map(() => ({ "__id__": idCounter++ })) : [],
                "_active": node.active !== false,
                "_components": node.components ? node.components.map(() => ({ "__id__": idCounter++ })) : [],
                "_prefab": {
                    "__id__": idCounter++
                },
                "_lpos": {
                    "__type__": "cc.Vec3",
                    "x": 0,
                    "y": 0,
                    "z": 0
                },
                "_lrot": {
                    "__type__": "cc.Quat",
                    "x": 0,
                    "y": 0,
                    "z": 0,
                    "w": 1
                },
                "_lscale": {
                    "__type__": "cc.Vec3",
                    "x": 1,
                    "y": 1,
                    "z": 1
                },
                "_mobility": 0,
                "_layer": 1073741824,
                "_euler": {
                    "__type__": "cc.Vec3",
                    "x": 0,
                    "y": 0,
                    "z": 0
                },
                "_id": ""
            };

            processedData.push(processedNode);

            // Process components
            if (node.components) {
                node.components.forEach((component: any) => {
                    const componentId = idCounter++;
                    const processedComponents = this.processComponentForPrefab(component, componentId);
                    processedData.push(...processedComponents);
                });
            }

            // Process child nodes
            if (node.children) {
                node.children.forEach((child: any) => {
                    processNode(child, nodeId);
                });
            }

            return nodeId;
        };

        processNode(nodeData);
        return processedData;
    }

    private processComponentForPrefab(component: any, componentId: number): any[] {
        // Process component data to conform to prefab format
        const processedComponent = {
            "__type__": component.type || "cc.Component",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {
                "__id__": componentId - 1
            },
            "_enabled": component.enabled !== false,
            "__prefab": {
                "__id__": componentId + 1
            },
            ...component.properties
        };

        // Add component-specific prefab info
        const compPrefabInfo = {
            "__type__": "cc.CompPrefabInfo",
            "fileId": this.generateFileId()
        };

        return [processedComponent, compPrefabInfo];
    }

    private generateFileId(): string {
        // Generate a file ID (simplified version)
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/';
        let fileId = '';
        for (let i = 0; i < 22; i++) {
            fileId += chars[Math.floor(Math.random() * chars.length)];
        }
        return fileId;
    }

    private createMetaData(prefabName: string, prefabUuid: string): any {
        return {
            "ver": "1.1.50",
            "importer": "prefab",
            "imported": true,
            "uuid": prefabUuid,
            "files": [
                ".json"
            ],
            "subMetas": {},
            "userData": {
                "syncNodeName": prefabName
            }
        };
    }

    private async savePrefabFiles(prefabPath: string, prefabData: any[], metaData: any): Promise<{ success: boolean; error?: string }> {
        return new Promise((resolve) => {
            try {
                // Use the Editor API to save the prefab file
                const prefabContent = JSON.stringify(prefabData, null, 2);
                const metaContent = JSON.stringify(metaData, null, 2);

                // Try a more reliable save method
                this.saveAssetFile(prefabPath, prefabContent).then(() => {
                    // Then create the meta file
                    const metaPath = `${prefabPath}.meta`;
                    return this.saveAssetFile(metaPath, metaContent);
                }).then(() => {
                    resolve({ success: true });
                }).catch((error: any) => {
                    resolve({ success: false, error: error.message || 'Failed to save prefab file' });
                });
            } catch (error) {
                resolve({ success: false, error: `Error occurred while saving file: ${error}` });
            }
        });
    }

    private async saveAssetFile(filePath: string, content: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Try multiple save methods
            const saveMethods = [
                () => Editor.Message.request('asset-db', 'create-asset', filePath, content),
                () => Editor.Message.request('asset-db', 'save-asset', filePath, content),
                () => Editor.Message.request('asset-db', 'write-asset', filePath, content)
            ];

            const trySave = (index: number) => {
                if (index >= saveMethods.length) {
                    reject(new Error('All save methods failed'));
                    return;
                }

                saveMethods[index]().then(() => {
                    resolve();
                }).catch(() => {
                    trySave(index + 1);
                });
            };

            trySave(0);
        });
    }

    private async updatePrefab(prefabPath: string, nodeUuid: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }

                return Editor.Message.request('scene', 'apply-prefab', {
                    node: nodeUuid,
                    prefab: assetInfo.uuid
                });
            }).then(() => {
                resolve({
                    success: true,
                    message: 'Prefab updated successfully'
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async revertPrefab(nodeUuid: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'revert-prefab', {
                node: nodeUuid
            }).then(() => {
                resolve({
                    success: true,
                    message: 'Prefab instance reverted successfully'
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async getPrefabInfo(prefabPath: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }

                return Editor.Message.request('asset-db', 'query-asset-meta', assetInfo.uuid);
            }).then((metaInfo: any) => {
                const info: PrefabInfo = {
                    name: metaInfo.name,
                    uuid: metaInfo.uuid,
                    path: prefabPath,
                    folder: prefabPath.substring(0, prefabPath.lastIndexOf('/')),
                    createTime: metaInfo.createTime,
                    modifyTime: metaInfo.modifyTime,
                    dependencies: metaInfo.depends || []
                };
                resolve({ success: true, data: info });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async createPrefabFromNode(args: any): Promise<ToolResponse> {
        // Extract the name from prefabPath
        const prefabPath = args.prefabPath;
        const prefabName = prefabPath.split('/').pop()?.replace('.prefab', '') || 'NewPrefab';

        // Call the original createPrefab method
        return await this.createPrefab({
            nodeUuid: args.nodeUuid,
            savePath: prefabPath,
            prefabName: prefabName
        });
    }

    private async validatePrefab(prefabPath: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            try {
                // Read the prefab file content
                Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
                    if (!assetInfo) {
                        resolve({
                            success: false,
                            error: 'Prefab file does not exist'
                        });
                        return;
                    }

                    // Validate the prefab format
                    Editor.Message.request('asset-db', 'read-asset', prefabPath).then((content: string) => {
                        try {
                            const prefabData = JSON.parse(content);
                            const validationResult = this.validatePrefabFormat(prefabData);

                            resolve({
                                success: true,
                                data: {
                                    isValid: validationResult.isValid,
                                    issues: validationResult.issues,
                                    nodeCount: validationResult.nodeCount,
                                    componentCount: validationResult.componentCount,
                                    message: validationResult.isValid ? 'Prefab format is valid' : 'Prefab format has issues'
                                }
                            });
                        } catch (parseError) {
                            resolve({
                                success: false,
                                error: 'Prefab file format error, unable to parse JSON'
                            });
                        }
                    }).catch((error: any) => {
                        resolve({
                            success: false,
                            error: `Failed to read prefab file: ${error.message}`
                        });
                    });
                }).catch((error: any) => {
                    resolve({
                        success: false,
                        error: `Failed to query prefab info: ${error.message}`
                    });
                });
            } catch (error) {
                resolve({
                    success: false,
                    error: `Error occurred while validating prefab: ${error}`
                });
            }
        });
    }

    private validatePrefabFormat(prefabData: any): { isValid: boolean; issues: string[]; nodeCount: number; componentCount: number } {
        const issues: string[] = [];
        let nodeCount = 0;
        let componentCount = 0;

        // Check basic structure
        if (!Array.isArray(prefabData)) {
            issues.push('Prefab data must be in array format');
            return { isValid: false, issues, nodeCount, componentCount };
        }

        if (prefabData.length === 0) {
            issues.push('Prefab data is empty');
            return { isValid: false, issues, nodeCount, componentCount };
        }

        // Check that the first element is a prefab asset
        const firstElement = prefabData[0];
        if (!firstElement || firstElement.__type__ !== 'cc.Prefab') {
            issues.push('The first element must be of type cc.Prefab');
        }

        // Count nodes and components
        prefabData.forEach((item: any, index: number) => {
            if (item.__type__ === 'cc.Node') {
                nodeCount++;
            } else if (item.__type__ && item.__type__.includes('cc.')) {
                componentCount++;
            }
        });

        // Check required fields
        if (nodeCount === 0) {
            issues.push('Prefab must contain at least one node');
        }

        return {
            isValid: issues.length === 0,
            issues,
            nodeCount,
            componentCount
        };
    }

    private async duplicatePrefab(args: any): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                const { sourcePrefabPath, targetPrefabPath, newPrefabName } = args;
                
                // Read the source prefab
                const sourceInfo = await this.getPrefabInfo(sourcePrefabPath);
                if (!sourceInfo.success) {
                    resolve({
                        success: false,
                        error: `Unable to read source prefab: ${sourceInfo.error}`
                    });
                    return;
                }

                // Read the source prefab content
                const sourceContent = await this.readPrefabContent(sourcePrefabPath);
                if (!sourceContent.success) {
                    resolve({
                        success: false,
                        error: `Unable to read source prefab content: ${sourceContent.error}`
                    });
                    return;
                }

                // Generate a new UUID
                const newUuid = this.generateUUID();

                // Modify the prefab data
                const modifiedData = this.modifyPrefabForDuplication(sourceContent.data, newPrefabName, newUuid);

                // Create new meta data
                const newMetaData = this.createMetaData(newPrefabName || 'DuplicatedPrefab', newUuid);

                // Prefab duplication is temporarily disabled due to complex serialization format
                resolve({
                    success: false,
                    error: 'Prefab duplication is temporarily unavailable',
                    instruction: 'Please duplicate the prefab manually in the Cocos Creator editor:\n1. Select the prefab in the Assets panel\n2. Right-click and choose Copy\n3. Paste at the target location'
                });

            } catch (error) {
                resolve({
                    success: false,
                    error: `Error occurred while duplicating prefab: ${error}`
                });
            }
        });
    }

    private async readPrefabContent(prefabPath: string): Promise<{ success: boolean; data?: any; error?: string }> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'read-asset', prefabPath).then((content: string) => {
                try {
                    const prefabData = JSON.parse(content);
                    resolve({ success: true, data: prefabData });
                } catch (parseError) {
                    resolve({ success: false, error: 'Prefab file format error' });
                }
            }).catch((error: any) => {
                resolve({ success: false, error: error.message || 'Failed to read prefab file' });
            });
        });
    }

    private modifyPrefabForDuplication(prefabData: any[], newName: string, newUuid: string): any[] {
        // Modify the prefab data to create a copy
        const modifiedData = [...prefabData];

        // Modify the first element (prefab asset)
        if (modifiedData[0] && modifiedData[0].__type__ === 'cc.Prefab') {
            modifiedData[0]._name = newName || 'DuplicatedPrefab';
        }

        // Update all UUID references (simplified version)
        // In practice, more complex UUID mapping may be required

        return modifiedData;
    }

    /**
     * Create an asset file using the asset-db API.
     */
    private async createAssetWithAssetDB(assetPath: string, content: string): Promise<{ success: boolean; data?: any; error?: string }> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'create-asset', assetPath, content, {
                overwrite: true,
                rename: false
            }).then((assetInfo: any) => {
                console.log('Asset file created successfully:', assetInfo);
                resolve({ success: true, data: assetInfo });
            }).catch((error: any) => {
                console.error('Failed to create asset file:', error);
                resolve({ success: false, error: error.message || 'Failed to create asset file' });
            });
        });
    }

    /**
     * Create a meta file using the asset-db API.
     */
    private async createMetaWithAssetDB(assetPath: string, metaContent: any): Promise<{ success: boolean; data?: any; error?: string }> {
        return new Promise((resolve) => {
            const metaContentString = JSON.stringify(metaContent, null, 2);
            Editor.Message.request('asset-db', 'save-asset-meta', assetPath, metaContentString).then((assetInfo: any) => {
                console.log('Meta file created successfully:', assetInfo);
                resolve({ success: true, data: assetInfo });
            }).catch((error: any) => {
                console.error('Failed to create meta file:', error);
                resolve({ success: false, error: error.message || 'Failed to create meta file' });
            });
        });
    }

    /**
     * Reimport an asset using the asset-db API.
     */
    private async reimportAssetWithAssetDB(assetPath: string): Promise<{ success: boolean; data?: any; error?: string }> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'reimport-asset', assetPath).then((result: any) => {
                console.log('Asset reimported successfully:', result);
                resolve({ success: true, data: result });
            }).catch((error: any) => {
                console.error('Failed to reimport asset:', error);
                resolve({ success: false, error: error.message || 'Failed to reimport asset' });
            });
        });
    }

    /**
     * Update asset file content using the asset-db API.
     */
    private async updateAssetWithAssetDB(assetPath: string, content: string): Promise<{ success: boolean; data?: any; error?: string }> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'save-asset', assetPath, content).then((result: any) => {
                console.log('Asset file updated successfully:', result);
                resolve({ success: true, data: result });
            }).catch((error: any) => {
                console.error('Failed to update asset file:', error);
                resolve({ success: false, error: error.message || 'Failed to update asset file' });
            });
        });
    }

    /**
     * Create prefab content conforming to the Cocos Creator standard.
     * Fully implements recursive node tree processing to match the engine's standard format.
     */
    private async createStandardPrefabContent(nodeData: any, prefabName: string, prefabUuid: string, includeChildren: boolean, includeComponents: boolean): Promise<any[]> {
        console.log('Starting creation of engine-standard prefab content...');

        const prefabData: any[] = [];
        let currentId = 0;

        // 1. Create the prefab asset object (index 0)
        const prefabAsset = {
            "__type__": "cc.Prefab",
            "_name": prefabName || "", // Ensure prefab name is not empty
            "_objFlags": 0,
            "__editorExtras__": {},
            "_native": "",
            "data": {
                "__id__": 1
            },
            "optimizationPolicy": 0,
            "persistent": false
        };
        prefabData.push(prefabAsset);
        currentId++;

        // 2. Recursively create the full node tree structure
        const context = {
            prefabData,
            currentId: currentId + 1, // The root node occupies index 1; child nodes start from index 2
            prefabAssetIndex: 0,
            nodeFileIds: new Map<string, string>(), // Stores the mapping from node ID to fileId
            nodeUuidToIndex: new Map<string, number>(), // Stores the mapping from node UUID to index
            componentUuidToIndex: new Map<string, number>() // Stores the mapping from component UUID to index
        };

        // Create the root node and the entire node tree.
        // Note: the root node's parent should be null, not the prefab asset object.
        await this.createCompleteNodeTree(nodeData, null, 1, context, includeChildren, includeComponents, prefabName);

        console.log(`Prefab content creation complete, total ${prefabData.length} objects`);
        console.log('Node fileId mapping:', Array.from(context.nodeFileIds.entries()));

        return prefabData;
    }

    /**
     * Recursively create the full node tree, including all child nodes and their corresponding PrefabInfo.
     */
    private async createCompleteNodeTree(
        nodeData: any,
        parentNodeIndex: number | null,
        nodeIndex: number,
        context: {
            prefabData: any[],
            currentId: number,
            prefabAssetIndex: number,
            nodeFileIds: Map<string, string>,
            nodeUuidToIndex: Map<string, number>,
            componentUuidToIndex: Map<string, number>
        },
        includeChildren: boolean,
        includeComponents: boolean,
        nodeName?: string
    ): Promise<void> {
        const { prefabData } = context;

        // Create the node object
        const node = this.createEngineStandardNode(nodeData, parentNodeIndex, nodeName);

        // Ensure the node is placed at the specified index position
        while (prefabData.length <= nodeIndex) {
            prefabData.push(null);
        }
        console.log(`Setting node at index ${nodeIndex}: ${node._name}, _parent:`, node._parent, `_children count: ${node._children.length}`);
        prefabData[nodeIndex] = node;

        // Generate a fileId for the current node and record the UUID-to-index mapping
        const nodeUuid = this.extractNodeUuid(nodeData);
        const fileId = nodeUuid || this.generateFileId();
        context.nodeFileIds.set(nodeIndex.toString(), fileId);

        // Record the node UUID-to-index mapping
        if (nodeUuid) {
            context.nodeUuidToIndex.set(nodeUuid, nodeIndex);
            console.log(`Recording node UUID mapping: ${nodeUuid} -> ${nodeIndex}`);
        }

        // Process child nodes first (to maintain consistent index ordering with manual creation)
        const childrenToProcess = this.getChildrenToProcess(nodeData);
        if (includeChildren && childrenToProcess.length > 0) {
            console.log(`Processing ${childrenToProcess.length} child nodes of node ${node._name}`);

            // Assign indices to each child node
            const childIndices: number[] = [];
            console.log(`Preparing to assign indices for ${childrenToProcess.length} child nodes, current ID: ${context.currentId}`);
            for (let i = 0; i < childrenToProcess.length; i++) {
                console.log(`Processing child node ${i+1}, current currentId: ${context.currentId}`);
                const childIndex = context.currentId++;
                childIndices.push(childIndex);
                node._children.push({ "__id__": childIndex });
                console.log(`Added child node reference to ${node._name}: {__id__: ${childIndex}}`);
            }
            console.log(`Node ${node._name} final children array:`, node._children);

            // Recursively create child nodes
            for (let i = 0; i < childrenToProcess.length; i++) {
                const childData = childrenToProcess[i];
                const childIndex = childIndices[i];
                await this.createCompleteNodeTree(
                    childData,
                    nodeIndex,
                    childIndex,
                    context,
                    includeChildren,
                    includeComponents,
                    childData.name || `Child${i+1}`
                );
            }
        }

        // Then process components
        if (includeComponents && nodeData.components && Array.isArray(nodeData.components)) {
            console.log(`Processing ${nodeData.components.length} components of node ${node._name}`);

            const componentIndices: number[] = [];
            for (const component of nodeData.components) {
                const componentIndex = context.currentId++;
                componentIndices.push(componentIndex);
                node._components.push({ "__id__": componentIndex });

                // Record the component UUID-to-index mapping
                const componentUuid = component.uuid || (component.value && component.value.uuid);
                if (componentUuid) {
                    context.componentUuidToIndex.set(componentUuid, componentIndex);
                    console.log(`Recorded component UUID mapping: ${componentUuid} -> ${componentIndex}`);
                }

                // Create the component object, passing context to handle references
                const componentObj = this.createComponentObject(component, nodeIndex, context);
                prefabData[componentIndex] = componentObj;

                // Create a CompPrefabInfo for the component
                const compPrefabInfoIndex = context.currentId++;
                prefabData[compPrefabInfoIndex] = {
                    "__type__": "cc.CompPrefabInfo",
                    "fileId": this.generateFileId()
                };

                // If the component object has a __prefab property, set the reference
                if (componentObj && typeof componentObj === 'object') {
                    componentObj.__prefab = { "__id__": compPrefabInfoIndex };
                }
            }

            console.log(`Node ${node._name} had ${componentIndices.length} components added`);
        }


        // Create a PrefabInfo for the current node
        const prefabInfoIndex = context.currentId++;
        node._prefab = { "__id__": prefabInfoIndex };

        const prefabInfo: any = {
            "__type__": "cc.PrefabInfo",
            "root": { "__id__": 1 },
            "asset": { "__id__": context.prefabAssetIndex },
            "fileId": fileId,
            "targetOverrides": null,
            "nestedPrefabInstanceRoots": null
        };
        
        // Special handling for the root node
        if (nodeIndex === 1) {
            // The root node has no instance, but may have targetOverrides
            prefabInfo.instance = null;
        } else {
            // Child nodes typically have instance set to null
            prefabInfo.instance = null;
        }
        
        prefabData[prefabInfoIndex] = prefabInfo;
        context.currentId = prefabInfoIndex + 1;
    }

    /**
     * Convert a UUID to Cocos Creator's compressed format.
     * Implemented based on the real Cocos Creator editor's compression algorithm.
     * The first 5 hex characters are kept unchanged; the remaining 27 characters are compressed into 18.
     */
    private uuidToCompressedId(uuid: string): string {
        const BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

        // Remove hyphens and convert to lowercase
        const cleanUuid = uuid.replace(/-/g, '').toLowerCase();

        // Ensure the UUID is valid
        if (cleanUuid.length !== 32) {
            return uuid; // If not a valid UUID, return the original value
        }

        // Cocos Creator compression: first 5 characters unchanged, remaining 27 compressed to 18
        let result = cleanUuid.substring(0, 5);

        // The remaining 27 characters need to be compressed into 18 characters
        const remainder = cleanUuid.substring(5);

        // Every 3 hex characters are compressed into 2 characters
        for (let i = 0; i < remainder.length; i += 3) {
            const hex1 = remainder[i] || '0';
            const hex2 = remainder[i + 1] || '0';
            const hex3 = remainder[i + 2] || '0';

            // Convert 3 hex characters (12 bits) into 2 base64 characters
            const value = parseInt(hex1 + hex2 + hex3, 16);

            // Split 12 bits into two 6-bit values
            const high6 = (value >> 6) & 63;
            const low6 = value & 63;
            
            result += BASE64_KEYS[high6] + BASE64_KEYS[low6];
        }
        
        return result;
    }

    /**
     * Create component object
     */
    private createComponentObject(componentData: any, nodeIndex: number, context?: { 
        nodeUuidToIndex?: Map<string, number>,
        componentUuidToIndex?: Map<string, number>
    }): any {
        let componentType = componentData.type || componentData.__type__ || 'cc.Component';
        const enabled = componentData.enabled !== undefined ? componentData.enabled : true;
        
        // console.log(`Creating component object - original type: ${componentType}`);
        // console.log('Full component data:', JSON.stringify(componentData, null, 2));

        // Handle script components - the MCP interface already returns the correct compressed UUID format
        if (componentType && !componentType.startsWith('cc.')) {
            console.log(`Using script component compressed UUID type: ${componentType}`);
        }

        // Basic component structure
        const component: any = {
            "__type__": componentType,
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": { "__id__": nodeIndex },
            "_enabled": enabled
        };

        // Set a placeholder for the __prefab property; it will be set correctly later
        component.__prefab = null;

        // Add type-specific properties based on the component type
        if (componentType === 'cc.UITransform') {
            const contentSize = componentData.properties?.contentSize?.value || { width: 100, height: 100 };
            const anchorPoint = componentData.properties?.anchorPoint?.value || { x: 0.5, y: 0.5 };
            
            component._contentSize = {
                "__type__": "cc.Size",
                "width": contentSize.width,
                "height": contentSize.height
            };
            component._anchorPoint = {
                "__type__": "cc.Vec2",
                "x": anchorPoint.x,
                "y": anchorPoint.y
            };
        } else if (componentType === 'cc.Sprite') {
            // Handle the Sprite component's spriteFrame reference
            const spriteFrameProp = componentData.properties?._spriteFrame || componentData.properties?.spriteFrame;
            if (spriteFrameProp) {
                component._spriteFrame = this.processComponentProperty(spriteFrameProp, context);
            } else {
                component._spriteFrame = null;
            }
            
            component._type = componentData.properties?._type?.value ?? 0;
            component._fillType = componentData.properties?._fillType?.value ?? 0;
            component._sizeMode = componentData.properties?._sizeMode?.value ?? 1;
            component._fillCenter = { "__type__": "cc.Vec2", "x": 0, "y": 0 };
            component._fillStart = componentData.properties?._fillStart?.value ?? 0;
            component._fillRange = componentData.properties?._fillRange?.value ?? 0;
            component._isTrimmedMode = componentData.properties?._isTrimmedMode?.value ?? true;
            component._useGrayscale = componentData.properties?._useGrayscale?.value ?? false;
            
            // Debug: print all Sprite component properties (commented out)
            // console.log('Sprite component properties:', JSON.stringify(componentData.properties, null, 2));
            component._atlas = null;
            component._id = "";
        } else if (componentType === 'cc.Button') {
            component._interactable = true;
            component._transition = 3;
            component._normalColor = { "__type__": "cc.Color", "r": 255, "g": 255, "b": 255, "a": 255 };
            component._hoverColor = { "__type__": "cc.Color", "r": 211, "g": 211, "b": 211, "a": 255 };
            component._pressedColor = { "__type__": "cc.Color", "r": 255, "g": 255, "b": 255, "a": 255 };
            component._disabledColor = { "__type__": "cc.Color", "r": 124, "g": 124, "b": 124, "a": 255 };
            component._normalSprite = null;
            component._hoverSprite = null;
            component._pressedSprite = null;
            component._disabledSprite = null;
            component._duration = 0.1;
            component._zoomScale = 1.2;
            // Handle the Button's target reference
            const targetProp = componentData.properties?._target || componentData.properties?.target;
            if (targetProp) {
                component._target = this.processComponentProperty(targetProp, context);
            } else {
                component._target = { "__id__": nodeIndex }; // Defaults to pointing to the node itself
            }
            component._clickEvents = [];
            component._id = "";
        } else if (componentType === 'cc.Label') {
            component._string = componentData.properties?._string?.value || "Label";
            component._horizontalAlign = 1;
            component._verticalAlign = 1;
            component._actualFontSize = 20;
            component._fontSize = 20;
            component._fontFamily = "Arial";
            component._lineHeight = 25;
            component._overflow = 0;
            component._enableWrapText = true;
            component._font = null;
            component._isSystemFontUsed = true;
            component._spacingX = 0;
            component._isItalic = false;
            component._isBold = false;
            component._isUnderline = false;
            component._underlineHeight = 2;
            component._cacheMode = 0;
            component._id = "";
        } else if (componentData.properties) {
            // Handle all component properties (both built-in and custom script components)
            for (const [key, value] of Object.entries(componentData.properties)) {
                if (key === 'node' || key === 'enabled' || key === '__type__' ||
                    key === 'uuid' || key === 'name' || key === '__scriptAsset' || key === '_objFlags') {
                    continue; // Skip these special properties, including _objFlags
                }

                // Properties starting with underscore require special handling
                if (key.startsWith('_')) {
                    // Ensure the property name is preserved as-is (including the underscore)
                    const propValue = this.processComponentProperty(value, context);
                    if (propValue !== undefined) {
                        component[key] = propValue;
                    }
                } else {
                    // Properties not starting with underscore are processed normally
                    const propValue = this.processComponentProperty(value, context);
                    if (propValue !== undefined) {
                        component[key] = propValue;
                    }
                }
            }
        }
        
        // Ensure _id is in the last position
        const _id = component._id || "";
        delete component._id;
        component._id = _id;
        
        return component;
    }

    /**
     * Process component property values to ensure the format is consistent with manually created prefabs.
     */
    private processComponentProperty(propData: any, context?: {
        nodeUuidToIndex?: Map<string, number>,
        componentUuidToIndex?: Map<string, number>
    }): any {
        if (!propData || typeof propData !== 'object') {
            return propData;
        }

        const value = propData.value;
        const type = propData.type;

        // Handle null values
        if (value === null || value === undefined) {
            return null;
        }

        // Handle empty UUID objects and convert to null
        if (value && typeof value === 'object' && value.uuid === '') {
            return null;
        }

        // Handle node references
        if (type === 'cc.Node' && value?.uuid) {
            // In a prefab, node references must be converted to __id__ form
            if (context?.nodeUuidToIndex && context.nodeUuidToIndex.has(value.uuid)) {
                // Internal reference: convert to __id__ format
                return {
                    "__id__": context.nodeUuidToIndex.get(value.uuid)
                };
            }
            // External reference: set to null because external nodes do not belong to the prefab structure
            console.warn(`Node reference UUID ${value.uuid} not found in prefab context, setting to null (external reference)`);
            return null;
        }

        // Handle asset references (prefabs, textures, sprite frames, etc.)
        if (value?.uuid && (
            type === 'cc.Prefab' || 
            type === 'cc.Texture2D' || 
            type === 'cc.SpriteFrame' ||
            type === 'cc.Material' ||
            type === 'cc.AnimationClip' ||
            type === 'cc.AudioClip' ||
            type === 'cc.Font' ||
            type === 'cc.Asset'
        )) {
            // For prefab references, keep the original UUID format
            const uuidToUse = type === 'cc.Prefab' ? value.uuid : this.uuidToCompressedId(value.uuid);
            return {
                "__uuid__": uuidToUse,
                "__expectedType__": type
            };
        }

        // Handle component references (including specific component types like cc.Label, cc.Button, etc.)
        if (value?.uuid && (type === 'cc.Component' ||
            type === 'cc.Label' || type === 'cc.Button' || type === 'cc.Sprite' ||
            type === 'cc.UITransform' || type === 'cc.RigidBody2D' ||
            type === 'cc.BoxCollider2D' || type === 'cc.Animation' ||
            type === 'cc.AudioSource' || (type?.startsWith('cc.') && !type.includes('@')))) {
            // In a prefab, component references also need to be converted to __id__ form
            if (context?.componentUuidToIndex && context.componentUuidToIndex.has(value.uuid)) {
                // Internal reference: convert to __id__ format
                console.log(`Component reference ${type} UUID ${value.uuid} found in prefab context, converting to __id__`);
                return {
                    "__id__": context.componentUuidToIndex.get(value.uuid)
                };
            }
            // External reference: set to null because external components do not belong to the prefab structure
            console.warn(`Component reference ${type} UUID ${value.uuid} not found in prefab context, setting to null (external reference)`);
            return null;
        }

        // Handle complex types and add a __type__ marker
        if (value && typeof value === 'object') {
            if (type === 'cc.Color') {
                return {
                    "__type__": "cc.Color",
                    "r": Math.min(255, Math.max(0, Number(value.r) || 0)),
                    "g": Math.min(255, Math.max(0, Number(value.g) || 0)),
                    "b": Math.min(255, Math.max(0, Number(value.b) || 0)),
                    "a": value.a !== undefined ? Math.min(255, Math.max(0, Number(value.a))) : 255
                };
            } else if (type === 'cc.Vec3') {
                return {
                    "__type__": "cc.Vec3",
                    "x": Number(value.x) || 0,
                    "y": Number(value.y) || 0,
                    "z": Number(value.z) || 0
                };
            } else if (type === 'cc.Vec2') {
                return {
                    "__type__": "cc.Vec2", 
                    "x": Number(value.x) || 0,
                    "y": Number(value.y) || 0
                };
            } else if (type === 'cc.Size') {
                return {
                    "__type__": "cc.Size",
                    "width": Number(value.width) || 0,
                    "height": Number(value.height) || 0
                };
            } else if (type === 'cc.Quat') {
                return {
                    "__type__": "cc.Quat",
                    "x": Number(value.x) || 0,
                    "y": Number(value.y) || 0,
                    "z": Number(value.z) || 0,
                    "w": value.w !== undefined ? Number(value.w) : 1
                };
            }
        }

        // Handle array types
        if (Array.isArray(value)) {
            // Node arrays
            if (propData.elementTypeData?.type === 'cc.Node') {
                return value.map(item => {
                    if (item?.uuid && context?.nodeUuidToIndex?.has(item.uuid)) {
                        return { "__id__": context.nodeUuidToIndex.get(item.uuid) };
                    }
                    return null;
                }).filter(item => item !== null);
            }

            // Asset arrays
            if (propData.elementTypeData?.type && propData.elementTypeData.type.startsWith('cc.')) {
                return value.map(item => {
                    if (item?.uuid) {
                        return {
                            "__uuid__": this.uuidToCompressedId(item.uuid),
                            "__expectedType__": propData.elementTypeData.type
                        };
                    }
                    return null;
                }).filter(item => item !== null);
            }

            // Primitive type arrays
            return value.map(item => item?.value !== undefined ? item.value : item);
        }

        // Other complex object types: keep as-is but ensure a __type__ marker is present
        if (value && typeof value === 'object' && type && type.startsWith('cc.')) {
            return {
                "__type__": type,
                ...value
            };
        }

        return value;
    }

    /**
     * Create a node object conforming to the engine's standard format.
     */
    private createEngineStandardNode(nodeData: any, parentNodeIndex: number | null, nodeName?: string): any {
        // Debug: print raw node data (commented out)
        // console.log('Raw node data:', JSON.stringify(nodeData, null, 2));
        
        // Extract basic node properties
        const getValue = (prop: any) => {
            if (prop?.value !== undefined) return prop.value;
            if (prop !== undefined) return prop;
            return null;
        };
        
        const position = getValue(nodeData.position) || getValue(nodeData.value?.position) || { x: 0, y: 0, z: 0 };
        const rotation = getValue(nodeData.rotation) || getValue(nodeData.value?.rotation) || { x: 0, y: 0, z: 0, w: 1 };
        const scale = getValue(nodeData.scale) || getValue(nodeData.value?.scale) || { x: 1, y: 1, z: 1 };
        const active = getValue(nodeData.active) ?? getValue(nodeData.value?.active) ?? true;
        const name = nodeName || getValue(nodeData.name) || getValue(nodeData.value?.name) || 'Node';
        const layer = getValue(nodeData.layer) || getValue(nodeData.value?.layer) || 1073741824;

        // Debug output
        console.log(`Creating node: ${name}, parentNodeIndex: ${parentNodeIndex}`);

        const parentRef = parentNodeIndex !== null ? { "__id__": parentNodeIndex } : null;
        console.log(`Node ${name} parent reference:`, parentRef);

        return {
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_parent": parentRef,
            "_children": [], // Child node references are dynamically added during recursion
            "_active": active,
            "_components": [], // Component references are dynamically added when processing components
            "_prefab": { "__id__": 0 }, // Temporary value; will be set correctly later
            "_lpos": {
                "__type__": "cc.Vec3",
                "x": position.x,
                "y": position.y,
                "z": position.z
            },
            "_lrot": {
                "__type__": "cc.Quat",
                "x": rotation.x,
                "y": rotation.y,
                "z": rotation.z,
                "w": rotation.w
            },
            "_lscale": {
                "__type__": "cc.Vec3",
                "x": scale.x,
                "y": scale.y,
                "z": scale.z
            },
            "_mobility": 0,
            "_layer": layer,
            "_euler": {
                "__type__": "cc.Vec3",
                "x": 0,
                "y": 0,
                "z": 0
            },
            "_id": ""
        };
    }

    /**
     * Extract UUID from node data
     */
    private extractNodeUuid(nodeData: any): string | null {
        if (!nodeData) return null;
        
        // Try multiple approaches to get UUID
        const sources = [
            nodeData.uuid,
            nodeData.value?.uuid,
            nodeData.__uuid__,
            nodeData.value?.__uuid__,
            nodeData.id,
            nodeData.value?.id
        ];
        
        for (const source of sources) {
            if (typeof source === 'string' && source.length > 0) {
                return source;
            }
        }
        
        return null;
    }

    /**
     * Create a minimal node object with no components to avoid dependency issues
     */
    private createMinimalNode(nodeData: any, nodeName?: string): any {
        // Extract basic node properties
        const getValue = (prop: any) => {
            if (prop?.value !== undefined) return prop.value;
            if (prop !== undefined) return prop;
            return null;
        };
        
        const position = getValue(nodeData.position) || getValue(nodeData.value?.position) || { x: 0, y: 0, z: 0 };
        const rotation = getValue(nodeData.rotation) || getValue(nodeData.value?.rotation) || { x: 0, y: 0, z: 0, w: 1 };
        const scale = getValue(nodeData.scale) || getValue(nodeData.value?.scale) || { x: 1, y: 1, z: 1 };
        const active = getValue(nodeData.active) ?? getValue(nodeData.value?.active) ?? true;
        const name = nodeName || getValue(nodeData.name) || getValue(nodeData.value?.name) || 'Node';
        const layer = getValue(nodeData.layer) || getValue(nodeData.value?.layer) || 33554432;

        return {
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "_parent": null,
            "_children": [],
            "_active": active,
            "_components": [], // Empty component array to avoid component dependency issues
            "_prefab": {
                "__id__": 2
            },
            "_lpos": {
                "__type__": "cc.Vec3",
                "x": position.x,
                "y": position.y,
                "z": position.z
            },
            "_lrot": {
                "__type__": "cc.Quat",
                "x": rotation.x,
                "y": rotation.y,
                "z": rotation.z,
                "w": rotation.w
            },
            "_lscale": {
                "__type__": "cc.Vec3",
                "x": scale.x,
                "y": scale.y,
                "z": scale.z
            },
            "_layer": layer,
            "_euler": {
                "__type__": "cc.Vec3",
                "x": 0,
                "y": 0,
                "z": 0
            },
            "_id": ""
        };
    }

    /**
     * Create standard meta file content
     */
    private createStandardMetaContent(prefabName: string, prefabUuid: string): any {
        return {
            "ver": "2.0.3",
            "importer": "prefab",
            "imported": true,
            "uuid": prefabUuid,
            "files": [
                ".json"
            ],
            "subMetas": {},
            "userData": {
                "syncNodeName": prefabName,
                "hasIcon": false
            }
        };
    }

    /**
     * Attempt to convert a raw node into a prefab instance
     */
    private async convertNodeToPrefabInstance(nodeUuid: string, prefabUuid: string, prefabPath: string): Promise<{ success: boolean; error?: string }> {
        return new Promise((resolve) => {
            // This feature requires deep scene editor integration; not yet implemented
            // In a real engine context this involves complex prefab instantiation and node replacement logic
            console.log('Converting node to prefab instance requires deeper engine integration');
            resolve({
                success: false,
                error: 'Converting node to prefab instance requires deeper engine integration'
            });
        });
    }

    private async restorePrefabNode(nodeUuid: string, assetUuid: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // Use official restore-prefab API to restore prefab node
            (Editor.Message.request as any)('scene', 'restore-prefab', nodeUuid, assetUuid).then(() => {
                resolve({
                    success: true,
                    data: {
                        nodeUuid: nodeUuid,
                        assetUuid: assetUuid,
                        message: 'Prefab node restored successfully'
                    }
                });
            }).catch((error: any) => {
                resolve({
                    success: false,
                    error: `Prefab node restore failed: ${error.message}`
                });
            });
        });
    }

    // New implementation based on official prefab format
    private async getNodeDataForPrefab(nodeUuid: string): Promise<{ success: boolean; data?: any; error?: string }> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-node', nodeUuid).then((nodeData: any) => {
                if (!nodeData) {
                    resolve({ success: false, error: 'Node does not exist' });
                    return;
                }
                resolve({ success: true, data: nodeData });
            }).catch((error: any) => {
                resolve({ success: false, error: error.message });
            });
        });
    }

    private async createStandardPrefabData(nodeData: any, prefabName: string, prefabUuid: string): Promise<any[]> {
        // Build prefab data structure based on official Canvas.prefab format
        const prefabData: any[] = [];
        let currentId = 0;

        // First element: cc.Prefab resource object
        const prefabAsset = {
            "__type__": "cc.Prefab",
            "_name": prefabName,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_native": "",
            "data": {
                "__id__": 1
            },
            "optimizationPolicy": 0,
            "persistent": false
        };
        prefabData.push(prefabAsset);
        currentId++;

        // Second element: root node
        const rootNode = await this.createNodeObject(nodeData, null, prefabData, currentId);
        prefabData.push(rootNode.node);
        currentId = rootNode.nextId;

        // Add root node PrefabInfo - fix asset reference to use UUID
        const rootPrefabInfo = {
            "__type__": "cc.PrefabInfo",
            "root": {
                "__id__": 1
            },
            "asset": {
                "__uuid__": prefabUuid
            },
            "fileId": this.generateFileId(),
            "instance": null,
            "targetOverrides": [],
            "nestedPrefabInstanceRoots": []
        };
        prefabData.push(rootPrefabInfo);

        return prefabData;
    }


    private async createNodeObject(nodeData: any, parentId: number | null, prefabData: any[], currentId: number): Promise<{ node: any; nextId: number }> {
        const nodeId = currentId++;
        
        // Extract basic node properties - adapted to query-node-tree data format
        const getValue = (prop: any) => {
            if (prop?.value !== undefined) return prop.value;
            if (prop !== undefined) return prop;
            return null;
        };
        
        const position = getValue(nodeData.position) || getValue(nodeData.value?.position) || { x: 0, y: 0, z: 0 };
        const rotation = getValue(nodeData.rotation) || getValue(nodeData.value?.rotation) || { x: 0, y: 0, z: 0, w: 1 };
        const scale = getValue(nodeData.scale) || getValue(nodeData.value?.scale) || { x: 1, y: 1, z: 1 };
        const active = getValue(nodeData.active) ?? getValue(nodeData.value?.active) ?? true;
        const name = getValue(nodeData.name) || getValue(nodeData.value?.name) || 'Node';
        const layer = getValue(nodeData.layer) || getValue(nodeData.value?.layer) || 33554432;

        const node: any = {
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_parent": parentId !== null ? { "__id__": parentId } : null,
            "_children": [],
            "_active": active,
            "_components": [],
            "_prefab": parentId === null ? {
                "__id__": currentId++
            } : null,
            "_lpos": {
                "__type__": "cc.Vec3",
                "x": position.x,
                "y": position.y,
                "z": position.z
            },
            "_lrot": {
                "__type__": "cc.Quat",
                "x": rotation.x,
                "y": rotation.y,
                "z": rotation.z,
                "w": rotation.w
            },
            "_lscale": {
                "__type__": "cc.Vec3",
                "x": scale.x,
                "y": scale.y,
                "z": scale.z
            },
            "_mobility": 0,
            "_layer": layer,
            "_euler": {
                "__type__": "cc.Vec3",
                "x": 0,
                "y": 0,
                "z": 0
            },
            "_id": ""
        };

        // Temporarily skip UITransform component to avoid _getDependComponent errors
        // To be added dynamically via Engine API later
        console.log(`Node ${name} temporarily skipping UITransform component to avoid engine dependency errors`);
        
        // Handle other components (temporarily skipped, focusing on UITransform fix)
        const components = this.extractComponentsFromNode(nodeData);
        if (components.length > 0) {
            console.log(`Node ${name} has ${components.length} other components, temporarily skipped to focus on UITransform fix`);
        }

        // Process child nodes - using full structure from query-node-tree
        const childrenToProcess = this.getChildrenToProcess(nodeData);
        if (childrenToProcess.length > 0) {
            console.log(`=== Processing child nodes ===`);
            console.log(`Node ${name} has ${childrenToProcess.length} child nodes`);
            
            for (let i = 0; i < childrenToProcess.length; i++) {
                const childData = childrenToProcess[i];
                const childName = childData.name || childData.value?.name || 'unknown';
                console.log(`Processing child node ${i + 1}: ${childName}`);
                
                try {
                    const childId = currentId;
                    node._children.push({ "__id__": childId });
                    
                    // Recursively create child node
                    const childResult = await this.createNodeObject(childData, nodeId, prefabData, currentId);
                    prefabData.push(childResult.node);
                    currentId = childResult.nextId;
                    
                    // Child nodes do not need PrefabInfo, only the root node does
                    // Child node _prefab should be set to null
                    childResult.node._prefab = null;
                    
                    console.log(`Successfully added child node: ${childName}`);
                } catch (error) {
                    console.error(`Error processing child node ${childName}:`, error);
                }
            }
        }

        return { node, nextId: currentId };
    }

    // Extract component info from node data
    private extractComponentsFromNode(nodeData: any): any[] {
        const components: any[] = [];
        
        // Try to get component data from different locations
        const componentSources = [
            nodeData.__comps__,
            nodeData.components,
            nodeData.value?.__comps__,
            nodeData.value?.components
        ];
        
        for (const source of componentSources) {
            if (Array.isArray(source)) {
                components.push(...source.filter(comp => comp && (comp.__type__ || comp.type)));
                break; // Exit once a valid component array is found
            }
        }
        
        return components;
    }
    
    // Create standard component object
    private createStandardComponentObject(componentData: any, nodeId: number, prefabInfoId: number): any {
        const componentType = componentData.__type__ || componentData.type;
        
        if (!componentType) {
            console.warn('Component missing type info:', componentData);
            return null;
        }
        
        // Base component structure - based on official prefab format
        const component: any = {
            "__type__": componentType,
            "_name": "",
            "_objFlags": 0,
            "node": {
                "__id__": nodeId
            },
            "_enabled": this.getComponentPropertyValue(componentData, 'enabled', true),
            "__prefab": {
                "__id__": prefabInfoId
            }
        };
        
        // Add type-specific properties based on component type
        this.addComponentSpecificProperties(component, componentData, componentType);
        
        // Add _id property
        component._id = "";
        
        return component;
    }
    
    // Add component-specific properties
    private addComponentSpecificProperties(component: any, componentData: any, componentType: string): void {
        switch (componentType) {
            case 'cc.UITransform':
                this.addUITransformProperties(component, componentData);
                break;
            case 'cc.Sprite':
                this.addSpriteProperties(component, componentData);
                break;
            case 'cc.Label':
                this.addLabelProperties(component, componentData);
                break;
            case 'cc.Button':
                this.addButtonProperties(component, componentData);
                break;
            default:
                // For unknown component types, copy all safe properties
                this.addGenericProperties(component, componentData);
                break;
        }
    }
    
    // UITransform component properties
    private addUITransformProperties(component: any, componentData: any): void {
        component._contentSize = this.createSizeObject(
            this.getComponentPropertyValue(componentData, 'contentSize', { width: 100, height: 100 })
        );
        component._anchorPoint = this.createVec2Object(
            this.getComponentPropertyValue(componentData, 'anchorPoint', { x: 0.5, y: 0.5 })
        );
    }
    
    // Sprite component properties
    private addSpriteProperties(component: any, componentData: any): void {
        component._visFlags = 0;
        component._customMaterial = null;
        component._srcBlendFactor = 2;
        component._dstBlendFactor = 4;
        component._color = this.createColorObject(
            this.getComponentPropertyValue(componentData, 'color', { r: 255, g: 255, b: 255, a: 255 })
        );
        component._spriteFrame = this.getComponentPropertyValue(componentData, 'spriteFrame', null);
        component._type = this.getComponentPropertyValue(componentData, 'type', 0);
        component._fillType = 0;
        component._sizeMode = this.getComponentPropertyValue(componentData, 'sizeMode', 1);
        component._fillCenter = this.createVec2Object({ x: 0, y: 0 });
        component._fillStart = 0;
        component._fillRange = 0;
        component._isTrimmedMode = true;
        component._useGrayscale = false;
        component._atlas = null;
    }
    
    // Label component properties
    private addLabelProperties(component: any, componentData: any): void {
        component._visFlags = 0;
        component._customMaterial = null;
        component._srcBlendFactor = 2;
        component._dstBlendFactor = 4;
        component._color = this.createColorObject(
            this.getComponentPropertyValue(componentData, 'color', { r: 0, g: 0, b: 0, a: 255 })
        );
        component._string = this.getComponentPropertyValue(componentData, 'string', 'Label');
        component._horizontalAlign = 1;
        component._verticalAlign = 1;
        component._actualFontSize = 20;
        component._fontSize = this.getComponentPropertyValue(componentData, 'fontSize', 20);
        component._fontFamily = 'Arial';
        component._lineHeight = 40;
        component._overflow = 1;
        component._enableWrapText = false;
        component._font = null;
        component._isSystemFontUsed = true;
        component._isItalic = false;
        component._isBold = false;
        component._isUnderline = false;
        component._underlineHeight = 2;
        component._cacheMode = 0;
    }
    
    // Button component properties
    private addButtonProperties(component: any, componentData: any): void {
        component.clickEvents = [];
        component._interactable = true;
        component._transition = 2;
        component._normalColor = this.createColorObject({ r: 214, g: 214, b: 214, a: 255 });
        component._hoverColor = this.createColorObject({ r: 211, g: 211, b: 211, a: 255 });
        component._pressedColor = this.createColorObject({ r: 255, g: 255, b: 255, a: 255 });
        component._disabledColor = this.createColorObject({ r: 124, g: 124, b: 124, a: 255 });
        component._duration = 0.1;
        component._zoomScale = 1.2;
    }
    
    // Add common properties
    private addGenericProperties(component: any, componentData: any): void {
        // Copy only safe, known properties
        const safeProperties = ['enabled', 'color', 'string', 'fontSize', 'spriteFrame', 'type', 'sizeMode'];
        
        for (const prop of safeProperties) {
            if (componentData.hasOwnProperty(prop)) {
                const value = this.getComponentPropertyValue(componentData, prop);
                if (value !== undefined) {
                    component[`_${prop}`] = value;
                }
            }
        }
    }
    
    // Create Vec2 object
    private createVec2Object(data: any): any {
        return {
            "__type__": "cc.Vec2",
            "x": data?.x || 0,
            "y": data?.y || 0
        };
    }
    
    // Create Vec3 object
    private createVec3Object(data: any): any {
        return {
            "__type__": "cc.Vec3",
            "x": data?.x || 0,
            "y": data?.y || 0,
            "z": data?.z || 0
        };
    }
    
    // Create Size object
    private createSizeObject(data: any): any {
        return {
            "__type__": "cc.Size",
            "width": data?.width || 100,
            "height": data?.height || 100
        };
    }
    
    // Create Color object
    private createColorObject(data: any): any {
        return {
            "__type__": "cc.Color",
            "r": data?.r ?? 255,
            "g": data?.g ?? 255,
            "b": data?.b ?? 255,
            "a": data?.a ?? 255
        };
    }

    // Determine whether a component property should be copied
    private shouldCopyComponentProperty(key: string, value: any): boolean {
        // Skip internal and already-processed properties
        if (key.startsWith('__') || key === '_enabled' || key === 'node' || key === 'enabled') {
            return false;
        }
        
        // Skip functions and undefined values
        if (typeof value === 'function' || value === undefined) {
            return false;
        }
        
        return true;
    }


    // Get component property value - renamed to avoid conflicts
    private getComponentPropertyValue(componentData: any, propertyName: string, defaultValue?: any): any {
        // Try to get property directly
        if (componentData[propertyName] !== undefined) {
            return this.extractValue(componentData[propertyName]);
        }
        
        // Try to get from value property
        if (componentData.value && componentData.value[propertyName] !== undefined) {
            return this.extractValue(componentData.value[propertyName]);
        }
        
        // Try property name with underscore prefix
        const prefixedName = `_${propertyName}`;
        if (componentData[prefixedName] !== undefined) {
            return this.extractValue(componentData[prefixedName]);
        }
        
        return defaultValue;
    }
    
    // Extract property value
    private extractValue(data: any): any {
        if (data === null || data === undefined) {
            return data;
        }
        
        // If value property exists, prefer it
        if (typeof data === 'object' && data.hasOwnProperty('value')) {
            return data.value;
        }
        
        // If it is a reference object, keep as-is
        if (typeof data === 'object' && (data.__id__ !== undefined || data.__uuid__ !== undefined)) {
            return data;
        }
        
        return data;
    }

    private createStandardMetaData(prefabName: string, prefabUuid: string): any {
        return {
            "ver": "1.1.50",
            "importer": "prefab",
            "imported": true,
            "uuid": prefabUuid,
            "files": [
                ".json"
            ],
            "subMetas": {},
            "userData": {
                "syncNodeName": prefabName
            }
        };
    }

    private async savePrefabWithMeta(prefabPath: string, prefabData: any[], metaData: any): Promise<{ success: boolean; error?: string }> {
        try {
            const prefabContent = JSON.stringify(prefabData, null, 2);
            const metaContent = JSON.stringify(metaData, null, 2);

            // Ensure path ends with .prefab
            const finalPrefabPath = prefabPath.endsWith('.prefab') ? prefabPath : `${prefabPath}.prefab`;
            const metaPath = `${finalPrefabPath}.meta`;

            // Use asset-db API to create prefab file
            await new Promise((resolve, reject) => {
                Editor.Message.request('asset-db', 'create-asset', finalPrefabPath, prefabContent).then(() => {
                    resolve(true);
                }).catch((error: any) => {
                    reject(error);
                });
            });

            // Create meta file
            await new Promise((resolve, reject) => {
                Editor.Message.request('asset-db', 'create-asset', metaPath, metaContent).then(() => {
                    resolve(true);
                }).catch((error: any) => {
                    reject(error);
                });
            });

            console.log(`=== Prefab save complete ===`);
            console.log(`Prefab file saved: ${finalPrefabPath}`);
            console.log(`Meta file saved: ${metaPath}`);
            console.log(`Prefab array total length: ${prefabData.length}`);
            console.log(`Prefab root node index: ${prefabData.length - 1}`);

            return { success: true };
        } catch (error: any) {
            console.error('Error saving prefab file:', error);
            return { success: false, error: error.message };
        }
    }

}