---
title: 'Building Agentic AI Systems: From LLM Chains to Autonomous Policy Simulators'
description: 'How we built an Agentic AI system for the Indonesian Ministry of Law to simulate and analyze the impact of new legal policies before enactment.'
date: '2025-09-15'
draft: false
slug: '/pensieve/building-agentic-ai-systems'
tags:
  - AI
  - Agentic AI
  - Langchain
  - LLM
  - Python
---

## Introduction

Agentic AI — systems where LLMs act as autonomous reasoning engines that plan, use tools, and execute multi-step workflows — is rapidly moving from research curiosity to production reality. I had the unique opportunity to build an **AI Policy Simulator** for Indonesia's Ministry of Law and Human Rights (Kemenkumham), a system that enables government officials to model the potential real-world impacts of new legal policies before they're officially enacted.

This post covers the architecture, key design decisions, and lessons learned from building a production agentic AI system for a high-stakes government use case.

## The Problem: Policy Impact Simulation

Before a new regulation is enacted within the AHU Online ecosystem (Indonesia's legal entity management system), decision-makers need answers to complex questions:

- "If we introduce this new compliance requirement, how many businesses will be affected?"
- "What's the estimated processing time impact on current AHU workflows?"
- "Are there conflicting regulations this new policy would interact with?"

These questions require reasoning over large document corpora, structured databases, and historical workflow data — exactly the kind of multi-step, tool-augmented reasoning that agentic AI excels at.

## Architecture: The Multi-Agent Approach

Rather than a single monolithic LLM chain, we used a **multi-agent architecture** where specialized agents handle different aspects of the simulation:

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────────┐
│                  Orchestrator Agent                   │
│  (Plans the simulation, delegates to sub-agents)     │
└──────────┬──────────────────────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌────────┐   ┌────────────┐
│ Legal  │   │ Workflow   │
│ Analyst│   │ Analyst    │
│ Agent  │   │ Agent      │
└────┬───┘   └─────┬──────┘
     │              │
     ▼              ▼
 Document      Database
 Retrieval     Queries
 (RAG)         (SQL)
```

### The Orchestrator

The orchestrator uses an LLM (Llama 3 via Ollama) to break down the user's policy question into a simulation plan:

```python
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

ORCHESTRATOR_SYSTEM = """You are a policy simulation orchestrator for the Indonesian
Ministry of Law. Given a proposed policy, create a structured simulation plan by:
1. Identifying what aspects of the AHU system would be affected
2. Estimating the scope of impact (number of affected entities)
3. Analyzing potential conflicts with existing regulations
4. Projecting workflow changes and processing time impacts

Use the available tools to gather data and reason systematically."""

prompt = ChatPromptTemplate.from_messages([
    ("system", ORCHESTRATOR_SYSTEM),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

orchestrator = create_openai_tools_agent(llm, tools, prompt)
orchestrator_executor = AgentExecutor(
    agent=orchestrator,
    tools=tools,
    verbose=True,
    max_iterations=10,
    handle_parsing_errors=True
)
```

### Tools: The Bridge to Real Data

The power of the agentic approach comes from tools — functions the LLM can call to interact with real systems:

```python
from langchain.tools import tool
from django.db import connection

@tool
def query_affected_entities(policy_type: str, criteria: str) -> str:
    """Query the AHU database to count entities affected by a policy change.

    Args:
        policy_type: Type of legal entity affected (PT, CV, Yayasan, etc.)
        criteria: SQL-safe criteria string for filtering entities

    Returns:
        JSON string with count and representative sample of affected entities
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT entity_type, COUNT(*) as count,
                   AVG(processing_days) as avg_processing
            FROM ahu_entities
            WHERE entity_type = %s AND %s
            GROUP BY entity_type
        """, [policy_type, criteria])
        results = cursor.fetchall()
    return json.dumps({"affected_count": results[0][1], "avg_days": results[0][2]})

@tool
def search_regulations(query: str) -> str:
    """Semantic search over the regulation document corpus.

    Args:
        query: Natural language query about regulations

    Returns:
        Top 3 most relevant regulation excerpts with source citations
    """
    results = regulation_rag.retrieve(query, top_k=3)
    return json.dumps([
        {"content": r["content"], "source": r["metadata"]["doc_id"]}
        for r in results
    ])

@tool
def simulate_workflow_impact(change_description: str) -> str:
    """Run a workflow simulation to estimate processing time impact.

    Args:
        change_description: Description of the workflow change

    Returns:
        Estimated delta in processing time and bottleneck analysis
    """
    return workflow_simulator.estimate_impact(change_description)
```

## Handling the Challenges of Agentic AI in Production

### 1. Grounding and Hallucination Prevention

Government systems have zero tolerance for hallucinated data. We implemented multiple guardrails:

- **Mandatory tool use for data claims**: The system prompt explicitly instructs the agent to use tools for any numerical claim, never to estimate from memory
- **Citation tracking**: Every factual claim in the output is traced back to a tool call result
- **Output validation**: A separate "critic" LLM call validates the final output against the tool call history

```python
def validate_simulation_output(output: str, tool_calls: list) -> dict:
    """Verify all claims in the output are grounded in tool call results."""
    critic_prompt = f"""Given this simulation output and the supporting data from tool calls,
identify any claims that are NOT supported by the tool call results.

Output: {output}
Tool Results: {json.dumps(tool_calls)}

List any unsupported claims or respond with "VALIDATED" if all claims are grounded."""

    validation = critic_llm.invoke(critic_prompt)
    return {"valid": "VALIDATED" in validation.content, "issues": validation.content}
```

### 2. Cost and Latency Management

Agentic AI systems can make many LLM calls per request. We managed this with:

- **Tool call caching**: Results of expensive DB queries are cached for the session duration
- **Early termination**: If the agent reaches a confident conclusion early, it stops before exhausting its iteration budget
- **Streaming**: We stream the agent's "thinking" to the frontend so users see progress during long simulations

### 3. MCP (Model Context Protocol) Integration

For structured data exchange between the Django backend and the Ollama model server, we used MCP (Anthropic's Model Context Protocol). This standardizes how the application exposes tools and resources to the model:

```python
# MCP server exposing AHU data resources
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("AHU Policy Simulator")

@mcp.resource("ahu://entities/{entity_type}")
def get_entity_stats(entity_type: str) -> str:
    """Get statistics for a specific AHU entity type."""
    stats = Entity.objects.filter(type=entity_type).aggregate(
        count=Count('id'),
        avg_processing_days=Avg('processing_days')
    )
    return json.dumps(stats)

@mcp.tool()
def run_compliance_check(policy_text: str) -> dict:
    """Check a proposed policy against existing regulations for conflicts."""
    conflicts = find_regulatory_conflicts(policy_text)
    return {"conflicts": conflicts, "severity": assess_severity(conflicts)}
```

## Key Lessons for Production Agentic AI

1. **Start with a bounded task** — don't give the agent unlimited scope; define clear entry/exit conditions
2. **Tool design is as important as model selection** — well-designed tools with clear docstrings dramatically improve reliability
3. **Always validate before presenting to users** — especially in high-stakes domains like government policy
4. **Log everything** — every tool call, every LLM response; you need this for debugging and audit trails
5. **Hybrid approaches work best** — combine agentic reasoning for complex queries with rule-based systems for simple lookups

## What's Next

We're exploring **multi-modal policy simulation** — incorporating document images, forms, and diagrams into the context alongside text. We're also building a **feedback loop** where government officials can correct simulation outputs, creating a fine-tuning dataset for domain adaptation.

---

_This post is based on my work at Pt Bagus Harapan Tritunggal building the AI Policy Simulator for Kemenkumham._
