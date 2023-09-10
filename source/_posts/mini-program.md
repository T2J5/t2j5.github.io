---
title: 小程序
date: 2023-09-06 15:22:39
tags: ["review", "mini-program"]
index_img: /img/mini-program-index.png
banner_img: /img/mini-program-banner.png
---

## 登录

### unionid & openid

#### unionid

unionid 是一个用户对应同主体微信小程序/公众号/app 的标识，开发者需要再微信开放平台下绑定相同账号的主体。开发者可以通过 UnionId,实现多个小程序、公众号甚至 app 之间数据互通

#### openid

openid 是一个用户对于一个小程序/公众号的标识，开发者可以通过这个标识识别出用户

### 登录流程设计

1. 利用现有的登录体系
   直接复用现有系统的登录体系， 只需要在小程序端设计用户名，密码/验证码输
   ⼊页面，便可以简便的实现登录， 只需要保持良好的用户体验即可

2. 利用 OpenId 创建用户体系
   OpenId 是⼀个⼩程序对于⼀个用户的标识，利用这⼀点我们可以轻松的实
   现⼀套基于⼩程序的用户体系，值得⼀提的是这种用户体系对用户的打扰最
   低， 可以实现静默登录 。具体步骤如下：

   - 小程序客户端通过 `wx.login` 获取 `code`
   - 传递 `code` 向服务端，服务端拿到 `code` 调用微信登录凭证校验接口，微信服务器返回 `openId` 和会话密钥 `session_key`，此时开发者服务端可以利用 `openid` 生成用户入库，再向小程序客户端返回自定义登录态
   - 小程序客户端缓存自定义登录态（token），后续调用 api 携带此 token

3. 利用 unionId 创建用户体系

- 如果户关注了某个相同主体公众号， 或曾经在某个相同主体 App 、公众号上进行过微信登
  录授权， 通过 wx.login 可以直接获取 到 unionid

- 结合 wx.getUserInfo 和 `<button open-type="getUserInfo"><button/>` 这两种⽅式引导用户主动授权， 主动授权后通过返回的信息和服务端交互 (这里有⼀步需要服务端解密数据的过程，很简单，微信提供了示例代码) 即可拿到 unionid 建立用户体系， 然后由服务端返回登录态，本地记录即可实现登录。
  具体示例：
  > 1. 调用 `wx.login` 获取 `code` ，然后从微信后端换取到 `session_key` ，用于 解密`getUserInfo` 返回的敏感数据
  > 2. 使用 `wx.getSetting` 获取用户的授权情况
  > 3. 如果用户已经授权， 直接调用 API `wx.getUserInfo` 获取用户最新的信息；
  > 4. 用户未授权，在界面中显示⼀个按钮提示用户登⼊， 当用户点击并授权后就获取到用
  >    户的最新信息
  > 5. 获取到用户数据后可以进行展示或者发送给自⼰的后端。

## 双线程模型

{% asset_img double-thread-frame.png double-thread-frame %}

小程序的渲染层和逻辑层分别由两个线程管理：渲染层的界面使用 webView 进行渲染；逻辑层采用 jsCore 运行 js 代码。一个小程序存在多个界面，所以渲染层存在多个 webView。这两个线程间的通信有小程序 Native 侧中转，逻辑层发送网络请求也经由 Native 侧转发，小程序的通信模型为：
{% asset_img wechat-miniprogram-framework.png wechat-miniprogram %}

微信小程序视图层是 WebView，逻辑层是 JS 引擎。三端的脚本执行环境以及用于渲染非原生组件的环境是各不相同的：

| 运行环境         | 逻辑层 | 渲染层            |
| ---------------- | ------ | ----------------- |
| Android          | V8     | Chromium 定制内核 |
| iOS              | jsCore | WKWebView         |
| 小程序开发者工具 | NWJS   | Chrome WebView    |

我们看一下单 WebView 实例与小程序双线程多实例代码执行的差异点
{% asset_img double-thread.png double-thread %}

多 WebView 模式下，每一个 WebView 都有一个独立的 JSContext，虽然可以通过窗口通信实现数据传递，但是无法共享数据和方法，对于全局的状态管理也相对比较复杂，抽离一个通用的 WebView 或者 JS Engine 作为应用的 JSContext 就可以解决这些问题，但是同时引入了其他问题：视图和逻辑如何通信，在小程序里面数据更新后视图是异步更新的。

双线程交互的生命周期图示：
{% asset_img lifecycle.png lifecycle %}

## 通信原理

小程序逻辑层和渲染层的通信会由 Native （微信客户端）做中转，逻辑层发送网络请求也经由 Native 转发。

> iOS 通过 **`window.webkit.messageHandlers.invokeHandler.postMessage`** 来与 Native 通信
> Android 通过 X5 内核的 **`window.WeixinJSCore.invokeHandler`** 来与 Native 通信

### 视图层组件

内置组件中有部分组件是利用到客户端原生提供的能量，既然需要客户端原生提供的能力，那就会涉及到视图层和客户端的交互通信。这层通信机制在 iOS 和安卓系统的实现方式并不一样。iOS 是利用了 WKWebView 提供的 messageHandlers 特性，安卓是往 WebView 的 window 对象上注入了一个原生方法，最终会被封装为 WeXinJSBridge 这样一个兼容层，主要提供调用（invoke）和监听（on）方法。

我们知道微信小程序逻辑层没有浏览器的 DOM/BOM，视图层的更新借助于 Virtual DOM。用 JS 对象模拟 DOM 树 -> 比较两棵虚拟 DOM 树的差异 -> 把差异应用到真正的 DOM 树上，状态更新的时候，通过对比前后 JS 对象变化，进而改变视图层的 Dom 树。实际上，在视图层与客户端的交互通信中，开发者只是间接调用的，真正调用是在组件的内部实现中。开发者插入一个原生组件，一般而言，组件运行的时候被插入到 DOM 树中，会调用客户端接口，通知客户端在哪个位置渲染一块原生界面。在后续开发者更新组件属性时，同样地，也会调用客户端提供的更新接口来更新原生界面的某些部分。

### 逻辑层接口

逻辑层与客户端原生通信机制与渲染层类似，不同在于，iOS 平台可以往 JavaScripCore 框架注入一个全局的原生方法，而安卓方面则是跟渲染层一致的。

同样地，开发者也是间接地调用到与客户端原生通信的底层接口。一般我们会对逻辑层接口做层封装后才暴露给开发者，封装的细节可能是统一入参、做些参数校验、兼容各平台或版本问题等等。

## 数据驱动

wxml 可以先转成 js 对象，然后再渲染出真正的 Dom 树，示例如下：
{% asset_img example.png example %}

通过 setData 把 msg 数据从“Hello World”变成“Goodbye”，产生的 JS 对象对应的节点就会发生变化，此时可以对比前后两个 JS 对象得到变化的部分，然后把这个差异应用到原来的 Dom 树上，从而达到更新 UI 的目的，这就是“数据驱动”。

## 快速渲染设计原理

小程序采用多个 webview 渲染，更加接近原生 App 的用户体验。

如果为单页面应用，单独打开一个页面，需要先卸载当前页面结构，并重新渲染。

多页面应用，新页面直接滑动出来并且覆盖在旧页面上即可。这样用户体验非常好。

### 小程序启动流程

{% asset_img start.png start %}

## WXML 设计思路

程序自行搭建了组件组织框架 Exparser 框架

Exparser 的组件模型与 WebComponents 标准中的 ShadowDOM 高度相似

在小程序中：

```vue
<view class="container">
  Weixin
  <text style="position:relative;">文本</text>
</view>
<button bindtap="test">按钮</button>
```

会被 exparser 框架会加上述结构转换为下面样子

```html
<wx-view
  exparser:info-class-prefix=""
  exparser:info-component-id="2"
  class="container"
>
  Weixin
  <wx-text
    exparser:info-class-prefix=""
    exparser:info-component-id="3"
    style="position:relative;"
  >
    <span style="display:none;">文本</span>
    <span>文本</span></wx-text
  >
</wx-view>
<wx-button
  exparser:info-class-prefix=""
  exparser:info-component-id="4"
  exparser:info-attr-bindtap="test"
  role="button"
  aria-disabled="false"
>
  按钮
</wx-button>
```

这样就和 WebComponents 基本一致

### WebComponents

Web Components 是一个浏览器原生支持的组件化方案，允许你创建新的自定义、可封装、可重用的 HTML 标记。不用加载任何外部模块，直接就可以在浏览器中跑。

如下代码，标签就是自定义组件的标签了，它不属于 html 语义化标签中的任何一个，是自定义的。

```html
<html>
  <head> </head>
  <body></body>
  <user-body></user-body>
  <template id="userCardId">
    <!-- 组件样式与代码封装在一起，只对自定义元素生效，不会影响外部的全局样式 -->
    <style>
      name {
        color: red;
        font-size: 50px;
      }
      button {
        width: 200px;
      }
    </style>
    <p class="name">21312</p>
    <button>test</button>
  </template>
  <script>
    class UserCard extends HTMLElement {
      constructor() {
        super();
        const shadow = this.attachShadow({ mode: "closed" });
        const templateElem = document.getElementById("userCardId");

        const content = templateElem.content.cloneNode(true);

        shadow.appendChild(content);
      }
    }
    window.customElements.define("user-card", UserCard);
  </script>
</html>
```

WebComponent 主要就是三个规范：

#### custom Elements 规范

可以创建一个自定义标签。根据规范，自定义元素的名称必须包含连接线"-",用于区别原生 html 元素

可以指定多个不同的回调函数，它们将会在元素的不同生命时期被调用

#### templates 规范

提供了`<template>` 标签，可以在它里面使用 HTML 定义 DOM 结构

#### Shadow DOM 规范

首先实例化一个根节点，挂在到宿主上，这里的宿主是 this。上面说过 this 指向 user-card。

然后我们把创建的 DOM 结构，或者`<template>`结构挂载到影子根上即可。看一下 HTML 结构展示

```js
var shadow = this.attachShadow({ mode: "closed" });
shadow.appendChild(content);
```

### Exparser 框架原理

Exparser 是微信小城的组件组织框架，内置在小程序基础库中，为小程序提供各种各样的组件支撑
内置组件和自定义组件都由 Exparser 框架组织管理

Exparser 组件模型与 WebComponents 标准中的 Shadow DOM 高度相似

Exparser 会维护整个页面的节点树相关信息，包括节点的属性，事件绑定等，相当于一个简化版的 Shadow DOM 实现。Exparser 的主要特点包括如下:

- 基于 Shadow DOM 模型: 模型上与 WebComponents 的 ShadowDOM 高度相似，但不依赖浏览器的原生支持，也没有其他依赖库；实现时，还针对性地增加了其他 API 以支持小程序组件编程。
- 可在纯 JS 环境中运行: 这意味着逻辑层也具有一定的组件树组织能力。
- 高效轻量：性能表现好，在组件实例极多的环境下表现尤其优异，同时代码尺寸也较小。

小程序中，所有节点树相关的操作都依赖于 Exparser，包括 WXML 到页面最终节点树的构建和自定义组件特性等。

### rpx -> px

```js
// px = rpx 值 / 基础设备宽度 750 * 设备宽度
number = (number / BASE_DEVICE_WIDTH) * (newDeviceWidth || deviceWidth);
```

### 事件绑定

- 最开始在 wxml 文件中定义的事件绑定，其实转化成虚拟 dom 树结构之后，其实只是一个键值对，表明了某个 dom 上有绑定某个事件，并没有完成事件绑定。

- `WAWebview.js` 处理虚拟 dom 树时，会去循环遍历 attr 属性，判断 attr 中的属性名是否为事件属性

- 如果是，通过 `addListener` 方法进行了事件绑定。可以理解成，通过 addListener 方法监听 tap 事件，就相当于 window.addEventListener 对 mouseup 方法的监听。回调函数中对函数的 event 信息进行组装，并触发 sendData 方法。sendData 方法就是向逻辑线程发送 event 数据的方法。

{% asset_img event.png event %}

> 目前在触发 sendData 方法之前这些逻辑的解析包括 event 参数的组装都是在渲染层的底层基础库 WAWebview.js 中完成的，也就是说还在渲染线程中。

### 通讯系统设计

最上面提到，视图层和逻辑层通讯是通过 Native 层。

具体的手段就是

ios 利用 WKWebView 的提供 messageHandlers 特性
android 是往 webview 的 window 对象注入一个原生方法
这两种会统一封装成 weixinJSBridge，这和正常 h5 与客户端通讯手段一致

初始化过程中 Native 层理论上是微信客户端，分别在视图层和业务逻辑层注入了 WeixinJSBridge

## 生命周期

### data

逻辑层的 data 与 view 是相互绑定的，data 是页面第一次渲染使用的初始数据。页面加载的时候，data 将会以 JSON 字符串形式由逻辑层传至渲染层。因此 data 中的数据必须是可以转成 JSON 的类型：字符串，数字，布尔值，对象，数组。

渲染层发出信号，发出一个我已经初始化完毕的信号发给逻辑层，并且自身状态进入等待。

逻辑层收到这个信号的时候有两种情况。

第一种就是自身还没初始化完，那么收到此信号后只需要初始化完毕后发送初始数据 Data 到渲染层即可。
第二种情况就是逻辑层早已经进入等待状态，那么收到信号后立即发送初始数据 Data 到渲染层即可。

### 生命周期

- `onLoad(query:Object)`: 页面加载时触发，一个页面只会调用一次，可以在 onLoad 的参数中获取打开当前页面路径中的参数。
- `onShow()`: 页面显示/切入前台时触发
- `onHide()`: 页面隐藏/切入后台时触发。 如 wx.navigateTo 或底部 tab 切换到其他页面，小程序切入后台等
- `onReady()`: 页面初次渲染完成时触发。一个页面只会调用一次，代表页面已经准备妥当，可以和视图层进行交互。
- `onUnload()`: 页面卸载时触发。如 wx.redirectTo 或 wx.navigateBack 到其他页面时

## 引用

[微信小程序底层框架实现原理｜万字长文](https://cloud.tencent.com/developer/article/2142622)
