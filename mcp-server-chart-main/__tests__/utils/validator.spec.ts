import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as Charts from "../../src/charts";
import { FlowDiagramSchema, MindMapSchema } from "../constant";

describe("validator", () => {
  it("should valid schema for mind-map chart", () => {
    // Fix: Use camelCase identifier to match the valid export name.
    const chartType = "mindMap";
    expect(() => {
      const schema = Charts[chartType].schema;
      z.object(schema).safeParse(MindMapSchema);
    }).toThrow("Invalid parameters: node's name '文字动画' should be unique.");
  });

  it("should valid schema for flow diagram chart", () => {
    // Fix: Use camelCase identifier to match the valid export name.
    const chartType = "flowDiagram";
    expect(() => {
      const schema = Charts[chartType].schema;
      z.object(schema).safeParse(FlowDiagramSchema);
    }).toThrow(
      "Invalid parameters: edge pair 'KnowledgeBase-Model' should be unique.",
    );
  });
});
