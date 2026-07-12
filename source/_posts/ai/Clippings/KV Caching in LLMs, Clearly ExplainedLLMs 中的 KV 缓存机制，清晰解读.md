---
title: "KV Caching in LLMs, Clearly ExplainedLLMs 中的 KV 缓存机制，清晰解读"
date: 2026-06-28 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://x.com/_avichawla/status/2034902650534187503"
original: true
index_img: /img/covers/ai.svg
banner_img: /img/covers/ai.svg
updated: 2026-07-12
---

> 原文来源：https://x.com/_avichawla/status/2034902650534187503

![Image](https://pbs.twimg.com/media/HD1sUDPa8AAJaSe?format=jpg&name=large)

You must have seen it every time you use ChatGPT or Claude that the first token takes noticeably longer to appear. Then the rest stream out almost instantly.你每次使用 ChatGPT 或 Claude 时一定注意到，第一个 token 出现的时间明显更长，随后其余内容几乎瞬间流式输出。

Behind the scenes, it's a deliberate engineering decision called KV caching, and the purpose is to make LLM inference faster.在幕后，这是一项名为 KV 缓存的深思熟虑的工程决策，其目的是让 LLM 推理速度更快。

Before we get into the technical details, here's a side-by-side comparison of LLM inference with and without KV caching:在深入技术细节之前，我们先来对比一下启用和未启用 KV 缓存的 LLM 推理过程：

<video preload="none" tabindex="-1" playsinline="" aria-label="Embedded video" poster="https://pbs.twimg.com/amplify_video_thumb/2034896425310724097/img/y4A-fhJoCZIj_63a.jpg" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"><source type="video/mp4" src="blob:https://x.com/494bb6e3-38d1-4bd6-90b2-3f14fd31af23"></video>

0:04 / 0:47

Now let's understand how it works, from first principles.现在让我们从基本原理出发，理解它是如何运作的。

## Part 1: How LLMs generate tokens第一部分：LLM 如何生成词元

The transformer processes all input tokens and produces a hidden state for each one. Those hidden states get projected into vocabulary space, producing logits (one score per word in the vocabulary).Transformer 会处理所有输入词元，并为每个词元生成一个隐藏状态。这些隐藏状态被投射到词汇空间中，产生 logits（词汇表中每个单词对应一个分数）。

<video preload="auto" tabindex="-1" playsinline="" aria-label="Embedded video" poster="https://pbs.twimg.com/tweet_video_thumb/HD1nzZmboAE8879.jpg" src="https://video.twimg.com/tweet_video/HD1nzZmboAE8879.mp4" type="video/mp4" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"></video>

GIF

But only the logits from the last token matter. You sample from them, get the next token, append it to the input, and repeat.但只有最后一个词元的 logits 才起作用。你从中采样，得到下一个词元，将其附加到输入中，然后重复这个过程。

<video preload="auto" tabindex="-1" playsinline="" aria-label="Embedded video" poster="https://pbs.twimg.com/tweet_video_thumb/HD1n36gbAAASEmH.jpg" src="https://video.twimg.com/tweet_video/HD1n36gbAAASEmH.mp4" type="video/mp4" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"></video>

GIF

This is the key insight: to generate the next token, you only need the hidden state of the most recent token. Every other hidden state is an intermediate byproduct.这是关键见解：要生成下一个词元，你只需要最近一个词元的隐藏状态。其他所有隐藏状态都是中间副产品。

## Part 2: What Attention actually computes第二部分：注意力机制实际计算的内容

Inside each transformer layer, every token gets three vectors: a query (Q), a key (K), and a value (V). Attention multiplies queries against keys for scores, then uses those scores to weight the values.在每个 Transformer 层内部，每个词元都会获得三个向量：查询向量（Q）、键向量（K）和值向量（V）。注意力机制通过将查询与键相乘得到注意力分数，再使用这些分数对值进行加权。

<video preload="auto" tabindex="-1" playsinline="" aria-label="Embedded video" poster="https://pbs.twimg.com/tweet_video_thumb/HD1n9AMboAEkHaT.jpg" src="https://video.twimg.com/tweet_video/HD1n9AMboAEkHaT.mp4" type="video/mp4" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"></video>

GIF

Now focus on just the last token.现在只需关注最后一个词元。

<video preload="auto" tabindex="-1" playsinline="" aria-label="Embedded video" poster="https://pbs.twimg.com/tweet_video_thumb/HD1oErLa0AAp8FL.jpg" src="https://video.twimg.com/tweet_video/HD1oErLa0AAp8FL.mp4" type="video/mp4" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"></video>

GIF

The last row of QK^T uses:QK^T 的最后一行使用：

- The query vector of the last token最后一个令牌的查询向量
- All key vectors in the sequence序列中的所有键向量

The final attention output for that row uses:该行的最终注意力输出使用：

- The same query vector相同的查询向量
- All key and value vectors所有键向量和值向量

So to compute the only hidden state we need, every attention layer requires Q from the latest token, and K and V from everything.因此，为了计算我们所需的唯一隐藏状态，每个注意力层都需要来自最新令牌的 Q，以及来自所有内容的 K 和 V。

## Part 3: The redundancy involved第三部分：涉及的冗余

Generating token 50 requires K and V vectors for tokens 1 through 50. Generating token 51 requires K and V vectors for tokens 1 through 51.生成第 50 个 token 需要第 1 到第 50 个 token 的 K 和 V 向量。生成第 51 个 token 则需要第 1 到第 51 个 token 的 K 和 V 向量。

The K and V vectors for tokens 1 through 49 were already computed. They haven't changed. Same inputs, same outputs. Yet the model recomputes them from scratch every step.第 1 到第 49 个 token 的 K 和 V 向量早已计算完毕。它们并未发生变化——相同的输入，相同的输出。然而模型每一步都在从头重新计算它们。

![Image](https://pbs.twimg.com/media/HD1oJrAboAUOeNI?format=png&name=large)

That's O(n) redundant work per step. Over an entire generation, O(n²) wasted compute.这意味着每一步都产生了 O(n)的冗余计算。在整个生成过程中，浪费的计算量高达 O(n²)。

## Part 4: The fix第四部分：修复方案

Instead of recomputing all K and V vectors at every step, store them. For each new token:不必在每一步都重新计算所有 K 和 V 向量，而是将它们存储起来。对于每个新生成的词元：

1. Compute Q, K, and V for only the newest token.仅计算最新词元的 Q、K 和 V 值。
2. Append the new K and V to the cache.将新的 K 和 V 向量追加到缓存中。
3. Retrieve all previous K and V vectors from the cache.从缓存中检索所有先前的 K 和 V 向量。
4. Run attention using the new Q against the full cached K and V.使用新的 Q 对完整缓存的 K 和 V 运行注意力机制。

<video preload="auto" tabindex="-1" playsinline="" aria-label="Embedded video" poster="https://pbs.twimg.com/tweet_video_thumb/HD1oNGXaUAAtPkt.jpg" src="https://video.twimg.com/tweet_video/HD1oNGXaUAAtPkt.mp4" type="video/mp4" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"></video>

GIF

That's KV caching. One new K and one new V per layer per step. Everything else comes from memory.这就是 KV 缓存。每层每步只需新增一个 K 和一个 V，其余全部来自内存。

The attention computation still scales with sequence length (you're attending over all keys and values). But the expensive projections to produce K and V happen only once per token, not once per step.注意力计算仍随序列长度扩展（你需要对所有键和值进行注意力计算）。但生成 K 和 V 的昂贵投影操作，每个 token 只需执行一次，而非每步都执行。

## Part 5: Time-to-First-Token第 5 部分：首 Token 生成时间

Now you can see why the first token is slow.现在你明白为什么第一个词元生成得慢了。

When you send a prompt, the model processes the entire input in one forward pass, computing and caching K and V vectors for every token. This is the prefill phase, and it's the most compute-intensive part of the request.当你发送提示词时，模型会在一次前向传播中处理整个输入，为每个词元计算并缓存 K 向量和 V 向量。这就是预填充阶段，也是请求中计算量最大的部分。

Once the cache is warm, each subsequent token needs only a single forward pass with one token.一旦缓存预热完成，后续每个令牌仅需对单个令牌进行一次前向传播。

![Image](https://pbs.twimg.com/media/HD1qUHAboAIrstz?format=jpg&name=large)

That initial delay is called time-to-first-token (TTFT). Longer prompts mean longer prefills, which mean longer waits. Optimizing TTFT (chunked prefill, speculative decoding, prompt caching) is its own deep topic, but the dynamic is always the same: building the cache is expensive, reading from it is cheap.最初的延迟被称为首令牌时间（TTFT）。更长的提示意味着更长的预填充，进而导致更长的等待时间。优化 TTFT（分块预填充、推测解码、提示缓存）本身就是一个深奥的话题，但其核心机制始终如一：构建缓存成本高昂，而从缓存中读取则代价低廉。

## Part 6: The Tradeoff第六部分：权衡取舍

KV caching trades compute for memory. Every layer stores K and V vectors for every token. For Qwen 2.5 72B (80 layers, 32K context, hidden dim 8192), the KV cache for a single request can consume several gigabytes of GPU memory. At hundreds of concurrent requests, it often exceeds the model weights themselves.KV 缓存以计算换内存。每一层都会为每个词元存储 K 向量和 V 向量。以 Qwen 2.5 72B 模型（80 层、32K 上下文、隐藏维度 8192）为例，单个请求的 KV 缓存可能消耗数 GB 的 GPU 内存。当处理数百个并发请求时，其内存占用往往超过模型权重本身。

This is why grouped-query attention (GQA) and multi-query attention (MQA) exist: share key/value heads across query heads, cut memory, and minimal quality loss.这就是分组查询注意力（GQA）和多查询注意力（MQA）存在的原因：在查询头之间共享键/值头，减少内存占用，且质量损失极小。

It's also why doubling context length is hard. Double the window, double the KV cache per request, fewer concurrent users.这也是为什么将上下文长度翻倍如此困难。窗口大小翻倍，每个请求的 KV 缓存也翻倍，导致并发用户数减少。

There is another idea called Paged attention, which solves this, and I talked about it here recently:还有一种名为分页注意力的方法可以解决这个问题，我最近在这里讨论过：

> Mar 11

## tl;dr长话短说

KV caching eliminates redundant computation during autoregressive generation. Previous tokens always produce the same K and V vectors, so you compute them once and store them. Each new token only needs its own Q, K, and V. Then, attention runs against the full cache.KV 缓存消除了自回归生成过程中的冗余计算。先前生成的 token 始终会产生相同的 K 向量和 V 向量，因此只需计算一次并存储即可。每个新 token 仅需计算自身的 Q、K 和 V 向量，随后注意力机制会基于完整缓存运行。

5x speedup in practice. The cost is GPU memory, which becomes the binding constraint at scale. Every LLM serving stack (vLLM, TGI, TensorRT-LLM) builds on this idea.实际应用中可实现 5 倍加速。代价是 GPU 内存消耗，这在大规模部署时成为关键制约因素。所有 LLM 服务框架（vLLM、TGI、TensorRT-LLM）均基于此理念构建。

<video preload="auto" tabindex="-1" playsinline="" aria-label="Embedded video" poster="https://pbs.twimg.com/tweet_video_thumb/HD1oaiiboAAJwwE.jpg" src="https://video.twimg.com/tweet_video/HD1oaiiboAAJwwE.mp4" type="video/mp4" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"></video>

GIF

That's a wrap!到此为止！

If you enjoyed this tutorial:如果你喜欢这篇教程：

Find me → [@\_avichawla](https://x.com/@_avichawla)

Every day, I share tutorials and insights on DS, ML, LLMs, and RAGs.每天，我都会分享关于数据科学、机器学习、LLMs 和 RAGs 的教程与见解。
