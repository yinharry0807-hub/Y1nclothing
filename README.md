# 服装跟单智能工作台（Garment Merchandiser Workbench）

一个面向服装跟单的云端资料库 + AI 智能助手：把散落在 Excel / Word / PDF / 图片里的客户资料
（款式、面料、辅料、大货单、产前版、样板单）全部结构化存储，随时搜索、随时更新、多设备同步。

> 当前状态：**阶段1 已完成**（项目骨架、Supabase 建表、密码登录、文件上传解析、资料结构化存储）
> 阶段2-5 按你确认的顺序继续开发（DeepSeek AI 总结 → 万能搜索/款式资料卡/辅料追踪 → 大货单/产前版生成导出 → AI 助手/视觉识别/GitHub+Vercel）。

---

## 技术栈

| 部分 | 技术 |
| --- | --- |
| 前端 | Next.js 15（App Router）+ React 19 + Tailwind CSS，响应式（电脑/手机） |
| 数据库 | Supabase（PostgreSQL），所有表启用 RLS + 自动审计 |
| AI | DeepSeek API（deepseek-chat，环境变量配置）；视觉模型预留空位（阶段5） |
| 文件解析 | SheetJS（xlsx/xls）、mammoth（docx）、word-extractor（doc）、pdf-parse（pdf） |
| 部署 | GitHub 仓库 + Vercel 自动部署 |

---

## 目录结构

```text
├── app/
│   ├── api/
│   │   ├── upload/                 # 文件上传 + 解析接口
│   │   ├── search/                 # 万能搜索接口（款式/面料/辅料/大货单/资料）
│   │   ├── styles/                 # 款式增删改
│   │   ├── fabrics/                # 面料增删改
│   │   ├── accessories/            # 辅料增删改（含追踪状态）
│   │   └── documents/[id]/download/# 原文件下载（签名 URL）
│   ├── login/                      # 登录/注册页
│   └── (app)/                      # 工作台（侧边栏 + 顶部搜索）
│       ├── dashboard/              # 工作台首页
│       ├── upload/                 # 资料导入
│       ├── documents/              # 资料库（原文预览）
│       ├── styles/                 # 款式库 / 款式详情（面料、辅料、大货单）
│       ├── accessories/            # 辅料追踪
│       ├── orders/                 # 大货单（阶段4开放模板生成）
│       ├── samples/                # 样板单（阶段4开放模板生成）
│       └── settings/               # 设置（环境变量状态/连接检测/审计日志）
├── components/                     # 通用组件（搜索框、表单、弹窗、表格等）
├── lib/
│   ├── supabase/                   # 服务端/浏览器 Supabase 客户端
│   ├── parsers/                    # Excel/Word/PDF 解析器
│   └── types.ts / utils.ts
├── scripts/import-folder.ts        # 本地文件夹批量导入脚本
├── supabase/schema.sql             # 完整建表 SQL（含 RLS、审计触发器、索引）
├── .env.example                    # 环境变量模板
└── README.md
```

---

## 一、本地运行

```bash
npm install
cp .env.example .env   # Windows 用 copy .env.example .env
npm run dev
```

打开 http://localhost:3000，先注册账号（需 Supabase 开启 Email 注册），再登录。

> 项目里的 `.env` 目前是占位值，**必须先配置真实的 Supabase 信息**（见下），否则登录页无法工作。

---

## 二、配置 Supabase（数据同步核心）

1. 打开 [supabase.com](https://supabase.com) 创建项目（选离你近的区域，如 Singapore）。
2. 进入项目 → **SQL Editor** → 粘贴 `supabase/schema.sql` 全部内容 → **Run**。
   - 脚本会创建 9 张业务表 + `audit_log` + 大货进度节点表、RLS 安全策略、审计触发器、`documents` 存储桶、模糊检索索引。
3. 进入 **Settings → API**，复制：
   - `Project URL` → 填入 `.env` 的 `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → 填入 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role`（仅本地批量导入脚本用）→ 填入 `SUPABASE_SERVICE_ROLE_KEY`
4. 进入 **Authentication → Providers → Email**，确认 **Enable Sign up** 已打开（单人使用建议保留；若关闭注册，先用第一个账号注册完成后再关）。
5. 重新 `npm run dev`，注册登录，工作台即可使用。

### 把桌面资料一键导入云端（可选，强烈推荐）

```bash
npm run import:folder -- "C:\Users\15813\Desktop\尹锐洋开发资料"
```

脚本会递归扫描该文件夹，解析全部 Excel/Word/PDF，上传原文件到 Storage，
原文写入 `documents` 表，并用原始相对路径去重（重复执行不会重复导入）。
图片会标记为"待视觉识别"，阶段5接入视觉模型后自动提取文字。

---

## 三、配置 DeepSeek（阶段2：AI 总结与 AI 助手）

在 `.env` 中填写：

```env
DEEPSEEK_API_KEY=sk-你的密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

阶段2完成后，上传资料会自动调用 DeepSeek 生成详细总结，并把款式、面料、辅料、
价格、交期、供应商等结构化字段自动归类入库（总结与原文双重保存，原文永不被覆盖）。

---

## 四、视觉模型（图片文字识别，已接入智谱 GLM）

DeepSeek 不支持图片，视觉识别走智谱 GLM-4V 系列（OpenAI 兼容接口）。已在 `.env` 配置：

```env
VISION_MODEL_API_KEY=你的智谱 API Key
VISION_MODEL_BASE_URL=https://open.bigmodel.cn/api/paas/v4
VISION_MODEL_NAME=glm-4v-flash
```

**工作方式**：图片上传后自动调用当前视觉模型，把识别出的文字/表格存入
`documents.original_text`；识别失败可在资料库点击「AI 识别图片文字」手动重试。

**模型切换**：网站「设置 → AI 视觉模型」页面可随时切换（选择结果存入云端，多设备同步）：

| 可切换模型 | 说明 |
| --- | --- |
| glm-4v-flash | 默认，速度快 |
| glm-4.1v-thinking-flash | 思考增强 |
| glm-4.6v-flash | 新一代轻量 |
| glm-4.6v-flashx | 新一代轻量增强 |
| glm-4.6v | 最强效果 |

该接口同样兼容其他 OpenAI 风格视觉模型（通义 qwen-vl、GPT-4o 等），
换服务商只需改 `VISION_MODEL_API_KEY` 和 `VISION_MODEL_BASE_URL`；
如需新增可切换模型，在 `lib/vision.ts` 的 `VISION_MODEL_OPTIONS` 中追加即可。

---

## 五、GitHub + 自动部署（没有外国手机号也能部署）

### 1. 推送到 GitHub

```bash
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

（代码已在本机提交好；仓库是新建的空仓库时，执行上面三条即可推送。`.env` 已被 .gitignore，不会上传密钥。）

### 2. 推荐：Netlify 免费部署（GitHub 登录，不用手机号，不用付费）

1. 打开 [netlify.com](https://netlify.com)，点 **Sign up**，选 **GitHub** 登录（授权后直接进后台，不要求手机号、不要求绑卡）。
2. 点 **Add new site → Import an existing project** → 选你的工作台仓库（需要先授权 Netlify 访问该仓库）。
3. 构建设置保持默认即可——Netlify 会自动识别 Next.js，项目里的 `netlify.toml` 已配置好
   构建命令（`npm run build`）和 Node 版本，无需手动改。
4. 部署完成后，进 **Site configuration → Environment variables**，添加与本地 `.env` 相同的一组变量：
   - `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`（Publishable key）
   - `DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`（阶段2）
   - `VISION_MODEL_API_KEY`、`VISION_MODEL_BASE_URL`、`VISION_MODEL_NAME`（GLM 视觉）
   - `NEXT_PUBLIC_APP_NAME`
5. 添加变量后 **重新部署一次**（Deploys 页面点 Redeploy），网站即可正常使用，得到 `https://xxx.netlify.app` 网址。

以后每次 `git push`，Netlify 自动重新部署，手机和电脑访问同一网址即数据同步。
免费额度：每月 300 分钟构建 + 100GB 流量，个人跟单使用完全够。

### 3. 兜底方案：电脑自己跑 + 免费内网穿透（零成本，不依赖国外平台）

如果不想注册任何国外平台，也可以让电脑当服务器：

1. 在电脑上运行 `powershell -ExecutionPolicy Bypass -File scripts\run-from-d.ps1`（默认启动开发模式）。
2. 手机和电脑连**同一个 Wi-Fi** 时，手机浏览器直接访问电脑局域网地址（脚本启动时会显示 `http://192.168.x.x:3000`）。
3. 出门在外想访问，装一个免费内网穿透工具（cpolar、花生壳任选其一），把本地 3000 端口映射到一个公网网址。

缺点：电脑要开着才访问得到；适合作为临时兜底。

### 4. 以后想用 Vercel / Zeabur 也可以

代码完全兼容 Vercel 和 Zeabur，以后有外国手机号或愿意付费时，把同一仓库导入、
填同样一组变量即可，无需改代码。

> 数据都在 Supabase 云端，换任何托管平台都不影响已有数据；换平台只是换一个"访问入口"。

---

## 六、数据安全说明（重点）

- **原文永不覆盖**：`documents.original_text` 保存解析出的原始全文；AI 总结单独存 `ai_summaries`。
- **每次修改都是新版本**：所有表都有数据库级触发器，任何 INSERT/UPDATE/DELETE 自动把新旧快照写入
  `audit_log`（含操作人、时间、完整 old_data/new_data），应用层无法绕过。
- **可恢复**：`audit_log` 保存每行的历史版本，后续阶段提供"一键恢复到任意历史版本"界面。
- **RLS 保护**：所有表开启 Row Level Security，只有登录用户可读写；`audit_log` 只读。
- **云端持久**：数据存在 Supabase，退出登录、清理浏览器缓存都不影响。

---

## 七、开发路线图

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| 1 | 项目骨架 + Supabase 建表 + 密码登录 + 文件上传解析 + 结构化存储 | ✅ 已完成 |
| 2 | DeepSeek 接入 + AI 详细总结 + 资料自动归类入库 | ⏳ 待确认 |
| 3 | 万能搜索框（拼音/模糊）+ 款式详情资料卡 + 辅料追踪时间线 | ⏳ |
| 4 | 大货单/产前版样板单模板生成 + PDF 导出 | ⏳ |
| 5 | AI 助手对话 + 图片视觉识别 + GitHub/Vercel 部署 | ⏳ |

---

## 八、文件解析说明

| 格式 | 解析库 | 说明 |
| --- | --- | --- |
| `.xlsx` / `.xls` | SheetJS（xlsx） | 逐个工作表输出"工作表名 + 每行单元格"，保留表格结构；同时支持新版和旧版 Excel |
| `.docx` | mammoth | 提取纯文本 |
| `.doc` | word-extractor | 读取老版 Word 二进制格式（你的全流程总结就是 .doc） |
| `.pdf` | pdf-parse | 提取文本层；扫描版 PDF 无文本层则标记为空，后续用视觉模型识别 |
| 图片 | —（阶段5接视觉模型） | 保存原图，状态为"待视觉识别" |

解析器位于 `lib/parsers/`，可单独扩展。
