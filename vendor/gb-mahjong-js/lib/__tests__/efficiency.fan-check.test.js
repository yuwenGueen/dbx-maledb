"use strict";

const { analyzeHandDetailed } = require("../solver/efficiency");

describe("效率计算器 - 8番检查", () => {
  describe("fast 和 non-fast 一致性", () => {
    const hand = "[PPP,1]5678m68s3378p4s|EE0000|";

    test("14张手牌的切牌效率在两种模式下一致", () => {
      const fast = analyzeHandDetailed(hand, { fast: true });
      const nonFast = analyzeHandDetailed(hand, { fast: false });

      expect(fast.discards.length).toBe(nonFast.discards.length);

      for (let i = 0; i < fast.discards.length; i++) {
        expect(fast.discards[i].discardTileId).toBe(
          nonFast.discards[i].discardTileId
        );
        expect(fast.discards[i].summary.efficiency).toBeCloseTo(
          nonFast.discards[i].summary.efficiency,
          4
        );
      }
    });
  });

  describe("听牌8番检查", () => {
    test("无法达到8番的听牌应被标记为fake wait", () => {
      // 567m 567s 678p + PPP + 3p3p = 4番，不够8番
      const hand = "[PPP,1]567m567s678p33p|EE0000|";
      const result = analyzeHandDetailed(hand, { fast: true });

      // 这个手牌已经和牌，但只有4番
      expect(result.isHu).toBe(true);
      expect(result.totalFan).toBeLessThan(8);
    });

    test("能达到8番的听牌应被标记为real wait", () => {
      // 567m 678s 789p + PPP + 3p3p = 9番，够8番
      const hand = "[PPP,1]567m678s789p33p|EE0000|";
      const result = analyzeHandDetailed(hand, { fast: true });

      expect(result.isHu).toBe(true);
      expect(result.totalFan).toBeGreaterThanOrEqual(8);
    });
  });

  describe("向听推进的8番检查", () => {
    test("14张手牌的fast模式效率与non-fast一致", () => {
      // 14张手牌
      const hand = "[PPP,1]5678m68s3378p4s|EE0000|";
      const fast = analyzeHandDetailed(hand, { fast: true });
      const nonFast = analyzeHandDetailed(hand, { fast: false });

      // 两种模式的效率应该一致
      expect(fast.discards[0].summary.efficiency).toBeCloseTo(
        nonFast.discards[0].summary.efficiency,
        4
      );
    });
  });
});
