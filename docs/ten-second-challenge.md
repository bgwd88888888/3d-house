# 刚好十秒

从庭院首页的「刚好十秒」入口进入，或访问 `/ten-second-challenge`。使用现有项目的 `npm run dev`，不需要单独安装或启动另一个项目。

页面通过同源 iframe 加载 `public/games/ten-second-challenge/` 中的小游戏，隔离其样式和页面事件。游戏内「返回庭院」回到顶层首页。

## 玩法

- 点击立体按钮或按空格开始，再次操作停止，计时数字全程可见。
- 使用 `performance.now()` 测量实际经过时间，以毫秒四舍五入记录；屏幕刷新频率不影响停止时重新计算的时间差。
- 目标 10,000 毫秒，误差为绝对时间差。零误差满分 1000，非零误差得分为 `min(999, round(1000 × exp(-误差 / 350)))`。
- 每次成绩独立记录，不按昵称去重。按误差升序排名，相同误差按达成时间排序，展示前十名。
- 成绩保存在当前浏览器、当前站点的 `localStorage`，不是联网排行榜。支持换昵称在同一设备轮流挑战。
- 页面进入后台取消当前挑战，不计成绩。支持可选音效和系统减少动态效果设置。

## 文件职责

小游戏 `js/` 下：`scoring.js` 负责计算，`timer.js` 负责计时，`storage.js` 负责存储，`view.js` 负责展示，`effects.js` 负责音效和彩带，`app.js` 负责事件编排。

3D 风格由 CSS 渐变、透视、阴影和动画实现，不需要新增 WebGL 依赖。Google Fonts 无法访问时回退到系统字体。

## 检查

```sh
npx tsc --noEmit
npx eslint app/page.tsx app/ten-second-challenge/page.tsx public/games/ten-second-challenge/js tests/ten-second-challenge/scoring.test.mjs
node --test tests/ten-second-challenge/scoring.test.mjs
```
