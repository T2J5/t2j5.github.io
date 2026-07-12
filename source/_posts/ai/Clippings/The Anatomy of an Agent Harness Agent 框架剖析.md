---
title: "The Anatomy of an Agent Harness Agent 框架剖析"
date: 2026-06-16 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://x.com/akshay_pachaar/status/2041146899319971922"
original: true
---

> 原文来源：https://x.com/akshay_pachaar/status/2041146899319971922

![Image](https://pbs.twimg.com/media/HFOWvmAaIAAzGHg?format=jpg&name=large)

A deep dive into what Anthropic, OpenAI, Perplexity and LangChain are actually building. Covering the orchestration loop, tools, memory, context management, and everything else that transforms a stateless LLM into a capable agent.深入剖析 Anthropic、OpenAI、Perplexity 和 LangChain 实际构建的内容。涵盖编排循环、工具、记忆、上下文管理，以及将无状态 LLM 转化为智能体的所有要素。

You've built a chatbot. Maybe you've wired up a ReAct loop with a few tools. It works for demos. Then you try to build something production-grade, and the wheels come off: the model forgets what it did three steps ago, tool calls fail silently, and context windows fill up with garbage.你构建了一个聊天机器人。也许你已用几个工具搭建了一个 ReAct 循环。它在演示中表现良好。但当你尝试构建生产级应用时，问题就暴露了：模型会忘记三步前的操作，工具调用无声失败，上下文窗口被垃圾信息填满。

The problem isn't your model. It's everything around your model.问题不在于你的模型。而在于模型周围的一切。

LangChain proved this when they changed only the infrastructure wrapping their LLM (same model, same weights) and jumped from outside the top 30 to rank 5 on TerminalBench 2.0. A separate research project hit a 76.4% pass rate by having an LLM optimize the infrastructure itself, surpassing hand-designed systems.LangChain 证明了这一点：他们仅改变了包裹 LLM 的基础设施（相同模型、相同权重），就在 TerminalBench 2.0 上从排名 30 名开外跃升至第 5 名。另一项独立研究项目通过让 LLM 自行优化基础设施，实现了 76.4% 的通过率，超越了人工设计的系统。

That infrastructure has a name now: **the agent harness**.这套基础设施如今有了专属名称：智能体框架（Agent Harness）。

# What Is the Agent Harness?什么是智能体框架？

The term was formalized in early 2026, but the concept existed long before. The harness is the complete software infrastructure wrapping an LLM: orchestration loop, tools, memory, context management, state persistence, error handling, and guardrails. Anthropic's Claude Code documentation puts it simply: the SDK is "**the agent harness that powers Claude Code.**" OpenAI's Codex team uses the same framing, explicitly equating the terms "**agent**" and "**harness**" to refer to the **non-model infrastructure** that makes the LLM useful.该术语于 2026 年初正式确立，但其概念早已存在。智能体框架是包裹 LLM 的完整软件基础设施：包括编排循环、工具、记忆、上下文管理、状态持久化、错误处理和防护栏。Anthropic 的 Claude Code 文档简明扼要地指出：SDK 就是"驱动 Claude Code 的智能体框架"。OpenAI 的 Codex 团队也采用相同表述，明确将"智能体"与"框架"视为同义词，指代使 LLM 发挥效用的非模型基础设施。

I really liked the canonical formula, from LangChain's Vivek Trivedy: **"If you're not the model, you're the harness."**我非常喜欢 LangChain 的 Vivek Trivedi 提出的经典公式：“如果你不是模型，你就是那个框架。”

Here's the distinction that trips people up. The "agent" is the emergent behavior: the goal-directed, tool-using, self-correcting entity the user interacts with. The harness is the machinery producing that behavior. When someone says "I built an agent," they mean they built a harness and pointed it at a model.这里有一个容易让人混淆的区别。“智能体”是一种涌现行为：用户与之交互的、具有目标导向、会使用工具、能自我修正的实体。而框架则是产生这种行为的机制。当有人说“我构建了一个智能体”时，他们的意思是他们构建了一个框架，并将其指向一个模型。

![Image](https://pbs.twimg.com/media/HFOTX8na4AACHWq?format=jpg&name=large)

Beren Millidge made this analogy precise in his 2023 essay "[Scaffolded LLMs as Natural Language Computers.](https://www.beren.io/2023-04-11-Scaffolded-LLMs-natural-language-computers/)" A raw LLM is a CPU with no RAM, no disk, and no I/O. The context window serves as RAM (fast but limited). External databases function as disk storage (large but slow). Tool integrations act as device drivers. The harness is the operating system. As Millidge wrote: **"We have reinvented the Von Neumann architecture"** because it's a natural abstraction for any computing system.Beren Millidge 在他 2023 年的文章《脚手架式 LLM 作为自然语言计算机》中精确地阐述了这一类比。一个原始的 LLM 就像一块没有 RAM、没有磁盘、没有 I/O 的 CPU。上下文窗口充当 RAM（快速但有限）。外部数据库充当磁盘存储（容量大但速度慢）。工具集成则充当设备驱动程序。框架就是操作系统。正如 Millidge 所写：“我们重新发明了冯·诺依曼架构”，因为对于任何计算系统来说，这都是一个自然的抽象。

# Three Levels of Engineering三个工程层级

Three concentric levels of engineering surround the model:围绕模型的三层同心工程结构：

- **Prompt engineering** crafts the instructions the model receives.提示工程负责构建模型接收的指令。
- **Context engineering** manages what the model sees and when.上下文工程管理模型看到的内容及其呈现时机。
- **Harness engineering** encompasses both, plus the entire application infrastructure: tool orchestration, state persistence, error recovery, verification loops, safety enforcement, and lifecycle management.框架工程涵盖上述两者，并包含完整的应用基础设施：工具编排、状态持久化、错误恢复、验证循环、安全管控及生命周期管理。

The harness is not a wrapper around a prompt. It is the complete system that makes autonomous agent behavior possible.工具框架并非提示词的简单包装，而是实现自主智能体行为的完整系统。

# The 12 Components of a Production Harness生产级工具框架的 12 个核心组件

Synthesizing across Anthropic, OpenAI, LangChain, and the broader practitioner community, a production agent harness has twelve distinct components. Let's walk through each one.综合 Anthropic、OpenAI、LangChain 及更广泛的实践者社区经验，生产级智能体工具框架包含十二个独立组件。让我们逐一解析每个组件。

![Image](https://pbs.twimg.com/media/HFOXoJ3aYAAGt9F?format=jpg&name=large)

## 1\. The Orchestration Loop1. 编排循环

This is the heartbeat. It implements the Thought-Action-Observation (TAO) cycle, also called the ReAct loop. The loop runs: assemble prompt, call LLM, parse output, execute any tool calls, feed results back, repeat until done.这是核心循环。它实现了思考-行动-观察（TAO）循环，也称为 ReAct 循环。该循环的运行流程为：组装提示词、调用 LLM、解析输出、执行工具调用、将结果反馈回去，重复此过程直至完成。

Mechanically, it's often just a while loop. **The complexity lives in everything the loop manages**, not the loop itself. Anthropic describes their runtime as a "dumb loop" where all intelligence lives in the model. The harness just manages turns.从机制上看，它通常只是一个 while 循环。复杂性在于循环所管理的所有内容，而非循环本身。Anthropic 将其运行时描述为"傻瓜式循环"，所有智能都存在于模型中，而框架仅负责管理轮次。

## 2\. Tools2. 工具

Tools are the agent's hands. They're defined as schemas (name, description, parameter types) injected into the LLM's context so the model knows what's available. The tool layer handles registration, schema validation, argument extraction, sandboxed execution, result capture, and formatting results back into LLM-readable observations.工具是智能体的双手。它们以模式（名称、描述、参数类型）的形式定义，注入到 LLM 的上下文中，让模型知晓可用的工具。工具层负责注册、模式验证、参数提取、沙盒执行、结果捕获，以及将结果格式化为 LLM 可读的观测数据。

Claude Code provides tools across six categories: file operations, search, execution, web access, code intelligence, and subagent spawning. OpenAI's Agents SDK supports function tools (via [@function\_tool](https://x.com/@function_tool)), hosted tools (WebSearch, CodeInterpreter, FileSearch), and MCP server tools.Claude Code 提供六大类工具：文件操作、搜索、执行、网络访问、代码智能和子代理生成。OpenAI 的 Agents SDK 支持函数工具（通过 @function\_tool）、托管工具（WebSearch、CodeInterpreter、FileSearch）以及 MCP 服务器工具。

## 3\. Memory3. 记忆

Memory operates at multiple timescales. **Short-term memory** is conversation history within a single session. **Long-term memory** persists across sessions: Anthropic uses [CLAUDE.md](http://claude.md/) project files and auto-generated [MEMORY.md](http://memory.md/) files; LangGraph uses namespace-organized JSON Stores; OpenAI supports Sessions backed by SQLite or Redis.记忆在多个时间尺度上运作。短期记忆是单个会话中的对话历史。长期记忆跨会话持久存在：Anthropic 使用 CLAUDE.md 项目文件和自动生成的 MEMORY.md 文件；LangGraph 使用按命名空间组织的 JSON 存储；OpenAI 支持由 SQLite 或 Redis 支持的会话。

Claude Code implements a three-tier hierarchy: a lightweight index (~150 characters per entry, always loaded), detailed topic files pulled in on demand, and raw transcripts accessed via search only. A critical design principle: **the agent treats its own memory as a "hint" and verifies against actual state before acting**.Claude Code 实现了一个三层级结构：轻量级索引（每条约 150 字符，始终加载）、按需拉取的详细主题文件，以及仅通过搜索访问的原始记录。一个关键设计原则：代理将其自身记忆视为"提示"，并在行动前与实际状态进行验证。

## 4\. Context Management4. 上下文管理

This is where many agents fail silently. The core problem is context rot: **model performance degrades 30%+ when key content falls in mid-window positions** (Chroma research, corroborated by Stanford's "Lost in the Middle" finding). Even million-token windows suffer from instruction-following degradation as context grows.这正是许多智能体悄然失败之处。核心问题在于上下文退化：当关键内容落在中间窗口位置时，模型性能会下降 30%以上（Chroma 研究证实，斯坦福大学"迷失在中间"的发现也佐证了这一点）。即便拥有百万级 token 的窗口，随着上下文增长，指令遵循能力也会持续衰减。

**Production strategies include:生产策略包括：**

- **Compaction**: summarizing conversation history when approaching limits (Claude Code preserves architectural decisions and unresolved bugs while discarding redundant tool outputs)压缩：在接近限制时对对话历史进行摘要（Claude Code 保留架构决策和未解决的错误，同时丢弃冗余的工具输出）
- **Observation masking**: JetBrains' Junie hides old tool outputs while keeping tool calls visible观察遮蔽：JetBrains 的 Junie 隐藏旧的工具输出，同时保持工具调用可见
- **Just-in-time retrieval**: maintaining lightweight identifiers and loading data dynamically (Claude Code uses grep, glob, head, tail rather than loading full files)即时检索：维护轻量级标识符并动态加载数据（Claude Code 使用 grep、glob、head、tail，而非加载完整文件）
- **Sub-agent delegation**: each subagent explores extensively but returns only 1,000 to 2,000 token condensed summaries子代理委派：每个子代理进行广泛探索，但仅返回 1000 至 2000 个 token 的浓缩摘要

Anthropic's context engineering guide states the goal: find the **smallest possible set of high-signal tokens** that maximize likelihood of the desired outcome.Anthropic 的上下文工程指南指出其目标：找到最小可能的高信号令牌集，以最大化期望结果的可能性。

## 5\. Prompt Construction5. 提示词构建

This assembles what the model actually sees at each step. It's hierarchical: system prompt, tool definitions, memory files, conversation history, and the current user message.这展示了模型在每个步骤中实际看到的内容。它是分层的：系统提示、工具定义、记忆文件、对话历史以及当前用户消息。

OpenAI's Codex uses a strict priority stack: server-controlled system message (highest priority), tool definitions, developer instructions, user instructions (cascading [AGENTS.md](http://agents.md/) files, 32 KiB limit), then conversation history.OpenAI 的 Codex 采用严格的优先级堆栈：服务器控制的系统消息（最高优先级）、工具定义、开发者指令、用户指令（级联的 AGENTS.md 文件，32 KiB 限制），然后是对话历史。

## 6\. Output Parsing6. 输出解析

Modern harnesses rely on native tool calling, where the model returns structured tool\_calls objects rather than free-text that must be parsed. The harness checks: are there tool calls? Execute them and loop. No tool calls? That's the final answer.现代工具框架依赖原生工具调用机制，模型会返回结构化的 tool\_calls 对象，而非需要解析的自由文本。框架会进行判断：是否存在工具调用？若有则执行并循环；若无工具调用，则该输出即为最终答案。

For structured outputs, both OpenAI and LangChain support schema-constrained responses via Pydantic models. Legacy approaches like RetryWithErrorOutputParser (which feeds the original prompt, the failed completion, and the parsing error back to the model) remain available for edge cases.在结构化输出方面，OpenAI 和 LangChain 均支持通过 Pydantic 模型实现受模式约束的响应。诸如 RetryWithErrorOutputParser（将原始提示、失败输出及解析错误重新反馈给模型）这类传统方法，仍可用于处理边缘情况。

## 7\. State Management7. 状态管理

LangGraph models state as typed dictionaries flowing through graph nodes, with reducers merging updates. Checkpointing happens at super-step boundaries, enabling resume after interruptions and time-travel debugging. OpenAI offers four mutually exclusive strategies: application memory, SDK sessions, server-side Conversations API, or lightweight previous\_response\_id chaining. Claude Code takes a different approach: **git commits as checkpoints and progress files as structured scratchpads**.LangGraph 将状态建模为通过图节点流动的类型化字典，并通过归约器合并更新。检查点设置在超级步骤边界处，支持中断后恢复和时间旅行调试。OpenAI 提供四种互斥策略：应用程序内存、SDK 会话、服务器端 Conversations API，或轻量级的 previous\_response\_id 链式调用。Claude Code 采用不同方法：将 Git 提交作为检查点，进度文件作为结构化草稿板。

## 8\. Error Handling8. 错误处理

Here's why this matters: **a 10-step process with 99% per-step success still has only ~90.4% end-to-end success**. Errors compound fast.这就是为什么这很重要：一个 10 步流程，即使每一步都有 99%的成功率，最终端到端的成功率也只有 90.4%。错误会迅速累积。

LangGraph distinguishes four error types: transient (retry with backoff), LLM-recoverable (return error as ToolMessage so the model can adjust), user-fixable (interrupt for human input), and unexpected (bubble up for debugging). Anthropic catches failures within tool handlers and returns them as error results to keep the loop running. Stripe's production harness caps retry attempts at two.LangGraph 区分了四种错误类型：瞬时错误（带退避重试）、LLM 可恢复错误（将错误作为 ToolMessage 返回，以便模型调整）、用户可修复错误（中断等待人工输入）以及意外错误（向上传递用于调试）。Anthropic 在工具处理程序内捕获故障，并将其作为错误结果返回以保持循环运行。Stripe 的生产环境将重试次数上限设为两次。

## 9\. Guardrails and Safety9. 护栏与安全

OpenAI's SDK implements three levels: input guardrails (run on first agent), output guardrails (run on final output), and tool guardrails (run on every tool invocation). A "tripwire" mechanism halts the agent immediately when triggered.OpenAI 的 SDK 实现了三个层级：输入护栏（在首个智能体上运行）、输出护栏（在最终输出上运行）和工具护栏（在每个工具调用上运行）。"触发线"机制可在触发时立即停止智能体运行。

Anthropic separates permission enforcement from model reasoning architecturally. The model decides what to attempt; the tool system decides what's allowed. **Claude Code gates ~40 discrete tool capabilities independently**, with three stages: trust establishment at project load, permission check before each tool call, and explicit user confirmation for high-risk operations.Anthropic 在架构上将权限执行与模型推理分离。模型决定尝试什么；工具系统决定允许什么。Claude Code 独立控制~40 个离散工具能力，分为三个阶段：项目加载时的信任建立、每次工具调用前的权限检查，以及高风险操作的明确用户确认。

## 10\. Verification Loops10. 验证循环

This is what separates toy demos from production agents. Anthropic recommends three approaches: rules-based feedback (tests, linters, type checkers), visual feedback (screenshots via Playwright for UI tasks), and LLM-as-judge (a separate subagent evaluates output).这就是玩具演示与生产级 Agent 之间的区别所在。Anthropic 推荐三种方法：基于规则的反馈（测试、代码检查工具、类型检查器）、视觉反馈（通过 Playwright 获取 UI 任务的截图），以及 LLM 作为评判者（由另一个子 Agent 评估输出）。

Boris Cherny, creator of Claude Code, noted that **giving the model a way to verify its work improves quality by 2 to 3x**.Claude Code 的创建者 Boris Cherny 指出，让模型能够验证自身工作，可将质量提升 2 到 3 倍。

## 11\. Subagent Orchestration11. 子代理编排

Claude Code supports three execution models: Fork (byte-identical copy of parent context), Teammate (separate terminal pane with file-based mailbox communication), and Worktree (own git worktree, isolated branch per agent). OpenAI's SDK supports agents-as-tools (specialist handles bounded subtask) and handoffs (specialist takes full control). LangGraph implements subagents as nested state graphs.Claude Code 支持三种执行模型：Fork（父上下文的字节级完全副本）、Teammate（独立的终端面板，通过基于文件的邮箱进行通信）和 Worktree（独立的 git 工作目录，每个代理拥有独立分支）。OpenAI 的 SDK 支持代理即工具（专家处理有边界的子任务）和交接（专家完全接管控制权）。LangGraph 将子代理实现为嵌套的状态图。

# The Loop in Motion: A Step-by-Step Walkthrough运动中的循环：逐步详解

Now that you know the components, let's trace how they work together in a single cycle.既然你已经了解了各个组件，接下来我们追踪一下它们在一个周期内是如何协同工作的。

![Image](https://pbs.twimg.com/media/HFOYY_KbIAAzilX?format=jpg&name=large)

**Step 1 (Prompt Assembly)**: The harness constructs the full input: system prompt + tool schemas + memory files + conversation history + current user message. Important context is positioned at the beginning and end of the prompt (the "Lost in the Middle" finding).步骤 1（提示组装）：测试框架构建完整的输入内容：系统提示词 + 工具架构 + 记忆文件 + 对话历史 + 当前用户消息。重要上下文被放置在提示词的开头和结尾（基于"中间迷失"研究发现）。

**Step 2 (LLM Inference)**: The assembled prompt goes to the model API. The model generates output tokens: text, tool call requests, or both.步骤 2（LLM 推理）：组装好的提示词被发送至模型 API。模型生成输出令牌：文本、工具调用请求，或两者兼有。

**Step 3 (Output Classification)**: If the model produced text with no tool calls, the loop ends. If it requested tool calls, proceed to execution. If a handoff was requested, update the current agent and restart.步骤 3（输出分类）：若模型生成的是不含工具调用的文本，则循环结束。若模型请求了工具调用，则进入执行阶段。若请求了交接，则更新当前代理并重新开始。

**Step 4 (Tool Execution)**: For each tool call, the harness validates arguments, checks permissions, executes in a sandboxed environment, and captures results. Read-only operations can run concurrently; mutating operations run serially.步骤 4（工具执行）：对于每次工具调用，框架会验证参数、检查权限、在沙盒环境中执行并捕获结果。只读操作可并发运行，而修改操作则串行执行。

**Step 5 (Result Packaging)**: Tool results are formatted as LLM-readable messages. Errors are caught and returned as error results so the model can self-correct.步骤 5（结果封装）：工具结果被格式化为 LLM 可读的消息。错误会被捕获并作为错误结果返回，以便模型能够自我修正。

**Step 6 (Context Update)**: Results are appended to conversation history. If approaching the context window limit, the harness triggers compaction.步骤 6（上下文更新）：结果被追加到对话历史中。若接近上下文窗口限制，框架将触发压缩处理。

**Step 7 (Loop)**: Return to Step 1. Repeat until termination.步骤 7（循环）：返回步骤 1。重复直至终止。

**Termination conditions** are layered: the model produces a response with no tool calls, maximum turn limit is exceeded, token budget is exhausted, a guardrail tripwire fires, the user interrupts, or a safety refusal is returned. A simple question might take 1 to 2 turns. A complex refactoring task can chain dozens of tool calls across many turns.终止条件是多层次的：模型生成无工具调用的响应、超过最大轮次限制、令牌预算耗尽、触发护栏警戒线、用户中断，或返回安全拒绝。一个简单问题可能只需 1 到 2 轮。一个复杂的重构任务则可能跨越多轮，串联数十次工具调用。

[For long-running tasks spanning multiple context windows, Anthropic developed a two-phase "Ralph Loop" pattern](https://www.anthropic.com/research/long-running-Claude): an **Initializer Agent** sets up the environment (init script, progress file, feature list, initial git commit), then a **Coding Agent** in every subsequent session reads git logs and progress files to orient itself, picks the highest-priority incomplete feature, works on it, commits, and writes summaries. The filesystem provides continuity across context windows.对于跨越多个上下文窗口的长时间运行任务，Anthropic 开发了一种两阶段“Ralph 循环”模式：初始化代理设置环境（初始化脚本、进度文件、功能列表、初始 git 提交），随后每个会话中的编码代理通过读取 git 日志和进度文件来定位自身，选取优先级最高的未完成功能，进行开发、提交并编写摘要。文件系统为跨上下文窗口提供了连续性。

# How Real Frameworks Implement the Pattern 实际框架如何实现该模式

![Image](https://pbs.twimg.com/media/HFOZ6DqawAAMSNf?format=jpg&name=large)

**Anthropic's Claude Agent SDK** exposes the harness through a single query() function that creates the agentic loop and returns an async iterator streaming messages. The runtime is a "dumb loop." All intelligence lives in the model. Claude Code uses a Gather-Act-Verify cycle: gather context (search files, read code), take action (edit files, run commands), verify results (run tests, check output), repeat.Anthropic 的 Claude Agent SDK 通过一个单一的 query()函数暴露了运行框架，该函数创建了智能体循环并返回一个异步迭代器来流式传输消息。运行时是一个"简单循环"，所有智能都存在于模型中。Claude Code 采用"收集-行动-验证"循环：收集上下文（搜索文件、阅读代码）、采取行动（编辑文件、运行命令）、验证结果（运行测试、检查输出），然后重复。

**OpenAI's Agents SDK** implements the harness through the Runner class with three modes: async, sync, and streamed. The SDK is "code-first": workflow logic is expressed in native Python rather than graph DSLs. The Codex harness extends this with a three-layer architecture: Codex Core (agent code + runtime), App Server (bidirectional JSON-RPC API), and client surfaces (CLI, VS Code, web app). All surfaces share the same harness, which is why "Codex models feel better on Codex surfaces than a generic chat window."OpenAI 的 Agents SDK 通过 Runner 类实现执行框架，包含三种模式：异步、同步和流式。该 SDK 采用"代码优先"理念：工作流逻辑通过原生 Python 表达，而非图形化 DSL。Codex 执行框架在此基础上扩展为三层架构：Codex 核心层（智能体代码+运行时）、应用服务器层（双向 JSON-RPC API）和客户端界面层（CLI、VS Code、Web 应用）。所有界面共享同一执行框架，这正是"Codex 模型在 Codex 界面上的表现优于通用聊天窗口"的原因。

**LangGraph** models the harness as an explicit state graph. Two nodes (llm\_call and tool\_node) connected by a conditional edge: if tool calls present, route to tool\_node; if absent, route to END. LangGraph evolved from LangChain's AgentExecutor, which was deprecated in v0.2 because it was hard to extend and lacked multi-agent support. LangChain's **Deep Agents** explicitly use the term "agent harness": built-in tools, planning (write\_todos tool), file systems for context management, subagent spawning, and persistent memory.LangGraph 将执行框架建模为显式状态图。两个节点（llm\_call 和 tool\_node）通过条件边连接：若存在工具调用，则路由至 tool\_node；若不存在，则路由至 END。LangGraph 由 LangChain 的 AgentExecutor 演化而来，后者因难以扩展且缺乏多智能体支持，在 v0.2 版本中被弃用。LangChain 的 Deep Agents 明确使用"智能体执行框架"这一术语：内置工具、规划（write\_todos 工具）、用于上下文管理的文件系统、子智能体生成以及持久化记忆。

**CrewAI** implements a role-based multi-agent architecture: Agent (the harness around the LLM, defined by role, goal, backstory, and tools), Task (the unit of work), and Crew (the collection of agents). CrewAI's Flows layer adds a "deterministic backbone with intelligence where it matters," managing routing and validation while Crews handle autonomous collaboration.CrewAI 实现了基于角色的多智能体架构：Agent（围绕 LLM 的框架，由角色、目标、背景故事和工具定义）、Task（工作单元）和 Crew（智能体集合）。CrewAI 的 Flows 层增加了"在关键环节注入智能的确定性骨架"，在管理路由和验证的同时，由 Crew 负责自主协作。

**AutoGen** (evolving into Microsoft Agent Framework) pioneered conversation-driven orchestration. Its three-layer architecture (Core, AgentChat, Extensions) supports five orchestration patterns: sequential, concurrent (fan-out/fan-in), group chat, handoff, and magentic (a manager agent maintains a dynamic task ledger coordinating specialists).AutoGen（正演进为微软智能体框架）开创了对话驱动的编排模式。其三层架构（核心层、智能体对话层、扩展层）支持五种编排模式：顺序执行、并发执行（扇出/扇入）、群组对话、任务交接，以及磁力编排（由管理智能体维护动态任务清单，协调各专业智能体协作）。

# The Scaffolding Metaphor脚手架隐喻

The scaffolding metaphor isn't decorative. It's precise. Construction scaffolding is temporary infrastructure that enables workers to build a structure they couldn't reach otherwise. It doesn't do the construction. But without it, workers can't reach the upper floors.脚手架隐喻并非装饰性表述，而是精准的类比。建筑脚手架是临时性基础设施，让工人能够建造原本无法触及的结构。脚手架本身不参与建造，但若没有它，工人便无法抵达上层施工面。

![Image](https://pbs.twimg.com/media/HFOahFWa0AEinPz?format=jpg&name=large)

**The key insight: scaffolding is removed when the building is complete.** As models improve, harness complexity should decrease. Manus was rebuilt five times in six months, each rewrite removing complexity. Complex tool definitions became general shell execution. "Management agents" became simple structured handoffs.核心洞察：建筑完工时脚手架便会拆除。随着模型不断改进，工具框架的复杂度也应逐步降低。Manus 在六个月内重构了五次，每次重写都在简化复杂性。复杂的工具定义演变为通用的 shell 执行，"管理代理"变成了简单的结构化交接。

This points to the **co-evolution principle**: models are now post-trained with specific harnesses in the loop. Claude Code's model learned to use the specific harness it was trained with. Changing tool implementations can degrade performance because of this tight coupling.这指向了协同进化原则：模型现在是在特定工具框架的参与下进行后训练的。Claude Code 的模型学会了使用其训练时所用的特定工具框架。由于这种紧密耦合，改变工具实现方式可能会导致性能下降。

The "future-proofing test" for harness design: if performance scales up with more powerful models without adding harness complexity, the design is sound.对工具框架设计的“未来适应性测试”：如果性能能随模型能力增强而提升，且无需增加框架复杂度，则该设计是合理的。

![Image](https://pbs.twimg.com/media/HFOar2zakAA_hnk?format=jpg&name=large)

# Seven Decisions That Define Every Harness定义每个框架的七个决策

**Every harness architect faces seven choices:每个工具架构师都面临七个选择：**

![Image](https://pbs.twimg.com/media/HFOaz7xakAAwJTU?format=jpg&name=large)

1. **Single-agent vs. multi-agent.** Both Anthropic and OpenAI say: maximize a single agent first. Multi-agent systems add overhead (extra LLM calls for routing, context loss during handoffs). Split only when tool overload exceeds ~10 overlapping tools or clearly separate task domains exist.单智能体 vs. 多智能体。Anthropic 和 OpenAI 都表示：优先最大化单个智能体。多智能体系统会增加开销（路由需要额外的 LLM 调用，交接时会出现上下文丢失）。只有当工具过载超过~10 个重叠工具，或存在明确分离的任务领域时，才进行拆分。
2. **ReAct vs. plan-and-execute.** ReAct interleaves reasoning and action at every step (flexible but higher per-step cost). Plan-and-execute separates planning from execution. LLMCompiler reports a **3.6x speedup** over sequential ReAct.
3. **Context window management strategy.** Five production approaches: time-based clearing, conversation summarization, observation masking, structured note-taking, and sub-agent delegation. ACON research showed **26 to 54% token reduction while preserving 95%+ accuracy** by prioritizing reasoning traces over raw tool outputs.
4. **Verification loop design.** Computational verification (tests, linters) provides deterministic ground truth. Inferential verification (LLM-as-judge) catches semantic issues but adds latency. Martin Fowler's Thoughtworks team frames this as **guides** (feedforward, steer before action) versus **sensors** (feedback, observe after action).
5. **Permission and safety architecture.** Permissive (fast but risky, auto-approve most actions) versus restrictive (safe but slow, require approval for each action). The choice depends on deployment context.
6. **Tool scoping strategy.** More tools often means worse performance. Vercel removed **80% of tools** from v0 and got better results. Claude Code achieves **95% context reduction** via lazy loading. The principle: expose the minimum tool set needed for the current step.
7. **Harness thickness.** How much logic lives in the harness versus the model. Anthropic bets on thin harnesses and model improvement. Graph-based frameworks bet on explicit control. Anthropic regularly deletes planning steps from Claude Code's harness as new model versions internalize that capability.

# The Harness Is the Product

Two products using identical models can have wildly different performance based solely on harness design. The TerminalBench evidence is clear: changing only the harness moved agents by 20+ ranking positions.

The harness is not a solved problem or a commodity layer. It's where the hard engineering lives: managing context as a scarce resource, designing verification loops that catch failures before they compound, building memory systems that provide continuity without hallucination, and making architectural bets about how much scaffolding to build versus how much to leave to the model.

The field is moving toward thinner harnesses as models improve. But the harness itself isn't going away. Even the most capable model needs something to manage its context window, execute its tool calls, persist its state, and verify its work.

The next time your agent fails, don't blame the model. Look at the harness.

That's a wrap!

If you enjoyed reading this:

Find me →[@akshay\_pachaar](https://x.com/@akshay_pachaar) ✔️

Every day, I share tutorials and insights on AI, Machine Learning, and vibe coding best practices.
