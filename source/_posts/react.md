---
title: react
date: 2023-09-11 00:28:33
tags: ["react", "review"]
index_img: /img/react-index.jpg
banner_img: /img/react-banner.png
---

## React 合成事件机制

- react16 事件绑定在`document`上
- react17 事件绑定到 root 组件上，有利于多个 react 版本共存，例如微前端
- event 不是原生的，是 SyntheticEvent 合成事件对象

> 为了解决跨浏览器兼容性问题，React 会将浏览器原生事件（Browser Native Event）封装为合成事件（SyntheticEvent）传入设置的事件处理器中。这里的合成事件提供了与原生事件相同的接口，不过它们屏蔽了底层浏览器的细节差异，保证了行为的一致性。另外有意思的是，React 并没有直接将事件附着到子元素上，而是以单一事件监听器的方式将所有的事件发送到顶层进行处理。这样 React 在更新 DOM 的时候就不需要考虑如何去处理附着在 DOM 上的事件监听器，最终达到优化性能的目的

**为何需要合成事件**

- 更好的兼容性和跨平台，如 react native
- 挂载到 document 或 root 上，减少内存消耗，避免频繁解绑
- 方便事件的统一管理（如事务机制）

## setState 和 batchUpdate 机制

setState 在 react 事件，生命周期中是异步的，在 setTimeout，自定义 DOM 事件中是同步的

### setState 主流程

setState 是否是异步还是同步，看是否能命中 batchUpdate 机制，判断 isBatchingUpdates

哪些能命中 batchUpdate 机制

- 生命周期
- react 中注册的事件和它调用的函数
- 总之在 react 的上下文中

## 哪些不能命中 batchUpdate 机制

- setTimeout、setInterval 等
- 自定义 DOM 事件
- 总之不在 react 的上下文中，react 管不到

在 React18 之前，setState 在 react 的合成事件中是合并更新的，在 setTimeout 的原生事件中是同步按序更新的

在 react18 之中，不论是在合成事件中，还是在宏任务重，都是合并更新

## 调用 setState 之后会发生什么

在调用 setState 函数之后，react 会将传入的参数和之前的状态进行合并，然后触发调和过程（reconciliation）。经过调和过程，react 会以相对高效的方式根据新的状态构建 react 元素树并着手重新渲染整个 UI 界面，在 react 得到元素树之后，react 会计算出新的树和老的树之前的差异，然后根据差异对界面进行最小化重新渲染。通过 diff 算法，react 能够精确知道哪些位置发生了变化以及该如何变化，这就保证了按需更新，而不是全部渲染

- 在 setState 的时候，react 会为当前节点创建一个 updateQueue 的更新队列
- 然后会触发 reconciliation 过程，在这个过程中，会使用名为 Fiber 的调度算法，开始生成新的 Fiber 树，Fiber 算法最大的特点是可以做到异步可中断的执行
- 然后 React scheduler 会根据优先级高低，先执行优先级高的节点，具体是执行 doWork 方法
- 在 doWork 方法中，react 会执行一遍 updateQueue 中的方法，已获得新的节点。然后对比新旧节点，为老街店打上更新、插入、替换等 tag。
- 当前节点 doWork 完成后，会执行 performUnitOfWork 方法以获得新节点，然后再重复上面的过程
- 当所有的节点都 doWork 完成后，会触发 commitRoot 方法，react 进入 commit 阶段
- 在 commit 阶段，react 会根据前面为各个节点打的 tag，一次性更新整个 dom 元素

## react 中 key 的作用是

- key 是 react 用于追踪哪些列表中元素被修改，被添加或者被移除的辅助标识
- 给每个 vnode 的唯一 id，可以依靠 key，更准确，更快的拿到 oldVnode 中对应的 vnode 节点
- 如果没有 key，react 会认为交换顺序的节点变化了，则会销毁这两个节点并重新构造
- 当我们用 key 指明了节点前后对应关系后，react 知道节点还在，就会复用该节点，只需要交换顺序
- 在 react diff 算法中，可以减少不必要的元素重新渲染

## Fiber

react fiber 用类似 requestIdleCallback 的机制来做异步 diff。但是之前数据结构不支持这样的实现异步 diff。于是 react 实现了类似链表的数据结构，将原来的递归 diff（不可被中断）变成了现在的遍历 diff，这样就能做到异步更新并且可中断恢复执行

React 的核心流程可以分为两个部分：

- reconciliation（调度算法），render

  1. 更新 state 与 props
  2. 调用生命周期钩子
  3. 生成虚拟 dom（这里是 fiber tree）
  4. 通过新旧 vdom 进行 diff 算法，获取 vdom change
  5. 确认是否需要重新渲染

- commit
  如需要，则操作 dom 节点更新

新版的 fiber reconciler，变成了具有链表和指针的 单链表树遍历算法。通过指针映射，每个单元都记录着遍历当下的上一步与下一步，从而使遍历变得可以被暂停和重启

这里我理解为是一种 任务分割调度算法，主要是 将原先同步更新渲染的任务分割成一个个独立的 小任务单位，根据不同的优先级，将小任务分散到浏览器的空闲时间执行，充分利用主进程的事件循环机制

### 核心

Fiber 是一种数据结构

```js
class Fiber {
  constructor(instance) {
    this.instance = instance;
    this.child = child;
    this.return = parent;
    this.sibling = previous;
  }
}
```

- 链表树遍历算法：通过节点保存与映射，便能随时地进行停止和重启，这样便能达到实现任务分割的基础前提。

- 任务分割：reconciliation 和 commit 两个阶段

- 分散执行： 任务分割后，就可以把小任务单元分散到浏览器的空闲期间去排队执行，而实现的关键是两个新 API: requestIdleCallback 与 requestAnimationFrame

低优先级的任务交给 requestIdleCallback 处理，这是个浏览器提供的事件循环空闲期的回调函数，需要 polyfill，而且拥有 deadline 参数，限制执行事件，以继续切分任务；

高优先级任务交给 requestAnimationFrame 处理

- 优先级策略：文本框输入 > 本次调度结束需完成的任务 > 动画过渡 > 交互反馈 > 数据更新 > 不会显示但以防将来会显示的任务

## 虚拟 DOM

对视图抽象，为跨平台助力

## React 渲染流程

{% asset_img https://s.poetries.work/images/20210425210718.png %}

在 React 16 之后，协调改为了 Fiber Reconciler。它的调度方式主要有两个特点，第一个是协作式多任务模式，在这个模式下，线程会定时放弃自己的运行权利，交还给主线程

## react 生命周期

挂载时：constructor -> getDerivedStateFromProps -> render -> react 更新 DOM 和 refs -> componentDidMount

更新时：getDerivedStateFromProps -> shouldComponentUpdate -> render -> getSnapshotBeforeUpdate -> react 更新 DOM 和 refs -> componentDidUpdate

卸载时：componentDidUnMount

constructor: 初始化 state 和绑定函数

getDerivedStateFromProps: 让组件在 props 变化时更新 state
