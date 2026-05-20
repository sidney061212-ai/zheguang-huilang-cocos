# 折光回廊 · zheguang-huilang-cocos

真实的 `Cocos Creator 3.8.8 + TypeScript` 竖屏微信小游戏原型，不是 Web Canvas、不是 Phaser、不是 PixiJS、不是原生 `wx.createCanvas` 自研引擎。

## 项目概览

- 工程名：`zheguang-huilang-cocos`
- Cocos Creator 版本：`3.8.8`
- 设计分辨率：`390 x 844`
- 屏幕方向：竖屏
- 平台目标：微信小游戏
- 核心玩法：拖拽 / 旋转镜子与三棱镜，实时重算光线反射、分光、衰减与目标命中

## 已实现内容

- `assets/scenes/Game.scene` 可直接在 Cocos Creator 3.8.8 中打开
- 首页、选关、游戏 HUD、通关弹窗、设置弹窗
- 5 个可玩测试关卡
- `RaySolver` 真正进行反射、分光、衰减与命中判定
- `RayRenderer` 三层光束渲染：glow / beam / highlight
- 镜子与三棱镜的拖拽、旋转、角度吸附与非法位置回弹
- 目标颜色与强度校验
- 障碍阻挡
- 通关判定、重置、下一关
- `AudioManager` 调用结构和音效 key 占位

## 如何打开项目

1. 安装 `Cocos Creator 3.8.8`
2. 打开 Creator，选择“打开项目”
3. 选择项目目录：`/Users/sidney/Documents/weixingame`
4. 在资源管理器中打开场景：`assets/scenes/Game.scene`

## 如何运行预览

1. 确认当前场景为 `Game.scene`
2. 点击 Creator 顶部预览按钮运行
3. 建议使用竖屏预览尺寸，或直接用模拟手机尺寸查看

如果窗口处于横屏，游戏会显示“请竖屏体验”提示。

## 如何构建微信小游戏

1. 在 Creator 中打开构建发布面板
2. 目标平台选择 `微信小游戏`
3. 构建场景确认包含 `assets/scenes/Game.scene`
4. 点击“构建”
5. 构建完成后，点击“运行”或用微信开发者工具打开输出目录

建议：

- 先在 Creator 偏好设置里配置微信开发者工具路径
- 使用真机调试进一步检查触控手感和安全区表现

## 本地验证

安装依赖：

```bash
npm install
```

类型检查：

```bash
npm run typecheck
```

补充说明：

- `tsconfig.check.json` 用于终端轻量类型检查
- `tsconfig.runtime.json` 仅用于离线求解器验证
- `.tmp-ts/` 是本地验证产物，已忽略，不参与运行时工程

## 关卡说明

1. `镜面初识`：单镜反射教学
2. `二次反射`：双镜折线路径
3. `绕开遮挡`：镜面抬高主光，绕墙命中
4. `三棱分光`：白光进入棱镜后分裂为 RGB
5. `颜色匹配`：蓝目标先亮，继续调镜让红目标也命中

## 关键文件

- `assets/scenes/Game.scene`
- `assets/scripts/app/GameApp.ts`
- `assets/scripts/data/levels.ts`
- `assets/scripts/optics/RaySolver.ts`
- `assets/scripts/optics/RayRenderer.ts`
- `assets/scripts/input/DragRotateController.ts`
- `assets/scripts/objects/DraggableOpticObject.ts`
- `assets/scripts/ui/`

## 已知问题

- 磨砂玻璃与辉光基于 `Graphics` 多层模拟，不是真实模糊后处理
- 音效管理器已接好调用点，但当前没有接入真实音频素材
- 离线求解验证依赖本地 `cc` stub，只用于开发校验，不参与 Creator 运行

## 目录结构

```text
assets/
  scenes/
    Game.scene
  scripts/
    app/
    audio/
    core/
    data/
    effects/
    input/
    objects/
    optics/
    ui/
    utils/
resources/
  audio/
  textures/
settings/
project.json
package.json
tsconfig.json
```
