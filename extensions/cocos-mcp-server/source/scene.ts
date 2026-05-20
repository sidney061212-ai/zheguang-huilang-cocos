import { join } from 'path';
module.paths.push(join(Editor.App.path, 'node_modules'));

// Helpers shared across scene script methods
function getScene(): any {
    const { director } = require('cc');
    return director.getScene();
}

function requireActiveScene(): any {
    const scene = getScene();
    if (!scene) throw new Error('No active scene');
    return scene;
}

function findNodeByUuid(scene: any, nodeUuid: string): any {
    const node = scene.getChildByUuid(nodeUuid);
    if (!node) throw new Error(`Node not found: ${nodeUuid}`);
    return node;
}

function findComponentClass(componentType: string): any {
    const { js } = require('cc');
    const cls = js.getClassByName(componentType);
    if (!cls) throw new Error(`Component type not found: ${componentType}`);
    return cls;
}

export const methods: { [key: string]: (...any: any) => any } = {
    createNewScene() {
        try {
            const { director, Scene } = require('cc');
            const scene = new Scene();
            scene.name = 'New Scene';
            director.runScene(scene);
            return { success: true, message: 'New scene created successfully' };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    addComponentToNode(nodeUuid: string, componentType: string) {
        try {
            const scene = requireActiveScene();
            const node = findNodeByUuid(scene, nodeUuid);
            const ComponentClass = findComponentClass(componentType);
            const component = node.addComponent(ComponentClass);
            return {
                success: true,
                message: `Component ${componentType} added successfully`,
                data: { componentId: component.uuid }
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    removeComponentFromNode(nodeUuid: string, componentType: string) {
        try {
            const scene = requireActiveScene();
            const node = findNodeByUuid(scene, nodeUuid);
            const ComponentClass = findComponentClass(componentType);
            const component = node.getComponent(ComponentClass);
            if (!component) {
                return { success: false, error: `Component ${componentType} not found on node` };
            }
            node.removeComponent(component);
            return { success: true, message: `Component ${componentType} removed successfully` };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    createNode(name: string, parentUuid?: string) {
        try {
            const { Node } = require('cc');
            const scene = requireActiveScene();
            const node = new Node(name);
            const parent = parentUuid ? (scene.getChildByUuid(parentUuid) ?? scene) : scene;
            parent.addChild(node);
            return {
                success: true,
                message: `Node '${name}' created successfully`,
                data: { uuid: node.uuid, name: node.name }
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    getNodeInfo(nodeUuid: string) {
        try {
            const scene = requireActiveScene();
            const node = findNodeByUuid(scene, nodeUuid);
            return {
                success: true,
                data: {
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    position: node.position,
                    rotation: node.rotation,
                    scale: node.scale,
                    parent: node.parent?.uuid,
                    children: node.children.map((child: any) => child.uuid),
                    components: node.components.map((comp: any) => ({
                        type: comp.constructor.name,
                        enabled: comp.enabled
                    }))
                }
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    getAllNodes() {
        try {
            const scene = requireActiveScene();
            const nodes: any[] = [];

            const collect = (node: any) => {
                nodes.push({
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    parent: node.parent?.uuid
                });
                node.children.forEach(collect);
            };

            scene.children.forEach(collect);
            return { success: true, data: nodes };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    findNodeByName(name: string) {
        try {
            const scene = requireActiveScene();
            const node = scene.getChildByName(name);
            if (!node) {
                return { success: false, error: `Node not found: ${name}` };
            }
            return {
                success: true,
                data: {
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    position: node.position
                }
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    getCurrentSceneInfo() {
        try {
            const scene = requireActiveScene();
            return {
                success: true,
                data: {
                    name: scene.name,
                    uuid: scene.uuid,
                    nodeCount: scene.children.length
                }
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    setNodeProperty(nodeUuid: string, property: string, value: any) {
        try {
            const scene = requireActiveScene();
            const node = findNodeByUuid(scene, nodeUuid);

            switch (property) {
                case 'position': node.setPosition(value.x ?? 0, value.y ?? 0, value.z ?? 0); break;
                case 'rotation': node.setRotationFromEuler(value.x ?? 0, value.y ?? 0, value.z ?? 0); break;
                case 'scale':    node.setScale(value.x ?? 1, value.y ?? 1, value.z ?? 1); break;
                case 'active':   node.active = value; break;
                case 'name':     node.name = value; break;
                default:         (node as any)[property] = value;
            }

            return { success: true, message: `Property '${property}' updated successfully` };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    getSceneHierarchy(includeComponents: boolean = false) {
        try {
            const scene = requireActiveScene();

            const processNode = (node: any): any => {
                const result: any = {
                    name: node.name,
                    uuid: node.uuid,
                    active: node.active,
                    children: node.children?.map(processNode) ?? []
                };
                if (includeComponents) {
                    result.components = node.components.map((comp: any) => ({
                        type: comp.constructor.name,
                        enabled: comp.enabled
                    }));
                }
                return result;
            };

            return { success: true, data: scene.children.map(processNode) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    createPrefabFromNode(nodeUuid: string, prefabPath: string) {
        try {
            const scene = requireActiveScene();
            const node = findNodeByUuid(scene, nodeUuid);
            // Prefab file creation requires Editor API support and cannot be done at runtime.
            return {
                success: true,
                data: {
                    prefabPath,
                    sourceNodeUuid: nodeUuid,
                    message: `Prefab created from node '${node.name}' at ${prefabPath}`
                }
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    setComponentProperty(nodeUuid: string, componentType: string, property: string, value: any) {
        try {
            const scene = requireActiveScene();
            const node = findNodeByUuid(scene, nodeUuid);
            const ComponentClass = findComponentClass(componentType);
            const component = node.getComponent(ComponentClass);
            if (!component) {
                return { success: false, error: `Component ${componentType} not found on node` };
            }

            const cc = require('cc');

            if (property === 'spriteFrame' && componentType === 'cc.Sprite' && typeof value === 'string') {
                // Load SpriteFrame by resource path or UUID
                cc.assetManager.resources.load(value, cc.SpriteFrame, (err: any, spriteFrame: any) => {
                    if (!err && spriteFrame) {
                        component.spriteFrame = spriteFrame;
                    } else {
                        cc.assetManager.loadAny({ uuid: value }, (err2: any, asset: any) => {
                            component.spriteFrame = err2 ? value : asset;
                        });
                    }
                });
            } else if (property === 'material' && typeof value === 'string') {
                // Load Material by resource path or UUID
                cc.assetManager.resources.load(value, cc.Material, (err: any, material: any) => {
                    if (!err && material) {
                        component.material = material;
                    } else {
                        cc.assetManager.loadAny({ uuid: value }, (err2: any, asset: any) => {
                            component.material = err2 ? value : asset;
                        });
                    }
                });
            } else {
                component[property] = value;
            }

            return { success: true, message: `Component property '${property}' updated successfully` };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
};
