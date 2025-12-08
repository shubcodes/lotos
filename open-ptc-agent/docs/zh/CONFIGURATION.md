# 配置指南

[English](../CONFIGURATION.md) | [中文](CONFIGURATION.md)

本指南涵盖 Open PTC Agent 的所有配置选项。

## 概述

项目使用两个主要配置文件：

| 文件 | 用途 |
|------|------|
| `config.yaml` | 主配置 - LLM 选择、MCP 服务器、Daytona 沙箱、安全、存储、日志 |
| `llms.json` | LLM 定义 - 模型 ID、提供商、SDK、API 密钥、参数 |

密钥单独存储在 `.env` 中（参见 `.env.example`）。

---

## config.yaml

### LLM 选择

```yaml
llm:
  # 引用 llms.json 中的 LLM 定义
  name: "claude-sonnet-4-5"
```

可用选项取决于 `llms.json` 中定义的内容。预配置模型：

**海外提供商：**
- `claude-sonnet-4-5`、`claude-opus-4-5` - Anthropic Claude
- `gpt-5.1-codex`、`gpt-5.1-codex-mini` - OpenAI GPT
- `gemini-3-pro`、`gemini-3-pro-image` - Google Gemini

**国内提供商：**
- `glm-4.6` - 智谱 GLM
- `minimax-m2-stable` - Minimax M2
- `doubao-seed-code` - 火山引擎/字节跳动 豆包
- `qwen3-max` - 阿里云 通义千问
- `kimi-k2-thinking` - 月之暗面 Kimi

---

### Daytona 沙箱

```yaml
daytona:
  base_url: "https://app.daytona.io/api"
  auto_stop_interval: 3600      # 1 小时 - 沙箱在不活动后自动停止
  auto_archive_interval: 86400  # 24 小时 - 沙箱归档
  auto_delete_interval: 604800  # 7 天 - 沙箱删除
  python_version: "3.12"

  # 快照配置（推荐用于更快启动）
  snapshot_enabled: true        # 使用快照实现 7 倍更快初始化
  snapshot_name: "open-ptc-v1"  # 基础名称（自动附加哈希值）
  snapshot_auto_create: true    # 如果缺失则创建快照
```

**快照**：首次创建沙箱需要约 10-15 分钟来安装依赖。启用快照后，后续沙箱初始化仅需约 8 秒。

---

### 安全

```yaml
security:
  # 执行限制
  max_execution_time: 300   # 每次代码执行最多 5 分钟
  max_code_length: 10000    # 最大代码大小 10KB
  max_file_size: 10485760   # 最大文件大小 10MB

  # 代码验证
  enable_code_validation: true

  # 允许的 Python 导入（白名单）
  allowed_imports:
    - os
    - sys
    - json
    - yaml
    - requests
    - datetime
    - pathlib
    - typing
    - re
    - math
    - random
    - time
    - collections
    - itertools
    - functools
    - subprocess
    - shutil

  # 被阻止的代码模式（安全）
  blocked_patterns:
    - "eval("
    - "exec("
    - "__import__"
    - "compile("
    - "globals("
    - "locals("
```

---

### MCP 服务器

```yaml
mcp:
  servers:
    - name: "tavily"
      enabled: true                    # 开启/关闭服务器
      description: "Web search engine"
      instruction: "Use for web searches..."
      tool_exposure_mode: "summary"    # "summary" 或 "full"
      transport: "stdio"               # "stdio"、"http" 或 "sse"
      command: "npx"
      args: ["-y", "tavily-mcp@latest"]
      env:
        TAVILY_API_KEY: "${TAVILY_API_KEY}"

    - name: "alphavantage"
      enabled: false
      transport: "http"
      url: "https://mcp.alphavantage.co/mcp?apikey=${ALPHA_VANTAGE_API_KEY}"

  # 工具发现
  tool_discovery_enabled: true
  lazy_load: true       # 按需加载工具（推荐）
  cache_duration: 300   # 缓存工具元数据 5 分钟
```

**传输类型**：
- `stdio` - 标准 I/O（最常见，作为子进程运行）
- `http` - HTTP 端点
- `sse` - 服务器发送事件

**MCP工具暴露模式**：
- `summary` - 简短工具描述（推荐）
- `full` - 包含所有参数的完整签名（用于高频调用的工具）

**添加自定义 MCP 服务器**：

```yaml
- name: "my-custom-server"
  enabled: true
  description: "My custom MCP server"
  instruction: "When to use this server..."
  tool_exposure_mode: "summary"
  transport: "stdio"
  command: "uv"
  args: ["run", "python", "mcp_servers/my_server.py"]
  env:
    MY_API_KEY: "${MY_API_KEY}"
```

---

### 文件系统

```yaml
filesystem:
  working_directory: "/home/daytona"  # 沙箱根目录
  allowed_directories:
    - "/home/daytona"
    - "/tmp"
  enable_path_validation: true        # 根据允许列表验证路径
```

---

### 云存储

```yaml
storage:
  # 用于自动上传图表/图像的提供商
  # 选项：s3、r2、oss、none
  provider: "s3"
```

所有凭证从 `.env` 加载。配置以下之一：

**Cloudflare R2**（推荐 - 零出口费用）：
```bash
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket
R2_PUBLIC_URL_BASE=https://your-bucket.r2.dev  # 可选
```

**AWS S3**：
```bash
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket
S3_REGION=us-east-1
S3_PUBLIC_URL_BASE=https://your-bucket.s3.amazonaws.com  # 可选
```

**阿里云 OSS**：
```bash
OSS_ACCESS_KEY_ID=your-access-key
OSS_ACCESS_KEY_SECRET=your-secret-key
OSS_BUCKET_NAME=your-bucket
OSS_REGION=oss-cn-hangzhou
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
```

设置 `provider: "none"` 以禁用图像上传。

---

### 日志

```yaml
logging:
  level: "INFO"        # DEBUG、INFO、WARNING、ERROR、CRITICAL
  format: "json"       # "json" 或 "text"
  file: "logs/ptc.log"
```

---

### Agent

```yaml
agent:
  # 使用自定义文件系统工具
  # true：自定义工具（Read、Write、Edit、Glob、Grep）具有更多选项
  # false：DeepAgent 的原生中间件工具
  use_custom_filesystem_tools: true
```

自定义工具提供：
- 带有 output_mode、multiline、context lines、文件类型过滤的 Grep
- 优化后的glob 模式
- 带行号的文件读取

---

## llms.json

定义可用的 LLM 提供商。

### 结构

```json
{
  "llms": {
    "model-name": {
      "model_id": "actual-model-id",
      "provider": "anthropic|openai|google",
      "sdk": "langchain_module.ClassName",
      "api_key_env": "ENV_VAR_NAME",
      "base_url": "https://custom-endpoint",  // 可选
      "output_version": "responses/v1",       // 可选（OpenAI）
      "use_previous_response_id": true        // 可选（OpenAI）
      "parameters": {
        "key": "value"
      }
    }
  }
}
```

### 必填字段

| 字段 | 描述 |
|------|------|
| `model_id` | 发送到 API 的实际模型标识符 |
| `provider` | 提供商名称：`anthropic`、`openai`、`google` |
| `sdk` | LangChain SDK 类：`langchain_anthropic.ChatAnthropic`、`langchain_openai.ChatOpenAI` 等 |
| `api_key_env` | 包含 API 密钥的环境变量 |

### 可选字段

| 字段 | 描述 |
|------|------|
| `base_url` | 自定义 API 端点（用于代理或替代提供商） |
| `output_version` | OpenAI 特定的输出格式 |
| `use_previous_response_id` | OpenAI 特定的响应链接 |
| `parameters` | 模型特定参数（如 OpenAI 的 `reasoning.effort`，通义千问的 `enable_thinking`） |

### 添加新 LLM 提供商

#### 第一步：选择正确的 SDK

| 模型类型 | 推荐 SDK | 说明 |
|----------|----------|------|
| Anthropic 原生 | `langchain_anthropic.ChatAnthropic` | Claude 模型 |
| OpenAI 原生 | `langchain_openai.ChatOpenAI` | GPT 模型，支持 responses API |
| Google | `langchain_google_genai.ChatGoogleGenerativeAI` | Gemini 模型 |
| OpenAI 兼容 + 推理输出 | `langchain_deepseek.ChatDeepSeek` 或 `langchain_qwq.ChatQwen` | 用于捕获推理/思考 token |
| 交织思考模型 | `langchain_anthropic.ChatAnthropic` | Minimax、Kimi K2 - 使用提供商的 Anthropic 端点 |

#### SDK 选择指南

1. **标准 OpenAI 兼容模型**：使用 `langchain_openai.ChatOpenAI`

2. **带推理/思考输出的模型**：如果模型通过 OpenAI completion API 输出推理 token，使用 `langchain_deepseek.ChatDeepSeek` 或 `langchain_qwq.ChatQwen` 来正确捕获推理内容。
   ```json
   {
     "qwen3-max": {
       "sdk": "langchain_qwq.ChatQwen",
       "parameters": { "enable_thinking": true }
     }
   }
   ```

3. **OpenAI Responses API 支持**：部分模型（如豆包）支持 OpenAI 的 responses API。
   ```json
   {
     "doubao-seed-code": {
       "sdk": "langchain_openai.ChatOpenAI",
       "output_version": "responses/v1",
       "use_previous_response_id": true
     }
   }
   ```

4. **交织思考模型（Minimax、Kimi K2）**：这些模型具有类似 Claude 的原生交织思考能力。使用 `langchain_anthropic.ChatAnthropic` 配合提供商的 Anthropic 兼容端点。
   ```json
   {
     "kimi-k2-thinking": {
       "sdk": "langchain_anthropic.ChatAnthropic",
       "base_url": "https://api.moonshot.ai/anthropic"
     }
   }
   ```
   > **注意**：第三方提供商（如 OpenRouter）对交织思考的支持可能较差 - 建议使用直连提供商端点。

#### 第二步：验证 Base URL 和区域设置

- 查阅提供商文档获取正确的端点
- 注意区域差异（如 `api.z.ai` 与区域变体）
- 国内提供商通常有不同区域的不同端点

#### 第三步：添加配置

1. 添加定义到 `llms.json`：
```json
{
  "llms": {
    "my-custom-model": {
      "model_id": "custom-model-v1",
      "provider": "my-provider",
      "sdk": "langchain_anthropic.ChatAnthropic",
      "api_key_env": "MY_CUSTOM_API_KEY",
      "base_url": "https://api.my-provider.com/anthropic"
    }
  }
}
```

2. 添加 API 密钥到 `.env`：
```bash
MY_CUSTOM_API_KEY=your-api-key
```

3. 更新 `config.yaml`：
```yaml
llm:
  name: "my-custom-model"
```

---

## 配置示例

### 最小配置

只需要一个 LLM 提供商和 Daytona。使用内置的 yfinance MCP 服务器（无需额外 API 密钥）。

**config.yaml**：
```yaml
llm:
  name: "claude-sonnet-4-5"  # 或任何已配置的模型

mcp:
  servers:
    - name: "tavily"
      enabled: false  # 需要 TAVILY_API_KEY

    - name: "yfinance"
      enabled: true
      transport: "stdio"
      command: "uv"
      args: ["run", "python", "mcp_servers/yfinance_mcp_server.py"]

storage:
  provider: "none"
```

**.env**：
```bash
# 一个 LLM 提供商（选择一个）
ANTHROPIC_API_KEY=your-key
# 或 OPENAI_API_KEY、GEMINI_API_KEY、ZAI_API_KEY 等

# Daytona（必需）
DAYTONA_API_KEY=your-key
```

### 完整配置（多 LLM + 存储）

**config.yaml**：
```yaml
llm:
  name: "claude-opus-4-5"

daytona:
  snapshot_enabled: true
  snapshot_name: "ptc-full-v1"

mcp:
  servers:
    - name: "tavily"
      enabled: true
      transport: "stdio"
      command: "npx"
      args: ["-y", "tavily-mcp@latest"]
      env:
        TAVILY_API_KEY: "${TAVILY_API_KEY}"

    - name: "yfinance"
      enabled: true
      transport: "stdio"
      command: "uv"
      args: ["run", "python", "mcp_servers/yfinance_mcp_server.py"]

storage:
  provider: "r2"

logging:
  level: "DEBUG"
```

**.env**：
```bash
ANTHROPIC_API_KEY=your-key
DAYTONA_API_KEY=your-key
TAVILY_API_KEY=your-key
R2_ACCOUNT_ID=your-account
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET_NAME=your-bucket
LANGSMITH_API_KEY=your-key
```
