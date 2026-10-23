import { describe, expect, it } from "vitest";
import { getRandom, sequential } from "@/lib/functions";

describe("getRandom", () => {
  it("min 以上 max 以下の整数を返す", () => {
    for (let i = 0; i < 100; i++) {
      const value = getRandom(3, 5);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(5);
    }
  });

  it("min と max が同じならその値を返す", () => {
    expect(getRandom(7, 7)).toBe(7);
  });
});

describe("sequential", () => {
  it("渡した順番に直列で実行し、結果を同じ順で返す", async () => {
    const order: number[] = [];
    const tasks = [1, 2, 3].map((n) => async () => {
      order.push(n);
      return n * 10;
    });

    expect(await sequential(tasks)).toEqual([10, 20, 30]);
    expect(order).toEqual([1, 2, 3]);
  });
});
