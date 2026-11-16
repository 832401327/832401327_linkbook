# 部署指南（云服务器）

> 可选任务（15 分）：将通讯录部署到华为云 / 阿里云等公网服务器。`localhost` 链接不计入云部署。

## 方案一：云服务器 + systemd + Nginx（推荐）

以 Ubuntu 22.04 / 24.04（华为云 ECS 或阿里云 ECS）为例，假设安全组已放行 80、443 端口。

### 1. 准备环境

```bash
sudo apt update && sudo apt install -y nginx git curl
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # 应为 v24.x
npm i -g pnpm@11
```

### 2. 拉取代码并构建

```bash
sudo mkdir -p /opt/linkbook && sudo chown $USER /opt/linkbook
git clone https://github.com/<your-account>/linkbook.git /opt/linkbook
cd /opt/linkbook

pnpm install --dir server
pnpm install --dir client
pnpm --dir client build

mkdir -p server/data
node server/src/seed.js       # 可选：写入示例数据
```

### 3. 注册为系统服务

```bash
sudo cp deploy/linkbook.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now linkbook
curl http://127.0.0.1:3000/api/health   # {"ok":true}
```

### 4. Nginx 反向代理

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/linkbook
sudo sed -i 's/linkbook.example.com/<your-domain-or-ip>/' /etc/nginx/sites-available/linkbook
sudo ln -s /etc/nginx/sites-available/linkbook /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

浏览器访问 `http://<公网 IP>/` 即可；绑定域名后可用 certbot 申请 HTTPS：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 5. 数据备份

SQLite 数据位于 `server/data/linkbook.db`，建议每日备份：

```bash
sudo crontab -e
# 0 3 * * * sqlite3 /opt/linkbook/server/data/linkbook.db ".backup '/var/backups/linkbook-$(date +\%F).db'"
```

## 方案二：Docker

服务器安装 Docker 后：

```bash
git clone https://github.com/<your-account>/linkbook.git
cd linkbook
docker compose up -d --build
docker compose logs -f
```

数据挂载在 `./data`，升级时 `git pull && docker compose up -d --build`。

## 验证清单

- [ ] `http://<公网 IP>/api/health` 返回 `{"ok":true}`
- [ ] 首页能加载联系人列表与收藏筛选
- [ ] 导出 Excel、导入模板在公网环境可用（上传大小限制 10 MB）
- [ ] 手机浏览器访问布局正常
- [ ] 重启服务器后服务自动恢复（`systemctl status linkbook`）
