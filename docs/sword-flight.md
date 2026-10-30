# 御剑云游

路由：`/sword-flight`。桌面键盘自由探索，十处具名岛屿及外围山峰；没有穿环、圈数或超出半径自动重置。

## 操作

- 飞行：剑自动向前，A / D 转向，W / S 抬头、俯冲，Space / C 升降，Shift 加速，X 减速。
- 登岛：飞到可站立表面上方 7 米内，HUD 出现提示后按 E 收剑落地。不能隔着屋顶或从岛底吸附到平台。
- 步行：W / S 前进、后退，A / D 转身，Shift 快步。沿真实地表、平台和台阶移动；步行 2.1 m/s，快步 3.8 m/s。
- 起飞：走出岛屿边缘自动御剑，或按 Space 主动起飞。碰到建筑和山体时停在安全位置，转向脱离。
- P 暂停或继续，Esc 暂停，R 返回听风台附近。返回渡口保留本次会话的到访记录；刷新页面会清空记录。

## 场景与碰撞

- `lib/swordFlightSpec.ts` 定义岛屿位置、地标类型和移动速度。
- `lib/flightIslandLayout.ts` 定义平台、台阶、石径、遗迹、浅池及植被；石构件的渲染和碰撞共用尺寸。
- `lib/flightIslandShape.ts` 和 `lib/flightMountainShape.ts` 提供与可见三角面一致的地面高度。
- `lib/swordFlightSimulation.ts` 管理模式切换，移动、落地检测、地面查询、实体碰撞分别放在对应模块中。
- 每帧移动保存在 ref，HUD 每 125 ms 更新。继续使用本地素材和 DPR 1；石构件、鸟群采用实例化，植被在 340 m 外隐藏，云保持 96 张合批面片。2048 px 阴影只在移动 12 m 后更新。

## 离线检查

下列命令在仓库根目录运行，使用项目已有 TypeScript 和 Node 22，不启动浏览器：

```sh
npx tsc --noEmit --incremental false
flight_check_dir=$(mktemp -d /tmp/geo-flight-check.XXXXXX)
./node_modules/.bin/tsc scripts/check-sword-flight.ts --outDir "$flight_check_dir" --module nodenext --target es2020 --moduleResolution nodenext --esModuleInterop --skipLibCheck --strict --noEmit false --incremental false
NODE_PATH="$PWD/node_modules" node "$flight_check_dir/scripts/check-sword-flight.js"
```

回归检查覆盖全部岛屿落地、台阶、亭内行走、前后离岛起飞、主动起飞、减速、无边界重置、屋顶阻挡、碰壁脱离，以及地形碰撞高度与渲染三角面的一致性。静态和离线检查不能证明浏览器画面或实际 FPS。
