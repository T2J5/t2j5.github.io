---
title: AMD && CMD && CommonJs && UMD && ES
index_img: /img/7.jpg
banner_img: https://i.pinimg.com/originals/d6/94/bb/d694bbcd2be272ed02051b7a83d9b7aa.jpg
---

## AMD

{% hint 'AMD' 'Asynchronous Module Definition' %} 是一种异步模块加载规范，专为浏览器设计。全称是 Asynchronous Module Definition,中文名称是异步模块定义。

提供定义模块及异步加载该模块依赖的机制，这和浏览器的异步加载模块的环境刚好适应（浏览器同步加载会导致性能，可用性，调试和跨域访问等问题）。但浏览器并不支持 AMD 模块，在浏览器端，需要借助 RequireJS 才能加载 AMD 模块。

AMD 规范中定义模块的的方式：

```js
  define(id?: String, dependencies?: String[], factory: Function|Object);
```

`id`: 模块的名称是个字符串，这个参数是可选的。如果没有提供该参数，模块的名字应该默认为模块加载器请求的指定脚本的名字。如果提供了该参数，模块名必须是“顶级”的和绝对的（不允许相对名字）。

模块名的格式：模块名用来唯一标识定义中模块，它们同样在依赖数组中使用。AMD 的模块名规范是 CommonJS 模块名规范的超集。引用如下：

- 模块名是由一个或多个单词以正斜杠为分隔符拼接成的字符串
- 单词须为驼峰形式，或者"."，".."
- 模块名不允许文件扩展名的形式，如".js"
- 模块名可以为 "相对的" 或 "顶级的"。如果首字符为"."或".."则为"相对的"模块名
- 顶级的模块名从根命名空间的概念模块解析
- 相对的模块名从 "require" 书写和调用的模块解析
- 上面所说到的 CommonJS 模块 id 属性常被用于 JavaScript 模块。

相对模块名解析示例：

- 如果模块 "a/b/c" 请求 "../d", 则解析为"a/d"
- 如果模块 "a/b/c" 请求 "./e", 则解析为"a/b/e"

`dependencies`: 是个定义中模块所依赖模块的数组。依赖模块必须根据模块的工厂方法优先级执行，并且执行的结果应该按照依赖数组中的位置顺序以参数的形式传入（定义中模块的）工厂方法中。

```js
define(function(require, exports, module) {}）
```

`factory`: 是最后一个参数，它包裹了模块的具体实现，它是一个函数或者对象。如果是函数，那么它的返回值就是模块的输出接口或值。

AMD 模块使用：

```js
require(["模块名"], callback);
```

第一个参数[module]，是一个数组，里面的成员就是要加载的模块；第二个参数 callback，则是加载成功之后的回调函数

## CMD

通用模块定义，其提供了模块定义和按需加载执行模块。它解决的问题和 AMD 规范是一样的，只不过在模块定义方式和模块加载时机上不同，CMD 也需要额外的引入第三方的库文件，SeaJS,SeaJS 推崇一个模块一个文件

在 CMD 规范中，一个文件就是一个模块，使用 define 来进行定义：

```js
define(factory);
```

这里的 define 是一个全局函数，用来定义模块，这里的 factory 参数既可以是函数，又可以是字符串或对象。如果参数是字符串或对象时，表示该模块的接口就是该对象或字符串：

```js
define({ website: "oecom" });
define("这里是OECOM");
```

当 factory 为函数时，此函数就是模块的构造方法，该函数默认为提供三个参数：require,exports,module

```js
define(function (require, exports, module) {});
```

-- **`require`** --

- 同步加载

require 参数也是一个方法，接收的参数为模块标识，其实就是需要加载模块的相对路径，作用就是加载其他模块。

```js
define(function (require, exports, module) {
  var a = require("./a");
  a.out(); //假设模块a有out方法。
});
```

- 异步加载
  直接使用 require 加载属于是同步加载，require 提供了 async 方法来在模块内部进行异步加载模块，并在加载完成以后执行指定的回调函数。

```js
define(function (require, exports, module) {
  require.async("./a", function (a) {
    a.doSomething();
  });

  require.async(["./c", "./b"], function (c, b) {
    c.doSomething();
    b.doSomething();
  });
});
```

**注意**：`require` 是同步往下执行，`require.async` 则是异步回调执行。`require.async` 一般用来加载可延迟异步加载的模块。

- 获取模块路径
  require.resolve 使用模块系统内部的路径解析机制来解析并返回模块路径。该函数不会加载模块，只返回解析后的绝对路径。

-- **`exports`** --

exports 是一个用来想外接提供模块接口的对象

提示：exports 仅仅是 module.exports 的一个引用。在 factory 内部给 exports 重新赋值时，并不会改变 module.exports 的值。因此给 exports 赋值是无效的，不能用来更改模块接口。

还有一点就是导出模块不要写在回调函数里，导出是需要同步执行，否则导入是会导入失败。

## commonJS

### 概述

Node.js 中采用此规范，每一个文件就是一个模块，有自己的作用域，模块中的变量，函数，类都是私有的。

CommonJS 规范规定，每个模块内部，`module`变量代表当前模块。这个变量是一个对象，它的`exports`属性（即`module.exports`）是对外的接口。加载某个模块，其实是加载该模块的`module.exports`属性。

使用如下：

```js
// 模块
var x = 5;
var addX = function (value) {
  return value + x;
};
module.exports.x = x;
module.exports.addX = addX;
```

CommonJS 模块的特点如下：

> 所有代码都运行在模块作用域，不会污染全局作用域。
> 模块可以多次加载，但是只会在第一次加载时运行一次，然后运行结果就被缓存了，以后再加载，就直接读取缓存结果。要想让模块再次运行，必须清除缓存。
> 模块加载的顺序，按照其在代码中出现的顺序。

### module 对象

所有模块都是`Module`的实例。每个模块内部都有一个 module 对象，代表当前模块。有如下属性：

- `module.id` 模块的识别符，通常是带有绝对路径的模块文件名。
- `module.filename` 模块的文件名，带有绝对路径。
- `module.loaded` 返回一个布尔值，表示模块是否已经完成加载。
- `module.parent` 返回一个对象，表示调用该模块的模块。
- `module.children` 返回一个数组，表示该模块要用到的其他模块。
- `module.exports` 表示模块对外输出的值。

#### module.exports

`module.exports`属性表示当前模块对外输出的接口，其他文件加载该模块，实际上就是读取`module.exports`变量。

#### exports

为了方便，Node 为每个模块提供一个`exports`变量，指向`module.exports`。这等同在每个模块头部，有一行这样的命令。

```js
var exports = module.exports;
```

在对外输出模块接口时，可以向 exports 对象添加方法。

```js
exports.hello = function () {
  return "hello";
};

module.exports = "Hello world";
```

上面代码中，hello 函数是无法对外输出的，因为 module.exports 被重新赋值了。

这意味着，**如果一个模块的对外接口，就是一个单一的值，不能使用 exports 输出，只能使用 module.exports 输出**。

### AMD 与 CJS 的兼容性

CommonJS 规范加载模块是同步的，也就是说，只有加载完成，才能执行后面的操作。AMD 规范则是非同步加载模块，允许指定回调函数。由于 Node.js 主要用于服务器编程，模块文件一般都已经存在于本地硬盘，所以加载起来比较快，不用考虑非同步加载的方式，所以 CommonJS 规范比较适用。但是，如果是浏览器环境，要从服务器端加载模块，这时就必须采用非同步模式，因此浏览器端一般采用 AMD 规范。

### require 命令

模块的循环加载

如果发生模块的循环加载，即 A 加载 B，B 又加载 A，则 B 将加载 A 的不完整版本。

### 模块加载机制

CommonJS 模块的加载机制是，输入的是被输出的值的拷贝。也就是说，一旦输出一个值，模块内部的变化就影响不到这个值。

**require 的内部处理流程**

require 指向当前模块的 module.require，而后者又调用 Node 内部命令 Module.\_load

```js
Module._load = function (request, parent, isMain) {
  // 1. 检查Module._cache， 是否缓存中存在此模块
  // 2. 如果缓存中不存在，就创建新的Module实例
  // 3. 添加到缓存
  // 4. 使用module.load()加载指定的模块文件,读取文件之后，使用module.compile()执行文件代码
  // 5. 如果加载/解析报错，就从缓存中删除此模块
  // 6. 返回模块的module.exports
};
```

## UMD

通用模块加载规范

```js
(function (root, factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
    console.log("是commonjs模块规范，nodejs环境");
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    console.log("是AMD模块规范，如require.js");
    define(factory());
  } else if (typeof define === "function" && define.cmd) {
    console.log("是CMD模块规范，如sea.js");
    define(function (require, exports, module) {
      module.exports = factory();
    });
  } else {
    console.log("没有模块环境，直接挂载在全局对象上");
    root.umdModule = factory();
  }
})(this, function () {
  return {
    name: "我是一个umd模块",
  };
});
```

## ES Module

ES Modules 特性
给 script 标签 设置`type = module` 来告知当前 script 标签中的代码采用 ESM 的规范来执行

- 自动采用严格模式
- 每个 ESM 模块都是单独的私有作用域
- ESM 的 script 标签会延迟执行脚本，默认加上了 defer 属性
- ESM 是通过 CORS 这种跨域请求的方式 去请求外部 JS 模块的

**export 导出是栈内存中的变量（原始数据类型存储的是值，对象数据类型存储的是堆内存的引用地址）**
