---
title: "中学生就能看懂：从零开始理解LLM内部原理【十四，大结局】｜理解 Transformer 架构"
date: 2026-06-22 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247525666&idx=1&sn=d48e9a4da9526b079d2a45891b1b6540&chksm=c3dfda7ef4a853687c7bf88872c1f8b060a10b14a53a1338e63f83f242867e5e79d6aaed60bf&cur_album_id=3801563016806531077&scene=189#wechat_redirect"
original: true
index_img: /img/covers/ai.svg
banner_img: /img/covers/ai.svg
updated: 2026-07-12
---

> 原文来源：https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247525666&idx=1&sn=d48e9a4da9526b079d2a45891b1b6540&chksm=c3dfda7ef4a853687c7bf88872c1f8b060a10b14a53a1338e63f83f242867e5e79d6aaed60bf&cur_album_id=3801563016806531077&scene=189#wechat_redirect

秋山墨客 AI大模型应用实践 *2026年5月4日 09:00*

点击上方蓝字加入我们

筒子们，五一快乐！

终于更新到最后一篇，希望你还有耐心看完。

本系列文章是原作者Rohit Patel的长篇雄文《Understanding LLMs from Scratch Using Middle School Math-A self-contained, full explanation to inner workings of an LLM》的学习与解读笔记。本篇是系列第十四篇。我们强烈建议您在开始前阅读并理解前文（点击下方链接）。

[1\. 一个简单的神经网络](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522402&idx=1&sn=9aab727e53e1f63cff791f6e745c057c&scene=21&token=1280853474&lang=zh_CN#wechat_redirect)

[2\. 这些模型是如何被训练的？](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522434&idx=1&sn=b6d66d793fc3de10f6c0b0e681ca55ba&scene=21&token=1280853474&lang=zh_CN#wechat_redirect)

[3\. 这些模型如何生成语言？](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522606&idx=1&sn=2174b7985b02c6e16be49d5d14f5dd02&scene=21#wechat_redirect)

[4\. 嵌入（Embeddings）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522678&idx=1&sn=ef6a51c26ad65233022ef104f5c4a2ac&scene=21#wechat_redirect)

[5\. 子词分词器（Sub-word tokenizers）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522913&idx=1&sn=04c78cfb70657d17bff5818aacf82717&scene=21#wechat_redirect)

[6\. 自注意力机制（Self-attention）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523028&idx=1&sn=a41b5956383719d701c440e745bbf1d5&scene=21#wechat_redirect)

[7\. Softmax](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523284&idx=1&sn=572c4cc3e1d1840ddb9caef1f52c091c&scene=21#wechat_redirect)

[8\. 残差连接（Residual connections）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523644&idx=1&sn=0c33043edbf8f4dd8bf86c8227663de6&scene=21#wechat_redirect)

[9\. 层归一化（Layer Normalization）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523710&idx=1&sn=ce74e9c32a5a53bde3db98a39b108bab&scene=21#wechat_redirect)

[10\. Dropout](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523874&idx=1&sn=18a0dd0246ef2cefa0d513a878c54679&scene=21#wechat_redirect)

[11\. 多头注意力（Multi-head attention）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247524878&idx=1&sn=7d477c38253c397ad33c4062a8388b02&scene=21&token=737693903&lang=zh_CN#wechat_redirect)

[12\. 位置嵌入（Positional embeddings）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247525003&idx=1&sn=330664d0d031762b86bc5707115546fe&scene=21#wechat_redirect)

[13\. GPT 架构](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247525283&idx=1&sn=16962f517d65a506c94d929ef3ffd4a5&scene=21#wechat_redirect)

14\. Transformer 架构

上一篇我们讲了 GPT。GPT 最容易理解的地方在于，它本质上是一个会续写的模型 — 把文本生成拆成了一连串“预测下一个词”的过程。

但GPT 并不是完整的 Transformer — GPT 采用的是 Transformer 的 Decoder-only 架构（仅解码器），把它发展成了一个非常擅长生成文本的系统。而 Transformer 的标准结构，其实由两部分组成：Encoder 和 Decoder。

这里面的区别，就是本篇的重点。

**1**

**为什么会需要完整的 Transformer？**

我们把 GPT 比作一个正在考场上写作文的学生： **它只能看见自己已经写下的内容，然后顺着逻辑继续往下编。你可以让它描写玫瑰、写 Python 代码、或者和它聊天，它都能通过“预测下一个词”来完成。**

但我们回到 Transformer 刚被发明时的核心任务： **机器翻译** 。假设要把一句英文翻译成中文：

`The rose is very beautiful.`

如果用 GPT 的思路，你只能把题目和答案拼在一起，给它这样一个提示词：

`请把英文“The rose is very beautiful.”翻译成中文：`

然后让 GPT 继续往下续写：

![图片](https://mmbiz.qpic.cn/sz_mmbiz_png/1m2qB7cobJo4GiaGtOia90AZM1FL17Aiac1YYINfRfdZ36JVia8UzN43kpBJ3vJMgsg7z9h87I262gI5jqwdddbvmXzR9So3nRRibpC7O1bfdXzY/640?wx_fmt=png&from=appmsg#imgIndex=3)

这套方法确实能用（如今的主流大语言模型就是这么做的）。但它也确实显得不够优雅，最开始的主要问题是：

1. **上下文挤占** ：如果原句特别长（比如一大篇关于玫瑰的英文说明），前面输入的原题信息，可能会被后面生成的中文给“挤出去”。
2. **任务混杂** ：模型必须在同一个流水线里，既要处理英文的语法（读懂原文），又要处理中文的逻辑（输出译文），还要自己领悟“哪些是原文、哪里开始是输出的结果，哪里要被重点参考”等等。

所以，Transformer 最初采用了一种分工更明确、更清晰的思路：

**不把“理解原文”和“生成译文”混在一起。先用一个模块把原文彻底读懂，再用另一个模块根据理解的结果写出答案。**

这就是 Transformer 的基本思想： **Encoder 负责读懂，Decoder 负责生成。**

**2**

完整 Transformer：左脑读懂，右脑生成

上篇我们已经看过完整的 Transformer 架构图：

![Image](https://mmbiz.qpic.cn/mmbiz_png/1m2qB7cobJryvgCS06Q9LmeraFCiasNDWias3gxzMLn3wtkpr4qXY6SIATByrK8ZIgIKCSjaQkcFH2yMYfXSUreUxO2DXIZQnUd5Lkt2sNfibc/640?wx_fmt=png&from=appmsg&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=35)

别被图吓到，拆开来看全是我们前 13 篇介绍过的主题：嵌入、位置嵌入、多头注意力、残差连接、层归一化等。

如果用最易懂的语言来解释 Transformer 的流水线：

**输入内容先进入 Encoder，被加工成一组“理解笔记”；随后 Decoder 一边看着自己已经写下的部分，一边查阅“笔记”，向后预测，直到生成最终答案。**

继续用上面的机器翻译的例子。

**Encoder 过程就像一个读题的学生：** 它先把 `The rose is very beautiful 这句话从头到尾完整看一遍，把句子里词与词的关系、重点（比如 rose 是主语，beautiful 是核心形容词）整理成一份包含深度语义的“向量笔记”。`

**Decoder 则像答题的学生：** 它开始生成中文。每写下一个词（比如刚写完“ `玫瑰”` ），它都会回头参考两部分信息：

1. 自己已经写了什么？（我刚写了“ `玫瑰”` ）
2. 读题学生的“理解笔记”里关键信息是什么？（比如，原句后面说的是 `very beautiful ` ）

于是 Decoder 自信地输出下一个词： `非常` 。

**3**

编码器（Encoder）：全局视角的阅读理解

先看左边的 Encoder。它的任务很好懂： **把输入的原文序列读懂。**

在输入英文“ `The rose is very beautiful”` 后，Encoder 的过程和 GPT 模型的前向传播过程相似：

- 第一步， **分词与嵌入** ，再加上 **位置嵌入** ，让每个词变成带有顺序信息的数字向量。
- 接下来，进入多层的 Encoder Block 进行加工。这里的重点是多头注意力机制与前馈网络（以及每个子层都会做的残差、层归一化等），和 GPT 训练的前向传播类似，但又有一个重要的区别： **Encoder 里的自注意力机制是不加“遮罩（Mask）”的。**

GPT 模型训练时的“遮罩”是什么？

遮罩可以理解成注意力机制里的一个“挡板”。在 GPT 训练时，为了提高效率，通常会把一整句话送进模型，让它在每个位置同时预测下一个 token。比如输入“花园里的玫瑰非常美丽”，模型要学会在“玫瑰”后面预测“非常”，也要在“非常”后面预测“美丽”。如果不加遮罩，模型在预测时就能直接偷看到右侧的真实答案。所以就需要“挡住”每个位置右边的未来 token。

![图片](https://mmbiz.qpic.cn/sz_mmbiz_png/1m2qB7cobJowxiabophsf8XERdSWBbQicicBmBa2y5zdpZUTeafawvJ8UYicic626apn3kRW94ykcicqWvDrpBXibSxIpO6pibTNGt4DDJ8yY2iaSQmU/640?wx_fmt=png&from=appmsg#imgIndex=5)

这是因为 Encoder 是在做“阅读理解”。当你读一句完整的英文时，你当然可以一眼看到整句话，而不需要假装看不见后面的词，比如 `rose` 可以同时和 `beautiful ` 交换信息，互相理解。

- 经过多层处理，最开始的“词向量”，就变成了一组 **深度融合了整句上下文语境的“理解向量”** 。就好比学生彻底理解了题目，形成了清晰的“观察笔记”。

**4**

解码器（Decoder）：带“交叉注意力”的开卷考试

接着来看右边的 Decoder 如何“答题”。

它的任务是：根据已经翻译生成的中文内容，以及 Encoder 提供的“理解笔记”，继续预测下一个 token。

它有三层核心结构：

- **第一层：带遮罩的自注意力。如上文所说，** Decoder 是在逐词生成答案，所以必须严格从左到右。
- **第二层：交叉注意力。**
	这是完整 Transformer 与 GPT **最大的区别** ！
	如果说第一层的自注意力是 Decoder 内部事务 — 一段话内部的词“互相看和找关系“；那么这一层就是在翻看 Encoder 的理解笔记。 过程类似于：
	Decoder 拿着当前写到的进度去问 Encoder： *“我现在写到“ `玫瑰非常”` 了，英文原句里接下来最关键的信息是什么？”* Encoder 的笔记反馈说，原句对应的重点是 `beautiful` 。于是 Decoder 吸收了这个关键提示。

当然，真实的注意力机制是很复杂的，涉及到著名的 Key、Value、Query 三者的复杂计算，你可以回顾： [中学生就能看懂：从零开始理解LLM内部原理【六】｜什么是“自注意力”？](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523028&idx=1&sn=a41b5956383719d701c440e745bbf1d5&scene=21#wechat_redirect)

- **第三层：前馈网络与输出。** 注意力机制负责“找信息”，前馈网络则负责“消化信息”，进行深度的非线性加工。最后通过线性层和 Softmax 算出词表里每个词的概率。

在例子中，因为查了笔记，此时 P(“美丽”) 的概率就会远高于其他词。因此 Decoder 会选择输出下个词：“美丽”。

**5**

完整的 Transformer 是如何训练出来的？

现在我们再来看看完整的 Transformer 又是怎么被训练出来的。假设我们的训练集里有海量的花朵双语翻译语料：

“The red rose blooms.” → “红玫瑰绽放了。”

“I love daisies.” → “我爱雏菊。”

训练过程就是让它做大量的“翻译填空题”：

1. **准备双语语料** ：把英文和中文都切成 token。
2. **Encoder 读题** ：比如把英文 `The red rose blooms.` 输入给 Encoder，得到一组代表原句语义的“理解向量”。
3. **Decoder 练题** ：Decoder 开始逐个词生成中文。
	\- 输入 `<开始符>` ，目标：预测 `红`
	\- 输入 `<开始符> 红` ，目标：预测 `玫瑰`
	\- 输入 `<开始符> 红 玫瑰` ，目标：预测 `绽放`
4. **不断查笔记与批改** ：Decoder 在每一步预测时，都会通过“交叉注意力”机制去参考 Encoder 的“理解向量”。如果最后预测错了（比如把“绽放”预测成了“枯萎”）， **损失函数** 就会给它扣分。
5. **反向传播更新权重** ：模型根据扣分情况，反向调整内部的权重参数。

经过千万次这样“读题-试答-批改-调整”的循环，模型终于学会了如何把一种语言的逻辑，完美映射到另一种语言上！

**6**

但为什么 GPT 成为了主流大语言模型架构？

讲到这里，你可能会有一个很自然的疑问： **既然完整 Transformer 的“左右脑分工”这么清晰优雅，为什么今天很多主流大语言模型反而采用了 Decoder-only，也就是 GPT 这条路线呢？**

原因在于 GPT 的“续写”模式足够统一。它把翻译、摘要、问答、写代码、聊天这些看起来不同的任务，都改写成同一种形式：

- **翻译** ：“请把【这朵玫瑰很美】翻译成英文：” -> `续写`
- **摘要** ：“请总结这段关于玫瑰种植的内容：” -> `续写`
- **代码** ：“请写一个 Python 函数画一朵玫瑰：” -> `续写`
- **问答** ：“问题：玫瑰需要多少水分？ 回答：” -> `续写`
- `......`

这正是 GPT 路线最强大的地方。模型训练时不需要为每种任务设计不同结构，只需要长期练习同一个基本动作： **预测下一个 token** 。

这条路线有巨大的工程优势：Decoder-only 架构简单、通用、非常适合规模化训练；且数据来源广，网页、书籍、代码、对话都可以变成“下一词预测”的训练材料，不需要为每种任务单独设计输入输出结构。当模型越大，见过的语言模式越多，就越能把“续写”这件事变成一种通用能力。

所以，Encoder-Decoder 像一套分工清晰的系统，但 Decoder-only 更像一台可以被大规模训练放大的通用生成引擎，后者工程上更容易统一、扩展和放大。这也是 GPT 路线成为当前主流 LLM 重要方向的原因。

不过，理解完整的 Transformer 能帮我们看清不同模型的底层关系 — 它们只是 Transformer 这套底层架构的不同装配方式：

![图片](https://mmbiz.qpic.cn/mmbiz_png/1m2qB7cobJpIaNiagbBVxqE7qciaB27p8MZwmKMib19VeFY347mfbYzConXqibHuBDeGHCxqooicWKT4xrPa773o9oxcOqRmL2LlGun1tLo2mzyw/640?wx_fmt=png&from=appmsg#imgIndex=6)

在一些需要严谨对齐的“输入到输出”转换任务中，完整的 Transformer 仍然可以得到应用。

**7**

系列收官：从一个神经元到 LLM，我们到底学会了什么？

最后，我们用三句话总结本篇的核心：

- **Transformer 有左右脑** ：左边 Encoder 负责全局读懂输入，右边 Decoder 负责逐字生成输出。
- **交叉注意力是核心桥梁** ：Decoder 在生成续写时，会不断回头查阅 Encoder 整理的“理解笔记”。
- GPT 是目前主流 LLM 架构：因为它架构简单、适合规模化，能够用同一种形式适应不同的任务。

到这里，我们《中学生就能看懂：从零开始理解LLM内部原理》系列就完结了。

回头再看：最开始的一个预测“花朵还是叶子”的神经网络，无非就是输入数字，经过加权求和，最后输出结果。

后来，为了让模型认识人类的语言，装上了 **分词器** 和 **嵌入；** 为了让模型懂得词和词之间的关系，发明了 **自注意力机制；** 为了让模型知道词的先后顺序，加上了 **位置嵌入；** 为了让几百层的神经网络不崩溃，使用了 **残差连接** 和 **层归一化，最后再用线性层和 Softmax，把内部向量变成下一个 token 的概率。**

最后，把这些零件拼成了 **GPT** 和 **Transformer。而模型的训练过程就是：通过损失函数和反向传播不断调整权重的过程。**

理解了这条主线，以后再看到新的 LLM 概念，你可以判断它到底是在改进分词、改进注意力、还是扩展上下文、优化训练、提升推理效率等。

这就是本系列希望达到的目标：不是让你去理解复杂的算法或公式，而是帮你在脑子里建立一张 LLM 内部结构的地图。

感谢你一路读到这里。如果你觉得有所收获，请继续支持我们。

END

喜欢就关注哦

![Image](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae6VuNmbv1MlsIMiaRz4fOcmXTVTs2fD0g1LlNiaehicZjsPQXasVBBxCuTicJTiaZs2iaKeiafRsJ8ic79mRQ/640?wx_fmt=png&from=appmsg&wxfrom=5&wx_lazy=1&tp=webp#imgIndex=16)

动动小手点个赞

![Image](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae6VuNmbv1MlsIMiaRz4fOcmXbI7b33rXz7c0fvK1DkQ6LJsrAEpeQiaDrqd9g1pRANd80phV6pxSgEA/640?wx_fmt=png&from=appmsg&wxfrom=5&wx_lazy=1&tp=webp#imgIndex=17)

点在看最好看

![Image](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae6VuNmbv1MlsIMiaRz4fOcmXrRqjVuIZCw8qzKZibm3e82iaeyib9PYTib0I7x777YwOOBr1Dun4wnQxyw/640?wx_fmt=png&from=appmsg&wxfrom=5&wx_lazy=1&tp=webp#imgIndex=18)

公众号私信，可加入本号交流群

LLM（大模型）原理 · 目录

继续滑动看下一个

AI大模型应用实践

向上滑动看下一个
