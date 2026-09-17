import { describe, expect, it } from "vitest";
import { normalizeGameText, normalizeSnapshotText } from "./richText";
import type { StateSnapshot } from "../types";

describe("STS2 presentation text normalization", () => {
  it.each([
    ["[gold]Gain [red]25[/red] Gold[/gold]", "Gain 25 Gold"],
    ["[GOLD]Upper[/GOLD] [color=#fff]case[/color]", "Upper case"],
    ["First[br]Second[BR /]Third", "First\nSecond\nThird"],
    [
      "[img]res://ui/ironclad_energy.png[/img] + [img width=16]res://ui/block_icon.png[/img]",
      "energy + block",
    ],
    ["Gain {Damage} damage and {Missing_Value} block", "Gain damage and block"],
    ["残缺标签：[gold 黄金[/gold", "残缺标签： 黄金"],
    ["Renderer leak: 25/gold and 3/RED", "Renderer leak: 25 and 3"],
    ["保留中文、énergie 与 日本語。", "保留中文、énergie 与 日本語。"],
  ])("normalizes %j", (source, expected) => {
    expect(normalizeGameText(source)).toBe(expected);
  });

  it("normalizes nested presentation fields without touching protocol identity", () => {
    const snapshot = {
      protocol_version: 1,
      state_revision: 8,
      phase: "event",
      action_pending: false,
      run: {},
      screen: {
        name: "[gold]事件[/gold]",
        options: [
          {
            title: "[green]选择[/green]",
            description: "获得 [gold]25[/gold] 金币",
            action_token: "token/[gold]",
          },
        ],
      },
    } as unknown as StateSnapshot;

    const normalized = normalizeSnapshotText(snapshot) as unknown as {
      screen: {
        name: string;
        options: Array<{
          title: string;
          description: string;
          action_token: string;
        }>;
      };
    };
    expect(normalized.screen.name).toBe("事件");
    expect(normalized.screen.options[0].title).toBe("选择");
    expect(normalized.screen.options[0].description).toBe("获得 25 金币");
    expect(normalized.screen.options[0].action_token).toBe("token/[gold]");
  });
});
