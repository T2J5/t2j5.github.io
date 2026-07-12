---
title: "How LLM Inference Works, Clearly Explained.LLM 推理的工作原理，清晰解读。"
date: 2026-06-28 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://x.com/_avichawla/status/2071201619530956863"
original: true
---

> 原文来源：https://x.com/_avichawla/status/2071201619530956863

![Image](https://pbs.twimg.com/media/HL5hjIyaQAAXKZW?format=jpg&name=large)

Every generate() call to an LLM runs two distinct computational phases on the same GPU:每次对 LLM 的 generate()调用都会在同一个 GPU 上运行两个不同的计算阶段：

- prefill (processing the prompt) is compute-bound预填充（处理提示词）受计算能力限制
- while decode (generating tokens one at a time) is memory-bound.而解码（逐个生成词元）则受内存带宽限制。

Most inference optimizations target one phase or the other, and diagnosing which phase is the bottleneck is the first step in making a deployment faster.大多数推理优化针对的是其中一个阶段，而诊断哪个阶段是瓶颈，是加速部署的第一步。

In this article, I'll walk through the full pipeline, from tokenized input to streamed output, and look at where the time goes in each phase.在本文中，我将带你了解从分词输入到流式输出的完整流程，并分析每个阶段的时间消耗情况。

# Tokenization and embedding分词与嵌入

Tokenizers like Byte Pair Encoding (BPE) convert raw text into integer IDs from a vocabulary of roughly 50,000 tokens.像字节对编码（BPE）这样的分词器，会将原始文本转换为来自约 5 万个词元词汇表的整数 ID。

```python
prompt = "How does inference work?"
ids = tokenizer.encode(prompt)
# ids -> [2437, 1374, 32278, 670, 30]
```

Each ID maps to a row in the embedding table, a learned matrix of shape \[vocab\_size, hidden\_dim\]. For a model with a hidden dimension of 4,096, each token becomes a 4,096-dimensional vector.每个 ID 对应嵌入表中的一行，该表是一个形状为\[vocab\_size, hidden\_dim\]的学习矩阵。对于隐藏维度为 4096 的模型，每个词元会变成一个 4096 维的向量。

```python
# embedding_table has shape [vocab_size, hidden_dim]
vectors = embedding_table[ids]   # shape: [num_tokens, 4096]
```

![Image](https://pbs.twimg.com/media/HL5e4aPb0AEgpmT?format=png&name=large)

Position information gets injected at this stage.位置信息在此阶段被注入。

Most modern architectures use Rotary Position Embeddings (RoPE), which encode position by rotating the embedding vectors rather than adding a separate positional vector.大多数现代架构采用旋转位置编码（RoPE），通过旋转嵌入向量而非添加独立的位置向量来编码位置信息。

# Transformer layersTransformer 层

The embedded sequence passes through a stack of transformer layers (typically 32 to 80+, depending on model size).嵌入后的序列会依次通过多层 Transformer（通常为 32 至 80 层以上，具体数量取决于模型规模）。

Each layer applies two operations in sequence:每一层按顺序执行两个操作：

**1) Self-attention** computes three projections per token (query Q, key K, value V) via learned weight matrices.1) 自注意力机制通过可学习的权重矩阵，为每个词元计算三种投影（查询 Q、键 K、值 V）。

![Image](https://pbs.twimg.com/media/HL5f0d9bgAAdUAy?format=jpg&name=large)

Each token's query is scored against every other token's key, and those scores (after scaling and softmax) determine how much of each token's value gets mixed in.每个词元的查询会与所有其他词元的键进行评分，这些分数（经过缩放和 softmax 处理后）决定了每个词元的值在混合时所占的比重。

```python
# scores: how much each token attends to every other token
Q, K, V  = x @ Wq, x @ Wk, x @ Wv

scores = (Q @ K.T) / sqrt (d_k)

weights = softmax(scaled) # one row per token, sums to 1

attn_output  = weights @ V
```

2) **Feed-forward network (FFN)** processes each token's vector independently through a two-layer MLP. Attention moves information between positions. The FFN transforms it.2) 前馈网络（FFN）通过两层 MLP 独立处理每个词元的向量。注意力机制负责在位置间传递信息，而 FFN 则对其进行转换。

After the final layer, the model projects the last token's hidden state back to vocabulary size (\[hidden\_dim, vocab\_size\]), applies softmax, and samples from the resulting distribution to produce the first output token.在最后一层之后，模型将最后一个 token 的隐藏状态映射回词汇表大小（\[hidden\_dim, vocab\_size\]），应用 softmax 函数，并从生成的分布中采样以产生第一个输出 token。

# Prefill: the compute-bound phase预填充：计算密集型阶段

Processing the input prompt is the first phase. All tokens are processed in parallel: Q, K, and V are computed for every token simultaneously, and attention runs as a large matrix-matrix multiplication.处理输入提示是第一阶段。所有令牌并行处理：同时为每个令牌计算 Q、K 和 V，注意力机制以大型矩阵-矩阵乘法的方式运行。

This is compute-bound work. The GPU's arithmetic throughput is the bottleneck, and utilization is high. The metric that captures this phase is Time to First Token (TTFT), the latency before the first output token appears.这是计算密集型工作。GPU 的算术吞吐量成为瓶颈，利用率很高。衡量这一阶段的指标是首字延迟（TTFT），即第一个输出令牌出现前的等待时间。

During prefill, the model also populates the KV cache: the K and V tensors for every layer get stored in GPU memory for reuse.在预填充阶段，模型还会填充 KV 缓存：每一层的 K 和 V 张量都会被存储在 GPU 内存中以便复用。

```python
# Prefill: process the whole prompt in one shot
hidden = embed(prompt_tokens) + positions
for layer in model.layers:
    Q, K, V = project(hidden)             # for ALL tokens at once
    hidden  = attention(Q, K, V) + hidden
    hidden  = feedforward(hidden) + hidden
    cache_kv(layer, K, V)                 # save for later
first_token = sample(project_to_vocab(hidden[-1]))
```

# Decode: the memory-bound phase解码：内存受限阶段

Once the first token is generated, the model switches to generating one token at a time. For each new token, it only computes Q, K, and V for that single token. The K and V from all previous tokens are already in the cache.一旦生成第一个词元后，模型便切换为逐词元生成模式。对于每个新词元，模型仅需计算该词元的 Q、K 和 V 值。此前所有词元的 K 和 V 值均已存储在缓存中。

```python
# Decode: one token per iteration
token = first_token
steps = 0
while token != STOP and steps < MAX_STEPS:
    x = embed(token) + position(steps)
    for layer in model.layers:
        q, k, v = project(x)
        K_all, V_all = caches[layer].append(k, v) # cached history + new
        x = layer.forward(q, K_all, V_all, x)  # attention + FFN, residuals
    token = sample(project_to_vocab(x))
    steps += 1
    yield token
```

The arithmetic per step is tiny (one query vector against the cached key matrix instead of a full matrix-matrix multiply). But the GPU still loads every weight matrix and the entire cached K/V from memory for that small computation. The bottleneck flips from compute to memory bandwidth.每一步的运算量很小（仅需一个查询向量与缓存的键矩阵进行运算，而非完整的矩阵乘法）。但 GPU 仍需为这微小的计算量从内存中加载所有权重矩阵和完整的缓存键值对。瓶颈从计算能力转向了内存带宽。

![Image](https://pbs.twimg.com/media/HL5hsJdaIAAyZTn?format=png&name=large)

The metric for this phase is Inter-Token Latency (ITL): the time between consecutive output tokens. Low ITL is what makes a model feel responsive.该阶段的衡量指标是令牌间延迟（ITL）：即连续输出令牌之间的时间间隔。低 ITL 能让模型显得响应迅速。

# The KV cacheKV 缓存

Without caching, generating a 1,000-token response would require recomputing attention over the entire growing sequence at every step, giving quadratic complexity.若不使用缓存，生成 1000 个 token 的回复时，每一步都需要对整个不断增长的序列重新计算注意力，导致计算复杂度呈二次方增长。

The KV cache stores each layer's K and V tensors once and appends new entries incrementally.KV 缓存会一次性存储每一层的 K 和 V 张量，并逐步追加新的条目。

The video below depicts LLM inference speed with vs. without KV caching:下方视频展示了 LLM 推理在启用与未启用 KV 缓存时的速度对比：

<video preload="none" tabindex="-1" playsinline="" aria-label="Embedded video" poster="https://pbs.twimg.com/amplify_video_thumb/2071198581126815744/img/_KefewWir_oV4c7f.jpg" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"><source type="video/mp4" src="blob:https://x.com/c8056a89-d361-4f29-aaff-2554876b7f17"></video>

0:01 / 0:47

The speedup is roughly 5x or more for long generations.对于长文本生成，加速效果大约为 5 倍或更多。

The cost is that the cache grows linearly with sequence length and exists per-layer. For a 13B-parameter model, the cache consumes roughly 1 MB per token. A 4K-token context burns through 4 GB of VRAM on the cache alone.代价在于，缓存会随序列长度线性增长，且每层都需要独立缓存。对于一个 130 亿参数的模型，每个 token 大约消耗 1MB 缓存。处理 4K 长度的上下文时，仅缓存就会占用 4GB 显存。

This is why long contexts get expensive. The cache competes directly with batch size for GPU memory, i.e., more cache per request means fewer concurrent requests per GPU.这就是长上下文成本高昂的原因。缓存会直接与批处理大小争夺 GPU 内存——每个请求占用的缓存越多，单张 GPU 能同时处理的请求就越少。

Standard mitigations include quantizing the cache to INT8 or INT4, sliding window attention (dropping tokens outside a fixed window), grouped-query attention (GQA, sharing K/V across attention heads to reduce the number of cached tensors), and PagedAttention (the memory management trick behind vLLM that pages the cache like an OS pages virtual memory, eliminating fragmentation).标准缓解方案包括：将缓存量化至 INT8 或 INT4 精度、滑动窗口注意力（丢弃固定窗口外的 token）、分组查询注意力（GQA，跨注意力头共享 K/V 以减少缓存张量数量），以及分页注意力（vLLM 背后的内存管理技巧，像操作系统管理虚拟内存那样对缓存进行分页，消除碎片化）。

There's another interesting idea that I talked about around KV cache management below:下面我还讨论了一个关于 KV 缓存管理的有趣想法：

> Jun 27
> 
> A tricky LLM interview question: You're serving a reasoning model on vLLM, and it keeps running out of GPU memory on long traces. So you add KV cache compression and evict 90% of the cached tokens. VRAM usage stays as is and GPU still runs out of memory. Why? (answer below)一个棘手的 LLM 面试问题： 你在 vLLM 上部署了一个推理模型，但它在处理长推理链时总是耗尽 GPU 内存。 于是你添加了 KV 缓存压缩，并驱逐了 90%的缓存令牌。 显存使用量保持不变，GPU 仍然会耗尽内存。 为什么？ （答案如下）

# Redesigning attention around the cache围绕缓存重新设计注意力机制

Quantization and paging treat the KV cache as a fixed cost to manage. DeepSeek's V4 series (released April 2025) takes a different approach: redesign attention so the cache is structurally smaller from the start.量化和分页技术将 KV 缓存视为一种固定成本进行管理。而 DeepSeek 的 V4 系列（2025 年 4 月发布）则采取了不同的方法：重新设计注意力机制，使缓存从一开始就在结构上更小。

![Image](https://pbs.twimg.com/media/HL5gSrVbcAE0xn0?format=jpg&name=large)

V4 uses a hybrid of two compressed attention mechanisms.V4 采用了两种压缩注意力机制的混合方案。

Compressed Sparse Attention (CSA) compresses KV entries by 4x using softmax-gated pooling, then applies sparse attention over the compressed tokens.压缩稀疏注意力（CSA）通过 softmax 门控池化将 KV 条目压缩 4 倍，随后对压缩后的令牌应用稀疏注意力。

Heavily Compressed Attention (HCA) is more aggressive. It consolidates KV entries across 128 tokens into a single compressed entry and applies dense attention over those representations.重度压缩注意力（HCA）更为激进。它将 128 个 token 的 KV 条目合并为单个压缩条目，并对这些表征应用密集注意力机制。

At a 1M-token context, V4-Pro requires 27% of the single-token inference FLOPs and 10% of the KV cache compared to DeepSeek-V3.2.在 100 万 token 的上下文长度下，V4-Pro 所需的单 token 推理 FLOPs 仅为 DeepSeek-V3.2 的 27%，KV 缓存占用仅为后者的 10%。

In absolute terms, that's 9.62 GiB of KV cache per sequence at 1M context in bf16, compared to an estimated 83.9 GiB for a V3.2-style architecture. With fp4/fp8 quantization on top, the cache shrinks by another 2x.具体而言，在 bf16 精度下，每个序列在 100 万上下文长度时仅需 9.62 GiB 的 KV 缓存，而 V3.2 架构的估算值高达 83.9 GiB。若叠加 fp4/fp8 量化，缓存容量还可再缩减 2 倍。

The KV cache has become the constraint that the field is optimizing the model architecture around.KV 缓存已成为当前领域优化模型架构的核心约束条件。

# ​Quantization​量化

Training uses FP32 or BF16 for gradient stability. Inference doesn't need that precision. The memory savings from reducing bit width are linear:训练时使用 FP32 或 BF16 以保证梯度稳定性，而推理阶段无需如此高的精度。降低位宽带来的内存节省是线性的：

- 7B parameters at FP32: 28 GB7B 参数在 FP32 下：28 GB
- 7B parameters at FP16/BF16: 14 GB7B 参数在 FP16/BF16 下：14 GB
- 7B parameters at INT8: 7 GB7B 参数在 INT8 精度下：7 GB
- 7B parameters at INT4: 3.5 GB7B 参数在 INT4 精度下：3.5 GB

![Image](https://pbs.twimg.com/media/HL5gahpa0AAlV11?format=jpg&name=large)

INT4 is why 7B models run on laptop GPUs with 4-6 GB of VRAM. Methods like GPTQ and AWQ use per-channel scaling factors to minimize quality degradation from the lossy compression.INT4 是 7B 模型能在配备 4-6 GB 显存的笔记本电脑 GPU 上运行的原因。GPTQ 和 AWQ 等方法使用逐通道缩放因子，以最小化有损压缩带来的质量下降。

Done well, INT4 lands within 1-2 percentage points of the full-precision model on standard benchmarks.若处理得当，INT4 在标准基准测试中的表现与全精度模型仅相差 1-2 个百分点。

Going from FP16 to INT8 often cuts inference latency in half with negligible quality loss, making quantization the single highest-leverage optimization for most deployments.从 FP16 切换到 INT8 通常能将推理延迟降低一半，且质量损失微乎其微，这使得量化成为大多数部署场景中性价比最高的优化手段。

# Serving infrastructure服务基础设施

Modern inference servers wrap the prefill-decode loop with several optimizations:现代推理服务器通过多种优化技术封装了预填充-解码循环：

![Image](https://pbs.twimg.com/media/HL5gfxjaEAAFdYg?format=jpg&name=large)

- ​Continuous batching​ interleaves tokens from multiple requests on the same GPU step, keeping utilization high even during memory-bound decode phases.连续批处理技术将多个请求的令牌交错在同一 GPU 步骤上处理，即使在内存受限的解码阶段也能保持高利用率。
- ​Speculative decoding​ uses a small draft model to propose multiple tokens, then the large model verifies them in a single forward pass. When the draft model's acceptance rate is high, this effectively converts multiple sequential decode steps into one parallel verification.推测解码技术利用小型草稿模型生成多个候选令牌，再由大型模型通过单次前向传播进行验证。当草稿模型的接受率较高时，这种方法能有效将多个顺序解码步骤转化为一次并行验证。

![Image](https://pbs.twimg.com/media/HL5go2paAAAqU6M?format=jpg&name=large)

I covered Speculative decoding in detail here:我在此详细介绍了推测解码：

> May 14

- ​PagedAttention​ (vLLM) manages KV cache memory in fixed-size blocks, eliminating fragmentation and enabling more concurrent requests per GPU.PagedAttention（vLLM）以固定大小的块管理 KV 缓存内存，消除了碎片化问题，使每个 GPU 能够处理更多并发请求。

Frameworks like vLLM, TensorRT-LLM, and Text Generation Inference (TGI) combine these techniques. A single GPU can serve dozens of concurrent users because decode leaves most of the arithmetic capacity idle, and continuous batching fills that idle capacity with other requests.像 vLLM、TensorRT-LLM 和 Text Generation Inference (TGI) 这样的框架整合了这些技术。单张 GPU 就能服务数十个并发用户，因为解码阶段大部分算力处于闲置状态，而连续批处理则用其他请求填补了这些闲置算力。

# The full inference path完整的推理路径

![Image](https://pbs.twimg.com/media/HL5g2udbQAEdk40?format=png&name=large)

1. **Tokenize:** Text becomes integer IDs via BPE.分词：通过 BPE 将文本转换为整数 ID。
2. **Embed:** IDs become vectors. RoPE encodes position.嵌入：ID 转化为向量。RoPE 编码位置信息。
3. **Prefill:** All input tokens are processed in parallel through every layer. Compute-bound. KV cache populated. First token emitted.预填充：所有输入令牌并行通过每一层进行处理。计算密集型。KV 缓存被填充。首个令牌生成。
4. **Decode loop:** One token per step: project Q for the new token, attend over cached K/V, run FFN, sample. Append new K/V to cache. Memory-bound.解码循环：每步生成一个令牌：为新令牌投影 Q，对缓存的 K/V 进行注意力计算，运行前馈神经网络，采样。将新的 K/V 追加到缓存中。内存密集型。
5. **Detokenize:** Token IDs mapped back to text and streamed.反令牌化：令牌 ID 映射回文本并进行流式输出。

# Some practical implications一些实际影响

- long prompts are expensive in TTFT (prefill)长提示词在 TTFT（预填充阶段）成本高昂
- long outputs are expensive in ITL (decode)长输出在 ITL（解码阶段）成本高昂
- and they stress different hardware resources.且它们对不同的硬件资源造成压力。
- Context length isn't free because it bloats the KV cache and directly reduces batch capacity.上下文长度并非无代价，因为它会膨胀 KV 缓存，直接降低批处理容量。
- GPU utilization during decode can drop to 30% even on a fully loaded server, because the bottleneck is memory bandwidth, not arithmetic.即使在满载服务器上，解码阶段的 GPU 利用率也可能降至 30%，因为瓶颈在于内存带宽而非算力。
- The fix isn't more compute, it's faster memory, a smaller cache, or better batching.解决方案并非增加算力，而是需要更快的内存、更小的缓存或更优的批处理策略。

When someone tells you their model is slow, the first diagnostic is whether it's slow to start (prefill-bound, optimize TTFT) or slow to stream (decode-bound, optimize ITL).当有人告诉你模型运行缓慢时，首要诊断是：是启动缓慢（受预填充阶段限制，需优化首 Token 生成时间）还是流式输出缓慢（受解码阶段限制，需优化 Token 间延迟）。

👉 Over to you: are you running into TTFT or ITL bottlenecks in your deployments, and what's worked for you?👉 轮到你了：在你的部署中，你遇到了 TTFT 还是 ITL 瓶颈？你又是如何解决的？

That's a wrap!到此为止！

If you enjoyed this tutorial:如果你喜欢这篇教程：

Find me → [@\_avichawla](https://x.com/@_avichawla)

Every day, I share tutorials and insights on DS, ML, LLMs, and RAGs.每天，我都会分享关于数据科学、机器学习、LLMs 和 RAGs 的教程与见解。
