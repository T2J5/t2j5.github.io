---
title: "代理 git 仓库无法使用ssh push的解决方案"
date: 2026-06-11 15:12:56
categories:
  - ai
tags:
  - ai
---

在~/.ssh/config 文件输入如下配置：
```
Host github.com

	HostName ssh.github.com
	
	Port 443
	
	User git
	
	ServerAliveInterval 30
	
	ServerAliveCountMax 3
```

测试连接是否成功：
```
> ssh -T git@github.com
Hi T2J5! You've successfully authenticated, but GitHub does not provide shell access.
```
