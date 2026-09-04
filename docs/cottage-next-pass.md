# 西式小院：下一轮优化备忘

记录时间：2026-09-03  
对照视角：默认斜侧机位（`CottageCameraRig`，约 30m），天气「晴」  
当时读数：右上角 `FpsOverlay` 约 **40 FPS**

性能重头已经做过一轮（见 `docs/fps-report.md`）：水面反射、环境贴图每帧烘、4096 阴影、云阴影盘都砍过了。这张默认机位里，**40 FPS 已经不是第一眼问题**——更抢戏的是「资产摆在一片绿地上」，还没长成一座院子。

上一轮「砍画面」曾被撤回（整片廉价草坪、去掉水面反射后观感太素）。下一轮不要再走那条路。

## 判断

- 近景瓶颈仍是草地 fragment（与 fps 报告一致：小院近景约 25–35）。
- 剩下的性能项收益会小很多，但有几处「不太伤近景」的还能挤。
- 观感上最扎眼的是地平线白缝、院子太空、房子太素、池塘像贴纸、风格不统一。

## 建议顺序（只做一轮时）

1. 地平线雾化  
2. 院子围合（篱笆 / 花坛）  
3. 池岸碎形  
4. 树叶不投影 + 池石材质合并  

前三步让这张截图变成「像个地方」；后两步把 40 往 50+ 推，且不太会再踩「砍完太素」的坑。

草地 shader 和加篱笆会抢同一块近景像素，最好先定一个主目标：补「像院子」，或把默认机位稳到 60。

---

## 观感

### 1. 地平线那条白缝（这张图第一刀）

草地还是绿的，天边已经灰白：`PrairieSky` 地平 `#eef2ee`，晴天雾要 160m 才开始（`fogNear: 160`，`fogFar: 350`）。斜侧机位正好把接缝拍满。

比继续堆草地 shader 更有效：

- 把雾拉近到这台相机能看见的距离；或
- 让远草坪往雾色 / 天空色收，别让 733m 大方块的边当地平线。

相关：`components/PrairieSky.tsx`、`lib/weatherPresets.ts`、`components/GrassGround.tsx`

### 2. 院子太空，像演示场

当前小院只有：房子、两棵松、三只鸡、两个人、一辆皮卡、一口圆池、几块汀步。草坪中间大片空白。

围合一下会立刻像「院子」，不必加很多高模：

- 矮篱 / 栅栏
- 门前花坛或菜畦
- 墙根灌木
- 树下落叶 / 枯枝

低模围合物件比再雕草地细节更能撑构图。

相关：`components/CottageGardenTrees.tsx`、`components/CityCanvas.tsx`（`CottageDecor`）

### 3. 房子还是「带窗的盒子」

正墙一扇窗、一扇门，山墙整面墙绘，檐口 / 烟囱在默认角度几乎读不出来。西式小院通常靠这些立住体积：

- 门廊柱
- 窗套厚度
- 檐下阴影
- 更多开窗

墙绘（水墨山水）和西式灰泥不在同一个世界里：要么收淡成风化痕迹，要么换成藤蔓 / 木板，别让水墨当主视觉。

相关：`lib/geoBuildings.ts`、`components/CottageScene.tsx`、`components/HouseWallMural.tsx`

### 4. 池塘从这机位仍像蓝贴纸

代码里已经有驳岸石、睡莲、滚动法线，默认机位仍读成「椭圆蓝面 + 三块大石头」。

不是缺反射（反射已为帧率拿掉），是缺：

- 岸线碎形（不要正圆）
- 石头半埋进草
- 近岸湿泥
- 水色再暗一点

这些比加回 `MeshReflectorMaterial` 便宜且好看。

相关：`components/GardenPond.tsx`、`components/PondWaterSurface.tsx`

### 5. 风格不统一

写实人体 + Quaternius 低模松树 + 卡通皮卡，挤在同一片偏嫩的草坪上。人已经是最贵的资产，树和车却还是玩具感。

与其再加人，不如：

- 松树换更写实的针叶，或加一棵阔叶
- 皮卡压饱和，或换更朴素的车
- 草别那么嫩绿

相关：`hooks/useGardenTreeModel.ts`、`hooks/useGardenVehicleModel.ts`、`hooks/useGardenCharacter.ts`、`components/GrassGround.tsx`

---

## 性能（还能挤，但别再砍画面）

`docs/fps-report.md` 里树叶 / 人物投阴影 **还没改**。云已减到约 200 粒子，再减会更「贴纸」，除非改天空盒 / 一张云图。人物、鸡每帧骨骼贴地 + wander 开销不大，先别动。

性价比比较高、且不太伤近景的项：

| 项 | 现状 | 建议 |
| --- | --- | --- |
| 池岸石头 | `GardenPond` 约 70+ 块各自 `clone` 材质 | 共享材质 + 顶点色 / 实例化，降 draw call |
| 树叶阴影 | 双面 + 透明 + `castShadow` | 树影改便宜 blob，或叶子不投影 |
| 窗玻璃 | `meshPhysicalMaterial` + `transmission` | 近看几乎看不见透射；改 `meshStandardMaterial` 高金属 / 低粗糙 |
| 草地 shader | 这台相机约 30m，近景 fbm 仍在跑 | 中距早切到 `grFarGrass`，比阴影 2048→1024 更能抬 FPS |
| 人物 / 鸡 | 每帧骨骼贴地 + wander | 先不动 |

相关：

- `components/GardenPond.tsx` — 池石 clone 材质
- `hooks/useGardenTreeModel.ts` — 树叶双面透明投阴影
- `components/CottageScene.tsx` — 玻璃 transmission
- `components/GrassGround.tsx` — 近景 fbm / LOD 切档
- `components/CityCanvas.tsx` — 阴影 2048 PCF、`dpr={[1, 1.5]}`

---

## 明确不做

- 加回水面实时反射（拉远曾从约 20 掉回约 5）
- 再减云粒子（会更贴纸）
- 整片换成廉价草坪（已撤回过）
- 为了 60 FPS 把近景草地细节砍光

## 相关文件

- `docs/fps-report.md` — 上一轮性能改动与读数
- `components/CityCanvas.tsx` — 默认机位、天气、阴影、DPR
- `components/PrairieSky.tsx` — 天空 / 地平线色
- `lib/weatherPresets.ts` — 雾距、曝光、日光
- `components/GrassGround.tsx` — 733m 草坪 + 近景 shader
- `components/CottageScene.tsx` / `lib/geoBuildings.ts` — 房子
- `components/HouseWallMural.tsx` — 山墙墙绘
- `components/GardenPond.tsx` / `components/PondWaterSurface.tsx` — 池塘
- `components/CottageGardenTrees.tsx` / `hooks/useGardenTreeModel.ts` — 树
