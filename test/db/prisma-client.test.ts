import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

// prisma generate が成功し、schema.prisma の Event モデルが Prisma Client から使えること。
// 生成されていない、または @prisma/client と CLI のバージョンがずれていると、ここで失敗する
describe("Prisma Client（生成物）", () => {
  it("Event モデルが含まれる", () => {
    expect(Prisma.ModelName.Event).toBe("Event");
  });

  it("Event の項目が型として使える（typecheck で検証される）", () => {
    const input: Prisma.EventCreateInput = {
      title: "打ち合わせ",
      description: null,
      startAt: new Date("2026-10-23T01:00:00Z"),
      endAt: new Date("2026-10-23T02:00:00Z"),
      allDay: false,
    };

    expect(Object.keys(input).sort()).toEqual([
      "allDay",
      "description",
      "endAt",
      "startAt",
      "title",
    ]);
  });

  it("Event のスカラー項目が schema.prisma と一致する", () => {
    expect(Object.keys(Prisma.EventScalarFieldEnum).sort()).toEqual([
      "allDay",
      "createdAt",
      "description",
      "endAt",
      "id",
      "startAt",
      "title",
      "updatedAt",
    ]);
  });
});
