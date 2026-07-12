---
title: "中学生就能看懂：从零开始理解LLM内部原理【五】｜分词的艺术"
date: 2026-06-22 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522913&idx=1&sn=04c78cfb70657d17bff5818aacf82717&chksm=c3df253df4a8ac2bd1783c2f544194a8cd01ca9f2bf5d6a8578ab7334eb20b6ad9403daf9fc7&cur_album_id=3801563016806531077&scene=189#wechat_redirect"
original: true
---

> 原文来源：https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522913&idx=1&sn=04c78cfb70657d17bff5818aacf82717&chksm=c3df253df4a8ac2bd1783c2f544194a8cd01ca9f2bf5d6a8578ab7334eb20b6ad9403daf9fc7&cur_album_id=3801563016806531077&scene=189#wechat_redirect

秋山墨客 AI大模型应用实践 *2025年2月14日 09:00*

点击上方蓝字关注我们

![图片](https://mmbiz.qpic.cn/mmbiz_png/6oWyooFSRsb05FdnF5Gd7aiaXibez8ZjfyPcibfvTDYReV1wDfSDmoTYCpD5GAuibOxK641tfUHV10Trbb0wUMSxlA/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=0)

本系列文章是原作者Rohit Patel的长篇雄文《Understanding LLMs from Scratch Using Middle School Math-A self-contained, full explanation to inner workings of an LLM》的深度学习与解读笔记。 **本篇是系列第五篇** 。我们强烈建议您在开始前阅读并理解前文（点击下方目录）。

[**1\. 一个简单的神经网络**](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522402&idx=1&sn=9aab727e53e1f63cff791f6e745c057c&scene=21#wechat_redirect)

[**2\. 这些模型是如何被训练的？**](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522434&idx=1&sn=b6d66d793fc3de10f6c0b0e681ca55ba&scene=21#wechat_redirect)

[**3\. 这些模型如何生成语言？**](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522606&idx=1&sn=2174b7985b02c6e16be49d5d14f5dd02&scene=21#wechat_redirect)

[**4\. 嵌入（Embeddings）**](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522678&idx=1&sn=ef6a51c26ad65233022ef104f5c4a2ac&scene=21#wechat_redirect)

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

**5**

**子词分词器**

我们了解了 **嵌入就是把字符转化为一组多维数字（向量），以方便语言模型更好的处理，及捕捉语言的结构与语义** 。

但截至目前我们一直使用 **单个字符** 作为语言的基本构建块，这种方法有它的局限性： **神经网络需要承担繁重的任务，它们需要理解一个字符序列（即单词）在彼此之间、以及与其他单词之间的关系。**

如果不用字符而是直接为 **单词** 分配嵌入向量，让神经网络预测下一个单词会怎样呢？比如可以为每个单词（如“I”、“love”、“you”等）分配一个多维向量，然后将这些单词的向量输入神经网络，神经网络则负责预测下一个单词。这样会不会更好？

如果用“ **token** ”（相信你很熟悉这个词）来代表嵌入（即分配向量）的基本单位，那么之前模型使用单个字符作为token，现在我们则提出使用整个单词作为token。

让我们来细说这个问题。

### 一、从字符到词语的进化之路

先前的语言模型确实像牙牙学语的婴儿，以单个字符为单位学习。比如处理"cat"这个词，模型需要分别处理c、a、t三个字符的向量。这种方式看似简单，却让模型承担了过重的负担——它必须自行发现"c-a-t"组合起来代表猫，还要理解"c-a-t-s"中的s表示复数。

举个具体例子，当模型看到这两个句子时：

1. The cat sat on the mat.
2. The cats ate the fish.

如果用单个字符为单位处理，模型需要从零开始发现：

- "cat"和"cats"共享前三个字符
- "sat"和"ate"都包含"at"但含义不同

这种学习方式就像要求小学生通过笔画来理解文章主旨，效率极低。

现在尝试改用整词分词：为每个单词（如"cat"、"cats"）分配独立向量。这显然可以大大简化学习任务！但也带来了新问题——比如英语有超过18万个单词，中文常用字词也超过大几万。想象一个需要管理10万种"文字基因"的模型，光是存储这些向量就要消耗海量资源！

更糟糕的是，整词分词割裂了词语间的天然联系。就像"猫"和"猫咪"在中文里明明有关联，模型却要当作完全不同的两个词来学习。这时，一个精妙的解决方案应运而生——子词分词。

### 二、子词分词的魔法原理

子词分词的智慧，在于它像拼乐高一样拆解词语。比如：

- "unhappy" → \["un", "happy"\]
- "cats" → \["cat", "s"\]
- "中文分词" → \["中", "文", "分", "词"\]（注：实际处理会更智能）

这种拆解带来了三重优势：

1. **共享零件，举一反三**  
	当模型学会"happy"表示开心，"un"表示否定，它就能自动理解"unhappy"、"unfriendly"等系列词汇，而不需要逐个记忆。这就像掌握"氵"偏旁后，能猜出"江""河""湖"都和水有关。
2. **应对生僻词**  
	遇到"ChatGPT"这种新造词时，子词分词可以将其拆解为\["Chat","G","P","T"\]，模型立即明白这与聊天程序相关。传统方法遇到新词就只能抓瞎。
3. **平衡效率与效果**  
	主流子词分词器（如BERT用的WordPiece、GPT用的BPE）通常只保留3-5万个常用子词。对比整词分词的18万词库，存储量减少80%以上，却覆盖了更广泛的语言现象。

实际案例：  
OpenAI的GPT-3使用BPE分词器后，即便面对网络俚语"LOLcats"也能游刃有余地拆解为\["LOL","cat","s"\]，既理解这是搞笑猫图，又保持语法正确性。

### 三、分词器的工程实践

一个优秀的分词器，就像语言模型的瑞士军刀，需要解决三大挑战：

**1\. 如何智能切割？**  
以"underground"为例，可能有多种切法：

- \["under","ground"\]（在地下）
- \["un","der","ground"\]（不接地）

分词器必须根据上下文选择正确拆分。这依赖统计学习：如果语料库中"under+ground"常一起出现，就优先保留这个组合。

**2\. 中文分词的特色**  
不同于英文的空格分隔，中文分词更具挑战。优秀的分词器要能区分：

- "南京市长江大桥" → \["南京","市","长江","大桥"\]
- 而不是错误拆分为\["南京","市长","江大桥"\]

**3\. 统一编码方案**  
现代分词器如SentencePiece采用统一编码：

- 将文本转换为Unicode字符
- 统计高频字符组合，逐步合并为子词
- 最终形成包含单字、词语、词缀的混合词表

这个过程就像制作压缩包——保留高频模式，舍弃低频组合，在压缩率与信息完整性间找到最佳平衡。

当我们把嵌入（embeddings）和子词分词（subword tokenization）结合起来，一个模型大体上可能是下面这样的，相比之前的区别是：

**输入输出向量不再以单个字符来匹配生成，也不是以完整的单词(word)为单位，而是以子词（subword）为单位，这里的“单位”也就是我们熟知的“Token”。**

![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae5YEjWkKib54te7RVicDz6fAaxCuJYBtHOH3ibaCGQNj4JcPuTnthId0lnYJpjHUiamthl7icx0CtQ3FTg/640?wx_fmt=png&from=appmsg#imgIndex=6)

图片来自作者原文

### 最后：

从结绳记事到甲骨刻字，人类一直在寻找记录语言的最佳方式。子词分词器延续了这个古老智慧，用数字时代的密码本重新诠释语言本质。当我们将"人工智能"拆解为\["人工","智能"\]时，不仅为机器找到了理解语言的钥匙，也在提醒自己： **最复杂的智慧，往往始于对基本元素的精妙组合。**

理解了神经网络及语言模型的基础后，接下来的章节我们将开始涉及到那些让大语言模型（LLMs）具备如今这般强大能力的核心技术，敬请继续关注。

THE END

福利时间

为了帮助LLM开发人员更系统性与更深入的学习RAG应用，特别是企业级的RAG应用场景下，当前主流的优化方法与技术实现，我们编写了 **《基于大模型的RAG应用开发与优化 — 构建企业级LLM应用》** 这本长达 **500页的开发与优化指南** ，与大家一起来深入到LLM应用开发的全新世界。

更多细节，点击链接了解

此处购买享 **5折** 优惠

**交流请识别以下名片**

![图片](https://mmbiz.qpic.cn/sz_mmbiz_jpg/wT3y8Vg9pFHz6icT5peYpicQ04tPsVcENDGnN54f56ct0UmibqRslCfoBdEOSnNBhBY6yibgMsJoopA0riaf3bYWiayA/640?wx_fmt=jpeg&from=appmsg#imgIndex=8)

LLM（大模型）原理 · 目录

继续滑动看下一个

AI大模型应用实践

向上滑动看下一个
