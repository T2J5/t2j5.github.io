---
title: "中学生就能看懂：从零开始理解LLM内部原理【十三】｜GPT 架构如何工作 ？"
date: 2026-06-22 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247525283&idx=1&sn=16962f517d65a506c94d929ef3ffd4a5&chksm=c3dfdcfff4a855e902835d685c8b06d2d3c5a8169ee304d3b4b8adefb6d4a1329c562d31f48b&cur_album_id=3801563016806531077&scene=189#wechat_redirect"
original: true
---

> 原文来源：https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247525283&idx=1&sn=16962f517d65a506c94d929ef3ffd4a5&chksm=c3dfdcfff4a855e902835d685c8b06d2d3c5a8169ee304d3b4b8adefb6d4a1329c562d31f48b&cur_album_id=3801563016806531077&scene=189#wechat_redirect

秋山墨客 AI大模型应用实践 *2026年2月13日 08:30*

![图片](https://mmbiz.qpic.cn/mmbiz_png/1m2qB7cobJopLGkJFmiasmDOqoUuQefqpTnarWInibmYNI54p4JmCBsvibc0xornLjx1ZUDhZ6HcUbrwqz4UG7ZyMhDkDVBK3VpFMB4dbQ8ZCI/640?wx_fmt=png&from=appmsg&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=0)

本篇是春节前的最后一次更新，预祝朋友们新春快乐！

本系列文章是原作者Rohit Patel的长篇雄文《Understanding LLMs from Scratch Using Middle School Math-A self-contained, full explanation to inner workings of an LLM》的学习与解读笔记。本篇是系列第十三篇。我们强烈建议您在开始前阅读并理解前文（点击下方链接）。

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

[11\. 多头注意力（Multi-head attention）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247524878&idx=1&sn=7d477c38253c397ad33c4062a8388b02&scene=21#wechat_redirect)

[12\. 位置嵌入（Positional embeddings）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247525003&idx=1&sn=330664d0d031762b86bc5707115546fe&scene=21#wechat_redirect)

13\. GPT 架构

14\. Transformer 架构

上一篇我们介绍了位置编码，这是为了让模型知道语言中“词汇”的先后。

现在，分词器、嵌入、注意力机制、残差连接、层归一化这些散落的零件我们都已经介绍（如果忘记就点上面的链接回顾）。现在需要把它们按照正确的顺序组装起来，看看传说中的 GPT 到底是怎么变成一个“会写作”的大脑的。

**1**

GPT 和 Transformer 的关系

Transformer 架构是 2017 年由 Google 团队提出的一种神经网络架构，用来处理文本等序列数据，其核心是自注意力机制。它的标准结构由编码器（Encoder）与解码器（Decoder）两部分组成，最初用于机器翻译。

它的标准架构如下（绝大部分模块之前已经学过，这里只需先抓住两点 — 编码器与解码器）：

![图片](https://mmbiz.qpic.cn/mmbiz_png/1m2qB7cobJryvgCS06Q9LmeraFCiasNDWias3gxzMLn3wtkpr4qXY6SIATByrK8ZIgIKCSjaQkcFH2yMYfXSUreUxO2DXIZQnUd5Lkt2sNfibc/640?wx_fmt=png&from=appmsg#imgIndex=35)

为了方便“中学生”理解，我们先通俗的介绍这两大组成：

- 编码器（Encoder）：擅长理解输入信息 — 把整段读懂，压缩成表示
- 解码器（Decoder）：擅长生成输出信息 — 看前面的内容，然后续写

所以，如果你只用编码器，那么你就擅长“阅读理解”；如果你只用解码器，那么你就擅长“写作文”；而两个都用的Transformer，就主要专注于“序列到序列任务”（先理解再写作，比如翻译、摘要等）。

很显然GPT选择的是“写作文”这套方案，也就是业内说的Decoder-only。规则就是 — 只能看已经写下的上文，然后顺着往下续写，也叫做 **自回归生成** 。

当然，GPT架构在Transformer架构中的解码器基础上，进行了堆叠和优化，形成了一个“专精特新”版本，专门用于语言的生成式任务，也就是我们现在看到最多的写文章、写代码、聊天对话等。

尽管 GPT 也能做翻译，但两者的原理并不一样：一个是先理解了再翻译（Transformer）；另一个只是在“续写”（GPT）。比如输入提示词“翻译\[我爱你\]为英文：“，GPT会在后面续写上了“I love you”，从而达到了“翻译”的效果。

**2**

GPT 架构总览：从“词”到“下一个词的概率”的流水线

经过前面章节的学习，你应该很清楚一个事实：

所谓“生成”（文本），本质上是预测“下一个词的概率”。

那么从输入一段文本，到“下一个词的概率”之间，这个车间的流水线是怎样的？可以大致这样描绘：

![图片](https://mmbiz.qpic.cn/mmbiz_png/1m2qB7cobJrbyicAglPaUOMR1xiaZSVa46EN6nYFDJy4F8mibByBP6DpaQXXCiaxXuAjYtm8TOgict6BibreHl3Rlvlib7ddL5XlNKZ353PCybElx0/640?wx_fmt=png&from=appmsg#imgIndex=36)

这里的绝大多数步骤之前都有文章做介绍，我们再做个简单总结：

- **分词器/嵌入** ：把一句话切成更小的“单词”，并用数字向量表示
- **位置嵌入** ：再给每个词加上位置信息，让模型知道顺序
- **多层 GPT Block** ：像多道加工工序反复处理 —
- **注意力** ：让每个词回头看看哪些词最重要，从多个角度“抓重点”
- **残差** ：叠加保留原信息，避免加工过程中把关键内容弄丢
- **归一化** ：每道工序后把数值校准到稳定范围，让模型不容易跑偏
- **前馈网络** ：对每个词的向量表示再做一次非线性的“复杂加工”，把理解变得更抽象、更好用
- **线性层** ：根据前面理解的输出向量，计算得到“词表里每个词的评分”
- **Softmax** ：把评分变成概率（也就是成为下一个词的概率），总和为 1
- **下一个词** ：按概率榜选出一个词（取最大或抽样），作为本轮的续写结果

这个架构被用于训练与推理时，又有所不同，下面我们用具体例子说明。

**3**

GPT架构的模型是如何训练出来的？

假设现在你有一堆人类的“语言”样本：

- “这朵玫瑰很漂亮。”
- “玫瑰很美。”
- “带刺的玫瑰拥有无与伦比的魅力。”
- ……（真实世界当然是海量文本）

训练 GPT 模型，本质上就是让它不断做一种题：

**给你前半句，请你猜下一个词（token）是什么。**

猜错就扣分，猜对就奖励；

扣分/奖励会反馈回来，用来调整模型的权重参数。

然后再接着“做题”... 最后你做题的准确率会越来越高。

这个过程的解释如下：

**1）准备语料：准备大量的训练文本，用来给模型“见世面”。看得越多，人类的语言规律学得越全。**

**2）分词（Tokenizer）：把文字切成 token，并编号**

- **模块** ：子词分词器
- **输入** ：训练文本（如“这朵玫瑰很漂亮”）
- **输出** ：token 序列 + token ID 序列
	示例：为了好懂，先假设切成：\[这, 朵, 玫瑰, 很, 漂亮\]
- **作用** ：把“人类文字”变成“模型能计算的编号”。

真实模型可能切得更碎/更奇怪（子词、字节片段），但不影响理解流程。

**3）构造训练题：把一句话变成很多道“填空题”**

- **模块** ：训练样本构造器
- **输入** ：训练语料的 token ID 序列 x1, x2, x3,...
- **输出** ：很多训练对（前缀 -> 下一个 token），比如：

\[这\] → 目标：朵

\[这, 朵\] → 目标：玫瑰

\[这, 朵, 玫瑰\] → 目标：很

\[这, 朵, 玫瑰, 很\] → 目标：漂亮

- **作用** ：把学语言变成很多次的“下一词预测”的练习。

注意，实际工程中通常会一次性输入整段（而不是逐个样本），让模型在每个位置同时预测下一个token，并一起计算损失来“批改”。

**4）模型初始化**

**搭 GPT 架构的模型，对其进行配置（层数、维度、注意力头数），并把权重等随机化（后续在训练中不断矫正），现在模型有了一个“空白”大脑，准备学习。**

**5）前向传播（Forward）：让输入 tokens 走完整个 GPT**

**5.1 词嵌入与位置嵌入**

- 将每个输入的token ID转换成对应的语义向量（比如 768 维）
- 通过变换，得到带顺序信息的向量（类似贴了编号的语义向量）

**5.2 多层的GPT Block**

这是处理的核心，在每层主要做两件大事（并配套残差与归一化）：

1） **多头自注意力**

- **输入** ：当前层的向量序列
- **输出** ：融合了上下文理解的向量序列
- 作用：让每个词在不偷看右边词（“遮罩”）的前提下，用多双“眼睛”（多头）从不同角度回看前文，挑出最相关的信息并融合成更懂上下文的表示。

2） **前馈网络**

- **输入** ：注意力模块处理后的向量
- **输出** ：再做一次加工后的向量（维度和原来一致，否则无法残差连接）
- 作用：把注意力汇总来的信息再在每个词自己的位置上做一次非线性“深加工”，让表示更抽象、更好用。

这里的两个子层都同时会做：Residual（残差：保留原始信息）、LayerNorm（层归一化：将数值调到一个稳定范围内）、Dropout（随机“断一些神经元”，防止模型死记硬背）。

**6）输出层：线性层 + Softmax**

- **模块** ：Linear（线性层）+ Softmax
- **输入** ：GPT Block 输出的向量序列
- **输出** ：整个词表的预测概率分布（每个 token 一个概率）。

即词表中每个 token 成为“下一个 token”的概率，比如：

P(漂亮)=0.35，P(美丽)=0.28，P(芬芳)=0.06 …

注意，此时是在训练，不是在推理，所以并不是要输出一个“正确答案”，而是要通过“批改答案”，来不断调整“参数”，让模型更聪明。

**7）算分：损失函数（Loss）**

- **模块** ：损失函数计算
- **输入** ：模型输出概率分布 + 正确答案 token
- **输出** ：一个损失值（错得越离谱，数越大）
- **作用** ：相当于告诉模型“你这题扣了多少分”。

**8）反向传播 + 更新权重**

- **模块** ：Backprop + Optimizer（如 AdamW）
- **输入** ：损失值 + 当前权重参数
- **输出** ：更新后的新权重
- **作用** ：相当于让模型反思：哪里错了，就把相关参数往正确方向调一点

**9）训练结束：最终得到了什么？**

经过上面过程的多轮训练，最后模型就会足够“聪明”。现在我们就得到了模型权重参数（Weights） — 嵌入、注意力、FFN、输出层等全套参数。

这些权重参数，就是 GPT 的“语言能力”存放的核心。

**4**

有了训练好的模型，如何做推理？

训练完以后，模型就像一个练了无数填空题的、有了底气的学生。现在我们给它一句新句子：

“花园里的玫瑰非常”

我们希望它预测： **“美丽 / 漂亮 / 迷人 ……”，模型将如何推理呢？**

推理流程其实就是训练流程的“前半段”，也就是去掉后面两步。即：

- **不计算损失（不再“改题”）**
- **不反向传播+更新权重（也不再“学习”）**

**另外，推理时还会关闭Dropout（不再随机断线）。**

**所以这里不再重复前面推理的过程（分词、嵌入、GPT Block等），只是注意在最后到达输出层、获得词表的概率分布以后，会根据策略最终输出“下一个词”：**

- 贪心策略：直接选最大概率，比如选择了“漂亮”。
- 采样策略：从前几个候选词里抽取，比如有时候选“漂亮”，有时候选“美丽”

很显然，前者更稳定一些，但是可能套路化；后者更随机一些，但更多样了（还记得大模型API常见的temperature参数吗）。

输出一个 token 后，模型就把它拼到原句后面，继续下一轮预测，于是你看到它“一词一词往下写”：

花园里的玫瑰非常美丽

花园里的玫瑰非常美丽动人

花园里的玫瑰非常美丽动人，层层叠叠

花园里的玫瑰非常美丽动人，层层叠叠的花瓣

......

所以总结推理过程就是：

GPT 推理 = 输入走一遍前向传播 → 得到下一个词概率 → 选一个词输出

**5**

**GPT 架构的进化：混合专家（MoE）**

GPT 的“主骨架”这些年其实变化不大： **还是 Decoder-only + 自回归** 。升级更多来自“怎么训练更强、怎么推理更省”的工程进化，其中最典型的是MoE（混合专家）模型。

你可以这样通俗的理解 MoE：

- **一个超大模型就像一个“全能老师”，每回答一个问题都要调动全部脑细胞，很强但很贵。**
- MoE 则在模型的前馈网络阶段做了改造，把它拆分成了一排“专科老师”（比如逻辑专家、代码专家、文学专家）。每次有输入进来，内部的“路由器”会判断并只激活少数几个最相关的专家来处理。这样一来，模型的总知识量可以变得极其庞大，但每次推理耗费的算力却大大降低了。
	当然，在训练阶段，MoE模型不仅需要学出“权重”，还需要学“怎么分流”。

**6**

小结

最后，我们用三句话来帮你总结本篇的内容：

- GPT 就是 Transformer 的解码器用法，专注语言的预测续写
- 训练过程：通过做海量的“下一词填空题”，来不断调整权重，让预测更准
- 推理过程：把输入送入模型，预测出下一个词，拼到结尾，再继续下一轮

下一篇是这个系列的最后一篇，我们将把另一半的Encoder部分补齐，了解完整的 Transformer 架构。欢迎继续关注。

END

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
