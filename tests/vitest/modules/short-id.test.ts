import { describe, expect, test } from "vitest";
import { findByShortId, shortId } from "@lib/dashboard/short-id.ts";

const rows = [
  { id: "0190f3a2-7b1c-7000-8000-868329f1" },
  { id: "0190f3a2-7b1d-7000-8000-aaaaaaaa" },
];

describe("short ids", () => {
  test("shortId is the last 8 characters", () => {
    expect(shortId(rows[0].id)).toBe("868329f1");
  });
  test("findByShortId resolves the short form and the full id", () => {
    expect(findByShortId(rows, "868329f1")).toBe(rows[0]);
    expect(findByShortId(rows, rows[1].id)).toBe(rows[1]);
    expect(findByShortId(rows, "nope")).toBeUndefined();
  });
});
