import { describe, expect, test } from "vitest";
import { byOrder, insertKey, reorderKey } from "@components/context/ordering.ts";

const list = [
  { id: "a", order: "a0" },
  { id: "b", order: "a1" },
  { id: "c", order: "a2" },
];

describe("reorderKey", () => {
  test("placing before the first item yields a key that sorts first", () => {
    const key = reorderKey(list, "c", "a")!;
    expect(key < "a0").toBe(true);
  });

  test("placing between two items yields a key that sorts between them", () => {
    const key = reorderKey(list, "a", "c")!;
    expect("a1" < key && key < "a2").toBe(true);
  });

  test("beforeId null appends after the last item", () => {
    const key = reorderKey(list, "a", null)!;
    expect(key > "a2").toBe(true);
  });

  test("returns null for a no-op (item onto itself)", () => {
    expect(reorderKey(list, "a", "a")).toBe(null);
  });

  test("returns null when beforeId is missing", () => {
    expect(reorderKey(list, "a", "zzz")).toBe(null);
  });
});

describe("insertKey", () => {
  test("appends after the last item when no index is given", () => {
    expect(insertKey(list) > "a2").toBe(true);
  });

  test("inserts between neighbors at the given index", () => {
    const key = insertKey(list, 1);
    expect("a0" < key && key < "a1").toBe(true);
  });
});

describe("byOrder", () => {
  test("sorts ascending by order and is stable for equal orders", () => {
    const a = { id: "x", order: "" };
    const b = { id: "y", order: "" };
    expect([a, b].sort(byOrder).map((i) => i.id)).toEqual(["x", "y"]);
  });
});
