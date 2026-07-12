---
title: "中学生就能看懂：从零开始理解LLM内部原理【十一】｜多头注意力(Multi-head Attention)"
date: 2026-06-22 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247524878&idx=1&sn=7d477c38253c397ad33c4062a8388b02&chksm=c3dfdd52f4a85444e9c964ac0f93ec3b2edd49e0e7191bd3f3efc500b5188395f30a6f040a7e&cur_album_id=3801563016806531077&scene=189#wechat_redirect"
original: true
---

> 原文来源：https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247524878&idx=1&sn=7d477c38253c397ad33c4062a8388b02&chksm=c3dfdd52f4a85444e9c964ac0f93ec3b2edd49e0e7191bd3f3efc500b5188395f30a6f040a7e&cur_album_id=3801563016806531077&scene=189#wechat_redirect

曾经的毛毛 AI大模型应用实践 *2026年1月1日 09:00*

新

年

快

乐

Happy New Year

各位 AI 人，2026新年快乐！

有粉丝私信催更这个系列，今天我们就续上一篇。

本系列文章是原作者Rohit Patel的长篇雄文《Understanding LLMs from Scratch Using Middle School Math-A self-contained, full explanation to inner workings of an LLM》的深度学习与解读笔记。本篇是系列第十一篇。我们强烈建议您在开始前阅读并理解前文（点击下方目录）。

[1\. 一个简单的神经网络](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522402&idx=1&sn=9aab727e53e1f63cff791f6e745c057c&scene=21#wechat_redirect)

[2\. 这些模型是如何被训练的？](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522434&idx=1&sn=b6d66d793fc3de10f6c0b0e681ca55ba&scene=21#wechat_redirect)

[3\. 这些模型如何生成语言？](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522606&idx=1&sn=2174b7985b02c6e16be49d5d14f5dd02&scene=21#wechat_redirect)

[4\. 嵌入（Embeddings）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522678&idx=1&sn=ef6a51c26ad65233022ef104f5c4a2ac&scene=21#wechat_redirect)

[5\. 子词分词器（Sub-word tokenizers）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522913&idx=1&sn=04c78cfb70657d17bff5818aacf82717&scene=21#wechat_redirect)

[6\. 自注意力机制（Self-attention）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523028&idx=1&sn=a41b5956383719d701c440e745bbf1d5&scene=21#wechat_redirect)

[7\. Softmax](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523284&idx=1&sn=572c4cc3e1d1840ddb9caef1f52c091c&scene=21#wechat_redirect)

[8\. 残差连接（Residual connections）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523644&idx=1&sn=0c33043edbf8f4dd8bf86c8227663de6&scene=21#wechat_redirect)

[9\. 层归一化（Layer Normalization）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523710&idx=1&sn=ce74e9c32a5a53bde3db98a39b108bab&scene=21#wechat_redirect)

[10\. Dropout](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523874&idx=1&sn=18a0dd0246ef2cefa0d513a878c54679&scene=21#wechat_redirect)

11\. 多头注意力（Multi-head attention）

12\. 位置嵌入（Positional embeddings）

13\. GPT 架构

14\. Transformer 架构

PART 01

单头注意力机制的局限性

在前面的文章中，我们学习过自注意力机制（self-attention，参见第6篇）。在自注意力环节中，模型会为输入序列中的每个词计算一个注意力输出。也就是：

让模型在读到一个词时，能去看看句子里的其他词，算出它们之间的相关性（权重），从而更好地理解当前的语境。

然而， 单头（Single-head Attention） 的注意力机制（即只有一个注意力“头”来参与计算）也存在着一些局限性：它在每次计算中只能集中于一种关系或模式 。

一个“头”（head）对应一套独立的用来计算Q、K、V的投影参数（第6篇中的W <sub>q</sub>,W <sub>k</sub>,W <sub>v</sub> ）；这个参数也是在模型训练过程中逐步学习出来（随机初始化）。

但自然语言的一句话里往往同时存在多种不同的联系或特点，一个注意力头可能很难同时关注到它们；它往往会把注意力集中在最显著的一两个关联上，而忽略其他潜在有用的信息。

我们举个直观的语言例子来理解：

“苹果发布了新手机，因为它很好吃。”

这句话本身就是故意设下的“歧义陷阱”（甚至带点语病）：当我们读到“它”时，模型需要理解“它”到底指向谁。

在这一刻，文本里至少同时存在两类不同的线索：

- 视角 A（结构/邻近线索）：

“它”离“手机”更近，很多时候语言里的指代会倾向于指向最近出现的名词，于是“手机”会成为一个强候选。

- 视角 B（语义/搭配线索）：

“好吃”通常用来形容食物或水果，而不是电子产品。这个词本身会把“它”的指代强烈拉向“苹果（水果）”这一语义解释。

![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae5NARNtSnDPe9xP9EG91Z9HjvIvTg6RicnmnhkcIMygeAV4oj7KcUFcX3GYjwmT3xEqUrzKGTAQH9A/640?wx_fmt=png&from=appmsg#imgIndex=8)

如果只有单头注意力 ，模型在一次注意力计算里往往会更“偏向”其中一种关联：要么抓住“最近的名词”（结构线索），要么主要抓住“好吃”带来的语义线索。这样就容易出现“看到了一个线索，却忽略了另一个线索”的情况。

因此，单头注意力的局限就可以理解为：

它更像只有一双观察的“眼睛”，面对同时存在多种关联的句子时，很难同时兼顾语法、语义、指代、情感等多种维度的信息。

PART 02

多头注意力：多双“眼睛”看问题

所谓 多头注意力机制 （Multi-head Attention），顾名思义，就是引入多个并行的注意力“头”，让模型可以从多种角度对信息进行关注和处理。每一个”头“都是一个独立的自注意力单元，它们各有一套参数，但面对的是相同的输入序列。

![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae5NARNtSnDPe9xP9EG91Z9HhLroDuVCZtQ0cxbabN2zia9m5awrf6gKiaC3tpPj6dEkaJkIN6Zf9n1g/640?wx_fmt=png&from=appmsg#imgIndex=11)

你可以把这种机制想象成老师让不同的小组去阅读同一篇文章：

每个小组分别总结文章的不同方面。一个小组关注文章的中心思想，另一个小组关注细节事实，还有一个小组也许关注文章的行文结构。最后老师把各组的汇报综合起来，就对文章有了全面的理解。

1. 每个注意力头接收相同的输入（也就是序列的表示，比如词嵌入向量），但是由于每个“头”有不同的参数，所以会以略有差异的方式计算注意力；
2. 每个“头”会输出自己基于某种关注模式得到的结果（可以理解为该头“认为”哪些信息很重要的一个表示向量）；
3. 最后把所有头的结果拼接起来（concatenate，将多个向量首尾相连，形成一个更长的向量）。这样一来，模型就同时获得了来自多个角度的见解。

所以，多头注意力机制就是：

通过“分工合作”，模型不再只有一双“眼睛”，而是拥有了多双“眼睛”，能同时捕捉到自然语言中的局部细节和全局逻辑。

PART 03

深入细节：如何实现"分头"行动

既然输入给每个“头”的数据都是一样的，为什么它们能学到不同的东西呢？答案就在于上文提到的：每个“头”各有一套独立的参数。

【独立的投影矩阵】

在单头注意力中，我们有Wq,Wk,Wv三个矩阵把词向量进行变换。而在多头注意力中，每个头都有自己专属的一套 Wq,Wk,Wv矩阵。

就像每个人戴着不同颜色的眼镜看同一幅画：

- 红镜片（头 1）：只看到了画里的红色元素（比如语法特征）。
- 蓝镜片（头 2）：只看到了蓝色元素（比如长距离依赖）。

虽然输入一样，但经过不同的矩阵变换后，每个头关注的重点就完全不同了。

【分割与拼接（Splitting & Concatenation）】

为了不增加计算负担，通常不会把计算量翻倍，而是把原来的“大向量”切分成几个“小向量”。

![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae4XKC5QBnjkaQTBBkjsibl34JXu3Cu59t4d73wNPXuD7I7u9Zw1bXKKzRIHJWmIStKSX5qvkgDLRnw/640?wx_fmt=png&from=appmsg#imgIndex=17)

假设我们的词向量长度（维度）是 256。我们决定使用 4 个头。我们不会让每个头都去处理 256 维的数据，而是把这 256 维切成 4 份，每份 64 维。

- 头 1 处理第 1 份 64 维子空间；
- 头 2 处理第 2 份 64 维子空间；
- ...以此类推。

每个头算出自己的结果（一个 64 维的向量）后，在最后一步把它们首尾相连（拼接）回去：

64 + 64 + 64 + 64 = 256

这就变回了原来的长度。最后，通常还会再加上一层线性变换（Wo矩阵，这个在单头注意力中通常不存在），相当于把拼接后的信息进行一次“融合”，整理成最终输出。

所以：

多头注意力并没有让参数量爆炸。它通过“切分维度”的巧妙设计，在保持总计算量基本不变的情况下，极大地丰富了模型理解问题的角度。

PART 04

多头注意力的威力：表达能力的巨大提升

引入多头注意力是 Transformer 架构核心的突破之一。它的威力主要体现在：

远近兼顾（捕捉不同距离的依赖）

短程关注：有的“头”专门盯着相邻的词（比如“在那遥远的”后面接“地方”）。

长程关注：有的“头”专门盯着相隔很远的词（比如文章开头的“张三”和文章结尾的“他”），模型不会“读了后面忘前面”。

特征分离（专家分工）

研究人员在分析训练好的 BERT 或 GPT 模型时发现，常常观察到不同的“头”自动学会了不同的技能：

有的“头”成了“语法专家”，专门盯着动词和宾语。

有的“头”成了“翻译专家”，在机器翻译任务中关注源语言和目标语言的对应词。这种自发的专家分工，让模型变得更强大。

增强鲁棒性（容错能力）

就像“不要把鸡蛋放在同一个篮子里”。如果某一个“头”判断失误了（比如没看懂某个双关语），其他“头”的信息还可以纠正它。从集成学习的角度看，这就像在一个模型内部训练了多个小模型，大家投票决定，结果自然更稳健。

多头注意力虽然强大，但它也不是说头的数量越多越好：太少了可能信息提取不充分，太多了则可能出现部分头学到的东西重复、闲置，甚至增加计算开销但收效甚微。实践中，常见的 Transformer 模型会根据总的模型尺寸来设定头数。总的原则是，让每个头都有明确的“分工”，又不过度浪费模型容量。

最后我们总结下：

多头注意力机制就是： 看待世界，视角越丰富，理解越深刻。

单“头”像是一双眼睛，容易有盲区。

多“头”像配合默契的多双眼，能同时捕捉语法、语义、长短距离等多种信息。

通过切分维度和独立参数 ，可以在不显著增加计算量的前提下，让模型拥有了理解复杂人类语言的能力。

下一篇，我们将介绍 Transformer 中的位置嵌入（Positional Embeddings）。注意力机制本身对词序不敏感，模型需要一种办法了解“句子中单词的顺序”究竟如何表达 — 这是位置嵌入要解决的问题。敬请期待！

喜欢就关注哦

![Image](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae6VuNmbv1MlsIMiaRz4fOcmXTVTs2fD0g1LlNiaehicZjsPQXasVBBxCuTicJTiaZs2iaKeiafRsJ8ic79mRQ/640?wx_fmt=png&from=appmsg&wxfrom=5&wx_lazy=1&tp=webp#imgIndex=16)

动动小手点个赞

![Image](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae6VuNmbv1MlsIMiaRz4fOcmXbI7b33rXz7c0fvK1DkQ6LJsrAEpeQiaDrqd9g1pRANd80phV6pxSgEA/640?wx_fmt=png&from=appmsg&wxfrom=5&wx_lazy=1&tp=webp#imgIndex=17)

点在看最好看

![Image](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae6VuNmbv1MlsIMiaRz4fOcmXrRqjVuIZCw8qzKZibm3e82iaeyib9PYTib0I7x777YwOOBr1Dun4wnQxyw/640?wx_fmt=png&from=appmsg&wxfrom=5&wx_lazy=1&tp=webp#imgIndex=18)

加入公众号交流群（说明来意）

![图片](https://mmbiz.qpic.cn/sz_mmbiz_jpg/wT3y8Vg9pFHz6icT5peYpicQ04tPsVcENDGnN54f56ct0UmibqRslCfoBdEOSnNBhBY6yibgMsJoopA0riaf3bYWiayA/640?wx_fmt=jpeg&from=appmsg&wxfrom=5&wx_lazy=1&randomid=iani7tmv&tp=webp#imgIndex=21)

LLM（大模型）原理 · 目录

继续滑动看下一个

AI大模型应用实践

向上滑动看下一个
