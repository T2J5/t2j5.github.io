---
title: "Loop Engineering Clearly Explained 循环工程清晰解析"
date: 2026-06-28 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://x.com/akshay_pachaar/status/2069118430582866051"
original: true
---

> 原文来源：https://x.com/akshay_pachaar/status/2069118430582866051

![Image](https://pbs.twimg.com/media/HLb2P3ta4AAwPri?format=jpg&name=large)

Half your feed is suddenly saying the same thing. Stop prompting your agents, start engineering loops.你信息流里突然有一半人都在说同一件事：别再给智能体写提示词了，开始设计循环吧。

Boris Cherny, the person who built Claude Code, said it plainly: "I don't prompt Claude anymore. I have loops that are running. My job is to write loops."构建了 Claude Code 的 Boris Cherny 说得直白："我不再给 Claude 写提示词了。我运行着循环。我的工作就是写循环。"

The person who builds one of the most popular coding agents on earth doesn't prompt it. So what is he doing instead?这个打造了全球最热门编程智能体之一的人，自己都不给它写提示词。那他到底在做什么？

That's the whole idea behind loop engineering. Now let's break down why it's harder than it looks.这就是循环工程背后的核心理念。现在我们来拆解一下，为什么它比看起来要难得多。

# First, the loop itself首先，循环本身

An agent isn't a magic box. At its core, it's a plain loop:智能体并非魔法盒子。其核心就是一个简单的循环：

```python
while True:
    response = model(context)
    if response.has_tool_calls():
        results = run_tools(response.tool_calls)
        context += results
    else:
        break
```

The model reads the context. It asks to call a tool. You run the tool and feed the result back. The model reads again, and this repeats until it stops asking for tools.模型读取上下文。它请求调用某个工具。你执行该工具并将结果反馈回去。模型再次读取，如此重复，直到它不再请求调用工具为止。

**Model → tools → context → repeat.模型 → 工具 → 上下文 → 循环。**

Here's the part that surprises people. **This loop is already solved.** Every serious agent framework lands on roughly these six lines. Nobody is competing on the while statement.接下来这部分可能会让人意外：这个循环其实已经解决了。每个正经的智能体框架最终都会落到大致这六行代码上。没人会在 while 语句上较劲。

So if the loop is trivial, what is everyone actually engineering?既然循环本身没什么技术含量，那大家到底在工程化什么？

# The work moved outside the model真正的工作转移到了模型之外。

The center of gravity in AI keeps drifting away from the model itself.AI 的重心正不断从模型本身偏移。

- **Prompt engineering.** The words you send.提示工程——你发送的文字。
- **Context engineering.** Everything the model sees, not just your instructions.上下文工程——模型所看到的一切，而不仅仅是你的指令。
- **Harness engineering.** The code around the model that runs tools, tracks state, and handles errors.工具工程——模型周围的代码，用于运行工具、追踪状态和处理错误。
- **Loop engineering.** The autonomous cycle that drives the whole thing toward a goal.循环工程。驱动整个系统朝着目标自主运转的循环机制。

Each layer wraps the one before it. You didn't stop caring about prompts. You just realized the prompt is one small piece of a much bigger system.每一层都包裹着前一层。你并非不再关注提示词，而是意识到提示词只是庞大系统中的一小部分。

LangChain puts it cleanly. **Agent = Model + Harness. If you're not the model, you're the harness.**LangChain 清晰地定义了这一点。智能体 = 模型 + 框架。如果你不是模型，你就是框架。

And here's the finding that should reorder your priorities. **The harness now matters more than the model.** Teams have kept the model fixed, changed only the code around it, and jumped from the middle of a benchmark into the top five. Same brain, different loop.而这一发现应当重新排列你的优先级：框架现在比模型更重要。团队保持模型不变，仅修改其外围代码，就能从基准测试的中游跃升至前五名。同样的"大脑"，不同的循环。

Loop engineering is the discipline of building everything that brain runs inside. Let me show you the parts that actually break.循环工程是一门构建大脑内部运行一切的学科。让我为你展示那些真正会出问题的部分。

# Hard part 1: knowing when to stop难点一：知道何时停止

This is the problem nobody warns you about.这是没人提醒过你的问题。

When an agent stops asking for tools, it has ended its turn. That is not the same as finishing the job.当智能体不再请求工具时，它只是结束了当前回合。但这并不等同于完成任务。

Picture a coding agent. It writes some code, glances around, sees that progress was made, and announces it's done. The tests still fail. It declared victory anyway.想象一个编程智能体。它写了一些代码，环顾四周，看到有进展，就宣布任务完成。但测试依然失败。它还是宣告了胜利。

**A terminal message ends the turn, not the task.** Confusing those two is the most common way loops go wrong.终端消息结束的是当前回合，而非整个任务。混淆这两者，是循环出错最常见的原因。

Good loops stop for the right reasons, so you layer several brakes:良好的循环会因正确的原因停止，因此你需要设置多重制动机制：

- **Max iterations.** A hard cap so a stuck agent can't run forever.最大迭代次数。一个硬性上限，防止卡住的智能体无限运行下去。
- **Budget and time limits.** A ceiling on tokens, money, and seconds.预算与时间限制。对令牌数、资金和秒数设置上限。
- **No-progress detection.** If it repeats the same call with the same arguments, it's spinning.无进展检测。若重复调用相同参数，说明系统在空转。
- **A real completion check.** An automated condition proving the job is done.真正的完成检查。通过自动化条件证明任务已完成。

That last one carries the weight. "Done" should mean the tests pass, not the agent feeling good about its work.最后一条至关重要。"完成"应意味着测试通过，而非智能体自我感觉良好。

# Hard part 2: keeping the context clean难点二：保持上下文清晰

Long loops rot from the inside.长循环从内部开始腐烂。

The more turns an agent takes, the more junk piles into its context, like old tool outputs, dead ends, and stale reasoning. Model performance drops as that pile grows. The field calls it **context rot.**智能体执行的轮次越多，其上下文中堆积的垃圾信息就越多，比如过时的工具输出、死胡同和失效的推理。随着这些堆积物的增长，模型性能会下降。业界称之为上下文腐烂。

A loop makes it spiral. A rotted context produces a worse decision, which adds more noise, which rots the context further. People call this the doom loop, and you've felt it. The agent gets dumber the longer it runs.循环使其螺旋恶化。腐烂的上下文会产生更糟糕的决策，进而增加更多噪音，进一步腐蚀上下文。人们称之为厄运循环，你对此深有体会。智能体运行时间越长，就会变得越笨拙。

You fight it by treating context as a budget, not a bucket:对抗它的方法是把上下文当作预算，而不是桶来对待：

- **Compaction.** Summarize the conversation when it gets long, then continue from the summary.压缩。当对话过长时，先总结对话内容，然后从总结处继续。
- **Offloading.** Push huge outputs to a file and keep only the slice you need.卸载。将大量输出推送到文件中，仅保留所需的部分。
- **Sub-agents.** Hand a messy subtask to a separate agent and let only its clean result return.子代理。将混乱的子任务交给独立的代理处理，仅让其返回干净的结果。

The instinct is to keep everything, just in case. The skill is knowing what to throw away.本能是保留一切，以防万一。而技巧在于知道该舍弃什么。

# Hard part 3: tools the agent can actually use难点 3：智能体实际可用的工具

A loop is only as good as the tools inside it.循环的好坏取决于其内部工具的质量。

Pile on a hundred tools and the agent loses track of which one to reach for. A tight set of focused, non-overlapping tools wins. Anthropic's rule of thumb is sharp. If a human engineer can't say for certain which tool fits, the agent has no chance.堆砌上百个工具，智能体就会迷失方向，不知该用哪一个。一套精炼、功能不重叠的工具才是制胜关键。Anthropic 的经验法则很犀利：如果人类工程师都无法确定该用哪个工具，智能体就更不可能做到了。

Two things matter more than people expect:有两件事比人们预期的更重要：

- **Make writes safe to repeat.** Loops retry, and if a retried "create customer" call makes a second customer, you'll wake up to duplicate records and double billing. Anything that changes state has to be safe to call twice.确保写入操作可安全重复。循环会重试，如果重试的"创建客户"调用生成了第二个客户，你将面对重复记录和双重计费。任何改变状态的操作都必须能安全调用两次。
- **Write error messages for the agent, not the human.** A good error tells the agent what to do next. Before a tool ships, ask whether an LLM reading its error would know the next move.为智能体编写错误信息，而非人类。好的错误信息会告诉智能体下一步该怎么做。在工具上线前，先问问自己：如果 LLM 读到这个错误信息，它知道下一步该做什么吗？

In a loop, an error isn't a dead end. It's the next instruction.在循环中，错误并非终点，而是下一条指令。

# Hard part 4: something that can say no难点 4：能够说“不”的事物

Autonomous loops have a quiet failure mode. An agent left alone tends to agree with itself.自主循环存在一种隐蔽的故障模式。当智能体独自运作时，往往会陷入自我认同的循环。

The sharpest comment in the whole debate nailed it. Designing the loop is half the job, and the other half is putting something in the loop that can say no, like a test, a type check, or a real error.整场辩论中最犀利的评论一针见血。设计循环只是工作的一半，另一半则是在循环中加入能说"不"的东西，比如测试、类型检查或真正的错误。

**A loop with no critic is just an agent nodding along to its own work.没有评判者的循环，只是一个对自己的工作点头称是的智能体。**

The fix is to separate the maker from the checker. One model does the work. A different check, often a separate model or a hard test, grades it. The worker doesn't grade its own homework.解决方案是将执行者与检查者分离。一个模型负责执行任务，而另一个不同的检查机制（通常是独立的模型或严格的测试）来评估结果。执行者不评判自己的作业。

# The actual shift实际的转变

Now Cherny's quote makes sense.现在切尼的引文就说得通了。

Prompting is you steering the agent move by move. Loop engineering is you building the system that steers it, then stepping back.提示工程是你一步步引导智能体行动。循环工程则是你构建一个能引导它的系统，然后退居幕后。

Your job changes from giving instructions to designing three things:你的工作从下达指令转变为设计三样东西：

1. **The goal,** written as success criteria the agent can check itself against.目标，以智能体可自行核验的成功标准形式呈现。
2. **The loop,** with sane brakes so it stops well.循环，配备合理的制动机制以确保其能良好停止。
3. **The verifier,** so "done" is proven, not claimed.验证器，确保“完成”是经过验证的，而非仅凭声称。

Andrej Karpathy captures the mindset. Don't tell the model what to do, give it success criteria and watch it go. He runs research loops overnight that tweak a script, test it, keep what works, and discard what doesn't, with himself nowhere in the loop. He arranges it once and hits go.安德烈·卡帕西抓住了这种思维模式。不要告诉模型该做什么，而是给它成功标准，然后观察它自行运作。他整夜运行研究循环，自动调整脚本、进行测试、保留有效部分、舍弃无效部分，而他自己完全置身于循环之外。他只需一次性设置好，然后按下启动键。

That's the whole move. You stop being the hands and become the person who designs the machine.这就是整个转变。你不再只是动手操作的人，而是成为设计机器的人。

# Where to start从哪里开始

You don't need an overnight autonomous agent on day one. Build up to it:你不需要在第一天就搞出一个过夜就能用的自主代理。逐步构建即可：

1. **Start with the basic loop,** and add a max-iteration cap, a timeout, and a cost ceiling right away.从基础循环开始，并立即添加最大迭代次数上限、超时限制和成本上限。
2. **Define "done" as an automated check** before you begin, not a vibe afterward.在开始之前，就将“完成”定义为自动检查项，而不是事后凭感觉判断。
3. **Protect the context.** Compact long runs, offload big outputs, isolate messy subtasks.保护上下文。压缩长序列，卸载大输出，隔离混乱的子任务。
4. **Audit your tools.** Keep them few and focused, make writes safe to repeat, and rewrite errors so an agent can act on them.审计你的工具。保持工具精简且专注，确保写入操作可安全重复，并重写错误信息，使智能体能够据此采取行动。
5. **Put a critic in the loop.** Only go fully hands-off once you trust the thing that says no.在循环中引入一个评判者。只有当你信任那个说“不”的机制后，才能完全放手。

# The takeaway要点总结

Loop engineering isn't a framework or a tool you install. It's a shift in where you aim your effort.循环工程并非一个可安装的框架或工具，而是一种努力方向的转变。

The model is becoming a commodity. The loop around it is where the real engineering lives now.模型正逐渐成为通用商品，而围绕它的循环系统才是当前真正的工程核心所在。

The best builders stopped asking "what should I tell the agent to do?" They started asking "what system would do this without me?"顶尖的构建者不再问"我该让智能体做什么？"，而是开始思考"什么样的系统能在没有我的情况下完成这件事？"

Answer that one well, and you'll stop prompting too.若能妥善回答这个问题，你也会停止编写提示词。

Here's a summary of以下是摘要：

![Image](https://pbs.twimg.com/media/HLb7qMjacAAddIh?format=jpg&name=large)

Key takeaways in loop engineering. 

Thanks for reading!感谢阅读！

Cheers :) Akshay.干杯 :) Akshay.
