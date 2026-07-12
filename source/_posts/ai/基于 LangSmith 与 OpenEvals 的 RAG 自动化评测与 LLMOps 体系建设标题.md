---
title: "基于 LangSmith 与 OpenEvals 的 RAG 自动化评测与 LLMOps 体系建设标题"
date: 2026-06-11 15:12:56
categories:
  - ai
tags:
  - ai
index_img: /img/covers/ai.svg
banner_img: /img/covers/ai.svg
updated: 2026-07-12
---

大语言模型（LLM）的输出具备天然的**非确定性（Non-deterministic）**。在商业级 RAG（检索增强生成）系统的生产部署中，如何量化评估迭代效果、捕捉线上幻觉、以及对全链路进行质量监控，是 LLMOps（大模型运维）的核心痛点。

本技术文档基于 **LangSmith (JS/TS SDK)** 的现代评估架构与 **OpenEvals** 的轻量化评估范式，解密如何针对 AI Agent 构建自动化回归测试、动态数据集注入与可解释性生产指标度量。

## 一、 LangSmith 四大核心支柱与运行机制 (Mechanisms)
LangSmith 的核心价值在于将黑盒的大模型调用，转化为可离散度量、可可视化追踪的白盒工程数据流。
### 1. Trace (全链路追踪)

- **技术本质**：基于 **OpenTelemetry** 标准或 SDK 内部的上下文字典传导。通过对生成链路中的每个原子节点（如：Embedding 向量检索、Prompt 复合渲染、LLM 吐字、Tool 工具回调）进行劫持，将其抽象为树状结构的 **Runs**（Root Run）与 **Spans**（Child Runs）。
    
- **核心抓手**：捕获单次会话中的 Token 消耗量、每一步的 P95/P99 延迟（Latency）以及最底层的输入/输出原始 JSON 负载，用于Bad Case的无损现场还原。
    

### 2. Monitor (宏观监控仪表盘)

- **技术本质**：对线上生产环境持续上报的 Trace 流进行**时间序列上的时空聚合（Aggregation）**。
    
- **核心抓手**：提供吞吐量（RPS）、系统报错率、成本（Token 耗费走势）以及各节点耗时的热点图谱（Heatmap），帮助架构师识别由于上下文窗口膨胀带来的成本过载与网络性能瓶颈。
    

### 3. Dataset (云端中心化数据集)

- **技术本质**：一个分布式存储在 LangSmith 云端的结构化测试集。每个测试条目（Example）均由业务输入的 `inputs` 与期望的黄金标准答案（Ground Truth）`outputs` 组成。
    
- **核心抓手**：作为回归测试（Regression Testing）的“公共期末题库”，支持直接从线上生产环境中一键克隆 Bad Case 到数据集，实现测试用例的动态演进与非技术人员（产品经理/QA）的协作协同。
### 4. Evaluator (评估裁判) 与 Experiment (实验大盘)

- **技术本质**：**Evaluator** 是一个满足特定的函数签名的闭包函数（输入为 `run` 与 `example`，返回包含 `key` 和 `score` 的结构化对象）。当启动 **Experiment** 时，流水线会驱动 Agent 遍历 Dataset 产生预测，再交由 Evaluator 阅卷，最终在前端矩阵大盘中提供跨版本的**并列对比（Side-by-side Benchmarking）**。
    

## 二、 现代 RAG 评测三元组（RAG Triad）的设计因果

在你提交的 `evaluators.mjs` 中，通过引入 `openevals` 内置的 `RAG_GROUNDEDNESS_PROMPT`、`RAG_HELPFULNESS_PROMPT` 和 `RAG_RETRIEVAL_RELEVANCE_PROMPT` 三大提示词模版，从数学和语义逻辑上完美闭环了 RAG 评测的经典三元组架构。

1. **RAG Groundedness (抗幻觉/忠实度)**
    
    - **输入源**：最终生成的答案 `outputs.answer` $\leftrightarrow$ 检索到的片段 `outputs.context`。
        
    - **所以然**：完全忽略用户最初问了什么，强制断开与现实世界先验知识的联系。让裁判模型化身为“严格的文本阅读理解老师”，审查生成的答案里**每一句话、每一个事实特征，能否在检索到的文档片段中找到出处**。如果模型跳出文档自行发挥，即判定为发生**幻觉（Hallucination）**。
        
2. **RAG Helpfulness (回答有用性/切题度)**
    
    - **输入源**：最终生成的答案 `outputs.answer` $\leftrightarrow$ 原始输入问题 `inputs.question`。
        
    - **所以然**：评估生成的最终文本是否对解决用户的提问起到实质性帮助。防止出现“完全忠实于上下文，但解答的却不是用户想问的问题”这一普遍工程痛点。
        
3. **RAG Retrieval Relevance (检索相关性)**
    
    - **输入源**：检索到的片段 `outputs.context` $\leftrightarrow$ 原始输入问题 `inputs.question`。
        
    - **所以然**：跳过最终的大模型生成阶段，直接卡住 RAG 系统的“上游水源”。如果本项得分低，说明向量数据库召回的知识本身就是噪音。此时应该调优的是 **Embedding 模型、分块策略（Chunking Strategy）或重排（Rerank）机制**，而不是去调整 Prompt。


## 三、 现代 ESM 评测架构源码全景解析

### 1. 黄金测试集构建：`build_dataset.mjs`

**设计意图**：实现数据资产的中心化注入。利用 `createExamples` 的**批量原子化接口**，在云端构建隔离的基准线（Baseline）。

```typescript
import "dotenv/config";
import { Client } from "langsmith";

const DATASET_NAME = "rag-eval-v1";

// 显式定义的 Golden Dataset 数组，强规范定义 inputs 与 outputs 键值格式
const EXAMPLES = [
  { inputs: { question: "无理由退货要在几天内申请？" }, outputs: { answer: "自签收之日起 7 天内支持无理由退货。" } },
  { inputs: { question: "质量问题换货期限是多久？" }, outputs: { answer: "15 天内出现质量问题可免费换货。" } },
  { inputs: { question: "无理由退货运费谁承担？" }, outputs: { answer: "无理由退货由买家承担退货运费。" } },
  { inputs: { question: "客服工作时间是什么？" }, outputs: { answer: "周一至周五 9:00-18:00，周六 10:00-17:00，法定节假日顺延。" } },
  { inputs: { question: "满多少元包邮？" }, outputs: { answer: "满 99 元包邮（部分大件/冷链除外）。" } },
  { inputs: { question: "现货商品多久发货？" }, outputs: { answer: "付款后 24 小时内发货，大促期间 48 小时内。" } },
  { inputs: { question: "支持哪些支付方式？" }, outputs: { answer: "支持微信支付、支付宝、银联云闪付、花呗/信用卡分期（满 500 元可选 3/6/12 期）。" } },
  { inputs: { question: "价保是多久？" }, outputs: { answer: "下单后 7 天内同款降价可申请差价退还。" } },
  { inputs: { question: "金卡会员有什么折扣？" }, outputs: { answer: "金卡享 95 折，并有专属客服和每月满 200 减 30 券。" } },
  { inputs: { question: "积分多少可以抵 1 元？" }, outputs: { answer: "100 积分可抵 1 元，单笔最多抵扣实付金额的 30%。" } },
  { inputs: { question: "手机保修多久？" }, outputs: { answer: "手机、平板、耳机全国联保 1 年。" } },
  { inputs: { question: "紧急问题怎么联系？" }, outputs: { answer: "可拨打 400-800-1234 转 2，接通后报订单号。" } },
];

async function main() {
  // 实例化具有独立凭证的远程控制客户端
  const client = new Client({ apiKey: process.env.LANGCHAIN_API_KEY });

  let dataset;
  try {
    // 幂等性控制：优先读取，防止重复运行脚本导致数据集名称在云端冲突或数据重复膨胀
    dataset = await client.readDataset({ datasetName: DATASET_NAME });
    console.log(`数据集已存在: ${DATASET_NAME}`);
  } catch {
    // 捕获异常说明云端无此数据集，触发初始化创建
    dataset = await client.createDataset(DATASET_NAME, {
      description: "RAG Agent 回归评估集",
    });
    console.log(`已创建数据集: ${DATASET_NAME}`);
  }

  // 批量映射并推送，解耦底层自增 ID 关联
  const created = await client.createExamples(
    EXAMPLES.map((e) => ({
      dataset_id: dataset.id,
      inputs: e.inputs,
      outputs: e.outputs,
    })),
  );

  console.log(`已创建 ${created.length} 条样例`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### 2. 多重裁判逻辑解耦：`evaluators.mjs`

**设计意图**：基于 `createLLMAsJudge` 动态派生出具备连续型得分（`continuous: true`，返回 0 到 1 之间的小数）的高级模型裁判。将具体的指标对象提取，包装为支持解构参数的通用评估器函数。

```typescript

import {
  createLLMAsJudge,
  RAG_GROUNDEDNESS_PROMPT,
  RAG_HELPFULNESS_PROMPT,
  RAG_RETRIEVAL_RELEVANCE_PROMPT,
} from "openevals";
import { ChatOpenAI } from "@langchain/openai";

// 配置裁判专属大模型实例：强确定性（temperature: 0）以保证阅卷结果可复现
const judge = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  configuration: { baseURL: process.env.OPENAI_BASE_URL },
  model: process.env.MODEL_NAME ?? "qwen-plus", 
  temperature: 0,
});

// 1. 实例化 Groundedness 裁判：专注答案与上下文的事实蕴含关系评估
const ragGroundednessJudge = createLLMAsJudge({
  prompt: RAG_GROUNDEDNESS_PROMPT,
  feedbackKey: "rag_groundedness",
  judge,
  continuous: true, // 启用连续评分，使模型能够输出类似 0.85 的细粒度分数，而非粗暴的 0 或 1
});

// 2. 实例化 Helpfulness 裁判：专注最终输出是否切合用户提问的意图
const ragHelpfulnessJudge = createLLMAsJudge({
  prompt: RAG_HELPFULNESS_PROMPT,
  feedbackKey: "rag_helpfulness",
  judge,
  continuous: true,
});

// 3. 实例化 Retrieval Relevance 裁判：专注向量召回层面的精确度评估
const ragRetrievalRelevanceJudge = createLLMAsJudge({
  prompt: RAG_RETRIEVAL_RELEVANCE_PROMPT,
  feedbackKey: "rag_retrieval_relevance",
  judge,
  continuous: true,
});

/**
 * 包装为符合 LangSmith 评估接口规范的闭包包装函数
 * 【之所以然】：此处解构拿到的 outputs 是被测系统 runRagAgent 返回的实际运行对象
 */
export async function ragGroundednessEvaluator({ outputs }) {
  return ragGroundednessJudge({
    // openevals 内置 RAG 提示词严格要求上下文传入结构为 { documents: string[] }
    context: { documents: outputs.context },
    outputs: { answer: outputs.answer },
  });
}

export async function ragHelpfulnessEvaluator({ inputs, outputs }) {
  // 对齐用户问题与模型实际回答进行两端对等打分
  return ragHelpfulnessJudge({ inputs, outputs: { answer: outputs.answer } });
}

export async function ragRetrievalRelevanceEvaluator({ inputs, outputs }) {
  // 对齐用户问题与向量召回集合，直接绕过大模型自身的生成能力
  return ragRetrievalRelevanceJudge({
    inputs,
    context: { documents: outputs.context },
  });
}

// 导出扁平化的评估器集合，供管道流水线直接加载
export const ragEvaluators = [
  ragGroundednessEvaluator,
  ragHelpfulnessEvaluator,
  ragRetrievalRelevanceEvaluator,
];
```

### 3. 高并发自动化评估流水线：`run.mjs`

**设计意图**：加载最新版本的 **`import { evaluate } from "langsmith/evaluation";`** 函数。引入**异步流式迭代器消耗机制**以同步网络 IO 栅栏，并输出标准的 LangSmith 远程实验仪表盘可视化链接。


```typescript
import "dotenv/config";
import { Client } from "langsmith";
import { evaluate } from "langsmith/evaluation";
import { ask } from "../rag_agent.mjs";
import { ragEvaluators } from "./evaluators.mjs";

const DATASET_NAME = "rag-eval-v1";
const client = new Client({ apiKey: process.env.LANGCHAIN_API_KEY });

/** * 被评测的目标 RAG 拓扑层
 * 【之所以然】：统一数据层面的契约，对下游问答接口返回的多维复杂对象进行提取
 * 将 context 映射为纯文本数组字符串格式，以契合 openevals 的标准输入。
 */
async function runRagAgent(inputs) {
  const { answer, context } = await ask(inputs.question);
  return {
    answer,
    context: context.map((d) => d.pageContent), // 扁平化文档对象为纯字符串数组
  };
}

async function main() {
  // 调用现代极简版高阶接口 evaluate 启动并行测试管道
  const result = await evaluate(runRagAgent, {
    data: DATASET_NAME,      // 绑定的云端黄金题库名称
    evaluators: ragEvaluators,// 加载的评估裁判矩阵
    client,                  // 云端鉴权凭证
    // 动态生成实验前缀，方便在多模型（如 qwen vs gpt）对比时在 UI 侧做分类筛选
    experimentPrefix: `rag-openevals-${process.env.MODEL_NAME ?? "qwen"}`,
    maxConcurrency: 2,       // 【关键工程防御】：限制大模型裁判和业务链调用的最高并发，规避 429 Rate Limit
  });

  // =================================================================
  // 【高级 Node.js 工程核心实现】：等待全链路异步流耗尽（Drain Lifecycle）
  // =================================================================
  // 【之所以然】：evaluate 函数在 Node.js 中会立刻返回一个代表云端运行状态的延迟迭代器。
  // 如果不使用 for await...of 进行显式的数据流耗尽（drain），当测试用例较多时，
  // Node.js 主进程会因为本地同步程序提前走完而瞬间异常终止退出，导致云端尚未处理完的裁判请求全部丢失。
  for await (const _row of result) {
    /* 通过空迭代强行维持事件循环，直到云端的所有测试实例全部判分结束并返回 */
  }

  const project = process.env.LANGCHAIN_PROJECT ?? "default";
  console.log("✅ 评测完成");
  console.log("实验名:", result.experimentName);
  console.log(
    "指标: rag_groundedness | rag_helpfulness | rag_retrieval_relevance",
  );
  // 组装并打印标准的公网实验报告访问链路，直接导向可视化大盘
  console.log(
    `报告: https://smith.langchain.com/o/default/projects/p/${encodeURIComponent(project)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```
