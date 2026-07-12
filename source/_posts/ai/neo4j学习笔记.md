---
title: "neo4j学习笔记"
date: 2026-06-29 16:17:27
categories:
  - ai
tags:
  - ai
---

# Neo4j 学习笔记（从入门到 Agent 实战）

> 目标：用一篇完整教程掌握 Neo4j 的核心概念、基本使用方法、建模思路、性能优化，并能在 Agent 开发中落地。

---

## 1. Neo4j 是什么？为什么要学？

Neo4j 是一种图数据库（Graph Database），它把现实世界里的“对象”和“关系”都作为一等公民来存储。

- 对象用“节点（Node）”表示
- 关系用“关系（Relationship）”表示
- 节点和关系都可以带属性（Property）

与传统关系型数据库（MySQL/PostgreSQL）相比，Neo4j 的核心优势是：

1. 对关系查询非常友好
2. 多跳关联查询速度通常更稳定
3. 业务语义更直观，建模更贴近认知

例如：

- 电商推荐：用户 -> 浏览 -> 商品 -> 属于 -> 类目
- 风控反欺诈：账号 -> 登录设备 -> IP -> 手机号
- 知识图谱：人物 -> 就职于 -> 公司 -> 投资 -> 项目
- Agent 记忆：用户需求 -> 约束 -> 历史决策 -> 结果反馈

传统 SQL 做多表 Join 到 4~6 跳时，复杂度和可维护性会迅速上升；图数据库在“关系即数据”的场景中往往更自然。

---

## 2. 核心概念：把图数据库的底层模型吃透

### 2.1 节点（Node）

节点是实体，比如一个用户、一篇文章、一个任务。

示例：

- `(:User {id: "u1", name: "张三"})`
- `(:Doc {id: "d1", title: "Neo4j 入门"})`

### 2.2 标签（Label）

标签是节点的“类型”。一个节点可以有多个标签。

- `(:User:Premium {id: "u1"})`

多个标签能表达复合身份，比如同一个人既是 `User`，又是 `Author`。

### 2.3 关系（Relationship）

关系是有方向的边：`(a)-[:TYPE]->(b)`。

示例：

- `(u:User)-[:VIEWED]->(p:Product)`
- `(a:Author)-[:WROTE {time: datetime()}]->(d:Doc)`

关系也能有属性，比如时间、权重、来源、置信度。

### 2.4 属性（Property）

属性是键值对，值支持字符串、数字、布尔、列表、时间等。

常见实践：

1. 业务主键使用 `id`
2. 时间统一 `createdAt`、`updatedAt`
3. 可枚举字段使用标准字符串值，避免脏数据

### 2.5 路径（Path）

路径是查询结果中的一条链路，可表达“从 A 到 B 的关系证据”。

在解释型 AI 场景中，路径可直接作为“可追踪推理依据”。

### 2.6 索引与约束

- 索引（Index）：提升查找速度
- 约束（Constraint）：保证数据一致性

最常见是唯一约束：

```cypher
CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.id IS UNIQUE;
```

---

## 3. 快速上手：安装与连接

你可以用三种方式开始：

1. Neo4j Desktop：本地图形化，适合学习
2. Docker：开发/测试环境快速部署
3. Neo4j Aura：云托管，适合线上

### 3.1 Docker 启动示例

```bash
docker run \
	--name neo4j \
	-p7474:7474 -p7687:7687 \
	-e NEO4J_AUTH=neo4j/password123 \
	-d neo4j:5
```

- `7474` 是 Web UI
- `7687` 是 Bolt 协议端口（程序连接常用）

### 3.2 JavaScript 连接 Neo4j

```javascript
import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "password123"),
);

async function main() {
  const session = driver.session({ database: "neo4j" });
  try {
    const result = await session.run(
      "RETURN 'Neo4j connected' AS msg, datetime() AS now",
    );
    console.log(result.records[0].get("msg"));
    console.log(result.records[0].get("now").toString());
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
```

---

## 4. Cypher 基础：最重要的查询语言

Cypher 是 Neo4j 的声明式查询语言，可理解为“图世界里的 SQL”。

### 4.1 创建数据

```cypher
CREATE (u:User {id: 'u1', name: '张三', level: 'vip'});
CREATE (p:Product {id: 'p1', name: '机械键盘', price: 499});
MATCH (u:User {id: 'u1'}), (p:Product {id: 'p1'})
CREATE (u)-[:VIEWED {at: datetime()}]->(p);
```

### 4.2 查询数据

```cypher
MATCH (u:User)-[r:VIEWED]->(p:Product)
WHERE u.id = 'u1'
RETURN u.name, p.name, r.at
ORDER BY r.at DESC;
```

### 4.3 更新数据

```cypher
MATCH (u:User {id: 'u1'})
SET u.level = 'svip', u.updatedAt = datetime()
RETURN u;
```

### 4.4 删除数据

```cypher
MATCH (u:User {id: 'u1'})-[r:VIEWED]->(p:Product {id: 'p1'})
DELETE r;

MATCH (p:Product {id: 'p1'})
DETACH DELETE p;
```

`DETACH DELETE` 会先删关系再删节点，避免“节点仍有关联边”报错。

### 4.5 MERGE：防重复写入的关键

```cypher
MERGE (u:User {id: 'u1'})
ON CREATE SET u.name = '张三', u.createdAt = datetime()
ON MATCH  SET u.lastSeen = datetime();
```

`MERGE` = “如果不存在则创建，存在则匹配”，是幂等写入的核心。

### 4.6 多跳查询

```cypher
MATCH p = (u:User {id: 'u1'})-[:VIEWED|PURCHASED*1..3]->(x)
RETURN p
LIMIT 20;
```

含义：从 `u1` 出发，沿 `VIEWED` 或 `PURCHASED` 走 1~3 跳。

### 4.7 聚合统计

```cypher
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN p.name AS product, count(*) AS buyCount
ORDER BY buyCount DESC
LIMIT 10;
```

---

## 5. 建模方法论：别急着写 Cypher，先画图

Neo4j 成败常取决于建模，而不是语法。

### 5.1 从问题出发的建模步骤

1. 列核心实体（名词）：用户、订单、商品、会话、任务
2. 列关键关系（动词）：购买、包含、提到、依赖
3. 确定方向：查询更频繁的一侧作为起点
4. 提炼高频过滤条件：哪些字段需要索引
5. 约束主键：每类实体都定义唯一 id

### 5.2 一个 Agent 任务系统的建模示意

- `(:User)` 用户
- `(:Session)` 对话会话
- `(:Task)` 子任务
- `(:ToolCall)` 工具调用
- `(:Memory)` 记忆片段

关系：

- `(:User)-[:HAS_SESSION]->(:Session)`
- `(:Session)-[:HAS_TASK]->(:Task)`
- `(:Task)-[:CALLS]->(:ToolCall)`
- `(:Task)-[:READS_MEMORY]->(:Memory)`
- `(:Task)-[:WRITES_MEMORY]->(:Memory)`
- `(:Task)-[:DEPENDS_ON]->(:Task)`

这个模型的价值是：

1. 可追踪任务依赖链
2. 可解释“为何调用这个工具”
3. 可沉淀跨会话长期记忆

---

## 6. 在 Agent 开发中的使用场景与能力

这里是最实用的部分：Neo4j 在 Agent 系统里通常不是“存聊天记录”，而是做“结构化记忆+可解释推理底座”。

### 6.1 场景一：图增强 RAG（Graph-RAG）

传统向量 RAG 更擅长“语义相似”，不擅长“关系推理”。

Graph-RAG 的典型流程：

1. 从文档抽取实体和关系
2. 写入图数据库
3. 用户提问后先图查询拿证据路径
4. 再把路径证据交给 LLM 生成答案

适合：

- 法规问答（条款之间引用关系）
- 金融研报（公司-事件-行业链条）
- 技术排障（组件依赖关系）

### 6.2 场景二：多步任务编排与可观测

Agent 执行是图结构：计划 -> 子任务 -> 工具 -> 结果 -> 反思。

Neo4j 可以保存：

- 任务 DAG
- 每次工具调用输入输出
- 失败原因与重试策略
- 最终成功路径

这样你能做“经验复用”：

`新任务` 与 `历史成功任务` 相似时，先复用路径再微调。

### 6.3 场景三：长期记忆（Long-term Memory）

单纯 KV 记忆很难表达“记忆之间的关系”。

图记忆可以表达：

- 用户偏好 -> 适用场景
- 约束 -> 决策 -> 结果
- 事实 -> 来源 -> 置信度

Agent 可按关系检索记忆，而不是只按关键词。

### 6.4 场景四：权限与策略图

复杂企业系统中，权限通常是多层继承：角色、组织、资源、策略。

图模型非常适配这类“谁可以访问什么”的推理问题。

### 6.5 场景五：工具路由与选择

把工具能力建成图：

- 工具 -> 可处理任务类型
- 工具 -> 依赖外部服务
- 工具 -> 成本、时延、成功率

Agent 可以根据上下文走最优路径，不再是固定 if-else。

---

## 7. Neo4j 在 Agent 场景里的关键功能清单

1. 图遍历与路径查询：支持多跳关系推理
2. 全文索引：关键词召回结构化节点
3. 向量索引（Neo4j 5+）：可与语义检索结合
4. 事务支持：保证记忆写入一致性
5. APOC 扩展：批处理、数据转换、图算法辅助
6. GDS（Graph Data Science）：社区检测、相似度、PageRank
7. 角色权限与审计：适合企业级系统

一个常见生产组合是：

- 向量库做粗召回
- Neo4j 做关系重排和证据路径补全
- LLM 基于证据生成可解释答案

---

## 8. JavaScript 实战：从 0 到 1 做一个 Agent 图记忆层

下面代码偏“可直接抄用”的工程风格。

### 8.1 安装依赖

```bash
npm i neo4j-driver zod @langchain/openai @langchain/core langchain
```

### 8.2 封装 Neo4j 客户端

```javascript
// neo4jClient.js
import neo4j from "neo4j-driver";

export const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
);

export async function runCypher(query, params = {}) {
  const session = driver.session({ database: process.env.NEO4J_DB || "neo4j" });
  try {
    const result = await session.run(query, params);
    return result.records.map((r) => r.toObject());
  } finally {
    await session.close();
  }
}
```

### 8.3 初始化约束与索引

```javascript
// initSchema.js
import { runCypher, driver } from "./neo4jClient.js";

async function init() {
  await runCypher(`
		CREATE CONSTRAINT user_id_unique IF NOT EXISTS
		FOR (u:User) REQUIRE u.id IS UNIQUE
	`);

  await runCypher(`
		CREATE CONSTRAINT memory_id_unique IF NOT EXISTS
		FOR (m:Memory) REQUIRE m.id IS UNIQUE
	`);

  await runCypher(`
		CREATE INDEX memory_topic_idx IF NOT EXISTS
		FOR (m:Memory) ON (m.topic)
	`);

  console.log("schema initialized");
  await driver.close();
}

init().catch(console.error);
```

### 8.4 写入用户记忆

```javascript
// memoryRepository.js
import { runCypher } from "./neo4jClient.js";

export async function writeMemory({
  userId,
  memoryId,
  topic,
  content,
  source = "agent",
  confidence = 0.8,
}) {
  const query = `
		MERGE (u:User {id: $userId})
		ON CREATE SET u.createdAt = datetime()
		MERGE (m:Memory {id: $memoryId})
		SET m.topic = $topic,
				m.content = $content,
				m.source = $source,
				m.confidence = $confidence,
				m.updatedAt = datetime()
		MERGE (u)-[r:HAS_MEMORY]->(m)
		SET r.updatedAt = datetime()
		RETURN u.id AS userId, m.id AS memoryId
	`;

  return runCypher(query, {
    userId,
    memoryId,
    topic,
    content,
    source,
    confidence,
  });
}

export async function readMemoriesByTopic(userId, topic) {
  const query = `
		MATCH (u:User {id: $userId})-[:HAS_MEMORY]->(m:Memory)
		WHERE m.topic = $topic
		RETURN m.id AS id, m.content AS content, m.confidence AS confidence, m.updatedAt AS updatedAt
		ORDER BY m.updatedAt DESC
		LIMIT 20
	`;
  return runCypher(query, { userId, topic });
}
```

### 8.5 用 LangChain Tool 把图查询接入 Agent

```javascript
// tools.js
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { readMemoriesByTopic, writeMemory } from "./memoryRepository.js";

export const memoryReadTool = new DynamicStructuredTool({
  name: "memory_read",
  description: "按用户和主题读取图记忆",
  schema: z.object({
    userId: z.string(),
    topic: z.string(),
  }),
  func: async ({ userId, topic }) => {
    const rows = await readMemoriesByTopic(userId, topic);
    return JSON.stringify(rows);
  },
});

export const memoryWriteTool = new DynamicStructuredTool({
  name: "memory_write",
  description: "写入或更新用户图记忆",
  schema: z.object({
    userId: z.string(),
    memoryId: z.string(),
    topic: z.string(),
    content: z.string(),
    confidence: z.number().min(0).max(1).default(0.8),
  }),
  func: async ({ userId, memoryId, topic, content, confidence }) => {
    await writeMemory({ userId, memoryId, topic, content, confidence });
    return "ok";
  },
});
```

### 8.6 用函数调用 Agent 执行

```javascript
// agent.js
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { memoryReadTool, memoryWriteTool } from "./tools.js";

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "你是一个带长期图记忆的助理。先读记忆，再回答；必要时写回新记忆。",
  ],
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

async function main() {
  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools: [memoryReadTool, memoryWriteTool],
    prompt,
  });

  const executor = new AgentExecutor({
    agent,
    tools: [memoryReadTool, memoryWriteTool],
  });

  const result = await executor.invoke({
    input:
      "用户 u_1001 说他偏好简洁风格。请先查询topic=preference；如果没有就写入一条记忆，再给出回应。",
  });

  console.log(result.output);
}

main().catch(console.error);
```

这套最小闭环做到了：

1. Agent 可读取结构化长期记忆
2. Agent 可把新事实写回图数据库
3. 记忆可按关系演化，不只是平铺文本

---

## 9. 进阶：Graph-RAG 的工程化实现建议

### 9.1 推荐架构

1. 文档切分 + 实体关系抽取
2. 写入 Neo4j（实体/关系/来源）
3. 用户问题 -> 实体识别
4. 图查询拿候选证据路径
5. 向量检索补充语义片段
6. 重排融合后交给 LLM
7. 输出答案 + 证据路径

### 9.2 关键数据字段建议

- 节点公共字段：`id`、`name`、`source`、`createdAt`
- 关系公共字段：`confidence`、`extractedBy`、`updatedAt`
- 证据追踪：每条事实保留来源文档 ID 与段落位置

### 9.3 质量评估指标

1. 路径准确率：检索到的路径是否真实支持答案
2. 证据覆盖率：答案关键断言是否都有证据
3. 关系召回率：应召回的关键关系是否遗漏
4. 延迟与成本：多跳查询 + LLM 调用总耗时

---

## 10. 性能优化与常见坑

### 10.1 性能优化清单

1. 给高频过滤字段建索引
2. 大写入使用批处理（UNWIND）
3. 避免无边界变长路径 `*..`
4. 用 `EXPLAIN`/`PROFILE` 看执行计划
5. 限制返回字段，避免把整图返回给应用层

批量写入示例：

```cypher
UNWIND $rows AS row
MERGE (u:User {id: row.userId})
MERGE (m:Memory {id: row.memoryId})
SET m.content = row.content, m.updatedAt = datetime()
MERGE (u)-[:HAS_MEMORY]->(m);
```

### 10.2 常见坑

1. 把所有东西都塞成属性，不建关系
2. `MERGE` 条件写太多字段导致意外重复节点
3. 路径查询不加限制，导致查询爆炸
4. 无版本控制，记忆被覆盖无法回溯
5. 忽略数据清洗，实体同名不同义

### 10.3 安全与治理

1. 最小权限账号，读写分离
2. 敏感属性加密或脱敏
3. 所有写操作记审计日志
4. 定期备份与恢复演练

---

## 11. 学习路线（建议 2~4 周）

### 第 1 周：基础语法与建模

1. 会写 CRUD + MERGE + 路径查询
2. 完成一个领域模型（电商或任务系统）
3. 建好约束和索引

### 第 2 周：项目化实践

1. 用 JavaScript 完成数据导入脚本
2. 封装查询层和仓储层
3. 建立查询性能基线

### 第 3 周：Agent 集成

1. 把 Neo4j 封装成 Tool
2. 做“读记忆-回答-写记忆”闭环
3. 加入可观测数据（任务、工具调用、结果）

### 第 4 周：Graph-RAG 与评测

1. 引入证据路径返回
2. 建评测集（问答 + 标准证据）
3. 用自动化评测看准确率与覆盖率

---

## 12. 一段总结

Neo4j 不只是“另一种数据库”，它更像是 Agent 时代的信息组织方式：

- 当你的系统需要理解“谁和谁有关、为什么有关、能否追溯依据”时，图模型天然占优。
- 在 Agent 开发中，Neo4j 的价值不只是存储，更在于把“计划、决策、工具调用、记忆、证据”串成可解释路径。
- 与向量检索结合后，可以形成“语义召回 + 关系推理 + 证据生成”的完整能力栈。

如果把 LLM 看成大脑、工具看成手脚，那 Neo4j 可以看作“结构化长期记忆与关系神经网络”。

掌握它，你会更容易做出可解释、可复用、可持续演进的 Agent 系统。
