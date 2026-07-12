---
title: "中学生就能看懂：从零开始理解LLM内部原理【九】｜ 层归一化：神经网络的稳定器"
date: 2026-06-22 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523710&idx=1&sn=ce74e9c32a5a53bde3db98a39b108bab&chksm=c3df2222f4a8ab3426453135faaad50e6b0da96b19878be1b23a364a6609a9c7bbf699774487&cur_album_id=3801563016806531077&scene=189#wechat_redirect"
original: true
---

> 原文来源：https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523710&idx=1&sn=ce74e9c32a5a53bde3db98a39b108bab&chksm=c3df2222f4a8ab3426453135faaad50e6b0da96b19878be1b23a364a6609a9c7bbf699774487&cur_album_id=3801563016806531077&scene=189#wechat_redirect

秋山墨客 AI大模型应用实践 *2025年5月30日 08:30*

![图片](https://mmbiz.qpic.cn/mmbiz_gif/u3MoWWHj8ZZIXCF5n0xEibBAwpZ9L0OqUDzddf1C36qia2pBm4uKAU8wlibzNYChLmLKicKo2Cp3yqteF5BYsUj0Vg/640?wx_fmt=gif&wxfrom=5&wx_lazy=1&tp=webp#imgIndex=0)

点击上方蓝色字体，关注我们

本系列文章是原作者Rohit Patel的长篇雄文《Understanding LLMs from Scratch Using Middle School Math-A self-contained, full explanation to inner workings of an LLM》的深度学习与解读笔记。 **本篇是系列第九篇** 。我们强烈建议您在开始前阅读并理解前文（点击下方目录）。

**[1\. 一个简单的神经网络](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522402&idx=1&sn=9aab727e53e1f63cff791f6e745c057c&scene=21#wechat_redirect)**

**[2\. 这些模型是如何被训练的？](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522434&idx=1&sn=b6d66d793fc3de10f6c0b0e681ca55ba&scene=21#wechat_redirect)**

**[3\. 这些模型如何生成语言？](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522606&idx=1&sn=2174b7985b02c6e16be49d5d14f5dd02&scene=21#wechat_redirect)**

**[4\. 嵌入（Embeddings）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522678&idx=1&sn=ef6a51c26ad65233022ef104f5c4a2ac&scene=21#wechat_redirect)**

**[5\. 子词分词器（Sub-word tokenizers）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247522913&idx=1&sn=04c78cfb70657d17bff5818aacf82717&scene=21#wechat_redirect)**

**[6\. 自注意力机制（Self-attention）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523028&idx=1&sn=a41b5956383719d701c440e745bbf1d5&scene=21#wechat_redirect)**

**[7\. Softmax](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523284&idx=1&sn=572c4cc3e1d1840ddb9caef1f52c091c&scene=21#wechat_redirect)**

**[8\. 残差连接（Residual connections）](https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247523644&idx=1&sn=0c33043edbf8f4dd8bf86c8227663de6&scene=21#wechat_redirect)  
**

**9\. 层归一化（Layer Normalization）**

**10\. Dropout**

**11\. 多头注意力（Multi-head attention）**

**12\. 位置嵌入（Positional embeddings）**

**13\. GPT 架构**

**14\. Transformer 架构**

信息在进入神经网络后，经过了N层形如流水线一样的模块（比如自注意力层）的不断加工后，信息就很容易不太稳定。残差连接把原始信息合并到输出以增强信息传播的准确性，今天介绍另一个神经网络中重要的“稳定器”：层归一化。

**01**

两个重要的数学概念

层归一化的理解需要我们先回顾中学的两个重要数学概念及其应用意义：

【标准差】

- 衡量一堆数字分散程度的指标。数字们离平均值越远、越分散，标准差越大；数字们越靠近平均值、越集中，标准差越小。
- **标准差怎么算？（忘记的可以请教家里的中学生）**
1. 算出每个数字与平均值的差（离均差）。
	2. 把这些差 **平方** （消除负号，并放大偏差）。
	3. 计算这些“差平方”的 **平均值** （这叫做方差）。
	4. 对方差再 **开平方根** （把单位变回原样）。
- 比如：一组考试成绩20，50，60，80，90，平均分60。
- 离均差计算：-40，-10，0，20，30
	- 方差 = (1600+100+0+400+900）/ 5 = 600
	- 标准差 = √600 ≈ 24.49。这说明这些同学的分数在60分上下24.49分左右波动。

**【标准分】**

- 衡量一个具体数字偏离平均值多少。公式：(具体数字 - 平均值) / 标准差。
- 作用是消除了原始数据的单位和量级影响，纯粹表示它在群体中的相对位置。
- **例子（接上）：上面5个同学的标准分分别为-1.63,-0.41,0,0.82,1.22，这说明20分的同学水平明显低于平均水平；而90分的同学则相反。**

为什么需要用标准分？

简单说就是它可以帮助我们更直观地理解这个数值在整体数据中处于的相对位置。同时，它可以将原本差异性很大的数值，拉到一个单位尺度更小的空间内，使得这种差异更加可控与稳定。（比如上面20和90的差距被拉到了-1.63和1.22的差距）

没错，高考的标准分计算也是基于这个思想。它可以直观的体现你的水平所处的位置；还可以方便在不同年份、不同科目之间做比较，而不用考虑难度。比如，你的数学考70分，语文考90分，不能说明你语文更强。但如果你的数学标准分计算是2，而语文是1，那么说明你的数学一定更有优势。

**02**

所以，什么是“层归一化”？

在神经网络中，尤其是像Transformer这样层数很深的模型里，神经元的输出值在不同层之间、同一层内部，可能会有非常大的差异。如果这些差异太大，网络在训练时就会变得非常不稳定，甚至难以收敛。就像我们前面用标准分数（Z-score）的例子一样：原始数据可能分布在20到90之间，跨度很大，但经过标准化之后，每个数据都被转化为围绕0波动、以标准差为单位的“标准分”，使得数据更集中、更容易比较。

层归一化正是把这个思想应用到了神经网络中。它在每一层中，对单一样本的所有神经元输出进行标准化处理——减去均值，再除以标准差，从而让这些神经元的输出具有统一的尺度。这样可以有效地避免某些神经元输出特别大、而另一些非常小的情况，提升网络训练时的稳定性。与另外一种批量归一化(BatchNorm，本文不展开）不同，层归一化完全作用在每个样本自身，非常适合处理序列数据和小批量输入。

![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae6xISqZZnrNcgt1qmBYXrroCXaSE88ibD8bMP9Egl0Dk1hjZMobJLj2opu6wia2Qx2TNfpZ924DkJIQ/640?wx_fmt=png&from=appmsg#imgIndex=12)

归根结底，层归一化的意义在于：让每一层的输出“更规范、更平衡”，就像考试成绩被转换成标准分一样，让后续处理更可靠与高效。这为神经网络特别是大模型的稳定训练和泛化性能，打下了基础。

**03**

缩放因子和偏移量

虽然层归一化可以有效地把每层的输出“标准化”到均值为0、分布相对固定的状态，听起来非常合理，但这又带来一个问题：会不会 **把太多“原始的信息”给抹掉了？会不会有原始数据中真正重要的差异（比如某个神经元值特别大可能表示一个很强的信号）也给“压平”，失去了“个性”？**

**当然会。为了解决这个问题，层归一化在处理之后，加入了两个** **可学习的参数** ： **缩放因子（Scale，记作 γ）** 和 **偏移量（Bias，记作 β）** 。这两个参数分别对每个神经元的标准化结果进行“放大/缩小”和“上移/下移”的操作（高考标准分也有类似变换过程）：

yᵢ = γᵢ \* zᵢ + βᵢ （zᵢ 是标准化后的值）

- `γᵢ * zᵢ` ： `γ` 可以放大（γ>1）或缩小（γ<1）标准化后的值 `zᵢ` 。比如某个神经元原始的大小差异很重要，它就会学习一个较大的 `γ` 来恢复其重要性。
- `+ βᵢ` ： `β` 可以把整个值向上或向下平移。比如发现某个神经元的平均值（位置）本身就包含重要信息，它就会学习一个合适的 `β` 来把它移动到更关键的位置。

以考试为例，你可以想象这两个类似于“权重”和“奖励”。比如你需要选拔数学特别优秀的学生，那么可以设定一个 γ=2的数学缩放因子，以放大数学成绩的重要性。而β则用来把整体的标准分做一个平移，改变其中心位置，以方便后续的处理（比如需要消除负数）。

这样一来，虽然在训练开始时先让所有神经元“从统一起跑线出发”，但模型在学习过程中可以通过 γ 和 β 来重新调整每个神经元的输出范围和基准线。其最大好处是： **在保证训练稳定的同时，保留了模型对数据差异进行“个性化解读”的能力** 。这是层归一化既“标准化”又“不失灵活性”的关键所在。

**04**

总结

**总的来说，层归一化就像一个“稳定器”，把处理的结果标准化，并通过可学习的缩放和偏移参数，保留住重要的特征差异，让数据既规范又灵活，再交给神经网络的下一道工序做加工。**

**需要注意的是，在 Transformer 的经典结构中，层归一化（LayerNorm）通常紧跟在残差连接之后，不过目前主流的模型则通常是在残差连接之前做层归一化。**

**无论怎样，这种“残差连接负责传递核心信息，层归一化负责规范与调节”的搭配，让深层 Transformer 模型像流水线一样高效运行，确保 模型可以稳定训练、层层深入，最终获得令人惊叹的能力！**

**END**

福利时间

为了帮助LLM开发人员更系统性与更深入的学习RAG应用，特别是企业级的RAG应用场景下，当前主流的优化方法与技术实现，我们编写了 **《基于大模型的RAG应用开发与优化 — 构建企业级LLM应用》** 这本长达 **500页的开发与优化指南** ，与大家一起来深入到LLM应用开发的全新世界。

更多细节，点击链接了解

**交流请识别以下名片**

![图片](https://mmbiz.qpic.cn/sz_mmbiz_jpg/wT3y8Vg9pFHz6icT5peYpicQ04tPsVcENDGnN54f56ct0UmibqRslCfoBdEOSnNBhBY6yibgMsJoopA0riaf3bYWiayA/640?wx_fmt=jpeg&from=appmsg&wxfrom=5&wx_lazy=1&tp=webp#imgIndex=16)

LLM（大模型）原理 · 目录

继续滑动看下一个

AI大模型应用实践

向上滑动看下一个
