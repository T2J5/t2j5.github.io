---
title: "12-Factor-Agents-精华中文笔记"
date: 2026-06-29 16:23:14
categories:
  - ai
tags:
  - ai
---

# 12-Factor Agents 精华中文笔记

> 来源项目：[humanlayer/12-factor-agents](https://github.com/humanlayer/12-factor-agents)  
> 主题：构建可靠、可维护、可上线的 LLM 应用与 Agent 系统  
> 整理目标：提取 12 个因素的核心思想，去掉闲谈与无关内容，保留关键图片、工程原则与落地要点。

## 目录

- [#一、项目核心观点](#一、项目核心观点)
- [#二、为什么需要 12-Factor Agents](#二、为什么需要 12-Factor Agents)
- [#三、Agent 的最小模型](#三、Agent 的最小模型)
- [#四、12 个因素总览](#四、12 个因素总览)
- [#Factor 1：Natural Language to Tool Calls（自然语言到工具调用）](#Factor 1：Natural Language to Tool Calls（自然语言到工具调用）)
- [#Factor 2：Own Your Prompts（掌控你的 Prompts）](#Factor 2：Own Your Prompts（掌控你的 Prompts）)
- [#Factor 3：Own Your Context Window（掌控上下文窗口）](#Factor 3：Own Your Context Window（掌控上下文窗口）)
- [#Factor 4：Tools Are Structured Outputs（工具只是结构化输出）](#Factor 4：Tools Are Structured Outputs（工具只是结构化输出）)
- [#Factor 5：Unify Execution State and Business State（统一执行状态与业务状态）](#Factor 5：Unify Execution State and Business State（统一执行状态与业务状态）)
- [#Factor 6：Launch / Pause / Resume with Simple APIs（用简单 API 启动、暂停、恢复）](#Factor 6：Launch / Pause / Resume with Simple APIs（用简单 API 启动、暂停、恢复）)
- [#Factor 7：Contact Humans with Tool Calls（用工具调用联系人类）](#Factor 7：Contact Humans with Tool Calls（用工具调用联系人类）)
- [#Factor 8：Own Your Control Flow（掌控控制流）](#Factor 8：Own Your Control Flow（掌控控制流）)
- [#Factor 9：Compact Errors into Context Window（把错误压缩进上下文窗口）](#Factor 9：Compact Errors into Context Window（把错误压缩进上下文窗口）)
- [#Factor 10：Small, Focused Agents（小而专注的 Agents）](#Factor 10：Small, Focused Agents（小而专注的 Agents）)
- [#Factor 11：Trigger from Anywhere（从任何地方触发）](#Factor 11：Trigger from Anywhere（从任何地方触发）)
- [#Factor 12：Make Your Agent a Stateless Reducer（让 Agent 成为无状态 Reducer）](#Factor 12：Make Your Agent a Stateless Reducer（让 Agent 成为无状态 Reducer）)
- [#五、工程落地清单](#五、工程落地清单)
- [#六、常见反模式](#六、常见反模式)
- [#七、一句话总结](#七、一句话总结)

## 一、项目核心观点

`12-Factor Agents` 的核心不是“再造一个 Agent 框架”，而是总结一组可以嵌入现有软件系统的工程原则。它反对把 Agent 交给黑盒框架一把梭，强调把 LLM 当成软件系统中的一个可控组件：让 LLM 负责理解自然语言、生成结构化意图；让确定性代码负责执行、状态、权限、恢复、审计和业务边界。

项目最重要的判断是：

- 好的 AI 产品通常不是一个“给 LLM 一堆工具然后循环直到完成”的大 Agent，而是“确定性软件 + 小范围 LLM 决策”的组合。
- LLM 很适合把含糊的人类语言转成结构化动作，但不应该拥有不受控的执行权。
- Prompt、上下文、工具输出、状态、控制流，都应该像普通代码一样可读、可测、可调试、可版本化。
- Agent 越大、上下文越长、步骤越多，越容易迷失、重复失败或走偏；生产系统应优先使用小而专注的 Agent。

## 二、为什么需要 12-Factor Agents

传统软件本质上是有向图：程序从一个节点流向另一个节点，条件分支决定路径。

![12-factor-agents-assets/010-software-dag.png](/img/ai/12-factor-agents-assets/010-software-dag.png)

DAG Orchestrator（如 Airflow、Prefect、Dagster 等）把这种有向图显式化，提供调度、重试、观测、模块化和管理能力。

![12-factor-agents-assets/015-dag-orchestrators.png](/img/ai/12-factor-agents-assets/015-dag-orchestrators.png)

机器学习进入软件后，很多系统只是把 ML 节点插入已有 DAG。例如分类、摘要、预测等步骤，但整体控制流仍由代码决定。

![12-factor-agents-assets/020-dags-with-ml.png](/img/ai/12-factor-agents-assets/020-dags-with-ml.png)

Agent 的诱人承诺是：不用工程师写死每个节点和边，只给 LLM 一个目标和一组可用转移，让它实时决定路径。

![12-factor-agents-assets/025-agent-dag.png](/img/ai/12-factor-agents-assets/025-agent-dag.png)

问题在于，这种“循环直到解决”的模式在真实生产场景里经常只能到 70%-80% 质量。它会在长上下文里迷失，重复尝试失败路径，或在高风险动作上缺少可靠的暂停、审批和恢复机制。对客户可见功能来说，80% 远远不够。

更可行的模式是 Micro Agent：把 Agent 放进更大的确定性系统里，只让它处理边界清晰、步骤有限、上下文可控的局部任务。

![12-factor-agents-assets/028-micro-agent-dag.png](/img/ai/12-factor-agents-assets/028-micro-agent-dag.png)

## 三、Agent 的最小模型

项目把 Agent 拆成四个朴素组件：

1. `prompt`：告诉 LLM 当前任务、可用动作、输出格式。
2. `switch statement`：确定性代码读取 LLM 的结构化输出，并决定如何处理。
3. `accumulated context`：保存已经发生的事件、工具调用、结果、人类反馈和错误。
4. `for loop`：不断把结果追加到上下文，再让 LLM 判断下一步，直到终止、暂停或交给外部事件恢复。

![12-factor-agents-assets/040-4-components.png](/img/ai/12-factor-agents-assets/040-4-components.png)

一个极简循环可以理解为：

```python
context = [initial_event]

while True:
    next_step = await llm.determine_next_step(context)
    context.append(next_step)

    if next_step.intent == "done":
        return next_step.final_answer

    result = await execute_step(next_step)
    context.append(result)
```

这不是建议你把所有生产系统都写成一个大循环，而是用它说明 Agent 的本质：LLM 选择下一步，确定性代码执行下一步，执行结果回到上下文。

![12-factor-agents-assets/027-agent-loop-animation.gif](/img/ai/12-factor-agents-assets/027-agent-loop-animation.gif)

## 四、12 个因素总览

| 因素 | 核心问题 | 精华结论 |
|---|---|---|
| Factor 1 | LLM 应该负责什么？ | 把自然语言转换成结构化工具调用。 |
| Factor 2 | Prompt 谁来控制？ | Prompt 是一等代码资产，不要外包给黑盒框架。 |
| Factor 3 | 上下文怎么组织？ | 自己设计上下文窗口，追求信息密度、安全性和可恢复性。 |
| Factor 4 | 工具是什么？ | 工具调用本质是结构化输出，不等于必须立刻执行函数。 |
| Factor 5 | 状态怎么存？ | 尽量统一执行状态与业务状态，用事件流作为单一事实来源。 |
| Factor 6 | 如何启动和恢复？ | Agent 应能通过简单 API 启动、查询、暂停、恢复。 |
| Factor 7 | 人类如何介入？ | 把联系人类也建模为工具调用和事件。 |
| Factor 8 | 控制流归谁？ | 应用代码拥有控制流，可以同步继续、异步暂停、审批、限流、压缩上下文。 |
| Factor 9 | 错误如何处理？ | 把压缩后的错误放回上下文，让 LLM 尝试恢复，但要设上限。 |
| Factor 10 | Agent 应该多大？ | 小而专注，通常控制在少量步骤和清晰领域内。 |
| Factor 11 | 从哪里触发？ | 支持 Slack、Email、Webhook、Cron、系统事件等入口。 |
| Factor 12 | 最终抽象是什么？ | Agent 可以看作从事件历史到下一事件的无状态 reducer。 |

## Factor 1：Natural Language to Tool Calls（自然语言到工具调用）

![12-factor-agents-assets/110-natural-language-tool-calls.png](/img/ai/12-factor-agents-assets/110-natural-language-tool-calls.png)

### 核心思想

LLM 最稳定、最实用的能力之一，是把自然语言请求转换成结构化对象。例如用户说“给某人创建 750 美元的付款链接”，LLM 不应该直接“执行付款”，而应该输出一个明确的结构化意图：

```json
{
  "function": {
    "name": "create_payment_link",
    "parameters": {
      "amount": 750,
      "customer": "cust_128934ddasf9",
      "product": "prod_8675309",
      "quantity": 1
    }
  }
}
```

确定性代码再检查这个结构化对象，补齐必要 ID，做权限判断、风控、日志记录，然后调用 Stripe 或其他业务 API。

### 工程要点

- LLM 负责“理解用户想做什么”，代码负责“这个动作是否允许、如何执行、如何回滚”。
- 工具调用应该是 typed schema，而不是自由文本解析。
- 复杂业务里，LLM 可能需要先列出客户、产品、价格等上下文，再生成最终调用参数。
- 不要把“LLM 能生成工具调用”理解为“LLM 可以直接拥有工具执行权”。

### 适用场景

- 从自然语言创建工单、付款链接、部署请求、CRM 更新、搜索请求。
- 把用户模糊表达转换为内部 API 参数。
- 把人类反馈转换为工作流下一步。

### 常见坑

- 让 LLM 直接执行外部副作用，而不是先输出可审查的结构化意图。
- 没有校验 schema、权限和业务约束。
- 把一次工具调用设计得过大，导致失败时很难恢复。

## Factor 2：Own Your Prompts（掌控你的 Prompts）

![12-factor-agents-assets/120-own-your-prompts.png](/img/ai/12-factor-agents-assets/120-own-your-prompts.png)

### 核心思想

不要把 Prompt Engineering 完全外包给框架。Prompt 是应用逻辑与 LLM 之间最关键的接口，应该像代码一样被你拥有、审查、测试和迭代。

很多框架会提供如下抽象：

```python
agent = Agent(
    role="...",
    goal="...",
    personality="...",
    tools=[tool1, tool2, tool3]
)

result = agent.run(task)
```

这对快速启动有帮助，但生产调优时常常很难知道最终传给模型的 token 到底是什么，也难以精细控制角色、上下文顺序、输出约束和边界条件。

### 工程要点

- Prompt 应该放在代码库里，参与版本控制。
- Prompt 应该有测试和 evals，尤其是工具选择、边界案例和拒绝策略。
- Prompt 模板应该清晰表达可用动作、输出格式、业务规则和安全要求。
- 可以使用 BAML、模板引擎或普通字符串，但最终目标是可控和可测。
- Prompt 的职责不是“包装人格”，而是把业务约束、可用动作、上下文解释和输出契约交给模型。

### 关键收益

- `Full Control`：你知道模型收到的确切指令。
- `Testing and Evals`：可以像测试代码一样测试 Prompt。
- `Iteration`：根据真实失败案例快速修改。
- `Transparency`：排查问题时能看到输入与输出。
- `Flexibility`：保留尝试不同格式、角色、上下文组织方式的自由。

### 常见坑

- 只配置 role、goal、personality，却不知道底层 Prompt。
- Prompt 散落在产品配置、数据库或第三方平台中，无法审查变更。
- 没有把失败案例沉淀为测试。

## Factor 3：Own Your Context Window（掌控上下文窗口）

![12-factor-agents-assets/130-own-your-context-building.png](/img/ai/12-factor-agents-assets/130-own-your-context-building.png)

### 核心思想

LLM 是无状态函数：输入上下文，输出下一步。Agent 的质量高度取决于你如何构造上下文窗口。

上下文不仅是聊天记录，还包括：

- 系统指令和任务说明。
- RAG 检索到的文档或外部数据。
- 已发生的工具调用与结果。
- 人类反馈、审批结果、错误信息。
- 相关历史、记忆或跨会话事件。
- 对结构化输出格式的说明。

标准 message 格式很好用，但不是唯一选择。为了提升信息密度、token 效率和模型注意力，你可以把事件流转换成自定义格式，例如 XML-like block：

```xml
<slack_message>
  From: @alex
  Channel: #deployments
  Text: Can you deploy the latest backend to production?
</slack_message>

<list_git_tags_result>
  tags:
    - name: "v1.2.3"
      commit: "abc123"
</list_git_tags_result>
```

### 工程要点

- 设计一个内部 `Thread/Event` 模型，记录所有发生过的关键事件。
- 单独实现 `event_to_prompt` 和 `thread_to_prompt`，把内部状态转换成给模型看的上下文。
- 不要把所有原始数据都塞进上下文；应该过滤、压缩、排序和结构化。
- 敏感数据、凭证、会话 ID 等应留在代码侧，不默认进入 LLM。
- 已解决的错误、过时结果、重复噪声可以从上下文中隐藏或摘要化。

### 判断标准

一个好的上下文窗口应该：

- 信息密度高：模型能快速看到影响下一步的事实。
- 结构清楚：事件类型、参数、结果、错误边界明显。
- token 高效：少用无意义包装，多放关键事实。
- 可审计：人类能读懂系统为什么走到当前状态。
- 可恢复：重新加载上下文后，Agent 能从正确位置继续。

### 常见坑

- 直接把完整聊天记录和所有工具原始输出追加到底。
- 让框架决定上下文格式，自己无法优化。
- 把状态存在多个地方，导致上下文和真实业务状态不一致。

## Factor 4：Tools Are Structured Outputs（工具只是结构化输出）

![12-factor-agents-assets/140-tools-are-just-structured-outputs.png](/img/ai/12-factor-agents-assets/140-tools-are-just-structured-outputs.png)

### 核心思想

“工具调用”本质上只是 LLM 输出的结构化数据。它描述了模型认为下一步应该做什么，但不意味着代码必须立刻、机械地调用同名函数。

例如：

```python
class CreateIssue:
    intent: "create_issue"
    title: str
    description: str
    assignee_id: str

class SearchIssues:
    intent: "search_issues"
    query: str
    what_youre_looking_for: str
```

LLM 输出 `CreateIssue` 后，应用代码可以选择：

- 直接创建 issue。
- 先请求人类审批。
- 检查重复 issue。
- 补齐缺失字段。
- 拒绝执行并要求更多信息。
- 将任务放入队列，等待外部系统处理。

### 工程要点

- 把工具调用看成“意图描述”，不是“函数指针”。
- 工具 schema 应表达业务语义，而不只是底层 API 参数。
- 工具执行前可以加入校验、审批、幂等、限流、审计。
- 工具结果也应该结构化，并能被放回上下文窗口。

### 与 Function Calling / JSON Mode 的关系

项目不执着于具体技术形式。你可以用 Function Calling、Structured Outputs、JSON Mode、Schema-Aligned Parsing 或普通 Prompt，只要最终能稳定得到可解析的结构化输出。关键在于你拥有输出契约和后续控制流。

## Factor 5：Unify Execution State and Business State（统一执行状态与业务状态）

![12-factor-agents-assets/155-unify-state-animation.gif](/img/ai/12-factor-agents-assets/155-unify-state-animation.gif)

### 核心思想

很多系统会把执行状态和业务状态分开：

- `Execution State`：当前步骤、下一步骤、等待状态、重试次数。
- `Business State`：到目前为止发生了什么，如消息、工具调用、结果、审批、错误。

项目建议：如果可以，尽量统一。很多执行状态其实可以从事件历史中推导出来。把事件流作为单一事实来源，可以显著降低复杂度。

### 工程要点

- 用一个 thread/event log 记录 Agent 工作流。
- 当前状态尽量从事件序列推导，而不是复制到多个状态机字段。
- 不适合进入 LLM 的数据可以存在旁路元数据里，但应尽量最小化。
- 每个工具调用、结果、人类反馈、错误、暂停都成为事件。

### 关键收益

- `Simplicity`：一个事实来源，减少状态同步问题。
- `Serialization`：线程天然可序列化和反序列化。
- `Debugging`：完整历史可见，易于复盘。
- `Flexibility`：新增事件类型即可扩展状态表达。
- `Recovery`：加载 thread 即可恢复。
- `Forking`：复制部分历史即可分叉实验。
- `Observability`：事件流容易渲染成 Markdown、Web UI 或审计日志。

### 常见坑

- 同时维护 workflow 状态、数据库状态、聊天状态、队列状态，且彼此不一致。
- 暂停恢复依赖内存中的调用栈，进程重启后无法继续。
- 工具结果只存日志，不存入可恢复的业务事件。

## Factor 6：Launch / Pause / Resume with Simple APIs（用简单 API 启动、暂停、恢复）

![12-factor-agents-assets/165-pause-resume-animation.gif](/img/ai/12-factor-agents-assets/165-pause-resume-animation.gif)

### 核心思想

Agent 是程序。程序应该能被启动、查询、暂停、恢复和停止。生产级 Agent 不应该只存在于一次阻塞式聊天调用里。

一个可靠 Agent 系统应支持：

- 外部系统通过简单 API 启动 Agent。
- Agent 遇到长任务、人类审批或外部事件时能暂停。
- Webhook、Cron、队列消息或用户回复能恢复 Agent。
- 恢复时不依赖内存调用栈，而依赖持久化 thread/event state。

### 工程要点

- `launch(thread_id, initial_event)`：创建或加载线程，开始运行。
- `pause(thread_id, reason)`：保存事件，退出当前执行。
- `resume(thread_id, event)`：追加外部事件，从上下文继续。
- `status(thread_id)`：查询当前事件、等待对象、最近结果。
- 长运行任务不要靠 `while sleep` 等在内存里等待。

### 关键边界

很多框架支持暂停恢复，但不一定支持在“模型选择工具之后、工具真正执行之前”暂停。这个粒度非常关键，因为高风险动作必须先审查再执行。

## Factor 7：Contact Humans with Tool Calls（用工具调用联系人类）

![12-factor-agents-assets/170-contact-humans-with-tools.png](/img/ai/12-factor-agents-assets/170-contact-humans-with-tools.png)

### 核心思想

联系人类也应该是工具调用。Agent 不一定总是“人类先发起、Agent 回复”。在很多生产场景里，Agent 由事件、Cron、告警、部署流程触发，运行到关键节点时再联系某个人审批、补充信息或做决定。

可以定义这样的结构化意图：

```python
class RequestHumanInput:
    intent: "request_human_input"
    question: str
    context: str
    options: {
        "urgency": "low | medium | high",
        "format": "free_text | yes_no | multiple_choice"
    }
```

当 LLM 输出这个意图时，代码保存事件、通知人类、暂停 Agent。之后 Slack、Email、SMS 或 Webhook 收到回复，再把人类响应追加为事件并恢复执行。

### 工程要点

- 人类请求和人类回复都进入事件流。
- 审批类请求要包含上下文、风险、可选项和 thread_id。
- 人类回复应保留来源、身份、时间戳和审批结果。
- 可以扩展到 Agent-to-Agent 请求，本质都是结构化事件交换。

### Outer Loop Agents

Outer Loop Agent 指不局限于 ChatGPT 式对话框的 Agent。它可以由外部事件触发，运行一段时间后主动联系人类，等待反馈，再继续执行。

![12-factor-agents-assets/175-outer-loop-agents.png](/img/ai/12-factor-agents-assets/175-outer-loop-agents.png)

### 常见坑

- 只把人类输入当聊天消息，而不是可审计事件。
- 高风险动作没有结构化审批。
- Agent 暂停后无法从人类回复恢复。

## Factor 8：Own Your Control Flow（掌控控制流）

![12-factor-agents-assets/180-control-flow.png](/img/ai/12-factor-agents-assets/180-control-flow.png)

### 核心思想

不要把 Agent 控制流完全交给框架。应用代码应该决定什么时候继续循环、什么时候暂停、什么时候请求审批、什么时候执行工具、什么时候压缩上下文、什么时候升级给人类。

同一个 LLM 输出，在不同业务场景下可能对应不同控制流：

- `request_clarification`：暂停并等待人类回复。
- `fetch_open_issues`：同步执行工具，把结果追加上下文，然后继续问模型。
- `create_issue`：高风险或有副作用，先请求审批，再执行。
- `deploy_backend`：生产操作，必须在工具选择和工具执行之间暂停。

### 工程要点

- 用显式 switch/handler 管理每种 intent。
- 区分同步步骤、异步步骤、高风险步骤和终止步骤。
- 支持 durable sleep、等待 webhook、等待队列任务、等待人类审批。
- 在控制流层加入日志、trace、metrics、rate limiting、重试上限。
- 在必要时对工具结果做摘要、缓存或 LLM-as-judge 校验。

### 为什么重要

如果不能在“工具选择”和“工具执行”之间暂停，你只能：

- 让进程阻塞等待，可靠性差。
- 限制 Agent 只能做低风险任务。
- 放任 Agent 直接做高风险操作，缺乏审批和审计。

生产系统通常需要第三种以外的选择。

## Factor 9：Compact Errors into Context Window（把错误压缩进上下文窗口）

![12-factor-agents-assets/195-factor-9-errors.gif](/img/ai/12-factor-agents-assets/195-factor-9-errors.gif)

### 核心思想

Agent 的一个实用能力是自我修复：工具调用失败后，把错误信息放回上下文，LLM 可能会读懂失败原因并尝试新的调用方式。

但不要把原始超长 stack trace 无脑塞回去。应该把错误压缩成模型能理解、能行动的结构化事件。

```python
try:
    result = await handle_next_step(thread, next_step)
    thread.events.append({
        "type": next_step.intent + "_result",
        "data": result
    })
except Exception as e:
    thread.events.append({
        "type": "error",
        "data": format_error(e)
    })
```

### 工程要点

- 错误事件应包含失败工具、关键参数、错误类别、可恢复线索。
- 对同一工具设置连续错误上限，例如 3 次。
- 达到上限后应停止循环、压缩上下文、切换策略或升级给人类。
- 已解决错误可以摘要化或从模型上下文中移除，但保留在审计日志里。

### 常见坑

- 无限重试导致 Agent 原地打转。
- 原始错误太长，污染上下文。
- 错误没有结构化，模型看不出该改什么。
- 不区分可恢复错误和必须人工介入的错误。

## Factor 10：Small, Focused Agents（小而专注的 Agents）

![12-factor-agents-assets/1a0-small-focused-agents.png](/img/ai/12-factor-agents-assets/1a0-small-focused-agents.png)

### 核心思想

不要构建试图做所有事情的巨型 Agent。Agent 应该是更大确定性系统里的一个构件，负责边界清晰、上下文较短、步骤有限的任务。

项目建议的经验范围是：让 Agent 处理大约 3-10 步，最多也许 20 步以内的工作流。上下文越长，模型越容易失焦、遗忘关键约束、重复失败路径。

### 工程要点

- 每个 Agent 有明确职责和退出条件。
- 用确定性代码编排多个小 Agent，而不是让一个 Agent 管所有事情。
- 长任务拆成阶段，每阶段上下文单独控制。
- 把复杂 DAG 的局部节点替换成 Agent，而不是让 Agent 替代整张 DAG。
- 对每个 Agent 建独立 evals 和失败案例集。

### 即使模型变强也仍然需要

即使未来模型能处理更长工作流，小而专注仍有价值。它让系统今天就可靠，也让你可以随着模型能力提升逐步扩大 Agent 边界，而不是一开始就把质量押在长上下文能力上。

![12-factor-agents-assets/1a5-agent-scope-grow.gif](/img/ai/12-factor-agents-assets/1a5-agent-scope-grow.gif)

## Factor 11：Trigger from Anywhere（从任何地方触发）

![12-factor-agents-assets/1b0-trigger-from-anywhere.png](/img/ai/12-factor-agents-assets/1b0-trigger-from-anywhere.png)

### 核心思想

Agent 不应该只能从一个聊天框启动。真正有用的 Agent 应该能从用户所在的地方或系统事件所在的地方启动，并在同样的渠道里反馈。

可触发入口包括：

- Slack / Teams。
- Email。
- SMS。
- Webhook。
- Cron。
- 告警系统。
- GitHub / CI 事件。
- 内部业务系统事件。

### 工程要点

- 入口事件统一转换成 thread/event。
- 不同渠道只负责接入和通知，不应该各自实现 Agent 逻辑。
- Agent 回复应能回到原渠道，同时保留 thread_id 以便恢复。
- 对高风险工具，渠道集成应支持快速找到合适的人审批。

### 价值

- 用户不必切换到专门聊天界面。
- Agent 可以作为数字同事参与真实工作流。
- 系统事件可以主动触发 Agent，关键节点再联系人类。
- 多渠道人类审批使高风险操作更可控。

## Factor 12：Make Your Agent a Stateless Reducer（让 Agent 成为无状态 Reducer）

![12-factor-agents-assets/1c0-stateless-reducer.png](/img/ai/12-factor-agents-assets/1c0-stateless-reducer.png)

### 核心思想

最终，Agent 可以被抽象成一个无状态 reducer：

```text
next_event = agent(previous_events)
```

也就是说，Agent 不依赖隐藏内存或进程状态，而是读取事件历史，产生下一个事件。外部系统负责保存事件、执行副作用、恢复线程、处理并发和审计。

![12-factor-agents-assets/1c5-agent-foldl.png](/img/ai/12-factor-agents-assets/1c5-agent-foldl.png)

### 工程要点

- LLM 调用本身尽量无状态。
- 所有必要信息来自持久化事件和可控上下文构造。
- 副作用由确定性 handler 执行，不藏在模型内部。
- 恢复、重放、分叉、测试，都围绕事件序列完成。

### 关键收益

- 可重放：给定同一事件历史，可以复盘 Agent 当时看到什么。
- 可恢复：进程崩溃后加载事件即可继续。
- 可测试：构造事件序列即可测试下一步选择。
- 可审计：每一步的输入、输出、审批、错误都有记录。

## 五、工程落地清单

### 设计层

- 明确 Agent 只负责哪些决策，不负责哪些执行。
- 把业务流程拆成确定性 DAG + 小范围 Agent 决策点。
- 为每个 Agent 定义输入事件、可输出 intent、终止条件和升级条件。
- 识别高风险工具，设计审批、幂等和回滚策略。

### Prompt 与 Schema

- Prompt 入库，参与版本控制。
- 为每个 intent 定义 typed schema。
- Prompt 明确列出工具语义、业务限制、输出格式和安全要求。
- 为常见失败案例写 evals。

### Context

- 建立 `Thread` / `Event` 模型。
- 实现上下文渲染层，把事件转换成模型输入。
- 对工具结果、错误、历史消息做摘要和过滤。
- 不把凭证、敏感数据和无关噪声放入 LLM 上下文。

### Runtime

- 用 handler/switch 管理每个 intent。
- 区分同步执行、异步暂停、人类审批、终止、错误恢复。
- 支持 `launch`、`pause`、`resume`、`status`。
- 所有外部触发统一追加为事件。

### Reliability

- 工具执行前做 schema 校验、权限校验和业务校验。
- 对副作用操作做幂等设计。
- 设置连续错误上限。
- 保存完整事件日志，支持审计、重放和分叉。
- 对每个小 Agent 单独观测成功率、恢复率、人工介入率。

## 六、常见反模式

- 把 Agent 当成一个超大黑盒，让它自己决定所有步骤。
- 使用框架默认 Prompt，却无法查看或测试最终 Prompt。
- 把工具调用等同于立即执行函数。
- 把所有上下文、日志、stack trace 原样塞给 LLM。
- 在内存里等待长任务或人工审批，无法跨进程恢复。
- 没有在工具选择和工具执行之间设置审批点。
- 一个 Agent 管太多领域、太多工具、太多步骤。
- 多渠道入口各自实现逻辑，导致状态分裂。
- 错误无限重试，没有升级路径。

## 七、一句话总结

`12-Factor Agents` 的精华是：用软件工程的方式驯服 LLM。让 LLM 做它擅长的自然语言理解和结构化决策，让代码掌控 Prompt、上下文、工具执行、状态、控制流、人类介入、错误恢复和审计。生产级 Agent 不是更大的黑盒，而是更清晰的边界、更小的作用域和更可靠的事件驱动系统。
