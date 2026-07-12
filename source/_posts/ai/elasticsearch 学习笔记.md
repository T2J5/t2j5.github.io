---
title: "elasticsearch 学习笔记"
date: 2026-06-29 16:17:27
categories:
  - ai
tags:
  - ai
---

## docker 部署 elasticsearch
```yaml
services: 
	# es 8.17.0 + IK 中文分词， 内置在镜像
	es:
		build: ./elasticsearch # 从本地 dockfile 构建镜像
		container_name: es-dev
		ports:
			- "9200":"9200"
		environment:
			- discovery.type=single-node # 单节点运行
			- xpack.security.enabled=false # 关闭安全认证，免密码访问
			- xpack.security.http.ssl.enabled=false # 关闭 HTTPS 加密
			- xpack.security.transport.ssl.enabled=false # 关闭节点传输加密
			- ES_JAVA_OPTS=-Xms512m -Xmx512m # JVM 内存配置，避免占用过高
		volumes:
			- ${DOCKER_VOLUME_DIRECTORY:-.}/volumes/es/data:/usr/share/elasticsearch/data
		restart: always
```

```dockerfile
FROM elasticsearch:8.17.0

# 安装IK分词
RUN elasticsearch-plugin install --batch \

https://release.infinilabs.com/analysis-ik/stable/elasticsearch-analysis-ik-8.17.0.zip
```

## 安装
```bash
pnpm install @elastic/elasticsearch
```

## 操作

### 连接
You can connect to the Elastic Cloud using an API key and the Elasticsearch endpoint.
```js
import { Client } from "@slastic/elasticsearch"
const client = new Client({
	node: 'http://localhost:9200',
	auth: {
		apiKey: {
			id: '',
			api_key: ''
		}
	}
})
```

### 创建索引
```js
await client.indices.create({
	index: 'indexName',
	mappings: {
		properties: {
			note_title: { type: 'text', analyzer: 'ik_max_word', search_analyzer: 'ik_smart'},
			tags: {type: 'keyword'},
			priority: { type: 'integer'},
			created_at: {type:'date'}
		}
	}
})
```

### 写入数据
```js
await client.bulk({
	refresh: true,
	operations: row.flatMap(r = > ([{
		index: { _index: indexName, _id: r.id },
		{...r, created_at: now, updated_at: now}
	}]))
})
```

### 查询数据
```js
client.search({
	index: indexName,
	size: 2,
	query: {
		multi_match: {
			query: q,
			fields: ["note_title^2", "note_body", "title", "content"],
			type: "best_fields", //  Finds documents which match any field, but uses the `_score` from the best field.
			analyzer: "ik_smart"
		}
	}
})
```
