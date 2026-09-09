// unified model API gateway

# 让每位 AI 创造者，  少走一步弯路

兼容 OpenAI / Claude / Gemini 等协议，覆盖文本、图像、视频、语音，智能路由，统一计费。

[免费开始](https://tokendance.space/keys) [查看文档](https://tokendance.space/docs/quickstart)

[战略合作方![无问芯穹](https://tokendance.space/infini-ai-logo-white.png)](https://cloud.infini-ai.com/)

terminal

```
$ curl https://tokendance.space/gateway/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{
    "model": "MODEL_ID",
    "messages": [{\
      "role": "user",\
      "content": "Hello World!"\
    }]
  }'
```

200 OK · latency 312ms · tokens 42

已有项目？让 coding agent 直接完成接入

交给 AI

TOKENDANCE

OpenAI 协议Claude 协议Gemini 协议智能路由统一计费模型丰富安全可靠开箱即用OpenAI 协议Claude 协议Gemini 协议智能路由统一计费模型丰富安全可靠开箱即用OpenAI 协议Claude 协议Gemini 协议智能路由统一计费模型丰富安全可靠开箱即用OpenAI 协议Claude 协议Gemini 协议智能路由统一计费模型丰富安全可靠开箱即用

Features

## 为接入 AI 模型的开发者而造。

`baseURL: "tokendance.space"`

### 多协议兼容

原生支持 OpenAI、Claude、Gemini 文本协议，覆盖图像 / 视频 / 文本转语音生成。无需修改代码，切换 Base URL 即可接入。

`route(model) → provider`

### 智能路由

根据模型名称自动路由至对应供应商。一个入口，无需关心底层调度。

`billing.unified()`

### 统一计费

跨供应商统一 Token 消耗统计与账单。告别多平台分别充值的混乱。

`fallback: model[] → provider[]`

### 容错降级

同一模型支持多供应商端点自动切换；单次请求可指定多个候选模型，逐级降级，保障服务持续可用。

`models.list() → 8+`

### 模型丰富

接入 MiniMax、通义千问、Kimi、智谱、DeepSeek 等国内头部模型。持续扩展中。

`import OpenAI from "openai"`

### 开箱即用

Watcha 一键登录，分钟级接入。兼容现有 SDK，零迁移成本。

// how it works

## 三步接入，分钟级上线

[01\\
\\
**注册账号** \\
\\
通过 Watcha 一键登录，即刻开始使用。\\
\\
→](https://tokendance.space/login) [02\\
\\
**创建 API Key** \\
\\
在控制台创建密钥，支持多 Key 管理与权限控制。\\
\\
→](https://tokendance.space/keys) [03\\
\\
**发起请求** \\
\\
使用你熟悉的 SDK 调用任意模型，完全兼容原生协议。\\
\\
→](https://tokendance.space/docs/quickstart)

Quick Start

## 快速开始

OpenAIClaudeGemini

cURLPythonNode.js

```
curl https://tokendance.space/gateway/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "MODEL_ID",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

[Documentation\\
\\
阅读完整文档，了解更多用法\\
\\
→](https://tokendance.space/docs/quickstart)

// pricing

## 获取 Token 额度

[**百亿 Token 补贴计划** \\
AI 时代，Token 正在成为硬通货。当 Agent 开始吞噬软件，一个人也可以像一支队伍。我们在内测期间开启百亿 Token 补贴计划，赋能 AI 时代的超级个体 —— 无论你正在验证场景、打磨产品，还是准备扩大规模，都欢迎申请。\\
查看详情 →](https://mp.weixin.qq.com/s/D_ZmohSbk1RiR1W1W4EWDQ)

限量 500 张

### 浦发观猹联名卡

「浦耳猹」

前 200 位办理用户，赠送近千万 Token（折合 RMB 100 元）

[立即申请 →](https://mp.weixin.qq.com/s/kWmrIU4IYxuCIDzLFQAvXg) [Token 申请问卷 →](https://agentuniverse.feishu.cn/share/base/form/shrcnvZvZq6hK2xgBvVGIuKpR5e)

### 观猹开发者计划

加入开发者计划，赠送超值 Token 额度。获取技术支持与优先体验新模型的机会。

[了解详情 →](https://agentuniverse.feishu.cn/wiki/J2FPwJp7zi6D6wklFbrcPbVNnNe)

免费注册，分钟级接入。兼容你现有的 SDK 和工作流。