/* eslint-disable max-nested-callbacks */
"use strict";

const fs = require("fs");
const path = require("path");
const { analyzeHand, analyzeHandDetailed } = require("../solver/efficiency");

const packageRoot = path.resolve(__dirname, "..", "..");

const collectLocalRequires = entry => {
  const seen = new Set();
  const pending = [entry];

  while (pending.length > 0) {
    const file = pending.pop();
    if (seen.has(file)) continue;
    seen.add(file);

    const source = fs.readFileSync(file, "utf8");
    const dir = path.dirname(file);
    const requireRe = /require\(["']([^"']+)["']\)/g;
    let match;
    while ((match = requireRe.exec(source))) {
      const specifier = match[1];
      if (!specifier.startsWith(".")) continue;

      const resolved = require.resolve(path.resolve(dir, specifier));
      if (resolved.startsWith(packageRoot)) pending.push(resolved);
    }
  }

  return [...seen];
};

describe("tile efficiency analysis", () => {
  describe("winning hand analysis", () => {
    test("complete hand - should report isHu", () => {
      const result = analyzeHand("[EEE,2][123m]456p789s55m|EE0000");
      expect(result.isHu).toBe(true);
      expect(result.shanten).toBe(-1);
      expect(result.totalFan).toBeGreaterThan(0);
    });

    test("winning hand - should have fan details", () => {
      const result = analyzeHand("[EEE,2][123m]456p789s55m|EE0000");
      expect(result.isHu).toBe(true);
      expect(result).toHaveProperty("totalFan");
      expect(result).toHaveProperty("fanIds");
      expect(result.fanIds.length).toBeGreaterThan(0);
    });
  });

  describe("tenpai analysis", () => {
    test("tenpai hand - waiting for S to complete pair", () => {
      const result = analyzeHand("123m456p789sEEES");
      expect(result.shanten).toBeLessThanOrEqual(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    test("tenpai hand - should show wait quality", () => {
      const result = analyzeHand("123m456p789sEEES");
      if (result.shanten === 0 && result.recommendations.length > 0) {
        const rec = result.recommendations[0];
        expect(rec).toHaveProperty("discardTileId");
        expect(rec).toHaveProperty("acceptanceCount");
        expect(rec).toHaveProperty("fakeAcceptanceCount");
        expect(rec).toHaveProperty("avgFan");
        expect(rec).toHaveProperty("avgRealFan");
      }
    });

    test("tenpai hand - waiting for 1m to complete pair", () => {
      const result = analyzeHand("123m456p789sEEE1m");
      expect(result.shanten).toBeLessThanOrEqual(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    test("tenpai hand - with discard option", () => {
      const result = analyzeHand("123m456p789sEEES1m");
      expect(result.shanten).toBeLessThanOrEqual(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("1-shanten analysis", () => {
    test("1-shanten hand - should find recommendations", () => {
      const result = analyzeHand("123m456p78sEEE1m1m");
      expect(result.shanten).toBeLessThanOrEqual(1);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    test("1-shanten hand - should show acceptance details", () => {
      const result = analyzeHand("123m456p78sEEE1m1m");
      if (result.recommendations.length > 0) {
        const rec = result.recommendations[0];
        expect(rec).toHaveProperty("discardTileId");
        expect(rec).toHaveProperty("acceptanceCount");
        expect(rec).toHaveProperty("fakeAcceptanceCount");
        expect(rec).toHaveProperty("avgRealFan");
      }
    });
  });

  describe("real vs fake wait distinction", () => {
    test("should distinguish real waits (8+ fan) from fake waits", () => {
      const result = analyzeHand("123m456p789sEEES");
      if (result.shanten === 0 && result.recommendations.length > 0) {
        const rec = result.recommendations[0];
        expect(typeof rec.acceptanceCount).toBe("number");
        expect(typeof rec.fakeAcceptanceCount).toBe("number");
      }
    });
  });

  describe("average fan calculation", () => {
    test("should calculate average fan for real waits", () => {
      const result = analyzeHand("123m456p789sEEES");
      if (result.shanten === 0 && result.recommendations.length > 0) {
        const rec = result.recommendations[0];
        expect(typeof rec.avgFan).toBe("number");
        expect(typeof rec.avgRealFan).toBe("number");
      }
    });
  });

  describe("recommendation sorting", () => {
    test("should sort by shanten ascending", () => {
      const result = analyzeHand("123m456p78sEEE1m1m", { maxShanten: 2 });
      if (result.recommendations.length > 1) {
        for (let i = 1; i < result.recommendations.length; i++) {
          expect(result.recommendations[i - 1].shanten).toBeLessThanOrEqual(
            result.recommendations[i].shanten
          );
        }
      }
    });

    test("should sort by acceptance count descending within same shanten", () => {
      const result = analyzeHand("123m456p78sEEE1m1m");
      if (result.recommendations.length > 1) {
        for (let i = 1; i < result.recommendations.length; i++) {
          const prev = result.recommendations[i - 1];
          const curr = result.recommendations[i];
          if (prev.shanten === curr.shanten) {
            expect(prev.acceptanceCount).toBeGreaterThanOrEqual(
              curr.acceptanceCount
            );
          }
        }
      }
    });
  });

  describe("edge cases", () => {
    test("empty hand should return error", () => {
      expect(() => analyzeHand("")).toThrow();
    });

    test("hand with melds should work", () => {
      const result = analyzeHand("[EEE,2]456p789s123m5m");
      expect(result).toHaveProperty("shanten");
      expect(result).toHaveProperty("recommendations");
    });
  });

  describe("detailed recursive efficiency analysis", () => {
    test("13-tile analysis returns one visible draw layer from strict shanten advances", () => {
      const result = analyzeHandDetailed("11122233mEEEFP", {
        maxShanten: 3,
        shantenModes: ["normal"]
      });

      expect(result.tileCount).toBe(13);
      expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
      expect(result.shanten).toBe(1);
      expect(result.summary.acceptanceCount).toBeGreaterThan(0);
      expect(result.summary.acceptanceTileCount).toBeGreaterThan(0);
      expect(result.summary.efficiency).toBeGreaterThanOrEqual(0);
      expect(result.improvements).toBe(null);
      expect(result.draws).toHaveLength(result.summary.acceptanceCount);

      result.draws.forEach(draw => {
        expect(draw.shanten).toBeLessThan(result.shanten);
        expect(draw.elapsedMs).toBeGreaterThanOrEqual(0);
        expect(draw.remainingCount).toBeGreaterThan(0);
        expect(draw.summary).toHaveProperty("avgFan");
        expect(draw.summary).toHaveProperty("efficiency");
        expect(draw.summary).toHaveProperty("mainFans");
        expect(draw.discards.length).toBeGreaterThan(0);
        draw.discards.forEach(discard => {
          expect(discard.shanten).toBeLessThanOrEqual(result.shanten);
        });
      });
    });

    test("14-tile analysis enumerates unique discards and returns only zero-layer summaries", () => {
      const result = analyzeHandDetailed("11112222mEEEFFF", {
        maxShanten: 3,
        shantenModes: ["normal"]
      });

      expect(result.tileCount).toBe(14);
      expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
      expect(result.discards.length).toBeGreaterThan(0);
      expect(new Set(result.discards.map(d => d.discardTileId)).size).toBe(
        result.discards.length
      );

      result.discards.forEach(discard => {
        expect(discard.elapsedMs).toBeGreaterThanOrEqual(0);
        expect(discard.summary).toHaveProperty("acceptanceCount");
        expect(discard.summary).toHaveProperty("efficiency");
        expect(discard.summary).toHaveProperty("avgFan");
        expect(discard.summary).toHaveProperty("mainFans");
        expect(discard.draws).toBeUndefined();
      });
    });

    test("14-tile analysis supports hands with melds", () => {
      const result = analyzeHandDetailed("[PPP,1]1346m345s2399p", {
        maxShanten: 3,
        shantenModes: ["normal"],
        compact: true,
        fast: false
      });

      expect(result.tileCount).toBe(14);
      expect(result.discards.length).toBeGreaterThan(0);
      expect(
        result.discards.some(discard => discard.summary.efficiency > 0)
      ).toBe(true);
      expect(
        result.discards.some(
          discard => typeof discard.summary.expectedFan === "number"
        )
      ).toBe(true);
      result.discards.forEach(discard => {
        expect(discard.summary).toHaveProperty("acceptanceCount");
        expect(discard.draws).toBeUndefined();
      });
    });

    test("14-tile analysis excludes regressing discards by default", () => {
      const result = analyzeHandDetailed("123578999m456p47s", {
        maxShanten: 3,
        fast: true,
        compact: true
      });

      expect(result.discards.length).toBeGreaterThan(0);
      result.discards.forEach(discard => {
        expect(discard.shanten).toBe(result.shanten);
      });
    });

    test("14-tile analysis records elapsed time for discard options", () => {
      const result = analyzeHandDetailed("123578999m456p47s", {
        maxShanten: 3,
        shantenModes: ["normal"],
        fast: false
      });

      expect(result.elapsedMs).toBeGreaterThan(0);
      expect(result.discards.some(discard => discard.elapsedMs > 0)).toBe(true);
    });

    test("debug mode includes compact draw contribution details", () => {
      const result = analyzeHandDetailed("123578999m456p47s", {
        maxShanten: 3,
        shantenModes: ["normal"],
        compact: true,
        fast: false,
        debug: true
      });
      const debugDiscard = result.discards.find(
        discard => discard.debug && discard.debug.draws.length > 0
      );

      expect(debugDiscard).toBeDefined();
      expect(debugDiscard.debug.draws[0]).toHaveProperty("tileId");
      expect(debugDiscard.debug.draws[0]).toHaveProperty("efficiency");
      expect(debugDiscard.debug.draws[0]).toHaveProperty("discards");
      expect(JSON.stringify(debugDiscard.debug)).not.toContain("matchedPacks");
    });

    test("remaining tile overrides reduce acceptance counts and efficiency", () => {
      const base = analyzeHandDetailed("123578999m456p47s", {
        maxShanten: 3,
        shantenModes: ["normal"],
        compact: true,
        fast: false
      });
      const limited = analyzeHandDetailed("123578999m456p47s", {
        maxShanten: 3,
        shantenModes: ["normal"],
        compact: true,
        fast: false,
        remainingTiles: { 6: 0 }
      });
      const baseDiscard = base.discards.find(
        discard => discard.discardTileId === 13
      );
      const limitedDiscard = limited.discards.find(
        discard => discard.discardTileId === 13
      );

      expect(limitedDiscard.summary.acceptanceTileCount).toBeLessThan(
        baseDiscard.summary.acceptanceTileCount
      );
      expect(limitedDiscard.summary.efficiency).toBeLessThan(
        baseDiscard.summary.efficiency
      );
    });

    test("discard options are sorted by efficiency within the same shanten", () => {
      const result = analyzeHandDetailed("12357899m456p58sN", {
        maxShanten: 3,
        shantenModes: ["normal"],
        compact: true,
        fast: false
      });

      for (let i = 1; i < result.discards.length; i++) {
        if (result.discards[i - 1].shanten === result.discards[i].shanten) {
          expect(
            result.discards[i - 1].summary.efficiency
          ).toBeGreaterThanOrEqual(result.discards[i].summary.efficiency);
        }
      }
    });

    test("draw summaries use the best discard efficiency instead of summing duplicate waits", () => {
      const result = analyzeHandDetailed("123578999m456p4s", {
        maxShanten: 3,
        shantenModes: ["normal"],
        compact: false,
        fast: false
      });

      result.draws.forEach(draw => {
        if (draw.discards.length > 0) {
          expect(draw.summary.efficiency).toBeCloseTo(
            Math.max(
              ...draw.discards.map(discard => discard.summary.efficiency || 0)
            )
          );
        }
      });
    });

    test("tenpai summary includes probability-weighted self-draw efficiency", () => {
      const result = analyzeHandDetailed("112233445566mE", {
        maxShanten: 3,
        shantenModes: ["normal"]
      });
      const weightedFan = result.tenpai.details.reduce(
        (sum, detail) =>
          sum +
          detail.expectedFan *
            detail.efficiency *
            (detail.tileId === 28 ? 3 / 4 : 0),
        0
      );
      const efficiency = result.tenpai.details.reduce(
        (sum, detail) =>
          sum + detail.efficiency * (detail.tileId === 28 ? 3 / 4 : 0),
        0
      );

      expect(result.tenpai.efficiency).toBeGreaterThanOrEqual(0);
      expect(result.tenpai.expectedFan).toBeCloseTo(weightedFan / efficiency);
      result.tenpai.details.forEach(detail => {
        expect(detail).toHaveProperty("ronFan");
        expect(detail).toHaveProperty("tsumoFan");
        expect(detail).toHaveProperty("efficiency");
      });
    });

    test("expected fan is averaged by effective win weight", () => {
      const result = analyzeHandDetailed("12355789m12345p", {
        maxShanten: 3,
        shantenModes: ["normal"]
      });
      const tsumoOnly = result.tenpai.details.find(
        detail => detail.ronFan < 8 && detail.tsumoFan >= 8
      );

      expect(tsumoOnly).toBeDefined();
      expect(tsumoOnly.efficiency).toBeCloseTo(0.25);
      expect(tsumoOnly.expectedFan).toBeGreaterThanOrEqual(8);
      expect(result.tenpai.expectedFan).toBeGreaterThanOrEqual(8);
      expect(result.tenpai.expectedFan).toBeLessThan(9);
    });

    test("compact detailed analysis omits verbose fan result payloads", () => {
      const result = analyzeHandDetailed("123578999m456p47s", {
        maxShanten: 3,
        fast: true,
        compact: true
      });
      const serialized = JSON.stringify(result);

      expect(serialized).not.toContain("fanNames");
      expect(serialized).not.toContain("matchedPacks");
      expect(Buffer.byteLength(serialized)).toBeLessThan(300000);
    });

    test("browser package entry exposes compact efficiency analysis", () => {
      const efficiencyPath = path.join(packageRoot, "efficiency.js");
      const efficiency = require(efficiencyPath);
      const result = efficiency.analyzeEfficiency("12357899m456p58sN", {
        maxShanten: 3,
        shantenModes: ["normal"]
      });

      expect(fs.existsSync(path.join(packageRoot, "efficiency.d.ts"))).toBe(
        true
      );
      expect(efficiency).toHaveProperty("analyzeHandDetailed");
      expect(result.tileCount).toBe(14);
      expect(result.discards.length).toBeGreaterThan(0);
      expect(JSON.stringify(result)).not.toContain("matchedPacks");
    });

    test("browser package entry does not depend on native bridge modules", () => {
      const entry = path.join(packageRoot, "efficiency.js");
      const files = collectLocalRequires(entry);
      const serializedFiles = files.join("\n");
      const serializedSources = files
        .map(file => fs.readFileSync(file, "utf8"))
        .join("\n");

      expect(serializedFiles).not.toContain("native-bridge");
      expect(serializedSources).not.toContain('require("child_process")');
      expect(serializedSources).not.toContain('require("fs")');
      expect(serializedSources).not.toContain('require("path")');
    });
  });
});
