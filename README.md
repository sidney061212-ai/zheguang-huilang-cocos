# 折光回廊 · zheguang-huilang-cocos

`Cocos Creator 3.8.8 + TypeScript` 竖屏微信小游戏项目。  
当前分支是**玩法验证版**，核心目标是验证“拖拽/旋转手感 + 光学规则 + 目标判定 + 机制关卡”，不是最终 UI 版本。

## 当前版本定位

- 引擎与结构：保留 Cocos 工程与 `Game.scene`
- 核心玩法：拖拽道具、手指旋转、实时光路重算
- 判定方式：基于 `RaySolver` 的真实命中/颜色/强度规则
- 验证重点：8 个机制关（教学与规则验证）

## 8 关机制说明（玩法验证）

1. 直线命中：光源与目标基础关系（教学演示关，可初始命中）
2. 单镜反射：一面镜子改变光路
3. 角度教学：旋转角度决定反射方向
4. 移动与旋转：位置+角度同时调整
5. 绕开遮挡：障碍阻挡与绕行路径
6. 双镜接力：多次反射接力命中
7. 三棱分光：白光分 RGB、颜色匹配判定
8. 双色目标：分光+反射联动，双目标同时完成

## 运行方式

1. 安装 `Cocos Creator 3.8.8`
2. 打开项目目录：`/Users/sidney/Documents/weixingame`
3. 打开场景：`assets/scenes/Game.scene`
4. 点击 Creator 顶部预览运行（竖屏）

如处于横屏，会显示“请竖屏体验”提示。

## 微信小游戏构建

1. Creator 构建发布面板选择 `微信小游戏`
2. 确认构建场景包含 `assets/scenes/Game.scene`
3. 点击构建
4. 用微信开发者工具打开输出目录进行调试

## 本地命令

```bash
npm install
npm run typecheck
node --test tests/*.mjs
```

## 关键文件

- `assets/scripts/app/GameApp.ts`
- `assets/scripts/ui/GameHUD.ts`
- `assets/scripts/optics/RaySolver.ts`
- `assets/scripts/optics/RayRenderer.ts`
- `assets/scripts/input/DragRotateController.ts`
- `assets/scripts/data/levels.ts`

## 已知问题

- 当前为玩法验证期，视觉与特效仍是临时版，不代表最终美术方向。
- `RaySolver`/关卡仍在迭代期，个别关卡容错和手感会继续调参。
- 音效调用点已接通，但素材完整度有限。
- 若仅在终端执行测试，不等于完成 Cocos Creator 真机手感验证。
