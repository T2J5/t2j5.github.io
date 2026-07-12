---
title: "Transformer 内部机制：一个 Token 的一生"
date: 2026-06-11 15:12:56
categories:
  - ai
tags:
  - ai
index_img: /img/covers/ai.svg
banner_img: /img/covers/ai.svg
updated: 2026-07-12
---

原文链接：[https://www.aleksagordic.com/blog/transformer](https://www.aleksagordic.com/blog/transformer)  
作者：Aleksa Gordić  
发布时间：2026-05-26

---
## 1. 文章概览

这篇文章深入拆解了一个现代 Dense Transformer（稠密 Transformer）的内部机制，重点关注单卡上的前向传播（forward pass）。作者刻意不展开反向传播与分布式训练细节，而是把注意力放在一个 token 在网络中的完整生命周期。

贯穿示例是 Rnj 1.5：

- 模型链接：[https://huggingface.co/EssentialAI/rnj-1.5-instruct](https://huggingface.co/EssentialAI/rnj-1.5-instruct)
- 属于 Rnj 1.0 的长上下文升级版
- 上下文窗口由 32k 提升到 160k
- 在 128k 窗口下 RULER 得分 79%

文章分为七部分：

1. Transformer forward pass（前向传播）
2. RMSNorm（均方根归一化）
3. GeGLU MLP（门控前馈）
4. MHA（多头注意力）
5. YaRN（长上下文位置编码扩展）
6. Core Attention（核心注意力）
7. Transformer math（参数/FLOPs/容量估算）

---

## 2. Transformer Forward Pass（前向传播）

作者先设定一个最小样例：

- batch size = 1
- sequence length = 16
- 启用 document packing（文档打包）

然后沿着 token 流动路径，从输入到输出逐层解释。


[![Figure 1: Tokenization stage](https://www.aleksagordic.com/blog/transformer/flow_pre.png)](https://www.aleksagordic.com/blog/transformer/flow_main.png)

图注翻译：分词阶段（Tokenization stage）  
图中英文翻译：

- tokenization -> 分词
- documents -> 文档
- sequence -> 序列
- token IDs -> token 编号

先把文本分词成整数序列，再把两个文档打包到一个序列中。作者将 tokenizer 视为黑盒，但指出实践中常见 BPE（Byte Pair Encoding，字节对编码）这类训练式分词方式。优秀 tokenizer 的设计会影响模型数值推理、代码理解等能力。

除了 token 序列，还会构建两个辅助结构：

- input positions（输入位置）
- segmentation mask（分段掩码）

### Figure 2

![Figure 2: Embedding stage](https://www.aleksagordic.com/blog/transformer/flow_pro.png)

图注翻译：嵌入阶段（Embedding stage）  
图中英文翻译：

- embedding table -> 嵌入表
- bf16 vectors -> bf16 向量

输入 token 会索引 embedding table，把整数序列映射为向量序列（例子里是 16 个 4096 维 bf16 向量）。

作者还解释了 FIM（Fill-In-the-Middle，中间填充）特殊 token 的用途：

- <FIM_PRE> prefix <FIM_SUF> suffix <FIM_MID> middle
- 模型学习“给前后文，预测中间缺失段”
- 对 IDE 自动补全非常实用

### Figure 3

![Figure 3: Forward pass through transformer blocks](https://www.aleksagordic.com/blog/transformer/flow_main.png)

图注翻译：穿过 Transformer 块的前向传播  
图中英文翻译：

- residual connection -> 残差连接
- attention module -> 注意力模块
- submodules -> 子模块

Rnj 1.5 会通过 32 层 block。每层结构相近，包含：

- RMSNorm
- Attention
- MLP
- 残差分支与求和

作者强调：除 attention 外，很多子模块都是按“单个向量并行处理”的点式计算。

### Figure 4

![Figure 4](https://www.aleksagordic.com/blog/transformer/flow_epi.png)

图注翻译：输出投影到 logits 阶段  
图中英文翻译：

- logits -> 未归一化对数几率
- softmax -> 概率归一化

最后一层输出会投影到 128,256 维，得到 logits。训练时进入交叉熵损失，推理时从 softmax 后分布采样。

---

## 3. RMSNorm（Root Mean Square Layer Normalization，均方根归一化）

RMSNorm 用于稳定深层网络训练。它对单个向量做归一化处理，输出形状与 dtype 不变。

### Figure 5

![Figure 5: RMSNorm](https://www.aleksagordic.com/blog/transformer/RMSNorm.png)

图注翻译：RMSNorm  
图中英文翻译：

- root mean square -> 均方根
- normalize -> 归一化
- scale -> 缩放

---

## 4. GeGLU MLP（GELU 门控前馈）

MLP（Multi-Layer Perceptron，多层感知机）负责学习非线性映射。文中采用 GeGLU：

W2 @ GELU(W0@X) * (W1@X)

### Figure 6

![Figure 6: GeGLU MLP](https://www.aleksagordic.com/blog/transformer/MLP.png)

图注翻译：GeGLU MLP  
图中英文翻译：

- gate/gating -> 门控
- GELU -> 高斯误差线性单元

作者指出：ReLU 门控通常非负，主要起“抑制/放大”作用；而 GELU 可能产生负值，门控也可能导致特征符号翻转。

---

## 5. MHA（Multi-Head Attention，多头注意力）

文中使用的是 GQA（Group Query Attention，分组查询注意力）：K/V 头数少于 Q 头，多个 query 组共享同一组 key/value。

流程概览：

1. 线性映射得到 Q/K/V
2. reshape
3. QK 归一化
4. 注入 YaRN 位置编码
5. core attention 跨位置聚合
6. 线性投影输出

### Figure 7

![Figure 7: MHA - multi head attention](https://www.aleksagordic.com/blog/transformer/MHA.png)

图注翻译：MHA 多头注意力  
图中英文翻译：

- query/key/value -> 查询/键/值
- head -> 注意力头
- projection -> 投影

---

## 6. YaRN（Yet another RoPE extensioN）

YaRN 是对 RoPE（Rotary Position Embedding，旋转位置编码）的扩展，目标是更稳健地支持长上下文外推。

### Figure 8

![Figure 8: The WHY behind positional embeddings](https://www.aleksagordic.com/blog/transformer/yarn_intro.png)

图注翻译：为什么需要位置编码  
图中英文翻译：

- positional embeddings -> 位置嵌入
- order information -> 顺序信息

### Figure 9

![Figure 9: YaRN frequency table](https://www.aleksagordic.com/blog/transformer/yarn2.png)

图注翻译：YaRN 频率表  
图中英文翻译：

- frequency table -> 频率表
- base frequency -> 基频

### Figure 10

![Figure 10: YaRN frequencies](https://www.aleksagordic.com/blog/transformer/yarn3.png)

图注翻译：YaRN 频率可视化  
图中英文翻译：

- slowest frequency -> 最低频率
- one cycle every 1.088M positions -> 每 108.8 万位置一个周期

### Figure 11

![Figure 11: YaRN - forward pass](https://www.aleksagordic.com/blog/transformer/yarn4.png)

图注翻译：YaRN 前向注入过程  
图中英文翻译：

- forward pass -> 前向传播
- rotation -> 旋转

### Figure 12

![Figure 12: How does RoPE encode relative positional information?](https://www.aleksagordic.com/blog/transformer/yarn5.png)

图注翻译：RoPE 如何编码相对位置信息  
图中英文翻译：

- relative positional information -> 相对位置信息
- dot product -> 点积

作者解释了核心直觉：通过对 Q/K 做成对坐标旋转，再做点积，就能把相对位置信号编码进注意力计算。

---

## 7. Core Attention（核心注意力）

工程中通常使用 FlashAttention（作者给了自己的科普文链接），但本文先讲 vanilla attention 原理。

FlashAttention 参考：

- [https://gordicaleksa.medium.com/eli5-flash-attention-5c44017022ad](https://gordicaleksa.medium.com/eli5-flash-attention-5c44017022ad)

### Figure 13

![Figure 13: Computing (seqlen, seqlen) matrix of attention scores](https://www.aleksagordic.com/blog/transformer/attn1.png)

图注翻译：计算 (seqlen, seqlen) 注意力分数矩阵  
图中英文翻译：

- attention scores -> 注意力分数
- seqlen -> 序列长度

如果不加掩码，会出现两类错误：

1. 文档 1 的 token 能看到文档 2 的 token
2. token i 能看到未来 token i+1，破坏因果性

### Figure 14

![Figure 14: Attention masking & value vector aggregation](https://www.aleksagordic.com/blog/transformer/attn2.png)

图注翻译：注意力掩码与 value 聚合  
图中英文翻译：

- masking -> 掩码
- value aggregation -> value 聚合
- causality -> 因果性

### Figure 15

![Figure 15: Hybrid attention: block local + global](https://www.aleksagordic.com/blog/transformer/attn3.png)

图注翻译：混合注意力（块局部 + 全局）  
图中英文翻译：

- block local -> 块局部
- global -> 全局

### Figure 16

![Figure 16: Hybrid attention layout](https://www.aleksagordic.com/blog/transformer/attn4.png)

图注翻译：混合注意力布局  
图中英文翻译：

- layout -> 布局
- attend to -> 关注到

在多数 block-local 层，较远 token 互相不可见；在少量 global 层，token 可以回看更远历史。

---

## 8. Transformer Math（工程估算）

作者把 KV cache 放在推理理解的核心位置：

- 推理是自回归逐 token 生成
- 历史 K/V 在因果模型中不变
- 因此可缓存，避免每步重算历史

### Figure 17

![Figure 17: KV cache calculation](https://www.aleksagordic.com/blog/transformer/calc1.png)

图注翻译：KV 缓存计算  
图中英文翻译：

- KV cache -> 键值缓存
- storage requirements -> 存储需求

### Figure 18

![Figure 18: Number of learnable parameters calculation](https://www.aleksagordic.com/blog/transformer/calc2.png)

图注翻译：可学习参数量计算  
图中英文翻译：

- learnable parameters -> 可学习参数
- parameter count -> 参数总量

作者给了一个实用心算建议：

- MLP 关注 3 个矩阵
- Attention 关注 4 个矩阵

### Figure 19

![Figure 19: FLOPs/token calculation](https://www.aleksagordic.com/blog/transformer/calc3.png)

图注翻译：每 token FLOPs 计算  
图中英文翻译：

- FLOPs/token -> 每 token 浮点运算量
- 6N formula -> 6N 公式

### Figure 20

 ![Cluster sizing calculation](https://www.aleksagordic.com/blog/transformer/calc4.png)

图注翻译：集群规模估算  
图中英文翻译：

- cluster sizing -> 集群容量规划
- throughput -> 吞吐
- budget -> 预算

### Figure 21

![Figure 21: Profit](https://www.aleksagordic.com/blog/transformer/sp.png)

图注翻译：收益  
图中英文翻译：

- profit -> 收益
- seed round -> 种子轮融资

---

## 9. Epilogue（结语）

作者总结：

- 一个 token 如何穿过 Transformer 各模块
- YaRN 与 attention 的关键机制
- 若干核心工程估算公式

并预告后续将继续展开：

- MoE（Mixture of Experts，专家混合）
- Muon（优化器）
- MLA、MTP（multi-token prediction，多 token 预测）、DSA（稀疏注意力）

---

## 10. References（参考文献）

1. Attention Is All You Need: [https://arxiv.org/abs/1706.03762](https://arxiv.org/abs/1706.03762)
2. RNJ 1.0: [https://essential.ai/research/rnj-1](https://essential.ai/research/rnj-1)
3. Efficient Training of Language Models to Fill in the Middle: [https://arxiv.org/abs/2207.14255](https://arxiv.org/abs/2207.14255)
4. Attention Residual Learning: [https://arxiv.org/abs/2603.15031](https://arxiv.org/abs/2603.15031)
5. DeepSeek-V2: [https://arxiv.org/abs/2405.04434](https://arxiv.org/abs/2405.04434)
6. Kimi Linear: [https://arxiv.org/abs/2510.26692](https://arxiv.org/abs/2510.26692)
7. Root Mean Square Layer Normalization: [https://arxiv.org/abs/1910.07467](https://arxiv.org/abs/1910.07467)
8. GLU Variants Improve Transformer: [https://arxiv.org/abs/2002.05202](https://arxiv.org/abs/2002.05202)
9. YaRN: [https://arxiv.org/abs/2309.00071](https://arxiv.org/abs/2309.00071)
10. RoFormer: [https://arxiv.org/abs/2104.09864](https://arxiv.org/abs/2104.09864)
11. Eli5 Flash Attention: [https://gordicaleksa.medium.com/eli5-flash-attention-5c44017022ad](https://gordicaleksa.medium.com/eli5-flash-attention-5c44017022ad)
12. Muon: [https://kellerjordan.github.io/posts/muon/](https://kellerjordan.github.io/posts/muon/)
13. Dissecting Sparsity in LLMs: [https://arxiv.org/abs/2512.02556](https://arxiv.org/abs/2512.02556)
