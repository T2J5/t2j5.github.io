---
title: "中学生就能看懂：从零开始理解LLM内部原理【四】｜为什么需要嵌入？"
date: 2026-06-22 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522678&idx=1&sn=ef6a51c26ad65233022ef104f5c4a2ac&chksm=c3df262af4a8af3c15e3ed2a2a482028e29df1db9e8df61df1671a0016e25f009f80d2bb5256&cur_album_id=3801563016806531077&scene=189#wechat_redirect"
original: true
index_img: /img/covers/ai.svg
banner_img: /img/covers/ai.svg
updated: 2026-07-12
math: true
---

> 原文来源：https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522678&idx=1&sn=ef6a51c26ad65233022ef104f5c4a2ac&chksm=c3df262af4a8af3c15e3ed2a2a482028e29df1db9e8df61df1671a0016e25f009f80d2bb5256&cur_album_id=3801563016806531077&scene=189#wechat_redirect

曾经的毛毛 AI大模型应用实践 *2025年1月20日 09:00*

点击上方蓝字关注我们

![图片](https://mmbiz.qpic.cn/mmbiz_png/6oWyooFSRsb05FdnF5Gd7aiaXibez8ZjfyPcibfvTDYReV1wDfSDmoTYCpD5GAuibOxK641tfUHV10Trbb0wUMSxlA/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=0)

本系列文章是原作者Rohit Patel的长篇雄文《Understanding LLMs from Scratch Using Middle School Math-A self-contained, full explanation to inner workings of an LLM》的深度学习与解读笔记。 **本篇是系列第四篇** 。我们强烈建议您在开始前阅读并理解前文（点击下方目录）。

[**1\. 一个简单的神经网络**](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522402&idx=1&sn=9aab727e53e1f63cff791f6e745c057c&scene=21#wechat_redirect)

[**2\. 这些模型是如何被训练的？**](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522434&idx=1&sn=b6d66d793fc3de10f6c0b0e681ca55ba&scene=21#wechat_redirect)

[**3\. 这些模型如何生成语言？**](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522606&idx=1&sn=2174b7985b02c6e16be49d5d14f5dd02&scene=21#wechat_redirect)

**4\. 嵌入（Embeddings）**

**5\. 子词分词器（Sub-word tokenizers）**

**6\. 自注意力机制（Self-attention）**

**7\. Softmax**

**8\. 残差连接（Residual connections）**

**9\. 层归一化（Layer Normalization）**

**10\. Dropout**

**11\. 多头注意力（Multi-head attention）**

**12\. 位置嵌入（Positional embeddings）**

**13\. GPT 架构**

**14\. Transformer 架构**

**4**

**嵌入（Embeddings）**

还记得吗？我们已经把一个能够预测“叶子”还是“花”的简单神经网络，成功的用来预测句子的“下一个输出字符”，从而构建了一个初步的语言模型：

![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae4BbzZYYFuUvMH9ib3PyenBkMqRmVPvibuIv2h5Iic9HtbSAyOiarab2W21wEA6h4ePWicH07UzwsOFOyw/640?wx_fmt=png&from=appmsg&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=3)

但这个简单模型离真正的现代语言模型还相差甚远，需要大量的优化创新，今天首先来看现代语言模型的一个基础概念： **嵌入（Embedding）与向量（Vectors）。**

你可能在RAG（检索增强生成）应用中了解了如何利用嵌入与向量实现语义检索。但请注意嵌入是语言模型得以工作的基础而非RAG。

**01**

**从简单的字符映射到嵌入**

在前面的模型中，输入采用简单的数字编码，字符通常被表示为任意的数字。例如， `a = 1` ， `b = 2` ，依此类推。这种方法虽然简单，但存在明显的缺陷：这些数字没有任何语义信息，无法捕捉字符之间的丰富的语义关系或上下文。

**“嵌入”** 就是为了解决这个问题。 **嵌入是一种将字符、单词或符号映射到一组数字的方法。** **这些数字不是随意选择的，而是通过训练模型学习得到的。** 核心思想是：通过优化输入表示，使模型能够更好地捕捉语言的结构和语义。

**这里的一组数字我们称为“向量”，向量是一个有序的数字集合。** 例如，一个长度为10的向量可以表示为 \[0.1, 0.2, 0.3,..., 0.10\]。注意， **每个数字在向量中的位置是固定的** ，交换位置会得到不同的向量。就像前面的“叶子 / 花朵”的数据，如果交换叶子的 R 和 G 值，就会得到不同的颜色，也就不再是同一个向量。

**02**

**嵌入（向量表示）是如何训练出来的？**

那么这些输入的数字（即向量）表示如何被训练出来的呢？答案是 **与神经网络的权重训练类似，即通过梯度下降来获得最优的向量表示。** 还记得权重的训练过程吗：

1. 输入数据：将字符或单词输入模型。
2. 计算输出：通过神经网络计算输出结果。
3. 计算损失：将输出与预期结果进行比较，计算损失（即误差）。
4. 调整权重：通过梯度下降调整模型的权重，以最小化损失，开始新一轮训练。
5. 多轮迭代：经过多轮的迭代，最终将会把权重调整到一个合适的值。

所以嵌入的训练过程也是类似：

1. 初始化嵌入：首先为每个字符分配一个随机的向量，即一组数字。
2. 输入到网络：我们将这些向量传递到神经网络中进行处理。
3. 优化向量：与优化权重类似，通过计算损失函数，来优化这些嵌入向量的值。通过梯度下降，不断调整这些向量，使得模型输出更接近我们期望的结果。

随着训练的进行，这些向量会逐渐变得更加“智能”，它们会捕捉到每个字符的语义特征，并且 **这种嵌入方式可以在不同的模型中复用** 。例如，如果我们为字符“a”学习到的向量是\[0.2, 0.5, 0.1, 0.3\]，那么每次我们遇到字符“a”时，模型都会使用这个向量进行处理，而不必每次重新随机初始化。

**03**

**向量如何输入神经网络？**

假设我们为每个字符分配一个长度为10的向量。那么，如果输入“humpty dumpt”这一串12个字符，就需要将每个字符的向量拼接起来，形成一个长度为120的输入层（12字符 × 10数字/字符）。

- **输入层的扩展** ：原本的输入层可能只有12个神经元（每个字符对应一个神经元），但现在扩展到了120个神经元。每个字符的向量被依次排列，输入到网络中。
- **所有的嵌入向量长度必须相同** ，否则我们就无法将所有字符组合输入到网络中。例如，“humpty dumpt” 和下一次迭代中的 “umpty dumpty”，在这两种情况下，我们都要向网络中输入 12 个字符，如果这 12 个字符不是都由长度为 10 的向量表示，我们就无法可靠地将它们全部输入到 120 个长度的输入层中。

**04**

**嵌入矩阵**

为了方便管理和使用嵌入向量，这里引入嵌入矩阵的概念。

- 什么是嵌入矩阵？ **嵌入矩阵是一个二维数组，其中每一列对应一个字符或单词的向量。** 例如，假设我们有26个字母，每个字母的向量长度为10，那么嵌入矩阵的大小就是 10 × 26。
![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae5WIVLz6TzDJX7ynQ7ibgiaNYibTHefibfAMH9sC2cxscRiaoN7oxlcIaFcM1Up3vsYjQSHSt3X9XfwNOA/640?wx_fmt=png&from=appmsg#imgIndex=7)

图片来自原文

- 如何使用嵌入矩阵？ **当我们需要表示某个字符时，只需查找嵌入矩阵中对应的列。** 例如，字母“a”的向量就是嵌入矩阵的第一列。

嵌入矩阵不仅可以用于字符，还可以用于单词、符号，甚至更复杂的语言单元。它的灵活性使得嵌入成为现代语言模型的核心组件之一。通过嵌入将词汇转换成的向量还有一个特征， **这些向量可以捕捉到词汇之间的相似性。** 例如，词汇的嵌入向量可以捕捉到“king”和“queen”之间的语义关系，即它们的嵌入向量距离非常接近。

从最初的简单数字表示到高维度嵌入向量，嵌入技术让神经网络能够更好地理解和处理复杂的语言信息，为进一步生成自然流畅的人类语言奠定基础。

截至目前我们探讨的嵌入仍然是基于单个字符，这存在一定的局限性，我们将在下一篇中探讨： **如何基于更大的单元(sub-word)生成向量？**

end

福利时间

为了帮助LLM开发人员更系统性与更深入的学习RAG应用，特别是企业级的RAG应用场景下，当前主流的优化方法与技术实现，我们编写了 **《基于大模型的RAG应用开发与优化 — 构建企业级LLM应用》** 这本长达 **500页的开发与优化指南** ，与大家一起来深入到LLM应用开发的全新世界。

更多细节，点击链接了解

此处购买享 **5折** 优惠

**交流请识别以下名片**

![图片](https://mmbiz.qpic.cn/sz_mmbiz_jpg/wT3y8Vg9pFHz6icT5peYpicQ04tPsVcENDGnN54f56ct0UmibqRslCfoBdEOSnNBhBY6yibgMsJoopA0riaf3bYWiayA/640?wx_fmt=jpeg&from=appmsg#imgIndex=10)

LLM（大模型）原理 · 目录

继续滑动看下一个

AI大模型应用实践

向上滑动看下一个
