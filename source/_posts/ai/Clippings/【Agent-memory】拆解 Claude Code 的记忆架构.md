---
title: "【Agent-memory】拆解 Claude Code 的记忆架构"
date: 2026-06-18 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://mp.weixin.qq.com/s/obUPzBCqQlq5vqJt_AEQUw"
original: true
index_img: /img/covers/ai.svg
banner_img: /img/covers/ai.svg
updated: 2026-07-12
---

> 原文来源：https://mp.weixin.qq.com/s/obUPzBCqQlq5vqJt_AEQUw

LZY 行板漫录 *2026年4月27日 19:27*

---

**TL;DR**

**Markdown is all you need.**

没有语义检索，没有向量库，没有 embedding——只有 md 文件和对应的索引文件（同样也是 md）。md 的提取、维护、检索全部交给 sub-agent（部分由 main-agent 完成）。

极简主义的存储哲学：纯文件系统、多层级、可解释、极易迁移。

## 写在前面

如何让 agent 越跑越好，给agent套上memory，这是市面上绝大多数Agent-harness都在做的事情。当绝大多数harness 为了memory而引入向量索引，引入RAG时，Claude-code 依旧走着之前的grep 的老路：只使用markdown文件；反直觉的极简主义，恰恰因为源码泄露，让我们有机会一窥其全貌。

简单来说，Claude Code 的 memory 可分为<mark style="background:#ff4d4f"> CLAUDE.md 和 Auto-memory </mark>两大类（也对应着不同时间段的发展）。 **这篇文章更着墨于 auto-memory** ，CLAUDE.md 的相关内容放在附录——毕竟这些内容在绝大多数 vibe-coding 教学和官方文档中都能找到。

后文讨论的 memory，默认指 auto-memory。

## Claude-code memory 概览

两大核心：

1. 1\. **Auto memory** ：Claude 自动保存有用的上下文，如项目模式、关键命令和你的偏好。存储在 `~/.claude/projects/<project>/memory/` 目录中。
2. 2\. **CLAUDE.md 文件** ：你编写和维护的 markdown 文件，包含给 Claude 的指令、规则和偏好。

| 特性 | CLAUDE.md | Auto Memory |
| --- | --- | --- |
| **谁写的** | 你（用户/团队） | Claude 自动写入 |
| **内容** | 规则、指令、项目约定 | 学习到的偏好和模式 |
| **存储位置** | 项目目录 / 用户目录 | `~/.claude/projects/.../memory/` |
| **是否应提交到 git** | **是**  （团队共享） | **否**  （个人机器本地） |

Claude Code 的 Memory 系统是一个 **多层次的持久化架构** ，为了让 agent 能够：

- • 记住用户信息（角色、偏好、知识背景）
- • 记录项目细节（约定、进行中的工作、外部系统引用）
- • 在跨会话中保持上下文连续性
- • 支持团队协作和知识共享
![图片](https://mmbiz.qpic.cn/mmbiz_png/K4eiceBl3nbSQexITYGOKibOdHdE6sV9L2myZ5en7xWk2vn0Jm4arLZSeNrlZdcoQh93L2rvKZM6k0DFDWNGENRriaOY5GMkdHxY202FgUyAFE/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=0)

其核心 **设计原则**

| 原则 | 说明 |
| --- | --- |
| **分层存储** | 从临时会话记忆到持久化跨项目记忆的多层架构 |
| **作用域隔离** | user/project/local/team 四种作用域，明确数据边界 |
| **可推导不存储** | 能从代码/git 推导的信息不存入 Memory |
| **用户控制** | 用户可审查、修改、删除任何记忆 |
| **渐进式整理** | Remember Skill 帮助用户整理和升级记忆 |

## Memory 文件格式和存储方式

Memory 系统使用 Markdown 文件存储，按作用域分散在不同目录：

| 类型 | 路径 | 说明 |
| --- | --- | --- |
| `MEMORY.md` | `~/.claude/projects/<path>/memory/` | Auto-memory 索引 |
| 记忆文件 | `~/.claude/projects/<path>/memory/` | 具体记忆条目 |
| `CLAUDE.md` | 项目根目录 | 项目级指令 |
| `CLAUDE.local.md` | 项目根目录 | 本地私有指令 |
| Session Memory | `~/.claude/session-memory/` | 会话临时笔记 |
| Agent Memory | `~/.claude/agent-memory/<type>/` | Agent 持久记忆 |
| Team Memory | `~/.claude/projects/<path>/memory/team/` | 团队共享记忆 |

所有 Memory 文件使用 YAML Frontmatter 格式，位于文件开头：

```
---
name: {{memory name}}
description: {{one-line description}}
type: {{user, feedback, project, reference}}
---

{{memory content}}
```

`MEMORY.md` 作为索引文件，每行一个条目，格式为：

```
- [Title](file.md) — one-line hook
```

当内容超过 200 行时，Claude 会将详细笔记拆分到单独的主题文件中。核心限制如下：

```
// src/memdir/memdir.ts:34-38
export const ENTRYPOINT_NAME = &#x27;MEMORY.md&#x27;
export const MAX_ENTRYPOINT_LINES = 200        // 最大行数
export const MAX_ENTRYPOINT_BYTES = 25_000     // 最大字节数 (~25KB)
```

**示例** ：

```
# Auto Memory

- [Go Developer Background](user_go_background.md) — User has 10 years Go experience, new to React
- [Database Testing Policy](feedback_db_testing.md) — Integration tests must hit real database
- [Mobile Release Freeze](project_release_freeze.md) — Merge freeze begins 2026-03-05
- [Pipeline Bug Tracker](reference_linear_ingest.md) — Bugs tracked in Linear project "INGEST"
```

## Memory分层设计

Claude Code 没有把所有记忆混为一谈，而是根据生命周期和作用域设计了四种严格隔离的记忆类型。这种分层不是过度工程化，而是让每个记忆条目天然知道自己该存在多久、谁能访问、何时失效。

这四个概念（Auto-memory、Session-memory、Agent Memory 和 Team Memory）在生命周期、作用域、服务对象和触发机制上各有明确的分工，共同构成了 Claude Code 完整的记忆与上下文管理闭环

| **维度** | **Auto-Memory** | **Session-Memory** | **Agent-Memory** | **Team-Memory** |
| --- | --- | --- | --- | --- |
| 对外开放 | 是 | 否（仅对 'ant' 用户开放） | 否（仅对 'ant' 用户开放） | 否（仅对 'ant' 用户开放） |
| **定位** | 跨会话的持久项目知识 | 当前会话的临时摘要笔记 | 特定 Agent 类型的专业知识 | 团队协作共享知识 |
| **持久性** | 永久（磁盘文件） | 会话级（随会话结束失效） | 永久（按 agent type 隔离） | 永久（服务器同步） |
| **存储路径** | `~/.claude/projects/<path>/memory/` | `{projectDir}/{sessionId}/session-memory/summary.md` | `~/.claude/agent-memory/<type>/`  或 `.claude/agent-memory/<type>/` | `~/.claude/projects/<path>/memory/team/` |
| **写入者** | 后台 forked agent（ `extractMemories` ） | 后台 forked agent（ `sessionMemory hook` ） | 子 Agent 自己（手动/自主） | 任何协作者（本地写入 + 同步） |
| **写入触发** | 每轮对话结束（ `stop hook` ） | 每轮对话后（ `post-sampling hook` ），满足 token/工具调用阈值 | Agent 执行中自主决定 | 用户/模型通过工具写入 |
| **读取注入** | `relevant_memories`  attachment（异步预取） | Compact 时作为 summary 注入 | `loadAgentMemoryPrompt`  注入 system prompt | 与 auto-memory 合并注入 |
| **整合机制** | `auto-dream`  （24h + 5 sessions） | 无（会话结束即丢弃） | 无（agent 自己管理） | 服务器端合并 + 乐观锁冲突解决 |
| **scope** | personal / team | session-only | user / project / local | team（按 owner/repo） |

这种分层设计的本质是用作用域隔离代替权限控制——不同记忆天然属于不同的访问边界，不需要额外的 ACL 检查，读取时按路径规则即可确定可见性。

![图片](https://mmbiz.qpic.cn/mmbiz_png/K4eiceBl3nbSgBlVGulQHibRJfJLHicbstalKB9h7NsRyr09iaaS8accboky6VQba6jz2UJzJrwiaIGNMPtsnSR5gPPuJRXgKmIWGKX8zxeHcM5A/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=3)

## Auto-memory（核心长期记忆）

主要用于跨会话（cross-session）记录不可从代码中直接推导的信息，文件的物理存储路径是按项目隔离

```
~/.claude/projects/<project-path>/memory/          ← personal                                                                
~/.claude/projects/<project-path>/memory/team/     ← team
```

Auto-memory 的存储格式和索引机制在「存储方式」一节已有详述（Markdown 文件 + MEMORY.md 索引 + YAML Frontmatter），这里不再重复。需要强调的是，它的内容被严格限制为一个 **不可扩展的闭集** ，包含 4 种类型：

| 类型 | 核心定位 | 解决什么问题 | Scope | 结构要求 |
| --- | --- | --- | --- | --- |
| `user` | 用户画像型 | "你是谁"——角色、经验、偏好 | Always private | — |
| `feedback` | 行为指导型 | "你喜欢我怎样工作"——避免/保持什么 | Default private | Rule + Why: + How to apply |
| `project` | 项目上下文型 | "项目正在发生什么"——截止日期、发布计划 | Bias toward team | Fact + Why: + How to apply |
| `reference` | 外部指针型 | "信息在哪里"——Linear、Slack、Grafana | Usually team | — |

采用闭集而非开放分类，是因为 Agent 的"自由存储"往往意味着不可控的记忆膨胀和检索噪声。严格限定四种类型，等于在写入阶段就定义了"什么不该存"——能从代码推导的、纯临时性的、无复用价值的信息，都被拦在记忆系统之外。这种前置过滤比后期的检索排序更有效。

通过后台的 系统在每轮对话结束时自动提取增量知识； 并通过 机制在后台定期（如24小时）进行记忆的合并、去重和索引维护

主要分为 Private（个人私有）和 Team（团队共享）两种存储边界

## Session-memory (临时会话状态)

**Working Memory**

Session Memory 是 Claude Code 的 **工作记忆** ——它不像 Auto Memory 那样追求跨会话的持久积累，而是专注于 **当前会话的上下文锚点** 。

其服务于 **Context Compaction** 场景：当对话历史被压缩时，Session Memory 提供了恢复上下文的锚点。结构化笔记比临时生成的摘要更准确，且避免了额外的 API 调用开销。

**注: 仅对 'ant' 用户开放 （Anthropic 内部）**

物理文件被存放在

从CC的 **Context Compaction** 来看

- • **第一层：Microcompact** ：每轮请求前自动删除旧的工具结果
- • **第二层：Session Memory 优先压缩** ：当上下文达到阈值时触发，直接利用后台预先生成的 Session Memory 笔记来恢复上下文，避免额外的 API 调用且结构化笔记比临时生成的摘要更准确
- • **第三层：传统压缩（Full Compact）** ：只有在缺乏 Session Memory 时才作为兜底触发，这需要消耗较高的 Token 成本（通过 Forked Agent 去阅读全局并生成摘要）

| 维度 | Session Memory | Auto Memory |
| --- | --- | --- |
| **生命周期** | Session 级别 | 项目级别，跨 Session 持久 |
| **内容性质** | 临时笔记、当前状态 | 长期知识、用户偏好 |
| **触发频率** | 频繁（每 5K tokens） | 定期（ `/dream` 技能） |
| **存储位置** | `~/.claude/projects/{project}/{session}/session-memory/summary.md` | `~/.claude/projects/{project}/memory/` |
| **主要用途** | Context Compaction 恢复 | 跨会话知识积累 |

### 触发机制

基于 Token 增长和工具调用阈值（如超过 10,000 tokens 后每增长 5,000 tokens 且有 3 次工具调用）在后台通过 Forked Agent 自动提取

![图片](https://mmbiz.qpic.cn/mmbiz_png/K4eiceBl3nbTKgyUSInk9ntp1HWsFibS8jdDeicaAEia3MEH7lHPyXMGibSZhCN2DJ64CgAib8QUf0lHeTIRvIxjYeluNDV18RSVOI7hFWeKD6vg8/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=5)

**自然对话断点检测** ： 如果上一轮助手消息没有工具调用，说明当前处于自然对话断点（用户和助手纯文本交流），此时即使工具调用阈值未满足，只要 token 阈值满足，也会触发提取。

首次触发阈值为 tokens，此后每增长 tokens 且期间有至少 次工具调用，就会启动更新

利用模型刚完成回复、主循环还在执行的间隙，异步做一些轻量级的状态更新和提取工作，且 **不阻塞用户看到回复**

### 后台运行机制

**Forked Agent 架构 + 上下文隔离机制**

Session Memory 的后台 Agent **只被允许使用 FileEditTool 一项工具** 。它无法执行命令、无法派生新代理，只被允许去编辑那个特定的 文件

**后台 Agent 的任何操作都不会影响主 Agent 的运行状态。**

### 模板结构设计

为防止在长对话中被撑爆，设计了一个极其严苛的 10 个 Section 的 Markdown 模板，整个文件被硬性限制在 tokens 以内，单个 Section 不允许超过 tokens

```
# Session Title
_A short and distinctive 5-10 word descriptive title for the session_

# Current State
_What is actively being worked on right now?_

# Task specification
_What did the user ask to build?_

# Files and Functions
_What are the important files?_

# Workflow
_What bash commands are usually run and in what order?_

# Errors & Corrections
_Errors encountered and how they were fixed_

# Codebase and System Documentation
_What are the important system components?_

# Learnings
_What has worked well? What has not?_

# Key results
_If the user asked a specific output..._

# Worklog
_Step by step, what was attempted, done?_
```
![图片](https://mmbiz.qpic.cn/mmbiz_png/K4eiceBl3nbS0pnNn8hxIoMw2d827THVZAtbmWncDa5Ngos8iaYuFfp5TcW9vYltFAMW2BIVZKJ7ZtibJSNTyfdibOFK8jQibdNicv3toxMzYYFAI/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=7)

后台 Agent 被系统提示词强硬要求：“必须保留所有 Section Headers 和斜体描述行不变”。以维持状态结构，

```
// prompts.ts 第 56-61 行
-- NEVER modify, delete, or add section headers
-- NEVER modify or delete the italic _section description_ lines
-- The italic _section descriptions_ are TEMPLATE INSTRUCTIONS
-- ONLY update the actual content that appears BELOW the italic _section descriptions_
```

## Agent Memory (subagent专属记忆)

**注: 仅对 'ant' 用户开放 （Anthropic 内部）**

由于主 Agent 会 Fork 出不同类型的子 Agent 来执行特定任务（如探索代码、验证测试），这些子代理需要独立于主对话的记忆空间，以防止污染人类与主 Agent 的 Auto-memory

使得在复杂任务的拆解和委派过程中，不同代理之间的知识能够独立沉淀，互不干扰， 更像是 **子 Agent 的持久化工作空间**

**Agent-memory 的本质是"不污染主记忆"的隔离机制。** 子 Agent 产生的大量专业细节如果写入 Auto-memory，会严重污染用户的个人画像。

| **维度** | **Auto-memory** | **Agent-memory** |
| --- | --- | --- |
| **存储格式** | YAML frontmatter + MEMORY.md 索引 | 完全相同的格式 |
| **底层基础设施** | memdir.ts、buildMemoryPrompt | 复用同一套 memdir 基础设施 |
| **作用域概念** | personal / team | user / project / local |
| **注入方式** | 作为 attachment 注入主对话 system prompt | 作为 system prompt appendix 注入子 Agent |
| **目录隔离** | 按项目隔离 | 按 agentType + scope 双重隔离 |

main-agent 同subagent之间的memory隔离：

- • 高度聚焦特定任务的子代理， 产生的大量专业细节和工作草稿会严重污染用户的个人画像和核心项目偏好
- • 需要在子 Agent 的定义中通过 字段显式启用。一旦启用，系统会自动为该子代理注入文件操作工具（Read/Edit/Write）

### 存储路径

| 作用域 | 路径 | 说明 |
| --- | --- | --- |
| **user** | `~/.claude/agent-memory/<agentType>/` | 跨所有项目共享 |
| **project** | `<cwd>/.claude/agent-memory/<agentType>/` | 项目级，可版本控制 |
| **local** | `<cwd>/.claude/agent-memory-local/<agentType>/` | 本地机器专用 |

### 存储格式

与 Auto Memory 相同的 YAML frontmatter 格式

**快照（Snapshot）**

快照机制允许团队将一个已经"训练"好的子代理的记忆（包含预配置的指令和经验）打包

|  | **Auto-memory** | **Agent-memory** |
| --- | --- | --- |
| **本质** | 全自动的经验沉淀系统 | 子 Agent 的持久化工作目录 |
| **谁写入** | 后台提取 agent（自动） | 子 Agent 自己（手动/自主） |
| **谁读取** | 主 Agent 每轮自动加载 | 子 Agent 启动时注入 |
| **有整合机制** | ✅ auto-dream | ❌ 无 |
| **有自动提取** | ✅ extractMemories | ❌ 无 |
| **团队共享** | ✅ team memory | ✅ snapshot 机制 |

Agent-memory 没有自动提取和自动整合的能力，它只是一个挂载到子 Agent system prompt 中的可读写工作空间，由子 Agent 自己决定存取什么内容。可以理解为 **Auto-memory 的存储层 + 子 Agent 的作用域隔离** ，但缺少 Auto-memory 的灵魂——自动沉淀。

![图片](https://mmbiz.qpic.cn/mmbiz_png/K4eiceBl3nbRyMMTUWRY7k4N3kPSC5YolNAyym6XuCrfEAPbY7iagRhBZyTqWhjHelMXQlxwwF92huK9HfehCWo4cYg67GvVbZXQ9WLNkOpso/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=8)

## Team-Memory

**注: 仅对 'ant' 用户开放 （Anthropic 内部）**

Team Memory Sync 是 Claude Code 的 **团队协作记忆系统** ，允许同一 GitHub 仓库的多个协作者共享和同步记忆文件。它构建在 Auto Memory 之上，通过 REST API 实现跨设备的实时同步。

Team Memory 不是独立的系统，而是 Auto Memory 的协作扩展——两者共享相同的格式、相同的提取机制，只是作用域不同。

### 同步机制

通过 **REST API 实现跨设备的实时后台同步**

- • Team Memory 以 GitHub 仓库（）作为自然协作边界， 而不是用户本地的文件路径； GitHub 仓库本身就是团队协作的天然边界，同一仓库的不同 worktree、不同分支，都对应同一个 owner/repo，在任何机器上都一样，而本地路径因人而异
- • **文件监控与自动触发** ：客户端通过操作系统原生的 （如 macOS 上的 FSEvents）实时监听本地团队记忆目录的变更；为了避免用户在批量编辑文件时引发频繁的网络请求，系统引入了 **2 秒的防抖（debounce）机制** ，在编辑动作停止 2 秒后才会自动触发推送
- • **基于内容哈希的增量同步（Delta Upload）** ：为了极大地节省带宽并降低 API 开销，同步时客户端会先计算文件的内容哈希。系统配合 HTTP 的 缓存头（返回 ），只打包并上传那些真正发生了变更的记忆文件（Delta），并且限制每批次上传不超过 200KB
- • **安全审查拦截** ：在任何增量数据推向服务器之前，必须通过客户端内置的安全扫描引擎， 系统集成了 24 条高置信度的 Gitleaks 正则规则，专门扫描 AWS 凭证、GitHub PAT、OpenAI/Anthropic 密钥以及 Stripe 支付 Token 等敏感信息

### 如何解决冲突？

由于团队成员可能同时修改同一份项目记忆， 系统必须处理多端并发修改引发的冲突；采用了云端 **乐观并发控制（Optimistic Concurrency）**

- • **ETag 与 If-Match 的乐观锁机制** ：系统通过维护一个包含哈希值的 结构来追踪文件版本， 在执行更新操作时，API 请求会带上 头，服务器比对如果版本一致则写入；如果不一致，服务器会拒绝并返回 状态码
- • **冲突重试与哈希探测** ：当遇到 412 冲突时，客户端并不会直接崩溃，而是会向服务器发起一个探测请求（）仅拉取最新的元数据哈希表，刷新校验和并尝试再次解决冲突
- • **Local Wins（本地优先）策略** ：当发生 Push 操作的代码合并冲突时，系统强制采用 **Local Wins** 的策略来解决， 必须保护用户当前在本地的工作成果，绝不能因为云端同步而"静默丢失"用户的本地修改， 而在执行 Pull（拉取）操作时，则默认服务器为准（Server wins）
- • **删除不传播设计** ：为了防止单点失误导致整个团队的知识资产受损，系统设定了本地记忆文件的 **删除操作不会同步到服务器** 的机制；这样不仅规避了复杂的"删除冲突"逻辑，也确立了服务器数据作为团队共识的权威性

### 与 Auto Memory 的关系

```
~/.claude/projects/{project}/memory/
├── MEMORY.md              (Auto Memory 入口)
├── *.md                   (个人记忆文件)
└── team/                  (Team Memory 目录)
    ├── MEMORY.md          (团队记忆入口)
    └── *.md               (团队共享文件)
```

两者共享相同的 Markdown + YAML Frontmatter 格式

两者的知识来源是相同的，都由后台的 子代理系统自动提取, 系统会通过携带 标签,决定从当前对话中提取的知识点应该写给个人还是写入团队

**差异性：**

- • Scope 隔离:User（用户画像）,被强制要求 **Always private**
- • **Feedback（偏好反馈）** ：通常也是默认保存在本地 Auto-memory，除非用户明确将其定义为"全项目应遵循的约定"，才会放入团队存储
- • **Project 和 Reference** ：这两种记录项目进度要求和外部链接,天生就带有公共属性，因此系统在提取时会Bias toward team / Usually team 将其存入 Team Memory

**API 行为**

| 状态码 | 含义 | 处理 |
| --- | --- | --- |
| 200 | 成功 | 更新本地状态 |
| 304 | 未修改（ETag 匹配） | 跳过处理，节省带宽 |
| 404 | 仓库无 team memory | 视为空状态 |
| 412 | 冲突（ETag 不匹配） | 刷新校验和并重试 |
| 413 | 条目过多 | 学习服务器限制并截断 |

![图片](https://mmbiz.qpic.cn/sz_mmbiz_png/K4eiceBl3nbT79Uiav1GKLqibTnFQnLbFshTVPsia2vEicTXqFJGNsy5KKR3ptnhQ7GHRnticVJtBR3JaC5dPcj6MRpvkib0PDT6hKR2y0icq32J8xY/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=11)

## 后台自动化机制(Memory 提取)

| 维度 | `extractMemories` | `autoDream` |
| --- | --- | --- |
| **触发频率** | 每轮对话结束（默认） | 满足时间+session 阈值后触发（默认 24h + 5 sessions） |
| 触发机制 | Stop-hook | post-sampling-hook |
| **职责** | 逐轮提取新对话中的知识点，写入单个 memory 文件 | 定期整合、合并、清理已有 memories，维护 `MEMORY.md` 索引 |
| **代理模式** | Forked subagent | Forked subagent |
| **工具权限** | 相同： `createAutoMemCanUseTool` | 相同 |
| **用户可见性** | 完成后内联 "Saved N memories" 消息 | 以 `DreamTask` 形式出现在 Background Tasks，完成后也可能内联 "Improved N memories" |
| **互斥关系** | 若主 agent 已写入 memory，跳过该轮提取 | 与主 agent 不直接互斥，通过 lock 文件保证单进程执行 |

**两者是互补关系** ：

- • `extractMemories` 负责 **增量捕获** （每轮对话的短期知识沉淀）
- • `autoDream` 负责 **定期整理** （长期记忆的合并、去重、索引维护）

两者的关系像是"记账员"和"财务总监"——一个负责每笔记录的准确性，一个负责定期对账和归档。

### Auto-Dream

**auto-dream** （也称 memory consolidation）是一套在对话结束后自动触发的 **记忆整合子代理系统** ，与 `extractMemories` （逐轮自动提取）并行运行，但职责和触发条件不同。

- • **高频增量捕获（收集）：** `extractMemories` 在每轮对话结束时运行，将碎片化知识写入单个文件
- • **低频定期整合（整理）：** `auto-dream` 对这些碎片化提取进行补充，负责合并、去重、矛盾解决以及 `MEMORY.md` 索引的修剪维护

auto-dream 在 **每轮对话结束** 时由 `handleStopHooks` 调用 `executeAutoDream` ，但内部有严格的门控顺序（按成本从低到高）。它没有采用简单的定时器，而是使用 **事件驱动结合多重严格门控** 的设计，确保后台机制不会毫无节制地消耗计算资源：

- • **Time Gate** ：距离上次 consolidation 的时间 `>= minHours` （默认 24 小时）
- • **Session Gate** ：自上次 consolidation 以来，有更新的 session transcript 数量 `>= minSessions` （默认 5 个，排除当前 session）
- • **Scan Throttle** ：两次 session 扫描间隔至少 10 分钟，防止反复检查
- • **Lock Gate** ：通过 `.consolidate-lock` 文件锁确保没有其他进程正在执行 consolidation

挂载在每轮对话结束的 `handleStopHooks` 中，使用 `void` （fire-and-forget）方式触发， **绝不阻塞用户的主对话体验** 。调用 `runForkedAgent` 生成一个子代理，与主对话 **共享相同的 Prompt Cache 前缀** 。后台整合任务被隔离在独立的上下文中执行，内部状态和工具调用不会污染主代理的对话历史。

（与 一样）被限制在一个严格的权限沙箱中：

- • **只读探索能力：** 允许使用 Read、Grep、Glob 以及只读的 Bash 命令（如 `ls`, `cat` ）来扫描工作区和日志
- • Edit 和 Write 工具仅被允许在 `auto-memory` 目录下进行操作， **绝对禁止** 其修改用户的代码或项目文件

**Prompt**

`consolidationPrompt.ts:15-64` 定义了 4 阶段任务：

> "You are performing a dream — a reflective pass over your memory files. Synthesize what you've learned recently into durable, well-organized memories..."

- • **Phase 1 — Orient** ：浏览 memory 目录、阅读 `MEMORY.md` 、查看日志
- • **Phase 2 — Gather recent signal** ：从 daily logs、漂移的记忆、transcript 搜索中提取新信息
- • **Phase 3 — Consolidate** ：合并到主题文件，转换相对日期为绝对日期，删除矛盾信息
- • **Phase 4 — Prune and index** ：更新 `MEMORY.md` 索引，保持其在 200 行 / 25KB 以内

### Extract Memories

`extractMemories` 是 Claude Code 的 **后台自动记忆提取系统** ，用于在每个查询循环结束时分析对话内容，自动提取有价值的信息并保存到 Auto Memory 中。与 SessionMemory 的"临时会话笔记"不同，extractMemories 专注于"长期知识沉淀"。

**调用链路**

```
query.ts 主循环
    ↓
模型采样完成
    ↓
postSamplingHook（SessionMemory 触发）
    ↓
handleStopHooks（extractMemories 触发）
    ↓
没有后续工具调用时执行
    ↓
extractMemories
```

**与 postSamplingHook 的区别** ：

| 特性 | postSamplingHook | handleStopHooks |
| --- | --- | --- |
| 执行时机 | 模型采样后立即 | 查询循环结束时 |
| 执行方式 | `void`  fire-and-forget | `yield*`  可阻塞 |
| 返回值 | 无 | 可返回 `blockingErrors` |
| 用途 | SessionMemory、轻量级处理 | Stop hooks、Memory 提取 |

避免重复提取：检测主 agent 是否已写入 memory。当主 agent 主动写入 memories 时，后台提取是冗余的，直接跳过该轮以避免重复写入。

**保存准则（What NOT to Save）**

```
// memoryTypes.ts:183-195
export const WHAT_NOT_TO_SAVE_SECTION = [
  &#x27;## What NOT to save in memory&#x27;,
  &#x27;&#x27;,
  &#x27;- Code patterns, conventions, architecture, file paths...&#x27;,  // 可推导
  &#x27;- Git history, recent changes, or who-changed-what...&#x27;,      // git 是权威
  &#x27;- Debugging solutions or fix recipes...&#x27;,                    // 在代码中
  &#x27;- Anything already documented in CLAUDE.md files.&#x27;,          // 避免重复
  &#x27;- Ephemeral task details: in-progress work...&#x27;,              // 临时状态
]
```

**允许的工具**

```
// extractMemories.ts:171-221
const canUseTool: CanUseToolFn = async (tool, input) => {
  // 1. REPL 工具 - 允许但内部仍需检查
  if (tool.name === REPL_TOOL_NAME) return { behavior: &#x27;allow&#x27;, ... }

  // 2. 读取类工具 - 完全无限制
  if ([FILE_READ, GREP, GLOB].includes(tool.name)) return { behavior: &#x27;allow&#x27;, ... }

  // 3. Bash - 只读限制
  if (tool.name === BASH_TOOL_NAME) {
    if (tool.isReadOnly(parsed.data)) return { behavior: &#x27;allow&#x27;, ... }
  }

  // 4. Edit/Write - 路径限制
  if ([FILE_EDIT, FILE_WRITE].includes(tool.name)) {
    if (isAutoMemPath(filePath)) return { behavior: &#x27;allow&#x27;, ... }
  }
}
```

**Prompt 设计**

```
/**
 * The extraction agent runs as a perfect fork of the main conversation — same
 * system prompt, same message prefix. The main agent&#x27;s system prompt always
 * has full save instructions; when the main agent writes memories itself,
 * extractMemories.ts skips that turn.
 */
```

**关键设计** ：

- • 复用主对话的系统提示（通过 `CacheSafeParams` ）
- • 通过 user prompt 注入提取指令
- • 避免定义独立的 SYSTEM\_PROMPT

## Memory检索

**“轻量级元数据扫描 + LLM决策”** 的两阶段检索机制

### 两阶段检索流程

```
用户 Query
    ↓
[Phase 1: scanMemoryFiles] ──→ 读取目录 → 解析 frontmatter → 按时间排序 → 取前200个
    ↓
过滤 alreadySurfaced（避免重复展示）
    ↓
[Phase 2: selectRelevantMemories] ──→ 构造 manifest → 附加 recentTools → Sonnet 选择
    ↓
返回最多5个 RelevantMemory {path, mtimeMs}
    ↓
readMemoriesForSurfacing ──→ 读取文件内容 → 截断处理 → 附加新鲜度提示
    ↓
作为 relevant_memories attachment 注入对话
```

Phase1:scanMemoryFiles

扫描器在执行时只读取文件开头的前 30 行

使得系统可以极快地提取出每个记忆条目的核心元数据

根目录下的 MEMORY.md 作为索引文件，也提供了快速的寻址辅助

Phase2: selectRelevantMemories

系统会调用专门的检索模块，依靠大模型（具体为 Sonnet 模型）来进行上下文相关性评估

> **为什么选择这种架构？**
> 
> 1. 1\. **计算效率** ：第一阶段是轻量级的本地文件操作，避免将所有 memory 内容都发送到 LLM
> 2. 2\. **成本优化** ：只将 memory 的元数据（文件名、描述、时间戳）而非完整内容传给 LLM
> 3. 3\. **延迟控制** ：扫描阶段可以缓存，选择阶段只处理过滤后的候选集
> 4. 4\. **分层过滤** ： `alreadySurfaced` 在扫描后立即过滤，减少 LLM 需要处理的候选数量

**Sonnet 选择记忆 System Prompt**

```
const SELECT_MEMORIES_SYSTEM_PROMPT = \`You are selecting memories that will be useful to Claude Code as it processes a user&#x27;s query...

Return a list of filenames for the memories that will clearly be useful to Claude Code as it processes the user&#x27;s query (up to 5). Only include memories that you are certain will be helpful based on their name and description.
- If you are unsure if a memory will be useful in processing the user&#x27;s query, then do not include it in your list. Be selective and discerning.
- If there are no memories in the list that would clearly be useful, feel free to return an empty list.
- If a list of recently-used tools is provided, do not select memories that are usage reference or API documentation for those tools (Claude Code is already exercising them). DO still select memories containing warnings, gotchas, or known issues about those tools — active use is exactly when those matter.
\`
```

**结构化输出** ：

```
output_format: {
  type: &#x27;json_schema&#x27;,
  schema: {
    type: &#x27;object&#x27;,
    properties: {
      selected_memories: { type: &#x27;array&#x27;, items: { type: &#x27;string&#x27; } },
    },
    required: [&#x27;selected_memories&#x27;],
    additionalProperties: false,
  },
}
```

### memory的注入机制

基于代码（ `// src/query.ts:297-301` 和 `// src/query.ts:1592-1613` ），memory 的注入机制可以总结为：

**注入方式：异步预取 + Attachment 注入**

不是通过修改 system prompt 注入，而是作为 **attachment** 附加到 user message 中

1\. **预取启动** ：startRelevantMemoryPrefetch（ `// src/utils/attachments.ts:2361` ）启动一个后台异步任务

```
- 提取最后一个真实用户输入（跳过 isMeta 系统注入）

- 调用 getRelevantMemoryAttachments，使用 Sonnet 模型评估 memory 目录中哪些文件最相关

- 最多选中 **5 个** memory 文件，读取内容（受 MAX_MEMORY_LINES 和 MAX_MEMORY_BYTES 限制）

- 返回 relevant_memories 类型的 attachment 数组
```

2\. **实际注入** ：通过 createAttachmentMessage 包装成 attachment message，推入 toolResults 数组，最终进入 messages

**单次预取，延迟消费：为什么每个 turn 只搜一次**

**注入：在第一个"预取完成"的迭代中执行一次**

```
// src/query.ts:1599-1613
  if (
    pendingMemoryPrefetch &&
    pendingMemoryPrefetch.settledAt !== null &&        // 预取已完成
    pendingMemoryPrefetch.consumedOnIteration === -1   // 尚未被 consume
  ) {
    const memoryAttachments = filterDuplicateMemoryAttachments(
      await pendingMemoryPrefetch.promise,
      toolUseContext.readFileState,
    )
    for (const memAttachment of memoryAttachments) {
      const msg = createAttachmentMessage(memAttachment)
      yield msg
      toolResults.push(msg)
    }
    pendingMemoryPrefetch.consumedOnIteration = turnCount - 1  // 标记已 consume
  }

//注入发生在 agent-loop 的每个迭代末尾检查，但：
//  - 如果预取还没完成（settledAt === null）→ 跳过，下轮迭代再试
//  - 如果已经注入过（consumedOnIteration !== -1）→ 跳过
//  - 只有"预取刚完成且从未注入过"的那一轮才会实际注入
```

*每个 user turn 只搜索一次 memory，在 agent-loop 的某个迭代末尾（预取完成后）注入一次，然后标记为已消费，同 turn 的后续迭代不再重复注入。*

**去重机制** ： 同一个 session 中，已经注入过的 memory 不会重复注入：

1. 1\. 路径级去重：collectSurfacedMemories 扫描历史 messages 中已有的 relevant\_memories attachment，已注入的路径排除在候选外
2. 2\. 文件状态去重：filterDuplicateMemoryAttachments 过滤掉模型已经在当前 session 中 Read/Write/Edit 过的 memory 文件
3. 3\. 会话字节上限：MAX\_SESSION\_BYTES 限制单个 session 中注入 memory 的总字节量

三层去重（路径级+文件状态级+会话字节上限）确保了 memory 注入既不会重复，也不会撑爆上下文。

**MemoryPrefetch 的工作机制：** "启动即走，择机注入"，当模型生成完流式输出、执行完工具（runTools）后，循环进入 **附件注入（Attachment Injection）阶段** ，后台并行执行 `memory prefetch` 和 `skill prefetch` ，将检索出的相关记忆组装进状态消息列表，随下一次循环递交给模型。

**注入的数量限制** ： **多层级的限制体系** ，从扫描、选择到注入都有 cap

| 层级 | 限制 | 代码位置 | 说明 |
| --- | --- | --- | --- |
| 目录扫描 | 最多 200 个文件 | `// src/memoryScan.ts:21` | 扫描 memory/ 目录时只读取最近修改的 200 个.md 文件的 frontmatter |
| 相关性选择 | 最多 5 个/轮 | `// src/utils/attachments.ts:2234` | Sonnet 评估后，slice(0, 5) 只保留前 5 个最相关的 |
| 单文件行数 | 200 行 | `// src/utils/attachments.ts:269` | 超出则截断，保留 frontmatter + 开头上下文 |
| 单文件字节 | 4,096 字节 | `// src/utils/attachments.ts:277` | 超出则截断，并附加提示让模型用 Read 工具读取完整文件 |
| 每轮注入总量 | ~20KB | 推导值 | 5 个文件 × 4KB = 20KB/turn |
| Session 累积 | 60KB | `// src/utils/attachments.ts:288` | 整个 session 累计注入的 memory 内容超过 60KB 后，完全停止预取 |

Auto-memory 有四层硬限制：扫描最多 200 个文件 → 每轮选最多 5 个 → 每个最多 4KB → 整个 session 最多 60KB。CLAUDE.md 没有同等严格的数值限制，依赖触发机制和 session 级去重控制注入量。这套分层 cap 的设计，本质上是在"相关性"和"上下文开销"之间做可预期的权衡。

## Memory相关skills

**注: 仅对 'ant' 用户开放 （Anthropic 内部）**

**Remember Skill** 是 Claude Code 的一个用户可调用 Skill，用于审查和组织 auto-memory 条目，提供分类建议（提升到 CLAUDE.md、移动到 CLAUDE.local.md、清理重复/过时项）。

| **手动审查** | 用户主动调用 `/remember` 触发审查 |
| --- | --- |
| **分类建议** | 将 auto-memory 条目分类到合适的目的地 |
| **清理检测** | 识别重复、过时、冲突的条目 |
| **用户控制** | 所有更改需用户明确批准 |

**Remember Skill 工作流程**

```
// src/skills/bundled/remember.ts:9-62
const SKILL_PROMPT = \`# Memory Review

## Goal
Review the user&#x27;s memory landscape and produce a clear report of proposed changes...

## Steps

### 1. Gather all memory layers
Read CLAUDE.md and CLAUDE.local.md... Review auto-memory in system prompt...

### 2. Classify each auto-memory entry
Determine the best destination for each entry...

### 3. Identify cleanup opportunities
Scan for duplicates, outdated entries, conflicts...

### 4. Present the report
Output structured report grouped by action type...
```

**决策树**

```
Auto-memory 条目
    ↓
是否是项目约定？
    ├── 是 → 建议提升到 CLAUDE.md
    └── 否 → 是否是个人偏好？
            ├── 是 → 建议提升到 CLAUDE.local.md
            └── 否 → 是否是组织级知识？
                    ├── 是 → 建议提升到 Team memory
                    └── 否 → 保留在 Auto-memory
```

## Memory 的全生命周期管理

```
对话/用户输入
      │
      ▼
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │  1. 写入    │────▶│  2. 存储    │────▶│  3. 注入    │
  │  (Creation) │     │ (Storage)   │     │ (Injection) │
  └─────────────┘     └─────────────┘     └─────────────┘
      │                                        │
      ▼                                        ▼
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │ 4. 读取使用 │◀────│ 5. 整合维护 │◀────│ 6. 老化消亡 │
  │  (Consume)  │     │(Maintenance)│     │ (Decay/Del) │
  └─────────────┘     └─────────────┘     └─────────────┘
```

大致总结一下Claude-code中memory的全生命周期管理

**阶段一：写入（Creation）**

memory 有三种诞生方式：

- • 手动写入：用户说 "remember..." 或主 agent 主动保存
- • **自动提取** ：每轮对话结束后的 post-sampling hook 触发，由后台 forked agent 执行（extractMemories）
- • subagent 写入：子 agent 执行中自主决定（agent-memory）

**阶段二：存储（Storage）**

Memory 使用 Markdown 格式存储，包含 YAML Frontmatter：

```
---
name: {{memory name}}
description: {{one-line description}}
type: {{user, feedback, project, reference}}
---

{{memory content}}
```

不同类型 memory 存储于不同路径下：Personal、Team 或 agent。

每个 memory 目录都有一个 MEMORY.md 索引文件（指针列表），用于快速浏览和 auto-dream 定期清理更新。

**阶段三：注入（Injection）**

**注入流程**

```
用户输入
      │
      ▼
  startRelevantMemoryPrefetch()  ──异步启动──▶  Sonnet 评估相关性
      │                                          │
      │                                          ▼
      │                              findRelevantMemories()
      │                              (最多 5 个文件)
      │                                          │
      ▼                                          ▼
  agent-loop 迭代                              readMemoriesForSurfacing()
      │                              (每文件最多 200 行 / 4KB)
      │                                          │
      ▼                                          ▼
  consume point:                               包装为 relevant_memories
  await pendingMemoryPrefetch.promise          attachment
      │                                          │
      ▼                                          ▼
  createAttachmentMessage()  ◀─────────────────┘
      │
      ▼
  作为 <system-reminder> 注入 messages
```

**阶段四：读取使用（Consume）**

注入后作为 出现在对话上下文中，模型根据新鲜度提示自行判断可信度。

**新鲜度提示（Staleness）**

`// src/memdir/memoryAge.ts` 在每次注入时计算文件年龄：

```
// 超过 1 天的 memory 会附加 staleness caveat

"This memory is 47 days old. It may be outdated — verify before acting on it."
```

**重要** ：Claude Code **不自动删除** 老化的 memory，而是 **让模型自行判断** 。这是因为"旧"不等于"错"——很多 project 级别的约束（如"测试必须打真实数据库"）是长期有效的。

**阶段五：整合维护（Maintenance）**

**auto-dream（定期整合）**

```
触发条件（全部满足）:
  ├── 距离上次整合 >= 24 小时
  ├── 新增 session 数量 >= 5
  ├── 扫描节流（10 分钟间隔）
  └── 文件锁未占用

  执行流程:
  ├── Phase 1: Orient（浏览 memory 目录和 MEMORY.md）
  ├── Phase 2: Gather（从 daily logs、transcript 中提取新信号）
  ├── Phase 3: Consolidate（合并主题文件、去重、转换日期）
  └── Phase 4: Prune（清理过时/矛盾信息、更新索引）
```

| 操作 | 效果 |
| --- | --- |
| 合并 | 同一主题分散在多个文件 → 合并到一个主题文件 |
| 去重 | 删除内容重复或高度相似的 memory |
| 日期规范化 | "这周四" → "2026-04-23"（绝对日期） |
| 矛盾清理 | 删除已被后续信息覆盖的旧记忆 |
| 索引修剪 | MEMORY.md 保持在 200 行 / 25KB 以内 |

与 extractMemories 的关系

```
extractMemories          auto-dream
    │                        │
    ▼                        ▼
逐轮增量捕获 ──────────────▶ 定期整理归档
（每轮对话结束）            （24h + 5 sessions）
    │                        │
    └── 共同维护长期记忆质量 ──┘
```

**阶段六：老化与消亡（Decay / Deletion）**

**老化机制**

| 机制 | 行为 | 是否自动删除 |
| --- | --- | --- |
| staleness 提示 | 注入时附加 "This memory is N days old" | ❌ 否，仅提示 |
| auto-dream prune | 清理矛盾、重复、明显过时的信息 | ✅ 是，由整合 agent 决定 |
| MEMORY.md 截断 | 索引超过 200 行时丢弃老条目 | ✅ 是，但原始文件仍在 |
| 扫描淘汰 | 超过 200 个文件的旧文件不再被评估 | ⚠️ 间接，文件仍在磁盘 |

Claude Code 的设计哲学是让记忆自然衰减，而非强制删除——旧记忆可能在某些场景下仍有价值。

memory 文件不会被系统自动物理删除（除非 auto-dream 明确决定删除）。但以下几种情况会导致 memory 实际上"死亡"：

1. 1\. 扫描淘汰：文件数量 > 200 时，最老的文件不再进入 findRelevantMemories 的候选集
2. 2\. Session 字节上限：60KB 累积限制达到后，该 session 不再注入任何 memory
3. 3\. Compact 重置：会话压缩会移除旧的 relevant\_memories attachments，虽然文件还在，但短期内不会被再次注入

核心流转哲学："渐进式沉淀 + 定期整合 + 提示老化"

## 值得借鉴的设计模式

- • **闭集分类** ：将记忆划分为 `user` / `feedback` / `project` / `reference` 等有限类别，而非任由 Agent 自由存储任何内容。定义"不该存什么"远比"该存什么"更重要——前者为 Agent 划定了清晰的边界，避免了记忆膨胀和噪音积累；后者则容易因标准模糊而导致过度存储。
- • **索引与内容分离** ：以 MEMORY.md 作为轻量索引，按需召回完整文件内容。Agent 先用轻量模型筛选出相关索引条目，再决定是否加载全文，既控制了上下文窗口的消耗，又保留了深度阅读的能力。
- • **后台提取（Fire-and-Forget）** ：不要在主对话流中做记忆提取，而是用后台 Agent 异步完成。后台 Agent 与主 Agent 共享前缀上下文（forked-agent），在不影响用户交互流畅度的前提下完成记忆整理，同时节约了主流程的 Token 消耗。
- • **善用 Frontmatter** ：在 Markdown 文件的 YAML frontmatter 中嵌入结构化元数据（如创建时间、分类标签、置信度、过期时间）。这让 Agent 无需解析正文即可快速筛选和排序，大幅降低了认知负担。
- • **老化策略** ：模型不擅长计算时间差，应提前将时间计算好（如将标准时间格式转换为"3 天前"、"2 周前"）。这种预计算显著降低了模型的认知负担，让老化决策更可靠。
- • **Auto-Dream（定期整理）** ：定期对已有记忆进行合并、去重、矛盾解决以及 MEMORY.md 索引的修剪维护，而非放任文件越堆越多。AK 的 LLM-wiki 中也体现了类似的"周期性归档"思路——记忆的价值随时间衰减，主动整理才能保持系统的高效。
- • **跨设备同步** ：基于 Etag + 乐观锁实现无冲突同步，配合隐私优先的设计（如端到端加密），让用户在不同设备上拥有一致的记忆体验，同时不牺牲数据安全。
- • **作用域即权限** ：通过目录隔离实现访问控制，而非构建复杂的 ACL 系统。每个作用域（项目、用户、团队）对应独立的记忆文件，Agent 根据当前上下文自动选择可见范围。

## 参考

How Claude remembers your project

## 附录-CLAUDE.md

### 存储层级与作用域

CLAUDE.md 可以放在多个位置，越具体的优先级越高：

| 作用域 | 位置 | 用途 |
| --- | --- | --- |
| **Managed Policy**  （组织级） | `/Library/Application Support/ClaudeCode/CLAUDE.md`  (macOS) 等 | 公司编码规范、安全合规 |
| **User**  （用户级） | `~/.claude/CLAUDE.md` | 个人跨项目偏好 |
| **Project**  （项目级） | `./CLAUDE.md`  或 `/img/.claude/``CLAUDE.md` | 项目架构、团队约定 |
| **Local**  （本地级） | `./CLAUDE.local.md` | 个人项目偏好（应 gitignore） |

**加载顺序** ：Managed → User → Project → Local。同级目录中， `CLAUDE.local.md` 追加在 `CLAUDE.md` 之后，因此个人偏好会覆盖项目默认

### 如何写好 CLAUDE.md

**原则**

- • **目标 200 行以内 （若内容过多，** 使用 `@path` 导入额外文件，或拆分到 `.claude/rules/` 目录 **）**
- • **用标题和 bullet 分组**
- • **具体性，写可验证的指令**

把 CLAUDE.md 当作" **否则你需要重新解释一遍** "的地方

- • Claude 第二次犯同样的错误
- • Code Review 中发现 Claude 本应该知道的事
- • 你在聊天中重复输入同样的纠正
- • 新成员也需要同样的上下文才能上手

**不该放什么** ：多步骤操作流程（用 Skill 代替）、只适用于代码库某一部分的指令（用 `.claude/rules/` 路径限定规则代替）

### CLAUDE.md 的加载与使用机制

1. 1\. **启动时扫描** ：Claude Code 从当前工作目录出发， **向上遍历目录树** ，收集沿途所有 `CLAUDE.md` 和 `CLAUDE.local.md` 。
2. 2\. **子目录懒加载** ：当前工作目录 **下方** 子目录中的 CLAUDE.md 不会一开始就加载，而是在 Claude **读取该子目录中的文件时** 按需加载。
3. 3\. **拼接注入** ：所有发现的文件被 **拼接** 进上下文，而不是互相覆盖。它们作为用户消息注入到系统提示之后。

### HTML 注释会被自动剥离

用块级 HTML 注释写给人看的维护说明，它们不会消耗 token

```
<!-- 这是给人类维护者的注释，Claude 看不到 -->
```

### 压缩后的行为 ()

- • 项目根目录的 `CLAUDE.md` **会在压缩后自动重新读取并注入** 。
- • 子目录中的 `CLAUDE.md` 不会自动重新注入，只有当下次读取该子目录文件时才会再次加载

Agent-Memory · 目录

继续滑动看下一个

行板漫录

向上滑动看下一个
