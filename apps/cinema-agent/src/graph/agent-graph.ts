import { StateGraph, END, START } from "@langchain/langgraph";
import { MovieAgentState } from "../types/agent-state.js";
import {
  createAgentNode,
  createToolsNode,
  routeAfterAgent,
  type NodeDeps,
} from "./nodes.js";

export interface GraphDeps extends NodeDeps {
  checkpointer: any;
}

/** agent (gọi Gemini) ⇄ tools (gọi backend thật), lặp tới khi mô hình trả lời bằng văn bản */
export function buildAgentGraph(deps: GraphDeps) {
  return new StateGraph(MovieAgentState)
    .addNode("agent", createAgentNode(deps) as any)
    .addNode("tools", createToolsNode(deps) as any)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", routeAfterAgent as any, {
      tools: "tools",
      end: END,
    })
    .addEdge("tools", "agent")
    .compile({ checkpointer: deps.checkpointer });
}

export type AgentGraph = ReturnType<typeof buildAgentGraph>;
