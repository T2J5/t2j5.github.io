---
title: "中学生就能看懂：从零开始理解LLM内部原理【八】｜ 什么是残差连接？"
date: 2026-06-22 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523644&idx=1&sn=0c33043edbf8f4dd8bf86c8227663de6&chksm=c3df2260f4a8ab7699521d06911c72008d24a09a2c29c308e4fb2408d7e5d943f22dfb9fa2ef&cur_album_id=3801563016806531077&scene=189#wechat_redirect"
original: true
index_img: /img/covers/ai.svg
banner_img: /img/covers/ai.svg
updated: 2026-07-12
---

> 原文来源：https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523644&idx=1&sn=0c33043edbf8f4dd8bf86c8227663de6&chksm=c3df2260f4a8ab7699521d06911c72008d24a09a2c29c308e4fb2408d7e5d943f22dfb9fa2ef&cur_album_id=3801563016806531077&scene=189#wechat_redirect

曾经的毛毛 AI大模型应用实践 *2025年5月16日 08:00*

![图片](https://mmbiz.qpic.cn/mmbiz_gif/u3MoWWHj8ZZIXCF5n0xEibBAwpZ9L0OqUDzddf1C36qia2pBm4uKAU8wlibzNYChLmLKicKo2Cp3yqteF5BYsUj0Vg/640?wx_fmt=gif&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=0)

点击上方蓝色字体，关注我们

本系列文章是原作者Rohit Patel的长篇雄文《Understanding LLMs from Scratch Using Middle School Math-A self-contained, full explanation to inner workings of an LLM》的深度学习与解读笔记。 **本篇是系列第八篇** 。我们强烈建议您在开始前阅读并理解前文（点击下方目录）。

**[1\. 一个简单的神经网络](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522402&idx=1&sn=9aab727e53e1f63cff791f6e745c057c&scene=21#wechat_redirect)**

**[2\. 这些模型是如何被训练的？](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522434&idx=1&sn=b6d66d793fc3de10f6c0b0e681ca55ba&scene=21#wechat_redirect)**

**[3\. 这些模型如何生成语言？](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522606&idx=1&sn=2174b7985b02c6e16be49d5d14f5dd02&scene=21#wechat_redirect)**

**[4\. 嵌入（Embeddings）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522678&idx=1&sn=ef6a51c26ad65233022ef104f5c4a2ac&scene=21#wechat_redirect)**

**[5\. 子词分词器（Sub-word tokenizers）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522913&idx=1&sn=04c78cfb70657d17bff5818aacf82717&scene=21#wechat_redirect)**

**[6\. 自注意力机制（Self-attention）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523028&idx=1&sn=a41b5956383719d701c440e745bbf1d5&scene=21#wechat_redirect)**

**[7\. Softmax](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523284&idx=1&sn=572c4cc3e1d1840ddb9caef1f52c091c&scene=21#wechat_redirect)**

**8\. 残差连接（Residual connections）**

**9\. 层归一化（Layer Normalization）**

**10\. Dropout**

**11\. 多头注意力（Multi-head attention）**

**12\. 位置嵌入（Positional embeddings）**

**13\. GPT 架构**

**14\. Transformer 架构**

前两篇中分别讲解了 **自注意力** （Self-Attention）和 **Softmax** ，它们是大语言模型（LLM）中核心的计算模块。自注意力帮助模型从输入序列中自主学习哪些位置更相关，Softmax 将注意力分数转化为概率分布，为后续计算提供权重。今天我们来介绍在深层神经网络训练中的一个关键主角 **残差连接** （Residual Connection）。

**01**

为什么需要“残差”连接？

在大型语言模型（LLM）中（比如 Transformer）信息会依次经过多个模块的加工，比如：

- 自注意力模块（理解词语之间的关系）
- 前馈网络模块（提取更深层的特征）
![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae7c3kzEb7tlkD2uBFfECD43GQm7AxOF2MmTrWWfPER0N0TbW1uy4YuuTuibT2iaIKrFZ5c4SDerK2Kg/640?wx_fmt=png&from=appmsg#imgIndex=10)

传统做法是：每个模块处理完信息后，将输出交给下一个模块，就像流水线那样。但现代大模型（比如 GPT、BERT、Claude）拥有几十层甚至上百层神经网络结构，就像“千层蛋糕”一样，但层数越多，越容易遇到两个问题：

- **网络退化** ：你以为层数越多模型越强，但有时反而精度下降，训练更难
- **梯度传导困难** ：训练信号（梯度）难以顺利传播回前层，学习速度慢甚至失败。

这就像耳语传话的游戏，从第一个人到最后一个人传递同一个信息，每传递一次，信息就可能因听力误差或主观联想被修改，或者是有人加一些添油加醋的噪音信息，原始信息就会被逐渐“淹没”。在神经网络层数过多时，模型可能因优化难度增加而 “学偏”，无法拟合真实数据分布，或者过度拟合噪声，导致精度下降等。

**所以，在神经网络复杂的层次结构中，由于信息传递链条越长，保持完整性和准确性的难度越高** ，而深度学习的残差连接、归一化层（下一节）等技术，正是为了缓解这类问题。

**02**

“残差”连接如何工作？

在神经网络中，残差连接（Residual Connection）就像这样一条“捷径”：它让信息在经历中间复杂的处理步骤的同时，还直接从输入传递到输出，以合并信息。

![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae7c3kzEb7tlkD2uBFfECD436ibiaepnP86Loiaoic4FXkoYp6YFSWhXefuicTDoTAhhedicOVsAlpZx1qog/640?wx_fmt=png&from=appmsg#imgIndex=11)

如果把每一层看作是流水线中的一个加工环节，那么残差连接就是：

把“原材料”（输入）和“半成品”（这一层的输出）直接相加，再送入下一层。你可以认为每一层的输出是：

```js
输出 = F(x) + x
```

其中：

- `x` 是输入（原始信息）
- `F(x)` 是经过模块（比如自注意力）的处理结果

输入信息（原材料）不仅通过了自注意力模块（加工机器），还通过一条额外的“连接线”直接与自注意力模块的输出结果“相加”，最终形成新的输出。这条直接连接输入和输出的“线”，就是我们所说的“残差连接”。

这样，每一层都把“原始信息”直接传递下去，就能够确保“大方向”不偏。而且即使 F(x) 表现不佳，网络依然可以退化为“恒等映射”，起码不会破坏输入信息。这也让 **梯度反向传播更稳定** ，因为梯度可以沿着残差路径“直达”前层，减少衰减。（反向传播与梯度下降翻阅： [中学生就能看懂：从零开始理解LLM内部原理【二】｜神经网络如何被训练？](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522434&idx=1&sn=b6d66d793fc3de10f6c0b0e681ca55ba&scene=21#wechat_redirect) ）

**03**

“残差”连接为什么可以工作？

你可能会问：为什么能直接把输入和输出相加？答案是： **它们“形状一致”，也就是“大小相同”。还记得吗，** 在神经网络里，“信息”通常表示成一组数字（向量），它的“大小”通常用“维度”来表示，你可以简单地理解为，这是描述信息所需的不同“方面”或“特征”的数量。比如：

```apache
x = [1.0, 2.5, -0.3]F(x) = [0.5, -1.5, 0.2]
```

这是两组纬度相同的信息表示（当然实际的表示要复杂的多），它们就可以相加。

为此，神经网络的设计者会确保模块的输出和输入“尺寸对齐”，就像工厂中不同机器之间必须有相同宽度的传送带才能对接一样。

这样我们就可以顺利地进行“残差连接”这个操作了。

残差连接看似只是在层与层之间多做一次“相加”，却能让深度模型的训练变得稳健、层数可以任意堆叠，也正是 Transformer、GPT 等大语言模型能够轻松达到上百层的关键手段之一。

福利时间

为了帮助LLM开发人员更系统性与更深入的学习RAG应用，特别是企业级的RAG应用场景下，当前主流的优化方法与技术实现，我们编写了 **《基于大模型的RAG应用开发与优化 — 构建企业级LLM应用》** 这本长达 **500页的开发与优化指南** ，与大家一起来深入到LLM应用开发的全新世界。

更多细节，点击链接了解

**交流请识别以下名片**

![图片](https://mmbiz.qpic.cn/sz_mmbiz_jpg/wT3y8Vg9pFHz6icT5peYpicQ04tPsVcENDGnN54f56ct0UmibqRslCfoBdEOSnNBhBY6yibgMsJoopA0riaf3bYWiayA/640?wx_fmt=jpeg&from=appmsg&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=18)

LLM（大模型）原理 · 目录

继续滑动看下一个

AI大模型应用实践

向上滑动看下一个
