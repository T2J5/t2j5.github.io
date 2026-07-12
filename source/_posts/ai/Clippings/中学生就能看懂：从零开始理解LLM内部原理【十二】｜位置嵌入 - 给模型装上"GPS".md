---
title: "中学生就能看懂：从零开始理解LLM内部原理【十二】｜位置嵌入 - 给模型装上\\\"GPS\\"
date: 2026-06-22 00:00:00
categories:
  - ai
tags:
  - ai
source: "https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247525003&idx=1&sn=330664d0d031762b86bc5707115546fe&chksm=c3dfddd7f4a854c1b647b6f17f768929386055df1bf5b4ae36fcc30fd9b91b265069bd3173a8&cur_album_id=3801563016806531077&scene=189#wechat_redirect"
original: true
index_img: /img/covers/ai.svg
banner_img: /img/covers/ai.svg
updated: 2026-07-12
math: true
---

> 原文来源：https://mp.weixin.qq.com/s?__biz=Mzk1NzQ1ODk5NQ==&mid=2247525003&idx=1&sn=330664d0d031762b86bc5707115546fe&chksm=c3dfddd7f4a854c1b647b6f17f768929386055df1bf5b4ae36fcc30fd9b91b265069bd3173a8&cur_album_id=3801563016806531077&scene=189#wechat_redirect

曾经的毛毛 AI大模型应用实践 *2026年1月15日 09:00*

点击上方蓝字关注我们

本系列文章是原作者Rohit Patel的长篇雄文《Understanding LLMs from Scratch Using Middle School Math-A self-contained, full explanation to inner workings of an LLM》的学习与解读笔记。本篇是系列第十二篇。我们强烈建议您在开始前阅读并理解前文（点击下方链接）。

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

12\. 位置嵌入（Positional embeddings）

13\. GPT 架构

14\. Transformer 架构

**1**

盲点：Transformer无法“感知顺序”

在上一节中，我们介绍了Transformer强大的多头注意力机制。多头自注意力可以让模型灵活地建立起句子中任意两词（Token）之间的联系，无论它们距离远近。然而，它有一个“盲点”：对词的顺序不敏感。换言之：

如果不给模型任何顺序信息，那么注意力层眼中的输入其实是无序的词集合

想象你把“我”、“爱”、“你”写在三张牌上按顺序交给Transformer ，但他只看到一个集合 — “我、爱、你”都在这儿。如果你把三张牌的位置随便打乱，对它来说内容并没有变！

![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae72GH0tsQKIby4uy9FiaRwbicnQHOibu4vemEibROPgOnKAH5BfvIiaoibLtibp4kIWAIOt9j7tyX1NQ9v6g/640?wx_fmt=png&from=appmsg#imgIndex=2)

这在自然语言的处理中就会有问题： “小明打小红” 和 “小红打小明” 在 Transformer眼里会非常接近 — 都有“小明”、“小红”和“打”，而这并不符合其真实语义。

为了解决这个问题，我们需要给每个词贴上一个“位置标签”。这就是位置嵌入（Positional Embedding）要做的事。

**2**

问题：为什么不简单编号1,2,3？

由于词在Transformer模型中的表示都是”向量”（一串N维的数字）。所以为了贴上位置标签，我们需要给词向量来“叠加”一个位置信息。

你可能会问：“给第 1 个词标上 1，第 10000 个词标上 10000，不就行了吗？”

我们在前面学过词向量（Embedding）是一串很精密的数字，数值通常都不大（比如在 -0.1 到 0.1 附近浮动）。

那“位置是 10000”这种信息，如果你直接塞进向量里，直觉做法是这样：

把位置 pos 变成位置向量 P(pos) = \[pos, 0, 0, …\]，然后和词向量相加。

![图片](https://mmbiz.qpic.cn/mmbiz_png/90CnTjsKiae72GH0tsQKIby4uy9FiaRwbicGz9K7KzJktVVLO6Z0dvdgPCDd0rfZQuiaia09VicS8D7B7v3ibk95VP4Hg/640?wx_fmt=png&from=appmsg#imgIndex=3)

我们用一个3维词向量来举例 **（真实模型是几百上千维，但道理一样）：**

假设 “苹果” 的词向量是：

E(苹果) = \[0.05, -0.02, 0.01\]

如果“苹果”出现在第 10000 位，你生成一个代表位置的向量：

P(10000) = \[10000, 0, 0\]

然后叠加得到：

X = E + P = \[10000.05, -0.02, 0.01\]

你会发现：代表语义的 0.05 被 10000 完全“淹没”了。模型“听到”的最大信号不再是“苹果”，而是“这是第 10000 位”这种信号。具体到注意力机制里，这种某一维突然变成万级，足以把计算与后续训练整体带偏。

所以正确方法应该是：生成一组 **数值大小和词向量差不多** 、但又能代表 **位置** 的、维数相同的向量，让它叠加到语义向量上。

**3**

经典方法一：函数编码

这是 Transformer 模型最开始发明的方法。简单的总结就是：

用一个 **固定函数** ，给每个位置算出一个独一无二的“指纹”向量。

具体做法是：用一组不同频率的 sin/cos 函数，把位置 pos 映射成一个 d 维向量；这样每个位置的编码是确定且固定的，同时因为是函数形式，所以理论上可自然延伸到更长序列（至少“能算出来”）。

这里：pos是位置（0开始）；d\_model是向量维度；i是维度索引。很显然对于一个确定的位置（pos），确定的总维度（d\_model），计算出的每一维（i）的结果（一个介于-1到1之间的数字）不一样，最后得到一个多维的向量。

如果你还记得sin/cos函数，应该很容易理解，这里生成向量的某一维，其实是某种频率的 **sin/cos函数** 在 pos 处的取值。特征是：

- 三角函数值范围天然在 **\[-1, 1\]** ，不会出现“10000 碾压语义”的问题
- 不同维度用不同频率，既能区分相邻位置，也能区分远距离位置

**继续用同样的 3 维词向量举例：**

E(苹果) = \[0.05, -0.02, 0.01\]

通过上述函数会给位置 10000 的这个词生成一个位置向量，比如：

P\_sin(10000) = \[0.20, -0.91, 0.03\]

叠加后得到：

X = \[0.25, -0.93, 0.04\]

这种方式下的叠加尺度相当，语义信息不会被“喧宾夺主”。

函数编码的优点是： **不受最大位置的上限约束** ——因为这是函数，你只要有X（位置）就可以算出Y（向量），并且 **每个位置的结果是固定的。当然** 缺点也对应：规则是写死的，模型不能自由决定。

**4**

经典方法二：可学习位置嵌入

这是 BERT 和早期 GPT 采用的方法。它的逻辑非常简单：

**不用函数公式，而让模型自己学一套位置编码出来。**

假设要训练的模型最长支持 512 个词，我们就准备 512 个“位置向量槽位”，每个槽位都是一条 d 维向量：

- 第 1 位的向量为 P\[1\]
- 第 2 位的向量为 P\[2\]
- …依次下去，一直到512位

一开始这些向量是随机的。训练过程中，模型不断调整它们：哪一种 P\[pos\] 叠加到 token 上能让任务损失更小，它就会把这个位置向量往那个方向“雕刻”。久而久之，这 512 个位置向量就被训练成了“最适合本模型”的一套“坐标”。

用上面同样的3维词向量举例：

E(苹果) = \[0.05, -0.02, 0.01\]

现在不再通过函数计算P\[pos\]，而是让模型训练时”学出来“。

比如训练后得到这个P\[pos\]为：

P\_learn(3) = \[0.12, -0.03, 0.07\]

叠加后得到：

X = \[0.17, -0.05, 0.08\]

这里与函数编码的区别就在于：这个位置向量是训练出来，更贴合模型需要。

但它的硬伤在于：”槽位“数量是固定的。如果你只准备到 512，那么第 513 位就没有 P\[513\] 可以查 — 模型就会“傻眼”。这就需要用到改进后的方法。

**5**

新的主流方法：旋转位置编码（RoPE）

上面两种方法（正弦波、可学习嵌入）都有一个共同点：它们提供的都是 **绝对位置** ，即告诉模型“你在第 100 位”。

但在理解语言时，我们更关心 **相对位置** 。比如下面句子中的“ **我** ”和“ **吃** ”：

句子A：“ **我** 想去 **吃** 饭。”（距离为 3）

句子B：“今天天气不错，于是 **我** 想去 **吃** 饭。”（距离还是 3）

于是有人设计出一种更聪明的编码，让“相对距离”在注意力计算里显现出来。这就是很多模型大量采用的RoPE（旋转位置编码）。其思想是：

与其把位置向量“加上去”，不如把词向量直接“转个身”。

想象词向量是“一个在平面上有方向的箭头”，那么如何让它带有位置信息：

- 第 1 个位置：把箭头逆时针转 10 度
- 第 2 个位置：把箭头逆时针转 20 度
- …
- 第 m 个位置：把箭头逆时针转 m × 10 度

当模型计算两个词的关联度时，就会发现（数学公式里的体现）：

- A 转了 100 度（第10位）
- B 转了 120 度（第12位）
- **计算结果只和“差值 20度”有关！**

所以模型不需要知道 A 和 B 具体位置，它只感受到：“ **那个词在我后面转了20度的地方。** ”这让 RoPE 擅长捕捉到词与词之间的 **相对关系** 。

注意，真实训练中，高维向量会分成N组二维向量，在各自的二维子空间里“旋转”，且不同子空间会有不同的“旋转速度”。

继续上面的3维向量的例子：

E(苹果) = \[0.05, -0.02, 0.01\]

以前两维作为一组二维坐标。那么在位置 pos 上，可以对这个(x,y)旋转一个角度 θ(pos)，得到(x', y')：

那么X = \[x', y', z\]，就是带有位置pos信息的新向量。

这里的关键不在于你算不算得出 x'、y'，而在于：

当模型去算两个不同位置 token （比如pos1和pos2）的相关性时，数学上会出现一种“对消”— 最终依赖 θ(pos2) - θ(pos1) 这样的差值，也就是相对位移，而不是绝对的位置。

**6**

最后：如果输入太长，怎么办？

虽然 RoPE 理论上能“无限旋转”，但实际训练时，模型可能只见过某个长度范围内的旋转角度，忽然你扔给它一本《红楼梦》，比如有些词需要“转 7200 度”，模型没见过这么大的“旋转”，就容易跑偏，注意力漂移等。

为了让模型能读更长的文本，工程师们在 RoPE 基础上常用 **PI** 和 **YaRN** 这类扩窗技巧。

- PI（位置插值）

**PI 的本质是：**

**把“很长的真实位置”压缩成“训练时见过的较短位置”（乘一个缩放因子）。**

**比如：**

假设模型训练时最多见过 4k 长度。现在你要它读 16k 的文本。

PI 的方法是：

真实位置：0 ～ 16000

喂给模型的位置：0 ～ 4000

换句话说：把位置整体除以 4

于是，原本第 12000 位就变成第 3000 位，“缩”到训练范围内。

这就像把一张很长的“道路地图” **等比例缩小** ：路还是那条路，但“刻度”变小。好处是模型不容易“看花”，坏处是“分辨率”下降 — 细微位置关系没那么精确。

- YaRN（RoPE的又一扩展方法）

YaRN的思路更像一种“智能压缩”：

**不是所有维度都同样压缩 — “慢”的更敢压，“快”的少压甚至不压。**

不是所有维度都一刀切地压缩，而是对不同维度做不同力度的调整。直觉上，慢变化的维度更像负责全局稳定，可以压得更狠；快变化的维度更像承载局部细节，压得少一些甚至尽量保留。

还是训练4k，推理16k的例子：

\* PI：所有维度旋转都统一“慢 4 倍”（一刀切）

\* YaRN则是：

“慢”维度：慢 4 倍甚至更多（保全局稳定）

“快”维度：慢 1.5～2 倍（保局部清晰）

这样既能覆盖更长范围的输入，又尽量不丢掉局部清晰度。

现在，我们已经理清了 Transformer 识别位置的几代方法：函数编码、可学习编码、RoPE宣传+PI等工程技巧。下一篇我们将结合前面学习的注意力、归一化、残差等方法，看看传说中GPT架构到底是怎样的。

欢迎继续关注。

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
