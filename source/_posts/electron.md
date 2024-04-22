---
title: electron
date: 2023-10-18 19:13:04
tags:
---

## 性能相关

> 推荐阅读 [官方文档](https://www.electronjs.org/zh/docs/latest/tutorial/performance)

1. 谨慎地加载模块
2. 过早的加载和执行代码
3. 阻塞主进程
   对于需要长期占用 CPU 的繁重任务，利用 worker threads，请考虑将它们移动到 BrowserWindow，或（作为最后手段）生成一个专用进程。

尽可能避免使用同步 IPC 和 @electron/remote 模块。 虽然有合法的使用案例，但很容易不知情地阻塞 UI 线程。

避免在主进程中使用阻塞 I/O 操作。 简而言之，每当 Node.js 的核心模块 (如 fs 或 child_process) 提供一个同步版本或 异步版本，你更应该使用异步和非阻塞式的变量。

4. 阻塞渲染进程
   现在处理你的应用的主要两个方法是对于小的操作使用 requestIdleCallback() 而长时间运行的操作使用 Web Workers。

requestIdleCallback()允许开发者将函数排队为在进程进入空闲期后立刻执行。 它使你能够在不影响用户体验的情况下执行低优先级或后台执行的工作。 想要了解如何使用它的更多信息，请查看 MDN 上的文档。

Web Workers 是在单独线程上运行代码的一个好方式。 有一些注意事项需要考虑 - 请查阅 Electron 的 多线程文档 和 MDN 的 Web Workers 文档。 对于长时间并且大量使用 CPU 的操作来说它们是一个理想的解析器。

## 进程管理 && 监控

目前是有一些可用的工具来进行进程管理的, electron-process-manager/electron-re

这些工具的大概流程如下:

1. 通过 BrowserWindow.getAllWindows()获取到所有的渲染进程信息（pid, url）// getAppMetrics/shell
2. 通过 pidusage 来查询资源占用情况
3. 另外创建一个 renderer 进程渲染资源占用的情况/通过 UI 交互杀死进程

```js
const { BrowserWindow } = require("electron");
const pidusage = require("pidusage");
const logServices = require("./log.services");

let instance;

class ProcessManager {
  constructor() {
    // 存储process映射对象
    this.processMap = {};
    // 开始定时任务
    this.timedTask();
  }

  static getInstance() {
    if (!instance) {
      instance = new ProcessManager();
    }

    return instance;
  }

  insert(pid, name) {
    if (!this.processMap[pid]) {
      this.processMap[pid] = { name };
    }
  }

  delete(pid) {
    delete this.processMap[pid];
  }

  // 实时获取所有BrowserWindow的进程信息
  getPidList() {
    BrowserWindow.getAllWindows().forEach((process) => {
      const _webContents = process.webContents;

      if (process && process.webContents) {
        this.insert(
          process.webContents.getOSProcessId(),
          _webContents.getURL()
        );
      }
    });
  }

  getProcessUsage(pid) {
    return pidusage(pid);
  }

  async monitor() {
    this.getPidList();
    for (let pid in this.processMap) {
      try {
        const _usage = await this.getProcessUsage(pid);

        logServices.debugLog(
          `{
            name: ${this.processMap[pid].name},
            pid: ${pid},
            cpuUsage: ${_usage.cpu},
            memoryUsage: ${_usage.memory}
          }`
        );
      } catch (err) {
        this.delete(pid);
      }
    }
  }

  timedTask() {
    // 每10s监控一次
    setInterval(() => {
      this.monitor();
    }, 10000);
  }
}

module.export = ProcessManager.getInstance;
```

另外再主进程在 whenReady 时候调用实例对象的 insert 方法将主进程也纳入到监控

```js
ProcessManager().insert(process.pid, "mainProcess");
```
