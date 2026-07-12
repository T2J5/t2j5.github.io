---
title: "Top AI Papers of the Week   本周顶级 AI 论文"
date: 2026-06-15 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://x.com/dair_ai/status/2066174390048358760"
original: true
index_img: /img/covers/ai.svg
banner_img: /img/covers/ai.svg
updated: 2026-07-12
---

> 原文来源：https://x.com/dair_ai/status/2066174390048358760

![Image](https://pbs.twimg.com/media/HKu_xTIWUAAit5g?format=jpg&name=large)

Welcome to The Top AI Papers of the Week (June 7 - June 14).

## 1\. MiniMax Sparse Attention

![Image](https://pbs.twimg.com/media/HKu_ynzWwAAvghM?format=png&name=large)

Ultra-long context is now a core requirement for agents, codebase-scale reasoning, multimodal workflows, and persistent memory, but dense softmax attention still makes million-token deployment expensive. MiniMax Sparse Attention (MSA) tackles this by adding blockwise sparsity on top of Grouped Query Attention, with a lightweight routing branch that chooses which key-value blocks each query group should actually attend to.

- **Two-branch attention design:** The Index Branch scores the full causal context and selects Top-k key-value blocks independently for each GQA group, while the Main Branch performs exact sparse attention only over those selected blocks.双分支注意力设计：索引分支对完整因果上下文进行评分，并为每个 GQA 组独立选择 Top-k 键值块，而主分支仅对这些选定块执行精确的稀疏注意力计算。
- **Hardware-aware implementation:** The paper co-designs the sparse pattern with GPU kernels, using exp-free Top-k selection and KV-outer sparse attention to improve tensor-core utilization under block-granular access.硬件感知实现：该论文将稀疏模式与 GPU 内核协同设计，采用无指数 Top-K 选择机制和 KV 外部稀疏注意力，在块粒度访问下提升张量核心利用率。
- **Large speedups at scale:** On a 109B-parameter natively multimodal model, MSA matches GQA performance while reducing per-token attention compute by 28.4x at 1M context. The paired kernel reaches 14.2x prefill and 7.6x decoding wall-clock speedups on H800.大规模加速效果：在 109B 参数的原生多模态模型上，MSA 在匹配 GQA 性能的同时，将 1M 上下文长度的单 token 注意力计算量降低 28.4 倍。配套内核在 H800 上实现了 14.2 倍预填充加速和 7.6 倍解码实时加速。
- **Why it matters:** Long context is only useful if it can be served cheaply. MSA is compelling because it keeps the mechanism simple, trains it directly into a production-scale model, open-sources the inference kernel, and powers the released MiniMax-M3 model.重要性解析：长上下文只有在低成本部署时才有实际价值。MSA 的突出优势在于：保持机制简洁性、直接训练至生产级模型、开源推理内核，并驱动已发布的 MiniMax-M3 模型。

[Paper](https://arxiv.org/abs/2606.13392) | [Tweet](https://x.com/MiniMax_AI/status/2065436935188058208)论文 | 推文

## 2\. Self-Harness

![Image|64](https://pbs.twimg.com/media/HKu_9jyWAAAq8bf?format=png&name=large)

Most agent scaffolds are built once by hand and then frozen, even as the underlying models keep changing. This paper introduces Self-Harness, a paradigm where an LLM agent improves its own operating harness, the prompts, tools, memory, and orchestration around the base model, without human engineers or a stronger external agent. Because every model fails in its own way, the system mines those model-specific weaknesses and turns them into concrete, executable harness edits rather than generic advice.大多数智能体框架都是人工一次性构建后便冻结不变，即便底层模型持续更新。本文提出 Self-Harness 范式，使 LLM 智能体能够自主改进其运行框架——包括基础模型周围的提示词、工具、记忆与编排系统，无需人类工程师或更强的外部智能体介入。由于每个模型的失败模式各不相同，该系统会挖掘特定于模型的弱点，并将其转化为具体可执行的框架编辑方案，而非泛泛的建议。

- **A three-stage self-improvement loop:** Self-Harness runs Weakness Mining, which clusters execution traces into model-specific failure patterns, then Harness Proposal, which generates diverse but minimal edits tied to those failures, then Proposal Validation, which accepts edits only after regression testing on held-in and held-out splits.一个三阶段自我改进循环：Self-Harness 首先运行弱点挖掘阶段，将执行轨迹聚类为模型特定的失败模式；随后进入框架提案阶段，针对这些失败模式生成多样化但最小化的编辑方案；最后通过提案验证阶段，仅在保留集和留出集上通过回归测试后才接受编辑。
- **Consistent gains across base models:** On Terminal-Bench-2.0, held-out pass rates rise for every model tested. MiniMax M2.5 improves from 40.5% to 61.9%, Qwen3.5-35B-A3B from 23.8% to 38.1%, and GLM-5 from 42.9% to 57.1%.各基础模型均获得持续提升：在 Terminal-Bench-2.0 基准测试中，所有测试模型的留出通过率均有提升。MiniMax M2.5 从 40.5%提升至 61.9%，Qwen3.5-35B-A3B 从 23.8%提升至 38.1%，GLM-5 从 42.9%提升至 57.1%。
- **Weaknesses become edits:** Rather than appending generic instructions, the loop converts each observed failure mode into a targeted change to memory, tools, or prompts, with reported relative improvements as high as 138%.弱点变为编辑：该循环并非附加通用指令，而是将每次观察到的失败模式转化为对记忆、工具或提示的针对性修改，报告显示相对改进幅度高达 138%。
- **Why it matters:** As models proliferate and evolve, hand-tuning a bespoke harness for each one does not scale. Self-Harness shows the scaffold itself can be made to adapt, closing the gap between a frozen harness and the model it wraps.为何重要：随着模型不断涌现和演进，为每个模型手动定制专属适配框架的做法难以规模化。Self-Harness 表明，框架本身可以实现自适应，从而缩小固定框架与其所封装模型之间的差距。

[Paper](https://arxiv.org/abs/2606.09498) | [Tweet](https://x.com/omarsar0/status/2064429834999304247)论文 | 推文

## 3\. Agents' Last Exam3. 智能体的终极考验

![Image](https://pbs.twimg.com/media/HKvAAPHWoAAex8F?format=jpg&name=large)

From Berkeley RDI, Agents' Last Exam (ALE) is a living benchmark built to measure whether agents can do economically valuable work, not just score well on academic tests. It was assembled with more than 250 industry experts and maps over 1,000 verifiable tasks to the U.S. federal occupational taxonomy, organized as 55 subfields across 13 industry clusters. Every task has an objective, checkable outcome, so there is no subjective human grading, and the pool is designed to keep growing as new workflows are onboarded.来自伯克利 RDI 的《智能体终极考试》（ALE）是一个动态基准测试，旨在衡量智能体能否完成具有经济价值的工作，而不仅仅是在学术测试中取得高分。该测试由 250 多位行业专家共同构建，将 1000 多个可验证任务映射至美国联邦职业分类体系，涵盖 13 个行业集群的 55 个子领域。每项任务都设有可核查的客观结果，无需人工主观评分，并且题库会随着新工作流程的加入持续扩展。

- **Grounded in real occupations:** Tasks are defined against O\*NET and SOC 2018 and span non-physical industries, deliberately targeting the professional workflows where agents would actually be deployed rather than puzzle-style problems.基于真实职业：任务依据 O\*NET 和 SOC 2018 标准定义，涵盖非实体行业，特意针对智能体实际部署的专业工作流程而非谜题式问题。
- **Three difficulty tiers:** Work is split into Near-Term, Full-Spectrum, and Last-Exam tiers, letting the benchmark track both near-term usefulness and the long tail of hard, multi-step jobs.三个难度层级：工作被划分为近期任务、全谱任务和终极考试任务三个层级，使基准测试既能追踪近期实用性，也能覆盖困难的多步骤长尾任务。
- **Far from saturated:** The hardest tier sits at just a 2.6% average full pass rate across mainstream harnesses, and even strong setups like Codex with GPT-5.5 score below 50% on the easiest tier and under 10% on the hardest.远未饱和：最难的层级在主流测试集上的平均完全通过率仅为 2.6%，即便是像搭载 GPT-5.5 的 Codex 这样的强大配置，在最容易的层级上得分也低于 50%，在最难的层级上则不足 10%。
- **Why it matters:** Strong scores on existing benchmarks have not translated into economically meaningful deployment. ALE reframes evaluation around verifiable, expert-curated work, giving a moving target that should resist saturation as agents improve.重要性：在现有基准测试中取得的高分并未转化为具有经济意义的实际部署。ALE 围绕可验证、专家策划的工作重新构建评估体系，提供了一个随着智能体能力提升而难以饱和的动态目标。

[Paper](https://arxiv.org/abs/2606.05405) | [Tweet](https://x.com/dair_ai/status/2062916866235068607)

## 4\. How AI Agents Reshape Knowledge Work

![Image](https://pbs.twimg.com/media/HKvAC3vWEAEHAkc?format=png&name=large)

This economics paper, drawing on large-scale production data from Perplexity, studies how the shift from conversational assistants to autonomous agents is reshaping knowledge work. It compares Search, a conversational assistant, with Computer, a general-purpose agent system, along three dimensions: autonomy, efficiency, and the scope of tasks people take on. The framing is a cost-structure model in which agents carry higher fixed and delegation costs but lower per-step marginal costs, so they win once tasks are complex enough.

- **Autonomy looks different in practice:** Computer performs around 26 minutes of autonomous machine work per session versus roughly 33 seconds for Search, and per-query dissatisfaction is 55% lower on the agent, 1.3% against 2.9%.
- **Large efficiency gains:** On matched tasks, Computer cuts completion time from 269 to 36 minutes, an 87% reduction in time and about a 94% reduction in cost relative to humans working with Search alone.
- **Scope shifts upward:** Agent queries are more cognitively complex, 71% abstract or non-routine versus 53%, with twice as much create-level work, and they bundle interdependent subtasks that cross occupational boundaries.
- **Why it matters:** The data supports a clean prediction. As the fixed costs of delegation fall, agents move the affordable value frontier toward higher-value, multi-step knowledge work, which is exactly where adoption grew fastest, reaching 84 times its first-week volume over the study.

[Paper](https://arxiv.org/abs/2606.07489) | [Tweet](https://x.com/omarsar0/status/2064076252584222933)

## 5\. Agentopia

![Image](https://pbs.twimg.com/media/HKvAK4oXAAAt262?format=png&name=large)

Agentopia is one of the most ambitious agent-society testbeds yet, a 79-page release that drops 100 LLM agents into a persistent world and lets them live, form relationships, and pursue goals over 10 simulated years, a horizon orders of magnitude longer than prior day-level work. Beyond observing emergent social behavior, the authors use the simulation as a training signal, optimizing models toward a life reward that reflects human well-being via rejection sampling.

- **Long-horizon by design:** Where earlier agent societies ran at the granularity of days, Agentopia simulates a decade of life per world, surfacing unscripted social strategies and interpersonal dynamics that only appear over long timescales.
- **Simulation as a training signal:** The life-reward metric is used to fine-tune more anthropomorphic models, and the improvements transfer beyond the simulation to downstream role-playing benchmarks rather than staying trapped in the sandbox.
- **Measured gains:** Trained agents improve overall CoSER Test performance by 15.6%, with the biggest jumps in Anthropomorphism at 23.7% and Character Fidelity at 16.4%, and they are respected by 24.2% more peers and liked by 15.9% more.
- **Why it matters:** A single 10-year, 100-agent run consumes 13.7 billion tokens across 567,000 LLM calls. That scale is a statement about where agent research is heading: living, learning populations as both an object of study and a source of training data.

[Paper](https://arxiv.org/abs/2606.07513) | [Tweet](https://x.com/dair_ai/status/2064075015960875347)

## 6\. The Geometry of On-Policy Distillation

![Image](https://pbs.twimg.com/media/HKvAOJaXYAAnm7A?format=jpg&name=large)

On-policy distillation (OPD) has become one of the most discussed post-training recipes of the year, but it has mostly been treated as a black box sitting somewhere between supervised fine-tuning and RL. This paper opens it up, characterizing how OPD changes a model's weights at the level of parameter geometry, and argues OPD is not a midpoint between SFT and RLVR but its own distinct kind of update.

- **It touches fewer weights:** Compared with SFT, OPD updates affect far fewer parameters and largely avoid the dominant principal directions of weight space, which helps explain its sample efficiency.
- **Early subspace locking:** OPD's cumulative updates rapidly collapse into a narrow, low-dimensional subspace early in training, rather than spreading across many directions as SFT does.
- **That subspace is functionally sufficient:** Constraining training to the early-formed subspace preserves OPD performance but substantially degrades SFT, showing the small subspace genuinely carries the useful signal rather than being an artifact.
- **Why it matters:** Knowing where in weight space OPD does its work turns a popular but poorly understood recipe into something with a mechanistic account. That makes the method easier to reason about, combine with other objectives, and improve deliberately instead of by trial and error.

[Paper](https://arxiv.org/abs/2606.07082)

## 7\. Lookahead Sparse Attention

![Image](https://pbs.twimg.com/media/HKvAQ9mWYAAxsly?format=png&name=large)

Long-context decoding is bottlenecked by the KV cache, which grows with every token and quickly dominates memory at extreme context lengths. This work, branded around DeepSeek-V4, introduces Lookahead Sparse Attention (LSA), which avoids storing the full KV cache by predicting which parts of the context future decoding will actually need and retaining only those query-critical chunks.

- **A learned, lightweight indexer:** Instead of keeping everything, a small indexer proactively selects the KV chunks that matter for upcoming generation, so the physical cache stays small without discarding information the model will need.
- **Backbone-free training:** A decoupled training strategy lets the indexer be trained on its own without loading the full backbone model, cutting the cost of adding the mechanism to a large model.
- **Big cache savings, no quality loss:** LSA shrinks the physical KV cache to 13.5% of the full-context baseline while slightly improving accuracy by 0.6% on average, and at 500K-token contexts it suppresses more than 90% of KV-cache overhead without destabilizing reasoning.
- **Why it matters:** Ultra-long context is increasingly the difference between a toy demo and a usable system, and memory is the wall. Predicting what context you will need, rather than keeping all of it, is a practical route to long context that fits in real hardware budgets.

[Paper](https://arxiv.org/abs/2606.09079)

## 8\. Latent Spatial Memory

Video world models struggle to stay consistent over long horizons because explicit 3D memory usually requires an expensive pixel-space loop. Mirage instead stores scene information directly in diffusion latent space, using depth-guided back-projection and latent-space warping to maintain persistent spatial memory. The approach reports up to 10.57 times faster end-to-end generation and 55 times lower memory use than explicit 3D-memory baselines while improving long-horizon spatial consistency.

[Paper](https://arxiv.org/abs/2606.09828)

## 9\. The Consistency Illusion

Multi-agent debate is often judged by whether the agents end up agreeing, but this paper shows that output-level consensus can hide deep disagreement in the reasoning that produced it. The authors abstract agents' reasoning traces and decisions into four states along two axes, reasoning similarity and conclusion agreement, and flag divergent agreement, where agents reach the same answer through very different paths. Across 600 content-moderation items, divergent agreement appeared in 118 cases and separated cleanly from genuine disagreement states with a Cohen's d of 0.80, and routing on these categories beat divergence-only methods at flagging high-disagreement cases.

[Paper](https://arxiv.org/abs/2606.04223) | [Tweet](https://x.com/dair_ai/status/2064395355220029696)

## 10\. Beyond Scalar Rewards

Reward models usually compress a judgment into a single scalar, but this paper argues human preferences are better captured as score distributions, and proposes Z-Reward, which internalizes reasoning into a predicted distribution before scoring. A large vision-language teacher does the reasoning-heavy judgment and is distilled into a compact student for efficient deployment, with the 27B teacher reaching 89.6% human-preference accuracy and the 9B student nearly matching it at 88.6%. Used as a reinforcement learning signal, it delivers a 41.3% net preference improvement over a supervised baseline, beating GRPO and other reward methods.

[Paper](https://arxiv.org/abs/2606.09076)
