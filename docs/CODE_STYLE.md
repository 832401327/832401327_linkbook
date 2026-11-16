# 代码规范

本项目采用「小步提交 + 单一职责」的极限编程实践，以下约定对两位成员同时生效。

## 1. 提交信息

采用 Conventional Commits 的简化形式：

```
<type>(<scope>): <subject>
```

- `type`：`feat` / `fix` / `test` / `docs` / `style` / `chore` / `refactor`
- `scope`：`server` / `client` / `excel` / `api` / `docs`
- `subject` 使用英文、祈使句、不超过 60 个字符，句末不加句号

示例：

```
feat(server): persist multiple contact methods per contact
feat(excel): export one column per method with stable headers
fix(client): keep detail panel in sync after bookmark toggle
```

## 2. JavaScript / JSX

- 2 空格缩进、单引号、语句结尾保留分号；
- 前端使用函数组件 + Hooks，组件文件使用 `PascalCase.jsx`；
- 纯函数与常量放在 `client/src/lib/`，网络请求统一走 `client/src/api.js`；
- 事件处理函数命名 `handleXxx`，回调属性命名 `onXxx`；
- 不引入 `any` 式的隐式约定：接口返回值在调用处显式解构。

## 3. 服务端

- ESM（`import` / `export`），不使用 CommonJS；
- 路由只做参数解析与响应，业务校验集中在 `contacts.js`；
- 所有 SQL 使用预编译参数，禁止字符串拼接用户输入；
- 错误通过 `ValidationError` / `NotFoundError` 表达，由统一错误中间件转换为 JSON；
- 时间戳统一使用 SQLite `datetime('now')`（UTC），展示层负责本地化。

## 4. 样式

- 颜色、圆角、阴影使用 `:root` 中的 CSS 变量；
- 类名使用 kebab-case，组件级样式集中在 `styles.css` 并保持分区注释；
- 交互元素必须提供 hover / focus-visible / disabled 三种状态；
- 新增布局需同时验证 1440px、1024px、390px 三个宽度。

## 5. 测试

- 每个 API 端点至少有正常路径与一个异常路径用例；
- 涉及 Excel 的功能必须包含「导出 → 导入」往返用例；
- 提交前执行 `node --test tests/api.test.js`，全部通过方可推送。

## 6. 分支与协作

- `main` 始终保持可构建；
- 功能分支命名 `feat/<scope>-<short-desc>`，合并前互相 review；
- 提交前运行 `node scripts/build.mjs` 确认前端可构建；
- 数据库文件 `server/data/*.db` 不进入版本库。
