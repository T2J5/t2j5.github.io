---
title: "Loops explained: Claude, GPT, Mira and what actually works循环机制详解：Claude、GPT、Mira 以及真正有效的方法"
date: 2026-06-28 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://x.com/AnatoliKopadze/status/2068328135611822149"
original: true
index_img: /img/covers/ai.svg
banner_img: /img/covers/ai.svg
updated: 2026-07-12
---

> 原文来源：https://x.com/AnatoliKopadze/status/2068328135611822149

![Image](https://pbs.twimg.com/media/HLQR6x3WgAAoX0v?format=jpg&name=large)

AI has been in everyone's hands for years. Most people who use it every day still use it the slowest way there is: type a request, wait, fix it, ask again, all by hand.人工智能已经掌握在每个人手中多年。大多数每天使用它的人仍然在用最慢的方式：手动输入请求、等待、修正、再次提问，全程手动操作。

Not because the faster way is complicated, because nobody showed them what it looks like.不是因为更快的方法复杂，而是因为没人向他们展示过它是什么样子。

The faster way is a loop, and right now it is the one thing the best AI engineers in the world care about. This article fixes the part nobody explained. By the end you will understand loops better than almost anyone on your timeline: what they are, how they actually work under the hood, when they are worth it and when they are a trap, how to build a basic one yourself in Claude or ChatGPT, the simple ones worth running in your own life.更快的方法就是循环，而目前这正是全球顶尖 AI 工程师们最关注的事情。这篇文章将补上没人解释清楚的那部分。 读完本文后，你将比时间线上几乎任何人都更理解循环：它们是什么，底层实际如何运作，何时值得使用、何时是陷阱，如何在 Claude 或 ChatGPT 中自己构建一个基础循环，以及那些值得在生活中运行的简单循环。

Before we get into it, follow me on X and join my Telegram channel I just created where I post more AI content every day. Both are free.在开始之前，请先在 X 上关注我，并加入我刚创建的 Telegram 频道，我每天都会在那里发布更多 AI 内容。两者都是免费的。

X - [https://x.com/AnatoliKopadze](https://x.com/AnatoliKopadze)

Telegram - [https://t.me/kopadzemp](https://t.me/kopadzemp)

## How most people use AI?大多数人如何使用 AI？

Look closely at the one-request-at-a-time habit, because it is the whole problem. Every step runs through you. You decide what to ask, you judge the answer, you decide what comes next. The AI never moves unless you push it, and the moment you stop, it stops.仔细看看这个“一次只处理一个请求”的习惯，因为这就是问题的全部。每一步都要经过你。你决定问什么，你判断答案，你决定下一步做什么。除非你推动，否则 AI 永远不会行动；一旦你停下来，它也就停下了。

This is fine, but it has a ceiling. You are the engine. The AI is only the tool in your hand, and a tool does nothing on its own.这固然可行，但存在上限。你是引擎，而 AI 只是你手中的工具——工具本身不会主动做任何事。

There is another way to work, and it is the reason the best engineers in the world are changing how they build. Instead of walking the AI through every step, you give it the goal once and let it run the steps itself. It plans, does the work, checks its own result, fixes what is weak, and repeats until the goal is met. You step out. The work keeps going.还有另一种工作方式，这正是全球顶尖工程师们改变构建方式的原因。你无需一步步引导 AI，只需一次性给出目标，让它自行执行步骤。它会规划、执行、检查自身结果、修复薄弱环节，并不断重复直到达成目标。你抽身而出，工作却仍在继续。

> Jun 8
> 
> Here’s your monthly reminder that you shouldn’t be prompting coding agents anymore. You should be designing loops that prompt your agents.这是每月提醒：你不应该再手动提示编码代理了。 你应该设计循环来提示你的代理。

<video preload="none" tabindex="-1" playsinline="" aria-label="Embedded video" poster="https://pbs.twimg.com/amplify_video_thumb/2068028099128643584/img/WqoEwyrbdk15hRD7.jpg" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"><source type="video/mp4" src="blob:https://x.com/c93251b7-3643-48c0-b374-1a0295a33293"></video>

0:06 / 0:08

Two of the most respected engineers, saying the same thing in different words. Most people read lines like these and quietly had no idea what they meant in practice. So let's break it down properly.两位最受尊敬的工程师，用不同的语言表达了相同的观点。大多数人读到这些文字时，其实并不清楚它们在实践中的具体含义。所以，让我们来好好拆解一下。

## What a loop is?什么是循环？

A prompt is a single instruction. A loop is a goal the AI keeps working toward until it gets there. Think of it as a recursive goal: you define a purpose, and the AI iterates until it is complete.提示词是一条单独的指令。而循环则是 AI 持续朝着目标努力，直到达成目标为止。你可以把它看作一个递归目标：你定义一个目的，AI 不断迭代直到完成。

A prompt gives you one answer and then waits for you to decide what is next. A loop runs the full cycle on its own:提示词只给你一个答案，然后等待你决定下一步做什么。而循环会自动运行完整流程：

```text
DISCOVER  →  work out what needs doing
PLAN      →  decide how to do it
EXECUTE   →  do the work
VERIFY    →  check it against the goal
ITERATE   →  not there yet? feed the result back in and repeat
```

Three of these five do all the real work, and they are where people get loops wrong.这五个步骤中有三个承担了所有实际工作，而人们正是在这三个步骤上容易搞错循环的运作方式。

**Verify is the heart of the loop.** Without a real check on the result, you do not have a loop, you have the agent agreeing with itself on repeat. The check is what turns repetition into progress. It can be a hard test ("does the code pass"), a measurable condition ("is the number above X"), or a rubric the model scores against. No gate means the agent grades its own homework, and the model that did the work is far too generous a grader.验证是循环的核心。如果没有对结果进行真正的检查，你就没有形成循环，只是让智能体不断自我认同。检查才是将重复转化为进步的关键。它可以是一个硬性测试（"代码是否通过"）、一个可衡量的条件（"数值是否超过 X"），或者模型需要对照评估的评分标准。没有把关机制，就等于让智能体自己批改作业，而完成工作的模型作为评分者会过于宽容。

**State is what makes the loop learn.** Each pass, the AI has to remember what it already tried, or it repeats the same mistake forever. A real loop keeps a small record on the side: what is done, what failed, what is next. Tomorrow's run resumes instead of starting from zero. This is also exactly where it starts getting expensive, which we will get to.状态是让循环学习的关键。每次迭代中，AI 必须记住已经尝试过的内容，否则就会永远重复同样的错误。真正的循环会在旁侧保留一份简短记录：已完成事项、失败记录、下一步计划。次日的运行将从断点处继续，而非从零开始。这也正是成本开始攀升的节点，我们稍后会详细说明。

**A stop condition is what keeps it sane.** A loop with no exit runs until it succeeds, breaks, or drains your account. Every serious loop has two ways to stop: success, and a hard limit ("after 8 tries, stop and report"). Skip this and you have built a machine that can run all night for nothing.停止条件是让循环保持理智的关键。没有退出条件的循环会一直运行，直到成功、中断或耗尽你的账户余额。每个严谨的循环都有两种停止方式：成功，以及硬性限制（"尝试 8 次后停止并报告"）。跳过这一点，你就造出了一台可能整夜空转的机器。

A prompt hands the AI an instruction. A loop hands the AI a job, a way to know when the job is done, and a rule for when to give up.提示词给 AI 一个指令。循环则给 AI 一项任务、一种判断任务何时完成的方法，以及一个何时放弃的规则。

## Do you even need one?你真的需要一个吗？

Most articles sell you the loop before they tell you when it is a mistake. Here is the test the serious people actually use. A loop is worth building only when all four of these are true:大多数文章在告诉你何时使用循环是个错误之前，就已经在向你推销循环了。以下是真正严谨的人实际采用的判断标准。只有当以下四个条件全部成立时，才值得构建一个循环：

- **The task repeats, at least weekly.** Less than that and the setup cost never pays itself back. A one-off is still better served by one good prompt.任务至少每周重复一次。低于这个频率，搭建成本永远无法收回。一次性任务仍然更适合用一个好提示词来解决。
- **Something can automatically reject bad output.** A test, a type check, a build, a linter, a hard rule. If nothing can fail the work for you, the loop just spins.某些事物可以自动拒绝不良输出。测试、类型检查、构建、代码检查、硬性规则。如果没有任何东西能为你让工作失败，循环就只会空转。
- **The agent can actually do the work itself,** end to end, not hand half of it back to you.智能体实际上可以端到端地自主完成工作，而不是把一半任务交还给你。
- **"Done" is objective, not a judgment call.** If quality is a matter of taste, a human still wins."完成"是客观标准，而非主观判断。如果质量取决于个人品味，人类仍然更胜一筹。

Miss one box, keep it as a manual prompt. The honest version of this whole topic: loop engineering is real, and most people do not need the heavy version yet. **What everyone can use is the light version, which we will get to.** But you should know where the line is.漏掉某个环节时，就将其保留为手动提示。关于这个主题最诚实的说法是：循环工程确实存在，但大多数人目前还不需要复杂版本。每个人都能使用的是轻量版，我们稍后会讲到。不过你应该清楚界限在哪里。

## The version built for code专为代码构建的版本

Loops took off in software first, because code is the easiest thing in the world to verify. A test passes or it fails. There is no arguing with it, so the AI always knows whether it is finished.循环在软件领域率先兴起，因为代码是世界上最容易验证的东西。测试要么通过要么失败，毫无争议，因此 AI 总能判断任务是否完成。

A coding loop is given a goal and a strict way to check it:编码循环被赋予一个目标以及一个严格的检查方式：

```text
▸ LOOP SPEC
GOAL: every test in /tests/auth passes, lint is clean, no type errors.

EACH ITERATION:
  1. run the test suite and read every failure
  2. pick the single highest-impact failure
  3. write the smallest change that fixes it
  4. re-run the tests, lint, and type checker

VERIFY: green tests + zero lint warnings + zero type errors
STOP WHEN: verify passes, OR 8 iterations reached
ON STOP: summarize what changed and what still fails
```

Under the hood, a real loop is assembled from five building blocks. Claude Code and Codex now ship all five.在底层，一个真正的循环由五个构建块组装而成。Claude Code 和 Codex 现已全部配备这五个构建块。

**1\. The automation (the heartbeat)1. 自动化（心跳机制）**

This is the trigger that makes it a loop and not a one-off you ran once. You define a prompt, a cadence, and a goal, and it runs on schedule without you starting it. In Claude Code, /loop re-runs a prompt on an interval, /goal keeps a session going until a condition you wrote is actually true, hooks fire commands at points in the agent's lifecycle, and pushing it to a cron job or GitHub Actions keeps it running after you close the laptop. Findings come to you. You are not the one going around checking.这是让它成为循环而非一次性运行的关键触发机制。你只需定义一个提示词、一个执行节奏和一个目标，它就会按计划自动运行，无需你手动启动。在 Claude Code 中，\`/loop\`按时间间隔重复执行提示词，\`/goal\`持续运行会话直到你设定的条件真正成立，钩子（hooks）在代理生命周期的特定节点触发命令，而将其推送到 cron 任务或 GitHub Actions 后，即使合上笔记本电脑也能持续运行。结果会自动送达给你，无需你主动去检查。

**2\. The skill (reusable instructions)2. 技能（可复用的指令）**

Instead of pasting a wall of instructions into every run, you save them once as a file the loop reads every time: the rules, the patterns to follow, and a hard list of what it must never touch. Now the automation just calls the skill by name, and the recurring job stays maintainable instead of rotting inside a schedule nobody updates.与其每次运行时都粘贴一大段指令，不如将它们一次性保存为文件，让循环每次读取：规则、要遵循的模式，以及一份它绝不能触碰的硬性清单。现在，自动化只需按名称调用技能，重复性任务就能保持可维护性，而不会在无人更新的计划表中逐渐腐坏。

**3\. Sub-agents (keep the maker away from the checker)3. 子代理（让创建者远离检查者）**

The single most useful structural trick in a loop is splitting the agent that does the work from the agent that checks it. The model that wrote the code is too nice grading its own homework. A second agent, with different instructions and sometimes a stronger model on higher effort, catches the things the first one talked itself into. Your writer can be fast and cheap, your reviewer slow and strict. That separation is most of the quality.循环中最有用的结构技巧，是将执行任务的智能体与检查任务的智能体分开。编写代码的模型在批改自己的作业时往往过于宽容。而第二个智能体，配备不同的指令，有时还会以更高成本使用更强的模型，能够捕捉到第一个智能体自我说服时忽略的问题。你的写手可以快速且廉价，而你的审稿人则需缓慢且严格。这种分离正是质量提升的关键所在。

**4\. Connectors (so it acts, not suggests)4. 连接器（使其执行，而非建议）**

This is the difference between an agent that says "here is the fix" and a loop that opens the pull request, links the ticket, and pings the channel once the build is green, by itself. Connectors are what let the loop act inside your real environment instead of just describing what it would do if it could.这就是"说'这是修复方案'的智能体"与"自动打开拉取请求、关联工单、并在构建通过后自行在频道中通知的循环"之间的区别。连接器能让循环在你的真实环境中行动，而不是仅仅描述它如果能做到会做什么。

**5\. The verifier (the gate)5. 验证器（关卡）**

The test, type check, or build that automatically rejects bad work. This is the one block that decides whether the loop helps you or just spends your money. Everything else is plumbing. This is the part that makes it real.测试、类型检查或构建——这些会自动拒绝不合格的工作。这是决定循环是在帮助你，还是仅仅在消耗你资金的唯一模块。其他一切都只是管道。正是这部分让一切变得真实。

Stack those together and you get what big teams now run at scale: fleets of agents looping on the same job, dozens or thousands at once. One engineer used a loop like this to rewrite an entire codebase from one programming language to another in about six days, work that would have taken close to a year by hand. It is a genuine change in how serious software gets built. And it comes with a catch the demos never show.将这些模块堆叠起来，你就得到了大型团队如今大规模运行的模式：成群的智能体在同一任务上循环，一次运行数十甚至数千个。一位工程师曾用这样的循环在约六天内将整个代码库从一种编程语言重写为另一种，而这项工作若手工完成需要将近一年。这是严肃软件开发方式真正的变革。而它带来的代价，是演示中从未展示过的。

## The cost nobody mentions无人提及的成本

Loops run on tokens, and tokens are money. The problem is not that each step costs something. The problem is how the cost compounds.循环基于令牌运行，而令牌就是金钱。问题不在于每一步都有成本，而在于成本如何累积。

Every time the loop goes around, the agent re-reads its context: the goal, the code, the last result, what failed. That whole pile is sent through the model again on every iteration, and it grows each pass. A loop that runs ten times does not cost ten prompts. It costs ten prompts that each keep getting bigger. The maker-and-checker trick that lifts quality also doubles the bill, because now two models read the work instead of one.每次循环时，智能体都会重新读取其上下文：目标、代码、上次结果、失败原因。这整堆内容在每次迭代中都会再次通过模型处理，并且每次都会增长。运行十次的循环并非消耗十个提示的成本，而是十个提示的成本，且每个提示都在不断变大。制作与检查这一提升质量的技巧，同时也让账单翻倍，因为现在有两个模型在读取工作内容，而非一个。

```text
▸ ROUGH COST OF ONE LOOP
single agent, one medium task:      ~50,000 – 200,000 tokens
context re-sent every iteration:    grows each pass
a fleet of agents in parallel:      multiply all of the above
```

The metric that actually matters, and almost nobody tracks, is cost per accepted change. Not tokens spent or loops run. If the loop gives you ten results and you toss six, you are doing the review work it was meant to save. Below a 50% accept rate, it costs more than it gives back.真正重要的指标，几乎没人追踪的，是每次被采纳的变更成本。不是花费的 token 数，也不是运行的循环次数。如果循环给你十个结果，你扔掉六个，那你就是在做它本该替你省去的审查工作。采纳率低于 50%时，它的成本就超过了它带来的回报。

Loops also fail quietly. Engineer Geoffrey Huntley calls it the "Ralph Wiggum loop": the agent decides it is done too early, exits on a half-finished job, and the loop keeps running and spending while producing nothing. Without a hard gate that can fail the work, loops do not crash, they bill you in silence.循环也会静默失败。工程师杰弗里·亨特利称之为"拉尔夫·威格姆循环"：智能体过早判定任务完成，在半成品状态下退出，而循环仍在持续运行并消耗资源，却毫无产出。由于缺乏能判定工作失败的硬性关卡，循环不会崩溃，只会悄无声息地持续计费。

That is why the heavy version belongs to teams with the budget and guardrails to run it: iteration caps, token budgets, cheap models on the boring steps, monitoring. If that is not you, you are not missing out, the core idea works at a fraction of the cost and none of the setup.正因如此，重型版本属于拥有预算和防护措施的团队：迭代上限、令牌预算、在枯燥步骤使用廉价模型、监控机制。如果你不具备这些条件，也无需遗憾——核心思想只需极低成本即可实现，且无需任何前期配置。

## The order that actually works真正有效的执行顺序

If you do build one, the order matters more than the tools. The people who ship loops that survive in production all do it the same way:若真要构建循环，执行顺序比工具更重要。那些能让循环在生产环境中稳定运行的人，都遵循相同的方法：

```text
1. Get ONE manual run reliable first.
2. Turn that into a skill (save the instructions).
3. Wrap the skill in a loop (add the gate + stop condition).
4. THEN put it on a schedule.
```

Skipping ahead, scheduling something you have not made reliable by hand, is exactly how loops blow up while you sleep. Prove it once, harden it, then automate it.跳过步骤，直接安排那些你尚未亲手验证可靠性的任务，正是循环在你睡觉时崩溃的原因。先亲自验证一次，将其固化，然后再自动化。

## Build a basic loop yourself (any LLM)自己构建一个基础循环（使用任意 LLM）

You do not need a coding agent to feel how this works. You can run a simple loop by hand inside any LLM right now, with nothing but a prompt. The trick is to give the model all three loop parts at once: a goal, strict success criteria, and a protocol that forces it to check itself before it is allowed to stop.你不需要一个编程代理就能理解它的运作方式。现在，你只需通过一个提示词，就能在任何 LLM 中手动运行一个简单的循环。诀窍在于一次性给模型提供循环的三个组成部分：一个目标、严格的成功标准，以及一个强制它在允许停止前进行自我检查的协议。

```text
▸ SELF-CHECKING LOOP  (paste into Claude or ChatGPT)
You will work in a loop until the task meets the bar.

TASK:
[describe exactly what you want produced]

SUCCESS CRITERIA (be strict, no soft passes):
- [criterion 1]
- [criterion 2]
- [criterion 3]

LOOP PROTOCOL, repeat every turn:
1. PLAN   - state the single next step.
2. DO     - produce or improve the work.
3. VERIFY - score the result 1-10 on each criterion.
            Be brutally honest. List exactly what is still weak.
4. DECIDE - if every criterion is 8+, print "FINAL" and stop.
            Otherwise print "ITERATING" and go again, fixing
            the weakest point first.

RULES:
- Never call it done until every criterion is 8 or higher.
- Each pass must fix the weakest score from the last VERIFY.
- Do not ask me questions. Make a sensible assumption, note it,
  and keep going.

Begin. Run the loop until FINAL.
```

Watch what happens. The model drafts, grades its own work against your criteria, finds the weak spot, and rewrites, over and over, until it actually clears the bar instead of handing you the first thing that looked close. That is a loop. You just built one with a paragraph.看看会发生什么。模型会起草内容，根据你的标准自我评分，找出薄弱环节，然后反复重写，直到它真正达标，而不是把第一个看似接近的结果交给你。这就是一个循环。你刚刚用一段话就构建了一个。

But notice what is still missing, because it is the whole point of what comes next. You are the trigger. You opened the chat, you pasted the prompt, you are sitting there watching it iterate. Close the tab and it is gone. There is no schedule. There is no "do this every morning," no "wake up when an email arrives." It cannot reach out to you, because it only exists while you are looking at it.但请注意仍然缺失的部分，因为这是接下来要讲的重点。你就是触发器。你打开了聊天窗口，粘贴了提示词，坐在那里看着它迭代。关闭标签页，它就消失了。没有计划安排。没有“每天早上执行这个”，也没有“收到邮件时唤醒”。它无法主动联系你，因为它只在你注视它时才存在。

To get a loop that runs on its own, on a schedule, triggered by real events, without you babysitting it, you normally have to step into the heavy world from earlier: tools, hosting, code, gates, and a bill. 要获得一个能自主运行、按计划执行、由真实事件触发、无需你全程监督的循环，你通常需要进入之前提到的那个复杂领域：工具、托管、代码、网关，以及账单。

That makes sense when you are tackling genuinely heavy tasks. But for 99% of everyday ones, there is already a ready, dead-simple solution.当你处理真正繁重的任务时，这确实说得通。但对于 99%的日常事务，早已存在现成且极其简单的解决方案。

## The same idea, for your actual life同样的理念，适用于你的现实生活

Strip away the code and the cost, and what is left is one simple, genuinely useful concept: a task that runs itself, on a schedule or the moment something happens, with no need for you to remember it or be there. You do not need to be an engineer for that. You just need loops built for life instead of for codebases.剥离代码和成本之后，剩下的就是一个简单而真正实用的概念：一个能自行运行的任务，按计划或在某事发生时自动执行，无需你记住它或在场。你不需要是工程师也能做到。你只需要为生活而非代码库构建的循环。

There is a free option where you create one by describing it in plain words. No code, no hosting, no keys, no tab to keep open, no build order to get wrong.有一个免费选项，你可以用日常语言描述来创建它。无需代码、无需托管、无需密钥、无需保持打开的标签页、无需担心构建顺序出错。

It is called Mira, and it lives inside Telegram, the app you probably already have open. You message it like a friend, and the loops it runs are called Skills. Every Skill quietly has the same parts a real loop needs, a trigger, an action, a way to run by itself, except you never wire any of them together. You just say what you want.它叫 Mira，存在于 Telegram 中——这个你可能已经打开的应用。你像和朋友聊天一样给它发消息，它运行的循环被称为“技能”。每个技能都默默具备真实循环所需的全部要素：触发器、动作、自主运行的方式，只是你无需将它们连接起来。你只需说出你想要什么。

```text
▸ SKILL
"Every weekday at 7am, check my Gmail and Google Calendar.
Send me a short brief: my 3 most important meetings, anything
urgent in the inbox, and one thing I said I'd follow up on but
haven't. Keep it under 120 words."
```

That is a real loop. A time trigger, a multi-step action across two connected apps, running on its own and coming to you. You wrote it as one message.这是一个真实的循环。一个时间触发器，跨两个关联应用的多步骤操作，自主运行并最终呈现在你面前。你只需用一条消息就编写了它。

## What Mira can actually doMira 的实际能力

Here is the part that makes it click. Mira is not a smarter chatbot. The difference from ChatGPT is simple: ChatGPT answers, Mira acts. You do not ask it to write the email, you tell it to send the email. You do not get a draft ticket, you get a real one in Linear with the owner assigned. It does the thing, in the background, and it remembers you between every conversation.这才是关键所在。Mira 并非更智能的聊天机器人。它与 ChatGPT 的区别很简单：ChatGPT 负责回答，Mira 负责执行。你无需让它撰写邮件，而是直接告诉它发送邮件。你得到的不是草稿工单，而是 Linear 中已分配负责人的真实工单。它会在后台完成操作，并在每次对话间记住你的信息。

It connects to 500+ apps through Composio (Notion, Gmail, Google Calendar, GitHub, Figma, Stripe and hundreds more), it has long-term memory that holds across sessions and group chats, and it is model-agnostic, running GPT, Claude, Gemini depending on the task. Here is what that turns into.通过 Composio，Mira 可连接 500 多个应用（包括 Notion、Gmail、Google 日历、GitHub、Figma、Stripe 等数百个平台），具备跨会话和群聊的长期记忆能力，并且不依赖特定模型——可根据任务需求运行 GPT、Claude 或 Gemini。以下是这些功能带来的实际效果。

**For work** This is where the loops idea pays off without a single line of code.用于工作 这正是循环理念的用武之地，无需编写一行代码。

```text
▸ SKILLS
"An hour before each meeting, remind me with the context and
decisions from our last conversation with that person."

"When I forward a message here, turn it into a Linear ticket
with the right priority and assign the owner."

"Every Friday at 4pm, collect the team's task status and metrics
and post a clean weekly digest in our chat."

"Summarize everything I missed in this group chat while I was
away, in 5 bullets."
```

It catches you up on a 200-message thread in seconds, files the ticket while you keep talking, and walks into meetings already briefed. In group chats it remembers the team's decisions and tasks, not just yours.它能在几秒内帮你跟上 200 条消息的讨论进度，在你继续交谈的同时归档工单，并带着已准备好的简报走进会议室。在群聊中，它记住的是团队的决定和任务，而不仅仅是你个人的。

**For creators** This is the part most people underrate. Mira makes content end to end, inside the chat.面向创作者 这是大多数人低估的部分。Mira 在聊天内端到端地生成内容。

```text
▸ SKILLS
"I'll send a voice note with a raw idea. Turn it into a finished
post with a caption and hashtags."

"Take this one idea and write versions for X, Instagram, LinkedIn,
Email, and a newsletter, each in the right format."

"Generate 3 image options for this post."

"Turn this image into a short video for my Telegram channel."
```

Voice note in, finished post out in about thirty seconds. One brief becomes six platform-native versions. It generates images and video right in the chat, edits photos, swaps backgrounds, builds mascots and avatars, even lip-syncs and animates them. The whole content pipeline lives in one window.语音笔记输入，约三十秒后即可输出成文。一条简报自动生成六个适配不同平台的版本。它能在聊天界面直接生成图片和视频，编辑照片、替换背景、创建吉祥物和头像，甚至能实现唇形同步和动画制作。整个内容生产流程都整合在一个窗口内。

**For voice** Mira treats voice as a first-class input, which matters more than it sounds.关于语音功能 Mira 将语音视为一级输入方式，其重要性远超表面所见。

```text
▸ SKILLS
"Transcribe my voice messages into clean text."
"Read this article back to me as audio."
"Summarize the voice notes in this group chat into key points."
```

It transcribes your voice messages, reads text back to you, understands voice notes inside group chats and summarizes the discussion, and works as a hands-free voice assistant when you cannot type.它能转录你的语音消息、为你朗读文本、理解群聊中的语音笔记并总结讨论内容，还能在你无法打字时充当免提语音助手。

**For your life** The same engine, pointed at everything else.为你的生活 同一引擎，对准万物。

```text
▸ SKILLS
"Every evening at 7, ask if I trained today. Keep a streak and
don't let me quietly skip more than one day."

"Every night, ask me 3 questions about my day, remember the
answers, and once a week tell me what changed."

"Track my calories from a photo of my plate."

"Watch this flight route and buy when the price drops to my number."

"Every morning, give me a no-clickbait news digest on my topics."
```

A coach that holds you to a streak. A journal that actually remembers you and becomes a check-in companion over time. Calorie tracking from a photo, no separate app. Language practice built from your own mistakes. A flight watcher that buys when the price is right. A daily digest with the clickbait stripped out.一位督促你坚持打卡的教练。一本真正记住你、随时间成为签到伙伴的日记。通过照片追踪卡路里，无需额外应用。基于你自身错误构建的语言练习。一个在价格合适时自动购票的航班监测器。一份去除标题党内容的每日摘要。

## How to start in two minutes两分钟快速上手

Open Telegram. Go to [Mira](https://t.me/mira?start=social_x_200626_howtostart). Send it a message. Free access works immediately. Try one of these first:

```text
@mira, plan my week
@mira, summarize this chat
@mira, remind me to review PRs every Monday at 9am
@mira, write a post about [topic] for X and Instagram
```

Any example in this article becomes a running loop the moment you type it.本文中的任何示例，在你输入的那一刻就会变成一个正在运行的循环。

## What this actually means for you这对你实际意味着什么

Loops are not a trend. They are a shift in who does the work. The AI stops waiting for you to push it through every step and starts running the whole job on its own. That said, this isn't something to chase or force into places it doesn't belong. More often than not, you will just burn money for nothing. My take: start by using what's already there for free, and only once you actually feel that it isn't enough should you start thinking about what you truly need.循环并非一时潮流，而是工作执行者的转变。AI 不再需要你一步步推动，而是开始自主完成整个任务。 话虽如此，这并非值得盲目追逐或强行套用的事物。多数情况下，你只会白白浪费资金。 我的建议是：先从现有的免费工具入手，只有当你切实感到不够用时，才去思考自己真正需要什么。

If you want to stay up to date with everything happening in AI, follow me on X and Telegram: X - [https://x.com/AnatoliKopadze](https://x.com/AnatoliKopadze) Telegram - [https://t.me/kopadzemp](https://t.me/kopadzemp)
