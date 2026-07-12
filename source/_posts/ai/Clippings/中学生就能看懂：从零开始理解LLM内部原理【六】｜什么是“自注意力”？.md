---
title: "中学生就能看懂：从零开始理解LLM内部原理【六】｜什么是“自注意力”？"
date: 2026-06-22 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523028&idx=1&sn=a41b5956383719d701c440e745bbf1d5&scene=21&poc_token=HAv9OGqjSR_wy-IAWY2cvaAiYQrni-cF3wXuFIBT"
original: true
---

> 原文来源：https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523028&idx=1&sn=a41b5956383719d701c440e745bbf1d5&scene=21&poc_token=HAv9OGqjSR_wy-IAWY2cvaAiYQrni-cF3wXuFIBT

曾经的毛毛 AI大模型应用实践 *2025年2月28日 09:00*

点击上方蓝字加入我们

本系列文章是原作者Rohit Patel的长篇雄文《Understanding LLMs from Scratch Using Middle School Math-A self-contained, full explanation to inner workings of an LLM》的深度学习与解读笔记。 **本篇是系列第六篇** 。我们强烈建议您在开始前阅读并理解前文（点击下方目录）。

[**1\. 一个简单的神经网络**](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522402&idx=1&sn=9aab727e53e1f63cff791f6e745c057c&scene=21#wechat_redirect)

[**2\. 这些模型是如何被训练的？**](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522434&idx=1&sn=b6d66d793fc3de10f6c0b0e681ca55ba&scene=21#wechat_redirect)

[**3\. 这些模型如何生成语言？**](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522606&idx=1&sn=2174b7985b02c6e16be49d5d14f5dd02&scene=21#wechat_redirect)

[**4\. 嵌入（Embeddings）**](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522678&idx=1&sn=ef6a51c26ad65233022ef104f5c4a2ac&scene=21#wechat_redirect)

[**5\. 子词分词器（Sub-word tokenizers）**](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522913&idx=1&sn=04c78cfb70657d17bff5818aacf82717&scene=21#wechat_redirect)

**6\. 自注意力机制（Self-attention）**

**7\. Softmax**

**8\. 残差连接（Residual connections）**

**9\. 层归一化（Layer Normalization）**

**10\. Dropout**

**11\. 多头注意力（Multi-head attention）**

**12\. 位置嵌入（Positional embeddings）**

**13\. GPT 架构**

**14\. Transformer 架构**

**6**

**自注意力机制（Self-attention）**

欢迎继续跟随我们一起学习LLM的原理。你应该已经了解到：语言模型的本质是输入一些内容给神经网络模型，并不断预测出下一个词。而为了方便计算，这些内容会被转化为带有语义特征的向量（一组数值），而这个转化是以子词（Token）为单位进行。

今天将来了解一个更高级的概念—— **自注意力机制** （Self-Attention）。它是自然语言处理（NLP）模型中的核心技术之一，也是Transformer模型得以成功的关键。

**01**

**为什么需要自注意力机制？**

在处理自然语言文本的过程中，存在一个显而易见的问题： **一个句子的下一个词（也就是神经网络需要预测的），取决于前面所有的词，并且很可能更依赖于之前的某几个词** 。比如在下面的句子中：

*“达米安有一个秘密女儿，是个金发碧眼的* *女孩* *。他在遗嘱中写道：所有财产连同魔法水晶球都将属于\_\_\_\_"*

需要预测的空白处的词可以是“她”或者“她”，这取决于句子前面的词“女孩”。”女孩“这个重要词的位置并不固定，当你换一种表达方式，关联词的位置又可能发生变化。

但是还记得基本神经网络的原理吗（请回顾第1-3节）？模型中神经元的特定位置对最终预测结果的影响（也就是这个位置的重要性）是固定的。那么问题来了： **与预测结果最相关的词实际上可能处于每一层的任意位置，也就是说，词的重要性不能仅取决于位置，而更取决于其内容以及上下文。** 比如上面的“女孩”这个词的重要性，并不取决于它的位置。

那么怎样让预测中输入词的“重要性”（也称为权重，但注意区分神经网络不同层之间的权重参数）变成动态的呢？答案就是自注意力机制。

**02**

**什么是自注意力机制？**

**自注意力机制（Self-Attention）是一种让每个词根据上下文来动态调整它的自身表示（即向量）的机制** 。即对于每个词，会根据与上下文其他词的相关性来重新计算，以得到新的向量表示。从而帮助神经网络模型更好的捕捉到词与词之间的动态紧密关系，从而实现更准确的预测输出。

![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae5Z8ib827PETa0d85VcBsqG0w3KoKOt29CfAf7cHZiaF1DNacUD99jibAW2hicxkMRcoWZQ6BzO9rLBZA/640?wx_fmt=png&from=appmsg&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=5)

简单的说就是：

**给每一个词生成新的、更高层的、融合了全局上下文信息的向量表示，让这个词“关注”到序列中的其他词。**

**03**

**自注意力机制的生成算法**

本节已经尽量简化，如果你对算法“过敏”，也可跳过本节继续

那么自注意力机制是如何让每个词能够“关注”到其他词，并融合与他们的相关性呢？这里以“the cat sat"这一句输入为例，假设现在已经生成了这三个词的嵌入向量，分别为：

![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae5Z8ib827PETa0d85VcBsqG0I8AWlTFiaug74zgxLQfIHUGQRd8NRLRlpk4hLhA0WpIVvCOUXy3jssg/640?wx_fmt=png&from=appmsg&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=7)

注意这里对三个词向量做了简化。现在来到自注意力层，有四个核心步骤：

**1\. 生成 Q、K、V 三组向量**

• 首先，会为输入序列中的每个词向量，分别通过三个不同的线性变换，生成三个新的向量：查询（Query）、键（Key）和值（Value），简称 Q、K、V。（这里的变换会用到Q、K、V的三个权重矩阵，也就是自注意力模块的三个参数Wq,Wk,Wv，一般也是通过训练得到）

• 每个词的这三个新向量是自注意力层的基础，分别用来代表“我想关注什么”（Q）、“我有什么可被关注”（K）以及“我实际携带的内容”（V）。

此时，一共有9个向量，比如：

![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae5Z8ib827PETa0d85VcBsqG0mvapUMpsM2Yu71bwfArsqKeNXUssVRfgXVV6JfEKss9LLFMVjxuxkw/640?wx_fmt=png&from=appmsg&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=8)

**2\. 计算注意力得分（Score）**

• 对于序列中的任意一个词，它的 Q 向量会和其他所有词的 K 向量做点积运算，得到一系列注意力得分。

• 这些得分越大，表示该词与对应的其他词相关性越强；得分越小，表示二者关系较弱。也可以认为 **这个得分代表了这个词对其他词的重要性** 。

比如计算“ **sat”** 这个词与所有词的注意力得分：

![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae5Z8ib827PETa0d85VcBsqG0goeia4vwOSvHLdQGW8gOrvxkR6w4s0Pa18KNZibXaPV7eGbGW9zOtAjQ/640?wx_fmt=png&from=appmsg&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=9)

**3\. 对得分进行缩放和 Softmax**

• 这一步可以理解为把得分做一个处理，目的是为了转化成总和为1的概率分布，便于处理，并不会改变得分的意义。比如把上面“ **sat** ”的三个注意力得分转化：

![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae5Z8ib827PETa0d85VcBsqG0HicHgibgNWmSRLRp0OwSJiaw4LANsQUoZLiaV0VEvsE0peGMrGF9vWTmeQ/640?wx_fmt=png&from=appmsg&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=10)

**4\. 加权合并值向量（V）**

• 最后，用上一步得到的“注意力权重”对对应词的 V 向量做加权求和，得到新的向量表示。

比如，继续对 **“sat”** 这个词继续处理：

![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae5Z8ib827PETa0d85VcBsqG0nH2JcToYKtNkyWuFMCmbIgNe9PzkfNwF6LWdBiaGyOA4GLz2wAvILYg/640?wx_fmt=png&from=appmsg&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=11)

最后得出：

![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae5Z8ib827PETa0d85VcBsqG0kQIiaSQqicZRzmUH5cdZMghc99uyaE1WXfKPibHNOCsFAwbZlrx6U7aTQ/640?wx_fmt=png&from=appmsg&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=12)

这就是“sat”这个词在自注意力机制下的最终输出，它综合了与句子中其他词（“the”和“cat”）的关系。

**通过这几个步骤，最终每个词都会生成新的向量表示，这些表示会进一步传递到后续网络层或解码器。**

从上面的过程也可以看出自注意力为什么能够捕捉到与其他词的相关性？原因是在这个计算过程中 **每个词都会直接与其他所有词进行了“交互”，不受序列长度限制** 。

**04**

**总结**

最后，总结下自注意力机制的要点：

- **为什么：** 让每个词都能“关注”到上下文的其他词，并对预测结果产生影响。
- **是什么：** 序列中每个词根据与上下文其他词的相关性，更新自身的向量表示。
- **怎么做：** 通过自注意力算法生成新的融合上下文相关性的新向量表示。
- **谁来做：** 由模型中的自注意力层来处理，然后交给后续层继续处理。
- **局限性：** 计算和内存开销较大，且对于极长的输入序列仍然有挑战。

THE END

福利时间

为了帮助LLM开发人员更系统性与更深入的学习RAG应用，特别是企业级的RAG应用场景下，当前主流的优化方法与技术实现，我们编写了 **《基于大模型的RAG应用开发与优化 — 构建企业级LLM应用》** 这本长达 **500页的开发与优化指南** ，与大家一起来深入到LLM应用开发的全新世界。

更多细节，点击链接了解

此处购买享优惠

**交流请识别以下名片**

![图片](https://mmbiz.qpic.cn/sz_mmbiz_jpg/wT3y8Vg9pFHz6icT5peYpicQ04tPsVcENDGnN54f56ct0UmibqRslCfoBdEOSnNBhBY6yibgMsJoopA0riaf3bYWiayA/640?wx_fmt=jpeg&from=appmsg#imgIndex=14)

继续滑动看下一个

AI大模型应用实践

向上滑动看下一个
