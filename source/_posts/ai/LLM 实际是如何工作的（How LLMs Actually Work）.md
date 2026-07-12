---
title: "LLM 实际是如何工作的（How LLMs Actually Work）"
date: 2026-06-11 15:12:56
categories:
  - ai
tags:
  - ai
---

原文链接：[https://www.0xkato.xyz/how-llms-actually-work/](https://www.0xkato.xyz/how-llms-actually-work/)

  

2026 - 26 mins

标签：[#Machine Learning](https://0xkato.xyz/tags/#machine-learning) [#Transformers](https://0xkato.xyz/tags/#transformers) [#LLM](https://0xkato.xyz/tags/#llm) [#Neural Networks](https://0xkato.xyz/tags/#neural-networks) [#AI](https://0xkato.xyz/tags/#ai)

  

这篇文章会带你走一遍 LLM（Large Language Model，大语言模型）是如何工作的。现代 LLM 大多是把 **Transformer**（转换器）模块一层层堆叠起来，所以理解 Transformer 的内部机制，基本就能理解大半个 LLM。

  

我会覆盖现代基于 Transformer 的 LLM 里的核心机制，尽量不陷入太黏人的数学细节。别误会，数学当然值得学，但这篇更像一个入门总览。

  

大多数现代 LLM 共享同一套 Transformer 家族骨架（transformer-family skeleton）。它们之间的差异主要来自训练数据、规模与配置选择，以及后训练（post-training）过程。读完后，你应该能看懂很多现代 LLM 论文或 model card（模型卡），并知道每一节对应架构中的哪一块。

  

路径如下：

  

1. <font color="#92d050">Tokens（词元）</font>：一段文本如何变成一串整数

2. <font color="#92d050">Embeddings（嵌入）</font>：这些整数如何获得语义

3. <font color="#92d050">Positional encoding（位置编码）</font>：模型如何知道词元顺序

4. <font color="#92d050">Attention（注意力）</font>：词元如何彼此交换信息

5. <font color="#92d050">Multi-head attention（多头注意力）</font>：模型如何同时追踪多种关系

6. <font color="#92d050">Feed-forward network（前馈网络）</font>：模型存储结构中很大一部分在这里

7. <font color="#92d050">Residual stream and layer normalization（残差流与层归一化）</font>：深层堆叠为何可训练

8. <font color="#92d050">Next-token prediction（下一词元预测）</font>：模型究竟输出什么，生成循环如何工作

9. <font color="#92d050">Architecture vs trained weights（架构与训练权重）</font>：现代 LLM 的共性与差异

  

![Transformer pipeline from tokenization to next-token prediction](https://www.0xkato.xyz/assets/transformer-pipeline.png)

  

文中会穿插非常短的小解释（Tiny explainer），便于不同背景的读者跟上。

  

---

  

## Tokenization（分词）

  

模型并不直接读取文本。它读取的是整数 ID。把你的提示词转换成一串整数序列的步骤，就是这里要说的内容。

  

这个转换步骤叫 tokenization（分词）。Tokenizer（分词器）接收一个字符串，输出一个整数序列，每个整数都指向固定 vocabulary（词表）中的一个条目。现代 LLM 的词表通常有几万到几十万条。

  

> **Tiny explainer: token ID（词元 ID）**

> token ID 是模型用来表示某个词表条目的整数。模型处理的是这个数字，而不是你看到的文字本身。

  

Tokens 往往不是完整单词，而是 subword（子词）片段。比如 “tokenization” 可能被切成 `["token", "ization"]`；“running” 可能被切成 `["run", "ning"]`。原因是效率：整词词表太大、对新词泛化差；字符级词表太小，又会让模型连最基础模式都得从零学。子词分词处在中间地带：高频片段变成单个 token，低频或新词由更小片段拼出来。

  

> **Tiny explainer: vocabulary（词表）**

> vocabulary 是 tokenizer 固定的片段清单。每个片段都有 ID，模型只能直接接收这份清单里的 ID。

  

这种权衡会在一些你意想不到的地方出现。经典例子是让 LLM 数一数 “strawberry” 里有几个 `R`。以前 LLM 经常答错。这未必是它“不会数数”，而是它并不是直接按字母操作，而是按 token ID 操作；而人类会按字母切分。

![Tokenization turns text into token IDs](https://www.0xkato.xyz/assets/transformer-tokenization.png)

  

不同模型家族用不同 tokenizer。<u>GPT 系列常用 Byte Pair Encoding（BPE，字节对编码）的变体</u>；LLaMA 风格模型常用 SentencePiece。选择会影响计算开销（token 更少通常计算更省）和多语言覆盖，但基本形态都一样：文本进，整数出。

现在提示词已经变成整数序列，下一步是给这些整数赋予意义。

---

## Embeddings（嵌入）

  
像 `1024` 这样的 token ID 本质只是某一行的索引，本身没有语义。赋予它意义的是一张很大的表，叫 embedding matrix（嵌入矩阵）。

  

每个模型都有这张表。它对词表里的每个条目有一行，每行是一长串数字向量；向量长度就是模型 hidden size（隐藏维度）。很多 7B 级模型里，这通常意味着每个 token 对应 4,096 个数。更大的模型一般向量更宽。

  

> **Tiny explainer: vector（向量）**

> 向量就是一串数字。在 Transformer 里，每个 token 会变成向量，模型才能对它做数学运算。

  

当 tokenizer 把整数给模型后，模型去 embedding matrix 里查对应那一行，用这行向量替代整数。这行向量就是 token 的 embedding（嵌入），是模型在训练中学到的“这个 token 大概是什么意思”的表示。

  

> **Tiny explainer: embedding matrix（嵌入矩阵）**

> embedding matrix 是查表结构：输入 token ID，输出学习到的向量。

  

这些 embedding 的有趣性质是：语义相近的 token 往往在向量空间中也相近。比如 “king” 靠近 “queen”，“Paris” 靠近 “France”。这些并不是硬编码的，而是在大量文本训练中自然涌现出来，因为这样的几何关系有助于预测下一个 token。

  

你还能在 embedding 上做“向量算术”，有时很有效。著名例子是 `king − man + woman ≈ queen`。这说明 embedding 空间的几何结构确实承载了语义结构，尽管没人明确要求模型这样构建。

  

![Embedding space analogy with semantic relationships](https://www.0xkato.xyz/assets/transformer-embedding-analogy.png)

  

但要说清楚：到这一步，每个 token 都被 embedding 替代了，可 embedding 本身并不包含它在序列中的位置。无论 “dog” 是第一词还是第五词，向量都一样。这是个问题。

  

Positional encoding（位置编码）就是来补这个缺口的。

  

---

  

## Positional encoding（位置编码）

  

纯 self-attention（自注意力）没有内建词序表示。没有位置信号，它无法直接知道 “dog” 是在 “bites” 前面还是后面。

  

而词序会改变语义。所以模型需要额外机制，把每个 token 的位置信息注入计算中。

  

> **Tiny explainer: positional encoding（位置编码）**

> 位置编码让模型获得顺序信息，告诉模型每个 token 在序列中的位置。

  

原始 Transformer 论文（Vaswani et al., 2017）做法是：为每个位置生成一组数字模式，并在其他处理前直接加到 token embedding 上。位置 1、一位置 5、位置 100 都有不同模式。这些模式来自不同频率的正弦和余弦波。于是位置 1 的 “dog” embedding 与位置 5 的 “dog” embedding 会不同，因为叠加了不同的位置模式。

  

这套方法能工作，而且 sinusoidal encoding（正弦位置编码）的一大优点是可外推到训练时未见过的序列长度。但随着模型变大，加法式位置方案暴露了两个问题。

  

第一，embedding 必须同时承载“语义”和“位置”，同一组数能装的信息有限。

  

第二，尤其是 learned absolute position embedding（可学习绝对位置嵌入）泛化不够好。如果训练只见过最长 2,048 token，模型没见过位置 5,000，对应 embedding 学得就不充分。

  

现代模型大多改用 Rotary Position Embeddings（RoPE，旋转位置嵌入），由 Su 等人在 2021 年提出，现已用于 LLaMA、Mistral、Gemma、Qwen 等大多数开源权重家族。直觉上，<mark style="background:#d3f8b6">RoPE 不是把位置向量“加到” token 向量，而是按位置相关角度去旋转 Query 和 Key 向量。位置 1 旋转小，位置 100 旋转大。后续做注意力比较时，关键是 Query/Key 旋转差异，它编码了相对距离。</mark>

  

> **Tiny explainer: RoPE（旋转位置嵌入）**

> RoPE 不再加位置向量，而是旋转 Query 与 Key，让相对距离在注意力计算中显现。

  

![Rotary position embeddings rotate vectors by position](https://www.0xkato.xyz/assets/transformer-rope.png)

  

RoPE 的实际优势很明显：<mark style="background:#fdbfff">天然编码相对位置（更贴近注意力真正需要的信息）、对长上下文泛化更好、且不增加新参数。</mark>

  

即便位置编码做好了，现代 LLM 仍有已被记录的 “lost in the middle（中间遗失）”问题（Liu et al., 2023）：它对长提示词开头和结尾的信息利用更稳定，对中段信息利用更弱。所以提示工程里“重要信息放前面”或“关键信息在末尾再重复一次”确实常常有效。模型并没有同等利用你提示中的每个部分。

  

当 token 的语义和位置都编码好后，接下来问题是：token 之间到底怎么交换信息？

  

---

  

## Attention（注意力）

  

这是让该架构得名的机制：Attention。

  

在每个 Transformer 层里，attention 做一件事：<font color="#92d050">让每个 token 去看它“被允许看到”的其他 token，并判断哪些对下一步最重要。</font>

  

<mark style="background:#fdbfff">它通过让每个 token 同时扮演三种角色实现：每个 token 会变换成三个新向量，称为 Query、Key、Value（Q、K、V）。</mark>

  

> **Tiny explainer: Q, K, V**

> Query 是“我在找什么”；Key 是“我能和什么匹配”；Value 是“匹配强时要传递的信息”。

  

- Query：我想从其他 token 获得什么信息？

- Key：我向看我的 token 提供什么特征？

- Value：一旦匹配成功，实际传递什么内容？

  

同一个 token 同时承担三种角色。Q/K/V 变换对应的是可学习矩阵，所以模型会在训练中学出每个 token 应该“找什么”和“提供什么”。

  

匹配通过相似度分数实现：某 token 的 Query 与它可见 token 的 Key 做比较，通常是 scaled dot product（缩放点积）。直觉上，点积衡量两个向量是否对齐；缩放用于在 softmax 前稳定数值。

  

> **Tiny explainer: dot product（点积）**

> 点积是衡量两个向量对齐程度的简单方法。越对齐，匹配越强。

  

之后用 softmax 把匹配分数转成权重。softmax 会把任意一组数变成“概率式”分布，和为 1。分数高的 token 权重大，分数低的权重小；再用这些权重对 Value 向量做加权平均。

  

> **Tiny explainer: softmax**

> softmax 把原始分数变成和为 1 的权重。大分数变大权重，小分数变小权重。

  

举个例子：句子 “The cat that I saw yesterday was sleeping.” 模型在处理 “was” 时，需要知道“谁在 sleeping”。“was” 的 Query 会和可见 token 的 Key 比较。与 “cat” 的点积高，因为模型学到了类似 “was” 的动词需要主语，而类似 “cat” 的主语会产生与之对齐的 Key。与 “yesterday” 的点积低。softmax 后，“cat” 权重大、“yesterday” 权重小。然后模型对对应 Value 做加权求和，结果主要由 “cat” 的 Value 主导，于是 “was” 的新表示主要受 “cat” 影响。这样，前面几个位置的 token 就能成为后面 token 的指代来源。

  

GPT 风格模型还有一个关键约束：它是从左到右生成文本。位置 5 的 token 只能关注位置 1 到 5，不能关注 6、7、8，因为那些还没生成。这叫 causal masking（因果掩码）。实现上很简单：把未来 token 的匹配分数压得极低，softmax 后它们权重几乎为 0。

  

> **Tiny explainer: causal masking（因果掩码）**

> 因果掩码会隐藏未来 token，保证 decoder-only（仅解码器）语言模型在预测下一个 token 时不会“偷看答案”。

  

![Attention heatmap showing causal masking and high attention to cat](https://www.0xkato.xyz/assets/transformer-attention-heatmap.png)

  

可解释性研究里一个很有意思的发现是 induction heads（归纳头，Anthropic 2022）。它们会捕捉提示中 “A B ... A” 形式的模式，并预测下一个是 B。当模型第二次看到 A，归纳头会回看第一次 A 出现的位置，找到后续内容并复制。这是目前已知最清晰的 in-context learning（上下文学习）机制之一。

  

> **Tiny explainer: induction head（归纳头）**

> 归纳头会识别提示中的重复模式，并帮助模型继续这个模式。

  

Attention 有个大成本：在 full attention（全注意力）里，每个 token 都要与可见范围内所有 token 比较，所以提示长度翻倍，计算量大约变四倍。这就是长提示贵的原因，也解释了为何很多研究在做更高效注意力（FlashAttention、sparse attention、linear attention）。

  

但单个 attention head 只能给模型一种关系视角。

  

---

  

## Multi-head attention（多头注意力）

  

一次 attention 只能提供一种“谁该关注谁”的判断方式，这不够。语言里有很多关系同时存在：主谓一致、代词与指代实体、跨句长程关联、词序与局部短语结构。

  

<mark style="background:#fdbfff">Multi-head attention 通过并行跑多次 attention 来解决，每个并行分支在自己的较小子空间里工作。每个分支叫一个 head（头）。</mark>

  

> **Tiny explainer: attention head（注意力头）**

> attention head 是一次独立的注意力计算，拥有自己学习到的投影参数。

  

一个常被讲错的点（不少教程也错）：每个 head 不是拿原 token 向量的固定切片。每个 head 都有自己的投影矩阵，把完整 token 向量映射到更小的 Q/K/V 空间。比如模型每 token 是 4,096 维、总共 32 个头，那么每头常在 128 维空间工作；但这 128 维是从完整 4,096 维“学出来的投影”，不是固定切块。

  

各个 head 独立完成 attention 后，输出会被拼接（concatenate），再经过一个最终线性层混回完整维度；这个混合方式也是模型学出来的。

  

![Multi-head attention combines specialized attention heads](https://www.0xkato.xyz/assets/transformer-multi-head-attention.png)

  

有趣的是，不同 head 常会出现部分专门化（specialization）。没人告诉每个头该做什么，但训练中会自然分工。研究者发现过：跟踪语法关系的头（如动词和宾语、冠词和名词）、追踪代词指代的头、追踪位置模式的头、归纳头等。单层 Transformer 可能有 32 个头，现代前沿模型有几十层，所以一个典型 LLM 里总共有上千个注意力头，各自贡献不同视角。

  

近年架构变化还受一个现实成本驱动：<font color="#92d050">每个头都要把已生成 token 的 Key/Value 保存在内存里，避免每来一个新 token 就从头重算。这叫 KV cache（键值缓存），也是长上下文推理时的主要显存/内存成本来源。</font>

  

> **Tiny explainer: KV cache（键值缓存）**

> KV cache 会在生成过程中保存历史 Key 与 Value，避免每次新增 token 都重算整段前缀。

  

现代 decoder-only LLM 大多采用 Grouped-Query Attention（GQA，分组查询注意力）变体。不是每个 query head 都有独立 key/value head，而是多组 query 共享更少的 key/value 头。比如 LLaMA-2 70B 有 64 个 query 头但只有 8 个 key/value 头；Mistral 7B 是 32 个 query 头配 8 个 key/value 头。效果是精度接近全多头注意力，但显著降低内存压力与推理成本。

  

> **Tiny explainer: GQA（分组查询注意力）**

> GQA 让多个 query 头共享更少的 key/value 头，在保留多视角查询的同时减少 KV cache 成本。

  

---

  

## Feed-forward network（前馈网络）

  

attention 完成 token 间信息混合后，每层还有一个常被忽略的第二步：feed-forward network（FFN，前馈网络）。

  

attention 负责“token 之间对话”，FFN 更像“每个 token 自己做进一步处理”。它对每个 token 向量独立运行，不做跨 token 混合。

  

FFN 按顺序做三件事：

  

1. 把 token 向量扩展到更大维度（原始 Transformer 常用 4x，现代 SwiGLU 模型扩展倍率可能不同）

2. 应用非线性函数（non-linearity）

3. 再压回原始维度

  

![Feed-forward network expands, transforms, and compresses each token vector](https://www.0xkato.xyz/assets/transformer-ffn.png)

  

中间的非线性步骤很关键。non-linearity（非线性）是会“弯折”输入的函数。最简单的 ReLU：负数输出 0，正数原样通过。

  

> **Tiny explainer: non-linearity（非线性）**

> 非线性函数可以防止网络退化为一个巨大的线性变换。

  

如果没有非线性，FFN 只是两层线性层叠加，而纯线性叠加会塌缩：两层线性等价于一层线性，一百层线性仍等价于一层。非线性正是阻止这种塌缩、让 FFN 拥有超出单次矩阵乘法表达力的关键。

  

原始 Transformer 用 ReLU；GPT 与 BERT 转向 GELU；LLaMA、Mistral、PaLM 等现代模型常用 SwiGLU。整体“先扩后压”的结构没变，主要迭代的是非线性本身。

  

在 dense transformer（稠密 Transformer）里，大部分参数其实在 FFN，不在 attention。大量权重都位于前馈层。

  

而且这些参数并不“泛用空白”。模型大量事实和语义结构就存于此。研究发现 FFN 某些神经元会和特定概念/事实强相关：有的对埃菲尔铁塔文本强激活，有的对编程语言强激活，有的对过去时动词强激活。当模型“知道”巴黎是法国首都时，这种事实会分布在特定层的 FFN 权重与激活中。

  

这种“存储记忆”属性有个有意思后果：研究者可以在不重训的前提下直接编辑训练后模型里的某些事实。像 ROME（Rank-One Model Editing，秩一模型编辑）这类方法，可以通过对某个 FFN 权重矩阵做定向低秩编辑，把 “the Eiffel Tower is in Paris” 改成 “the Eiffel Tower is in Rome”。之后模型往往会生成与新关联一致的文本。

  

一些现代前沿模型开始把稠密 FFN 替换成 Mixture of Experts（MoE，专家混合）。不是每层一个 FFN，而是每层并行多个 FFN（称 experts，专家），再由一个小路由网络决定每个 token 走哪些专家。Mixtral 8x7B 每层有 8 个专家，但每个 token 只激活其中 2 个。总参数显著上升，但单 token 计算增长慢得多，因为只跑少量专家。这就是“参数规模上去但推理成本不同比例上升”的关键。

  

> **Tiny explainer: MoE（专家混合）**

> MoE 指模型包含多个前馈网络，并将每个 token 只路由给其中少数几个网络处理。

  

Mixtral 8x7B 总参数约 467 亿，但每 token 实际用到约 129 亿。对于超大模型，这已成为常见选择，因为它允许继续增大参数量而不让推理成本线性暴涨。

  

---

  

## Residual stream and layer normalization（残差流与层归一化）

  

Residual stream（残差流）让模型是“叠加式（additive）”而不是“替换式（replacing）”。attention 或 FFN 运行后，结果通常不会覆盖原 token 向量，而是逐位置加回去：新向量 = 旧向量 + 子模块输出。

  

> **Tiny explainer: residual connection（残差连接）**

> 残差连接把模块输出加回初始向量，为信息与梯度提供一条捷径。

  

在 30、50 甚至 100 层堆叠中，每层贡献会累加，而非覆盖前层。这个运行中的和就是 residual stream。它有个重要性质：最初输入 embedding 仍有一条直接可加路径通向后层，同时沿途混入了每个子模块的贡献。

  

![Residual stream accumulates attention and feed-forward outputs](https://www.0xkato.xyz/assets/transformer-residual-stream.png)

  

残差连接并非由 Transformer 首创，而是来自 ResNet（He et al., 2015），最初用于图像识别。动机是深网太难训练：训练信号在反向传播穿越很多层时会过弱（有时过强），模型很难真正从错误中学习。加了捷径路径后，信号能更直接从输出回流到输入，于是上百层网络变得可训练。Transformer 继承了这套技巧。

  

在现代可解释性研究中，residual stream 已成为核心对象。每个组件、每个注意力头、每个 FFN，乃至最后的 unembedding（反嵌入）步骤，都从 residual stream 读取并写回 residual stream。

  

第二个关键件是 <font color="#92d050">layer normalization（层归一化）</font>，它的意义更“工程化”。没有它，residual stream 会失稳：几十次加法后的数值容易爆炸或塌缩到接近 0，训练都会失败。层归一化会在子模块之间把每个 token 向量重新缩放到可控范围。

  

> **Tiny explainer: layer normalization（层归一化）**

> 层归一化会把 token 向量重缩放到稳定区间，使模型训练过程保持数值稳定。

  

2017 原始 Transformer 在每个子模块之后做归一化（post-norm）。浅层模型可行，但层数加深后训练稳定性变差。现代 Transformer（GPT-2 之后、LLaMA、Mistral 等）通常在每个子模块之前做归一化（pre-norm）。这也是深层 Transformer 更易训练的重要改进之一。

  

归一化函数本身也演化了。很多现代开源模型（LLaMA、Mistral、Gemma、Phi）使用更简单的 RMSNorm。原始 layer norm 同时做两件事：先平移到零均值，再重缩放幅度；RMSNorm 去掉平移，只保留缩放。经验上，主要收益来自缩放，而计算代价更低。

  

> **Tiny explainer: RMSNorm**

> RMSNorm 是更便宜的归一化方式：不先减均值，只重缩放向量大小。

  

这套“看起来不酷”的机制其实很关键：没有残差连接，超深模型难训；没有层归一化，累加流会爆炸或塌缩。两者结合，才有了上百层深度的模型。

  

---

  

## Next-token prediction（下一词元预测）

  

当 attention 和 FFN 全部层处理完，模型会得到序列中每个 token 的最终向量。生成时要预测下一个词，只取最后一个 token 的最终向量。

  

这个向量会被映射成“每个可能下一个 token 各一个分数”。若词表有 100,000 个 token，就会得到 100,000 个数。这些数叫 logits（对数几率分数）。它们还不是概率，可以为任意正负值。

  

> **Tiny explainer: logits（对数几率分数）**

> logits 是每个候选下一个 token 的原始分数。经过 softmax 后才变成概率。

  

再通过 softmax，把 logits 变成下一个 token 的概率分布。操作和前文一样，只是发生在模型末端。

  

模型通常不会每次都拿最高概率 token。解码设置决定输出是更确定还是更丰富。temperature（温度）控制分布尖锐度；top-k 和 top-p 把选择限制在更可能的候选里。这就是同一模型在不同设置下会表现得“更严谨”或“更有创意”的原因。

  

> **Tiny explainer: temperature（温度）**

> 温度控制采样随机性。低温更保守，高温更多样。

  

一旦选出 token，它会被拼回输入。模型在更长序列上跑下一步，通常复用 KV cache，避免重算整段前缀。新 token 触发新的 attention、新的 FFN、新的最终向量、新的预测。循环持续到模型输出 end-of-sequence token（序列结束标记）或达到长度上限。整段文本就是这个循环一次次迭代的结果。

  

“预测下一个 token”这个单一目标，就是 base LLM（基座模型）的核心训练信号。基座模型并不是直接按“事实准确性”“对话能力”“推理能力”“编码能力”来训练的；它是通过海量文本上的下一词元预测学出来的。之后再通过 post-training 去调成更符合指令、偏好、安全与对话行为。

  

还有一个重要效率创新值得知道：speculative decoding（推测解码）。一个小而快的模型先向前猜若干 token，大模型并行验证。若候选在大模型概率下可接受，就直接采用；否则回退到大模型。做得对时，输出分布可与“只用大模型”一致，但循环速度更快。

  

> **Tiny explainer: speculative decoding（推测解码）**

> 推测解码让小草稿模型先猜多步，再由大模型一次验证多个猜测 token。

  

下一词元循环是架构中最朴素的一环，但它让整个系统真正运转起来。

  

---

  

## Architecture vs trained weights（架构与训练权重）

  

我们已经走过核心机制：tokens、embeddings、位置编码、attention、多头注意力、FFN、残差流与归一化，以及输出侧的下一词元循环。这就是基础架构的一次完整走查。

  

那 GPT、Claude、Gemini、LLaMA 到底区别在哪？公开信息并不一致，闭源模型也不会公开所有架构细节。但在本文覆盖的粒度上，它们基本都位于同一 Transformer 家族设计空间里。

  

多数现代 Transformer LLM 使用相似的大框架：tokenization、embeddings、位置编码、堆叠 Transformer 层（每层含多头注意力与 FFN）、残差流、层归一化、下一词元预测。

  

变化主要在：

  

1. 训练权重（trained weights）本身：来自不同数据、不同规模训练

2. 配置（configuration）：层数、词表大小、头数、参数量、MoE 还是稠密结构

3. 后训练（post-training）：指令微调、人类反馈学习、安全控制等

  

> **Tiny explainer: weights（权重）**

> 权重是模型内部学到的数字。训练不断调整这些数字，直到模型能较好预测文本。

  

2023-2025 年间，“现代 Transformer”技术栈在许多前沿和开源权重模型中趋于收敛：pre-norm、RMSNorm、RoPE、SwiGLU、GQA，以及部分超大模型里的 MoE。这些并非一次发明，而是在 2017 年原始设计之上约五年的持续迭代累积。

  

---

  

## Where this is going（接下来会走向哪里）

  

Transformer 家族架构的收敛在机器学习史上很少见。过去很长时间里，不同问题往往配不同网络：图像一套、语言一套、音频一套，视觉和语言团队的方法几乎不共享。

  

现在，Transformer 风格模型已经覆盖语言、视觉、音频和多模态系统。Transformer 吸收了这个领域很大一部分方法论。

  

这当然可能改变。Mamba 与其他 state-space model（状态空间模型）是有竞争力的替代方案，尤其在超长序列场景。混合架构也在探索。MoE 已经在前沿实践中改变了“什么叫模型架构”的含义，而这在五年前还会被视为非主流。

  

但本文覆盖的核心机制（tokens、embeddings、位置编码、attention、FFN、残差流与归一化、下一词元预测）是更“耐久”的部分。即便架构变了，任何序列模型都必须以某种形式解决这些问题。

  

如果你看到这里，已经足以读懂很多现代 Transformer 论文或模型卡里每节在谈哪块。这就是目标。

  

欢迎反馈。如果这些内容让你感兴趣，欢迎在 [X](https://x.com/0xkato) 联系作者，他很乐意认识新朋友。

  

[« The Next Jump](https://0xkato.xyz/the-next-jump/)

  

#### Related Posts

  

- [The Next Jump](https://0xkato.xyz/the-next-jump/)

  

0xkato © 2026 [anchor link to rss feed](https://0xkato.xyz/feed.xml)
