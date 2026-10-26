# Pass It On

A local-only demo for free item sharing in communities.

[English](README.md) | [简体中文](README.zh-CN.md)

# 快速开始

运行项目：

- `docker compose up -d`（等待服务启动）
- `docker compose exec backend python manage.py createsuperuser`
- 打开 http://127.0.0.1:18080 并登录

## Pass It On 本地演示

此 checkout 将 Sharebubble 适配为仅供本机运行的免费赠送演示。使用 `docker compose up -d --build` 启动服务，然后运行 `docker compose exec backend uv run python manage.py reset_demo` 初始化虚构示例账号和记录。打开 <http://127.0.0.1:18080/demo/browse>，并参阅[演示指南](docs/DEMO_GUIDE.md)。

两个演示账号、示例物品、对话和影响数据均为虚构。重置命令只替换明确标记为 Pass It On 演示数据的记录，不会重置整个数据库。前端宿主端口仅绑定到 IPv4 回环地址；后端 API 不会映射到宿主端口。

Pass It On 的改动基于 Sharebubble [`bubble`](https://github.com/sharebubble/bubble/tree/362a83fc9edb25fccdeddd5716629a3e6f2e1d05)，对应 commit 为 `362a83fc9edb25fccdeddd5716629a3e6f2e1d05`，并遵循仓库的 GNU AGPL v3 许可证。现有 `LICENSE` 文件予以保留。本地演示不提供已部署的公共服务。

# 通知

Bubble 通过 [Apprise](https://github.com/caronc/apprise) 向用户发送通知，为多个渠道提供统一的投递方式。用户可在个人资料的 **Notifications（通知）** 部分按渠道选择是否订阅。

## 支持的渠道

| 渠道 | 用于联系用户的字段 | Apprise URL 配置（Constance／环境变量） |
| --- | --- | --- |
| Rocket.Chat | 用户名 | `APPRISE_ROCKETCHAT_URL` |
| Signal | 电话号码 | `APPRISE_SIGNAL_URL` |
| Matrix | Matrix ID（`@user:server`） | `APPRISE_MATRIX_URL` |
| Email | 电子邮件地址 | `APPRISE_MAILTOS_URL` |

每个值都是一个 [Apprise URL](https://github.com/caronc/apprise/wiki) **模板**，其中包含 `{target}` 占位符；系统会将它替换为收件人的地址。例如：

```env
APPRISE_ROCKETCHAT_URL=rocket://user:password@rocketchat.example.com/{target}
APPRISE_SIGNAL_URL=signal://signal-api.example.com/+15551230000/{target}
APPRISE_MATRIX_URL=matrixs://user:password@matrix.example.com/{target}
APPRISE_MAILTOS_URL=mailtos://user:password@smtp.example.com?to={target}
```

对于 Rocket.Chat，`{target}` 已解析为带 `@` 前缀的用户名（例如 `@alice`），Apprise 会据此直接给用户发送私信，因此模板中不要再添加一个 `@`。普通登录密码只能向房间或频道发送消息，不能给用户发私信，因此 `APPRISE_ROCKETCHAT_URL` 需要使用以下一种方式：

- **Token 模式（推荐）**：在 **Rocket.Chat → Account → Personal Access Tokens** 中获取 Personal Access Token 和 User ID，并在 URL 中使用 `?mode=token`：
  `rocket://<UserID>:<PersonalAccessToken>@rocketchat.example.com/{target}?mode=token`
- **Webhook 模式**：使用 Incoming Webhook URL 中的两段 token（`<token1>/<token2>`），不填写登录凭据：
  `rocket://<token1>/<token2>@rocketchat.example.com/{target}`

这些值可以通过环境变量设置，也可以在 Django admin 的 **Constance → Config** 中运行时编辑。

## 工作方式

一个渠道只有在同时满足以下条件时，才会显示在用户个人资料中：

1. 后端已完成配置（设置了上述 Apprise URL）；
2. 该渠道有可用于联系此用户的地址（Rocket.Chat 和 Email 自动使用 Bubble 用户名／账号电子邮件；Signal 需要用户在个人资料中填写电话号码；Matrix 需要 Matrix ID，用户可直接在 Notifications 区域编辑）。

随后，用户可按渠道选择要接收的事件：

- **新消息和预约**：收到新聊天消息，或有用户预约了其物品。
- **新物品**：每当有新物品发布时收到通知。

电话号码可以在个人资料中手动填写；如果 OIDC 提供方提供 `phone_number` claim，系统也会自动填入（系统会自动请求 `phone` scope）。

Rocket.Chat 和 Email 始终使用用户的 Bubble 用户名／账号电子邮件地址联系用户，因此无需单独填写地址。配置 `APPRISE_ROCKETCHAT_URL` 或 `APPRISE_MAILTOS_URL` 后，这些渠道及其通知选项会自动显示。包括 Email 在内的所有渠道通知默认均为**关闭**，需要用户主动订阅。Matrix 的工作方式类似，但需要为每个用户设置 Matrix ID：配置 `APPRISE_MATRIX_URL` 后，个人资料的 Notifications 区域会显示可编辑的 Matrix ID 字段。系统默认填入 `@<bubble username>:<homeserver>`，因此渠道可立即使用；用户仍可改为自己的 `@user:server` 地址。

预填 Matrix ID 中的 `<homeserver>` 默认取自 `DJANGO_ALLOWED_HOSTS[0]`。按照 Matrix ID 的惯例，即使客户端服务器 API 位于子域名（例如 `matrix.example.com`），这里通常仍应使用网站主域名，并通过 `.well-known` 委派。若不符合此情况，可设置 `APPRISE_MATRIX_HOSTNAME` 覆盖默认值，例如：

```env
APPRISE_MATRIX_HOSTNAME=example.com
```

# 联邦（ActivityPub）

Bubble 支持 ActivityPub 联邦，可在不同 Bubble 实例之间共享物品、预约和消息，并与更广泛的联邦宇宙（如 Mastodon）交互。

## 启用联邦

设置以下环境变量（例如写入 `backend/.env`）：

```env
FEDERATION_ENABLED=true
FEDERATION_DOMAIN=bubble.example.com
# 32-byte URL-safe base64 key — generate with:
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
FEDERATION_KEY_ENCRYPTION_KEY=<your-key>
```

然后重启 backend 并运行数据库迁移：

```bash
docker compose exec backend python manage.py migrate
```

## 允许对等实例

联邦功能使用**允许列表模式**：只有明确获准的远程实例才会交换活动。

1. 登录 Django admin：`/admin/`。
2. 前往 **Federation → Remote instances → Add**。
3. 输入对等实例的域名，并将 **Allowlist state** 设为 `Allowed`。
4. 可选：使用 **Allow instances and backfill catalog** 管理操作，立即导入远程实例的公开物品目录。

## 面向用户的控制项

- **按用户启用／停用联邦**：账号设置 → Federation。
- **按物品设置可见范围**：可选择 `Public (federated)` 或 `Local only`。
- **个人资料是否可被发现**：控制个人资料是否显示在远程搜索结果中。

## 在 Mastodon 中查找用户

Bubble 用户资料兼容 Mastodon。可使用以下格式在 Mastodon 中查找 Bubble 用户：

```
@username@bubble.example.com
```

## 监控

可检查联邦健康状态接口（无需身份验证）：

```
GET https://bubble.example.com/federation/health
```

完整运维说明请参阅[联邦运维指南](docs/federation/operating.md)。
隐私与 GDPR 相关说明请参阅[联邦隐私文档](docs/federation/privacy.md)。

# 前端

## UI 组件库方向

前端正在从 shadcn 风格的基础组件迁移到 Mantine。

- 新增 UI 组件和交互时使用 Mantine。
- `frontend/src/components/ui/` 中现有的 shadcn 组件暂时保留，迁移期间可以共存。
- 采用渐进式迁移：如果修改现有的 shadcn 界面，在可行时一并将涉及区域迁移到 Mantine。

如需在 IDE 中使用自动补全和类型检查，可在 _frontend/_ 目录安装 npm 包：

```
npm ci
```

## 更新软件包

- 运行 `npm outdated` 查看可更新的软件包。
- 运行 `npm update` 更新软件包。

## 更新 API 类型

后端会通过 OpenAPI 暴露 API 类型。

每当后端类型发生变化，都应更新前端对应的类型信息。升级前端的 _@hey-api/openapi-ts_ 软件包时，通常也需要更新。

运行 `npm run types:openapi` 更新类型。

# 后端

所有内容都放在 `backend` 目录中。

## 更新翻译

先在 `base.py` 中配置 `LANGUAGES`，取消注释你愿意支持的语言。然后运行以下命令生成翻译字符串：

```bash
docker compose run --rm backend python manage.py makemessages --all --no-location
```

## 类型检查

使用 mypy 运行类型检查：

```bash
mypy bubble
```

## 测试覆盖率

运行测试、检查覆盖率并生成 HTML 覆盖率报告：

```bash
coverage run -m pytest
coverage html
open htmlcov/index.html
```

### 使用 pytest 运行测试

```bash
pytest
```

## 邮件服务器

在开发环境中，查看已发送邮件会很有帮助。因此，项目提供本地 SMTP 服务器 [Mailpit](https://github.com/axllent/mailpit) 及其 Web 界面。运行全部 Docker 容器时会自动启动 Mailpit 容器。

如需了解如何启动全部容器，请参阅 [Cookiecutter Django Docker 文档](https://cookiecutter-django.readthedocs.io/en/latest/2-local-development/developing-locally-docker.html)。

Mailpit 启动后，可在 `http://127.0.0.1:8025` 查看已发送的邮件。

## Sentry

Sentry 是用于汇总错误日志的服务。你可以在 <https://sentry.io/signup/?code=cookiecutter> 注册免费账号，也可以下载并自行托管。

系统已设置合理的默认值，包括对 404 错误的记录和 WSGI 集成。生产环境必须设置 DSN URL。
