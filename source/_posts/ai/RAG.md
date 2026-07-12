---
title: "RAG"
date: 2026-07-11 10:38:31
categories:
  - ai
tags:
  - ai
---

## 检索方式

### Sparse Retrieval: BM25 and TF-IDF

### Dense Retrieval: DPR

### Hybrid Retrieval with Reciprocal Rank Fusion

### Learned Sparse Retrieval: SPLADE and SPLADEv2

### ColBERT: Late Interaction

### Retrieval Method Comparison

![Pasted image 20260709180754.png](/img/ai/Pasted%20image%2020260709180754.png)

## 分块策略

分块是将文档分割成以下几部分的过程：(1) 足够小，可以放入嵌入模型的上下文窗口中，(2) 语义上连贯，(3) 包含足够的信息，在独立检索时仍然有用。

1. 固定大小分块重叠
	最简单的策略：将每个W个标记分成连续块之间重叠o个标记的块。
	```python
	from langchain.text_splitter import RecursiveCharacterTextSplitter 
	splitter = RecursiveCharacterTextSplitter(
		chunk_size =512 , # tokens per chunk 
		chunk_overlap =64 , # overlap to preserve context across boundaries 
		length_function =len , 
		separators =["\n\n", "\n", ". ", " ", ""]
	)
	chunks = splitter.split_documents ( documents )
	```
	
2. 语义分块
	而不是在固定间隔处分割，语义块分割是在通过测量连续句子之间的嵌入相似度检测到的主题边界处分割：
	```python
	from langchain_experimental.text_splitter import SemanticChunker 
	from langchain_openai import OpenAIEmbeddings 
	chunker = SemanticChunker (
		embeddings = OpenAIEmbeddings(),
		breakpoint_threshold_type=" percentile ", # or " standard_deviation " 
		breakpoint_threshold_amount =95 , # split at top 5% dissimilarity 
	) 
	chunks = chunker.split_documents ( documents )
	```
	
3. 文档结构感知分块 
	对于结构化文档（Markdown、HTML、代码），在自然边界处分割：
	- Markdown: split at ## headers, preserving section context
	- HTML: split at section,article,p 等tags
	- Code: split at function/class definitions, preserving imports in each chunk
	- Tables: keep entire tables as single chunks; never split mid-row

4. 父-子分块
	一种将检索粒度与生成上下文解耦的强大模式：
	- 索引小的子块（例如，128个标记）以实现精确检索
	- 将大块父级内容（例如，512个标记）返回给LLM以获得更丰富的上下文

	```python
	from langchain.retrievers import ParentDocumentRetriever
	from langchain.storage import InMemoryStore
	from langchain.text_splitter import RecursiveCharacterTextSplitter
	
	parent_splitter = RecursiveCharacterTextSplitter(chunk_size =2000)
	child_splitter = RecursiveCharacterTextSplitter(chunk_size =400)
	
	retriever = ParentDocumentRetriever (
		vectorstore = vectorstore,
		docstore = InMemoryStore(),
		child_splitter = child_splitter,
		parent_splitter = parent_splitter,
	)
	retriever.add_documents(documents)
	```

5. 经验性块大小指南
	![Pasted image 20260708112016.png](/img/ai/Pasted%20image%2020260708112016.png)

## 高级RAG模式
### 查询转换
原始用户查询通常含糊不清、过于简短，或者与文档语言不匹配。查询转换技术可以在搜索步骤之前提高检索效果。

1. HyDE（假设文档嵌入）。不是直接嵌入查询，而是生成一个假设答案并嵌入：
直觉：假设答案与真实文档处于相同的语言层次，从而缩小查询-文档分布差距。

2. Step-Back Prompting（步骤回退提示）。对于特定问题，首先生成一个更一般的“步骤回退”问题，为两者检索并合并上下文。例如：“乙醇在2 atm下的沸点是多少？”→ 步骤回退：“哪些因素影响液体的沸点？”

3. 多查询生成。生成M个不同的查询变体，对每个变体进行检索，并将结果合并：
```python
from langchain.retrievers.multi_query import MultiQueryRetriever
from langchain_openai import ChatOpenAI

retriever = MultiQueryRetriever.from_llm(
	retriever = vectorstore.as_retriever(search_kwargs ={"k": 5}),
	llm = ChatOpenAI ( temperature =0.7),
	include_original = True , # also retrieve for original query
) 
# Internally generates 3 query variants , retrieves for each , deduplicates 
docs = retriever.get_relevant_documents ( query )
```

### 重排 Re-Ranking

在检索出前k个候选者之后，一个交叉编码重排器联合评分每个查询-文档对（同时关注两者），以更高的延迟为代价，产生更准确的相关性得分：
	scross(q, d) = CrossEncoder([q; d])
	
交叉编码器不能用于第一阶段检索（没有预先计算的文档嵌入），但非常适合对一小部分候选集进行重新排名（通常为k = 20-100）。

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("BAAI/bge-reranker-large")
def rerank (query: str, docs: list[str], top_n: int = 5) -> list[str ]:
	pairs = [( query , doc ) for doc in docs]
	scores = reranker.predict(pairs)
	ranked = sorted(zip(scores, docs) , reverse = True)
	return [doc for _ , doc in ranked [:top_n]]
```

### 上下文压缩

检索到的块通常包含与相关段落无关的句子。上下文压缩使用一个LLM来提取仅相关的部分：
```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor

compressor = LLMChainExtractor.from_llm(llm)
compression_retriever = ContextualCompressionRetriever(
	base_compressor = compressor,
	base_retriever = vectorstore.as_retriever()
)
compressed_docs = compression_retriever.get_relevant_documents(query)
```

### 自我RAG Self-RAG

Self-RAG 训练一个单一模型来（1）决定是否检索，（2）生成检索与否的内容，以及（3）使用特殊反思标记对其输出进行评价：
- \[Retrieve]: 模型应该检索额外的段落吗？
- \[IsRel]: 检索到的段落与查询相关吗？
- \[IsSup]: 该生成的陈述是否由检索到的段落推导而来？
- \[IsUse]: 这个整体回应有用吗？

该模型经过端到端训练，以预测这些标记以及响应，从而实现对检索和自我评分的精细控制。

### CRAG：Corrective RAG 纠错RAG


### Adaptive RAG

### Graph RAG

### RAG-Fusion

## Agentic RAG

### Motivation: Limits of Static RAG

### Agentic RAG Architecture

### Multi-Source Routing

### Full Agentic RAG Implementation

### Tool-Augmented RAG

### Search-R1: RL-Trained Agentic RAG
