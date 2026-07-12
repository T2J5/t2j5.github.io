---
title: "Long-running Agent Harness：长任务如何分段、交接和恢复"
date: 2026-06-18 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://mp.weixin.qq.com/s/YazsWxiMwGFin_R10kXs5g"
original: true
index_img: /img/covers/ai.svg
banner_img: /img/covers/ai.svg
updated: 2026-07-12
---

> 原文来源：https://mp.weixin.qq.com/s/YazsWxiMwGFin_R10kXs5g

过拟合 AI 过拟合人生 *2026年6月17日 07:03*

> 摘要：长任务 Agent 的核心难题不是上下文窗口不够大，而是任务状态、工作证据和完成标准没有被外部化。本文拆解 Long-running Agent Harness 的工程模式：什么时候做 context compaction，什么时候做 context reset，handoff artifact 应该包含什么，planner / generator / evaluator 如何分工，以及 checkpoint、progress file、git history 如何共同支撑恢复和验收。
> 
> 标签：AI Agent、Harness Engineering、Long-running Agent、Context Reset、Checkpoint、Handoff Artifact

上一篇我们讲了 Sandbox 与 Manifest：Agent 要安全操作真实文件和工具，必须先有可声明、可隔离、可恢复的执行环境。这一篇继续往前走，讨论一个更麻烦的问题：如果任务不是 10 分钟，而是 3 小时、8 小时，甚至跨好几次会话，Agent 怎么不迷路？

很多人第一反应是"换更长上下文模型"。这当然有帮助，但它不是根治方案。长任务失败时，问题往往不是模型没看见信息，而是它不知道哪些信息还重要、哪些工作已经完成、哪些路径已经被验证失败、下一步到底该做什么。

一句话说：长任务不是靠无限上下文硬撑，而是靠 Harness 把状态外部化、任务分段化、交接结构化、评价独立化。

---

## 01长任务为什么会失败

一个短任务 Agent 像是在白板前解一道题。一个长任务 Agent 更像是接手一个真实项目：它要读代码、改文件、跑测试、回看错误、修下一处问题、最后把证据整理给人。

时间一拉长，Agent 会遇到四类典型故障。

![长任务 Agent 的四类失败模式表](https://mmbiz.qpic.cn/sz_mmbiz_png/AEiagGsHyqiboFrKibajFF02nzSxZs2udXLoat1yunzFrXdO7xSrDKrgZsBjk3Fjr4O3LujKKoGQFhjzbSGRPF9TJ4PChE2PELsC4lmeB50ibicE/640?wx_fmt=png&from=appmsg&watermark=1&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=0)

> 表 1: 长任务 Agent 的四类失败模式。四类问题分别对应状态、证据、验收和交接的外部化缺口。

Anthropic 在 long-running agents 的实践中也提到，跨多个上下文窗口持续推进仍然是开放问题；他们的改进方向不是单纯扩大上下文，而是把任务拆成可处理的块，并用结构化 artifact 在会话之间交接 <sup>[1]</sup> 。2026 年的 harness design 文章进一步把这种模式发展成 planner / generator / evaluator 三角色架构 <sup>[2]</sup> 。

![长任务 Agent 的四类失败模式](https://mmbiz.qpic.cn/sz_mmbiz_png/AEiagGsHyqibo0gT5qD2sOY8XFRwt7bTPO1diaEU579lBQVqv3C8mzL0cfzjTnwFIsuRicZqJvRSlia2xMsWtKlSR1iaAHAobIXgAYcnDibQj4ibsNw/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=1)

> 图 1: 长任务 Agent 的四类失败模式。问题通常不是"模型不会调用工具"，而是状态、证据、交接和验收没有被 Harness 托住。

一个反直觉的结论是：长任务里，记住一切反而会降低质量。 因为上下文越长，噪声越多，模型越容易把过期计划、失败路径和当前目标混在一起。真正有效的做法是保留任务状态，丢掉不再需要的过程噪声。

这也是 Long-running Harness 和普通 agent loop 的分水岭：普通 loop 依赖对话自然延续，Long-running Harness 依赖外部状态接力。

---

## 02Context Compaction 与 Context Reset

处理长上下文有两种常见手段：context compaction 和 context reset。它们看起来都在"缩短上下文"，但目标完全不同。

### Context Compaction

Context compaction 是把当前对话压缩成摘要，然后继续在同一个任务上下文里工作。它适合任务仍在连续推进，只是上下文快满了。

一个好的 compaction 摘要至少要保留：

• 当前目标和不可违反的约束

• 已完成的关键步骤

• 已验证失败的路径

• 当前工作区的关键文件变化

• 最近一次失败的错误信息

• 下一步建议

它不应该保留完整推理链、重复日志、无关探索过程和已经废弃的计划。Compaction 的目标不是"压缩聊天记录"，而是生成下一轮推理所需的最小任务状态。

判断 compaction 质量有个简单办法：把摘要交给一个新会话，如果它能在 5 分钟内说清当前目标、已完成工作和下一步，就说明摘要合格；如果它还要翻旧上下文，摘要就只是变短了，不是变清楚了。

### Context Reset

Context reset 更激进：结束当前会话，用结构化 handoff artifact 启动一个新会话。新会话不继承完整对话历史，只读取外部化的任务状态、文件 diff、验证日志和下一步计划。

它适合三种情况：

1\. 上下文污染严重：旧计划、旧错误、旧判断太多，继续压缩会把噪声也带过去

2\. 任务阶段切换：从调研进入实现、从实现进入测试、从修复进入验收

3\. 需要角色切换：从 generator 切到 evaluator，或者从 planner 切到 executor

![Context Compaction 与 Context Reset 对比](https://mmbiz.qpic.cn/mmbiz_png/AEiagGsHyqiboYLscFME9soXEVEPS45N7JQicf2atYp6JTsQ7UNV8icRqXuTKlVQWUDWZfK2x1PTiayicbFuZFVvsANnQiaOwMISgu7NLMehemDkPI/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=2)

> 图 2: Context Compaction 保留连续性，Context Reset 切断噪声。两者不是替代关系，而是不同阶段的 Harness 策略。

### 怎么选

![Compaction 与 Reset 选择表](https://mmbiz.qpic.cn/mmbiz_png/AEiagGsHyqibrI2ROqdyibVwDtyXLw8Db4cyOTuJHdjVgjVfTdE8ibuqMk2iavnOnOgjhdwucLfBOkjTWMCkBEHUcPrckxyNic54ADPOlpibibLm04w/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=3)

> 表 2: Compaction 与 Reset 的选择原则。同一子任务内优先保留连续性，阶段切换或独立验收时优先切断历史噪声。

一句话总结：compaction 是"带着整理过的记忆继续跑"，reset 是"把工作交接给一个新的自己"。

### 触发器由谁判断

真正落地时，compaction、reset、checkpoint 不应该只靠 Agent 自己"觉得差不多了"。更稳的做法是在 Harness 里放一个轻量调度器，持续观察运行信号：

![长任务调度触发器表](https://mmbiz.qpic.cn/mmbiz_png/AEiagGsHyqibqx8bkrtJLFAbtiaF3FYVMEomWY9XYglb9lI08VN7TsibIeeUWDIurZyOnSl5v1zvI5WvibjiaYISusZNYznxRo6h0liaiaInytrbGHY/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=4)

> 表 3: 长任务调度触发器。Harness 持续观察运行信号，决定何时压缩、重置、检查点或重新规划。

这层调度器不需要理解全部业务逻辑，但必须能识别"继续沿着当前上下文跑下去是否还安全"。否则长任务会把 compaction、reset 和 checkpoint 变成事后补救，而不是运行时控制。

---

## 03Handoff Artifact 应该包含什么

Context reset 能不能成功，取决于 handoff artifact 的质量。一个糟糕的交接文档只会说"我改了一些东西，测试还有点问题"。这等于没有交接。

一个可用的 handoff artifact 至少应该回答六个问题：

1\. 当前任务到底是什么？

2\. 哪些工作已经完成？

3\. 哪些尝试失败了，为什么失败？

4\. 工作区发生了哪些文件变化？

5\. 已经跑过哪些验证命令，结果是什么？

6\. 下一步应该从哪里开始？

可以把它设计成一个固定结构：

```
# Handoff Artifact

## Goal
- 修复登录失败：OAuth callback 在缺少 state 参数时返回 500

## Constraints
- 不修改数据库 schema
- 不引入新依赖
- 必须保留现有 public API

## Completed
- 定位到 \`auth/callback.ts\` 缺少 state guard
- 新增 state 校验分支
- 补充 2 个单元测试

## Failed Attempts
- 尝试在 middleware 层拦截 state，导致内部 callback 测试失败

## Workspace Changes
- modified: \`src/auth/callback.ts\`
- modified: \`tests/auth/callback.test.ts\`

## Verification
-\`pnpm test tests/auth/callback.test.ts\` 通过
-\`pnpm lint\` 失败：历史文件 \`legacy.ts\` 有未修复问题，和本次修改无关

## Next Step
- 跑完整 auth 测试套件，确认没有破坏 refresh token 流程
```
![Handoff Artifact 结构](https://mmbiz.qpic.cn/sz_mmbiz_png/AEiagGsHyqibrpcq1pfEdPNjVnsbv9rmxQytv1zJjtLO7VMP8sl6UUUfWQiazXic5QeSHIud3EfQtKlRm0lcZ4Q1af8n0mHS6RcPe9EzuQpE2rk/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=5)

> 图 3: Handoff Artifact 结构。它不是聊天摘要，而是下一轮 Agent 可以直接接手工作的任务状态包。

这里的关键不是格式，而是可接手性。新的 Agent 会话应该能只靠 handoff artifact、工作区文件和验证日志继续工作，而不是必须读取完整历史对话。

> Tip：handoff artifact 最好由 Harness 自动生成初稿，再让 Agent 补充解释。纯手写容易漏掉文件变化和验证命令；纯自动生成又可能缺少判断理由。

读这张图时可以把它理解成一个"交接检查清单"：目标、约束、已完成、失败尝试、文件变化、验证结果和下一步，缺任何一项，下一轮 Agent 都可能重新踩坑。

---

## 04Planner / Generator / Evaluator 三角色架构

长任务里最危险的反模式是：一个 Agent 从头规划、一路实现、最后自己宣布完成。它既是选手，又是裁判，还负责写赛后报告。短任务里这还能忍，长任务里很容易自我催眠。

更稳的结构是三角色分工：

![Planner Generator Evaluator 分工表](https://mmbiz.qpic.cn/sz_mmbiz_png/AEiagGsHyqibrNhtzMvu9zAVIKhiciakmBj0c0ZGShkkrhVEibTMktlwOu1mSiayevSEF3824WcEsrsZA1mzuDHWU2mwmBmQT0sQ7QIE7iaicZibFXNw/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=6)

> 表 4: Planner / Generator / Evaluator 分工。三者分别负责规划、执行和验收，避免同一个 Agent 自己写、自己评。

Anthropic 的 harness design 实践中，planner / generator / evaluator 的三角色架构用于把长时间 autonomous coding 拆成可推进、可评价的阶段 <sup>[2]</sup> 。这个思路很适合迁移到通用 Long-running Harness：Planner 管方向，Generator 管行动，Evaluator 管质量。

![Planner / Generator / Evaluator 三角色架构](https://mmbiz.qpic.cn/sz_mmbiz_png/AEiagGsHyqibpNmLz8ibNMFO0VIa6vnQFPYicTT37IG6DXQpQatsCd6lDh1xpzia7s4pOEj69MxazRah2zz94tZKH6h8sJwiaHjAgWYWW7ejcPgqk/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=7)

> 图 4: Planner / Generator / Evaluator 三角色架构。三者可以是不同 Agent，也可以是同一个模型在不同会话和不同指令下运行。

### Planner 不应该写太细

Planner 的任务不是把每一行代码都规划出来，而是把任务拆成可验证的阶段。一个好的 plan 关注：

• 当前阶段目标

• 输入材料

• 允许修改范围

• 验证命令

• 停止条件

• 风险点

如果 plan 写得太细，Generator 只会机械执行，遇到真实代码差异就崩。如果 plan 太粗，Generator 又会自由发挥。合适的粒度是：每个阶段能在一个上下文窗口内完成，并且有明确验证方式。

### Generator 必须写 progress file

Generator 不能只改代码。它还要持续更新一个外部进度文件，例如 `progress.md` 或 `.agent/progress.json` 。这个文件不需要很长，但必须结构化：

```
{
  "current_goal":"修复 OAuth callback 缺少 state 导致 500",
"active_files":[
    "src/auth/callback.ts",
    "tests/auth/callback.test.ts"
],
"completed":[
    "复现失败测试",
    "新增 state 缺失分支",
    "补充单元测试"
],
"blocked":[],
"last_verification":{
    "command":"pnpm test tests/auth/callback.test.ts",
    "status":"passed"
},
"next":"运行完整 auth 测试套件"
}
```

这个文件的价值在于：即使对话丢了，Harness 也能从工作区恢复任务状态。它和 handoff artifact 的区别是：progress file 是运行中持续更新的状态，handoff artifact 是阶段结束时的交接包。

这里还有一个细节：progress file 不应该只写"做了什么"，还要写"为什么停在这里"。长任务失败后，下一轮 Agent 最容易浪费时间的地方不是找不到代码，而是不知道上一次为什么没有继续往前走。 `blocked` 、 `last_verification` 和 `next` 这三个字段，就是为了把这种停顿原因显式化。

这些状态也不应该全部交给同一个角色写。一个更可靠的分工是：

![长任务状态文件写入责任表](https://mmbiz.qpic.cn/sz_mmbiz_png/AEiagGsHyqibojjxv67AukyEfka65ABSkxibkibzb3qlcrbFGVJ9M47DZ90YhZtRqfSk7JrPibSL3QqF4xaAicO2okL92icWAZszAsbcQ02wMTViaNE/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=8)

> 表 5: 长任务状态文件写入责任。状态文件不是备忘录，而是 Harness 可以依赖的运行协议。

分清写入责任后，状态文件就不只是"Agent 自己的备忘录"，而是 Harness 可以依赖的运行协议。

### Evaluator 必须独立

Evaluator 的职责不是"帮 Generator 找补理由"，而是独立回答三个问题：

1\. 任务完成标准是否满足？

2\. 证据是否足够？

3\. 是否引入了新的风险？

Evaluator 应该优先看 artifact、diff、测试日志和 trace，而不是相信 Generator 的总结。只要 Generator 和 Evaluator 共享同一个长上下文，Evaluator 就容易被前面的叙事带偏。所以在关键阶段，Evaluator 最好运行在 context reset 后的新会话里。

---

## 05Checkpoint、Task State 与 Git History

长任务恢复不是单靠一个 checkpoint 完成的。它至少有四类状态源：

![长任务恢复状态源表](https://mmbiz.qpic.cn/mmbiz_png/AEiagGsHyqiboKfCFlHuJ682Sg1983ziaVlT2kaibWetN1SKL6ZsCEOib06UFzb6cpicW9LC5OoWPCbvU2GHwYEh5UVBl8jzoQEUakZleU4icicFibIc/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=9)

> 表 6: 长任务恢复的四类状态源。Checkpoint 只能恢复环境，必须和任务状态、进度文件和 diff 一起使用。

OpenAI 的 Agents SDK 更新强调 harness 与 compute 分离后，Agent state 可以外部化；即使 sandbox 容器失败或过期，也可以通过 snapshotting 和 rehydration 在新容器中继续 <sup>[3]</sup> 。这说明 checkpoint 不是锦上添花，而是长任务 Harness 的基本能力。

但 checkpoint 只能回答"文件系统长什么样"，不能回答"为什么变成这样"。所以它必须和 task state、progress file、git diff 一起使用。

![Checkpoint 恢复路径](https://mmbiz.qpic.cn/sz_mmbiz_png/AEiagGsHyqibqlTCf4RV46hKwgs2HSmUDlDRRXNehR3V3K2RJK7t7ibCT0AdQw6qXaANazHbhicyD2nOgJXCDu1MrJkMjQmByTiasSCc3o9I5OCI/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=10)

> 图 5: Checkpoint 恢复路径。恢复时不仅要恢复文件系统，还要恢复目标、进度、验证证据和下一步动作。

一个实用的恢复流程是：

1\. 从最近 checkpoint 恢复工作区

2\. 读取 task state，确认任务阶段和目标

3\. 读取 progress file，确认已完成和下一步

4\. 查看 git diff，确认文件变化是否符合预期

5\. 重新运行最近一次验证命令

6\. 生成新的 handoff artifact，再继续执行

这 6 步看起来繁琐，但它解决了一个关键问题：恢复不是简单接着跑，而是先确认"恢复点可信"。

如果只能先做一个能力，优先做 progress file，而不是复杂 checkpoint。原因很简单：checkpoint 能恢复文件，但 progress file 能恢复意图。没有意图，恢复出来的只是一个不知道为什么被改成这样的工作区。

> Tip：不要把 progress file 当成给人看的工作日报。它首先是给下一轮 Agent 读取的机器友好状态，所以字段要稳定、粒度要小、结论要可验证。

---

## 06失败恢复：从哪里继续

长任务恢复最难的地方不是"能不能恢复"，而是"从哪里恢复"。恢复点选错了，就会重复工作、跳过验证，或者在错误状态上继续堆改动。

可以把恢复分成四级：

![失败恢复级别表](https://mmbiz.qpic.cn/mmbiz_png/AEiagGsHyqibqf2KhDwSxPUkIlibxibEcUJ6WTntKhLgjiamvD3eqyrtOznKGp4ibJnXBkFoIg2KStk3zDYdU3QTj663OVJPJI3POB7VuqicWLenxc/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=11)

> 表 7: 失败恢复的四个级别。越靠近外部副作用，恢复点越要保守。

选择恢复点的原则是：越靠近外部副作用，越要保守。 只读分析失败，可以从最近命令继续；已经改文件、发请求、写数据库，就应该回到 checkpoint 或 milestone，并检查幂等性。

### 避免重复工作

重复工作通常来自三个缺口：

• 没有记录失败路径，导致下一轮再次尝试

• 没有记录文件变化，导致重复修改

• 没有记录验证命令，导致重复跑无关检查

解决方式也很直接：失败路径写进 handoff artifact，文件变化用 git diff 兜底，验证命令写入 progress file。不要指望模型靠记忆避免重复，长任务里记忆最不可靠。

### 避免错误延续

恢复点可信，不代表任务方向可信。比如 Agent 已经完成了 80% 的实现，但后来发现最初需求理解错了。这时从 checkpoint 恢复只会继续错下去。

所以 Long-running Harness 需要一个"重新规划"触发器：

• 同一错误连续出现 3 次

• 验收标准无法满足

• 关键假设被新证据推翻

• Evaluator 判定当前方案方向错误

• 人类介入修改目标

触发后，Planner 重新生成计划，Generator 不再沿用旧上下文，只读取必要的证据和工作区状态。

---

## 07成本权衡：不是越多角色越好

Planner / Generator / Evaluator、context reset、checkpoint、handoff artifact 都会增加成本。多一个会话，就多一次上下文准备；多一个 evaluator，就多一次评估；多一次 checkpoint，就多一次存储和恢复开销。

所以，Long-running Harness 不是越复杂越好。它应该按任务风险分级启用。

![任务风险与 Harness 强度表](https://mmbiz.qpic.cn/mmbiz_png/AEiagGsHyqibpFsS541nO8V9aUSEnicpOfJS4gznthvATZtxPPghpu6phr0M2mg9up6WBEjcGtQW4jYeGX3aWzQXmIsNiaf2FdsjEsrpiaqeZ7pI/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=12)

> 表 8: 按任务风险选择 Harness 强度。失败后从头重来更便宜，就不要设计复杂恢复。

一个简单判断是：如果失败后从头重来更便宜，就不要设计复杂恢复；如果失败后无法解释或无法重做，就必须设计恢复和审计。

---

## 08最小可行 Long-running Harness

如果你现在要给一个代码 Agent 增加长任务能力，不必一上来做完整平台。可以从一个最小版本开始：

```
workspace/
├─ .agent/
│  ├─ task.md            # 任务规格
│  ├─ progress.json      # 当前进度
│  ├─ handoff.md         # 阶段交接
│  ├─ verification.log   # 验证命令与结果
│  └─ checkpoints/       # checkpoint 引用或元数据
├─ src/
├─ tests/
└─ ...
```

运行策略：

1\. 开始前写入 `task.md`

2\. 每完成一个关键步骤更新 `progress.json`

3\. 每次测试或构建输出追加到 `verification.log`

4\. 每个 milestone 生成 `handoff.md`

5\. 上下文污染或阶段切换时做 context reset

6\. 新会话先读取 `.agent/` ，再读取代码

7\. Evaluator 只基于 diff、日志和完成标准做判断

这个版本不华丽，但已经能解决大多数长任务失败的根因：状态不外部化、交接不可读、验证不可复现。

---

## 09总结：长任务的关键是可交接

长任务 Agent 的真正难点不是"让模型一直想下去"，而是让任务在多个上下文窗口、多个执行阶段、甚至多个 Agent 角色之间仍然能持续推进。

本文的核心结论可以压缩成五句话：

1\. 长任务不是靠更长上下文硬撑，而是靠状态外部化。

2\. Compaction 和 Reset 解决不同问题：前者整理记忆，后者切断噪声。

3\. Handoff Artifact 是长任务的交接合同，不是聊天摘要。

4\. Planner / Generator / Evaluator 分离可以降低自评偏乐观和过早收尾。

5\. Checkpoint 只能恢复环境，不能恢复意图，所以必须和 task state、progress file、git diff、验证日志一起使用。

下一篇会进入 Evaluation Harness：当我们改了 Harness、换了模型、调整了 prompt 或工具权限以后，怎么证明 Agent 真的变好了，而不是只是这次看起来更顺？

## 参考资料

<sup>[1]</sup>: Anthropic: Effective harnesses for long-running agents：https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents  
<sup>[2]</sup>: Anthropic: Harness design for long-running application development：https://www.anthropic.com/engineering/harness-design-long-running-apps  
<sup>[3]</sup>: OpenAI: The next evolution of the Agents SDK：https://openai.com/index/the-next-evolution-of-the-agents-sdk/

**微信扫一扫赞赏作者**

Harness 工程 · 目录

作者提示: 个人观点，仅供参考

继续滑动看下一个

过拟合人生

向上滑动看下一个
