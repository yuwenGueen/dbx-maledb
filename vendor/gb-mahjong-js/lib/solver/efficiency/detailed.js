/* eslint-disable new-cap */
"use strict";

const Tile = require("../../core/tile");
const { normalizeHandInput } = require("../../api/normalize-hand");
const { judgeHu } = require("../judge-hu");
const { evaluateFanRules } = require("../fan-rules");
const { evaluateWaitQuality } = require("./wait-quality");
const { getMainFans } = require("./main-fan");
const {
  TILE_MIN,
  TILE_MAX,
  formatTileIds,
  cloneWithDiscard,
  addTileToHand,
  visibleCounts,
  countKey,
  uniqueTileIds,
  totalTileCount,
  normalizeRemainingTiles,
  handKey,
  minShanten
} = require("./hand-utils");
const {
  expectedFanFromWeight,
  emptySummary,
  summarizeDraws,
  summarizeDiscards,
  sortByQuality
} = require("./summary");
const { compactDebug, compactResult } = require("./compact-output");

const now = () => Date.now();

const createAnalyzer = config => {
  const {
    exhaustedTiles,
    maxDepth,
    shantenOptions,
    fast,
    allowRegression,
    debug,
    remainingTiles
  } = config;
  const remainingOverrides = normalizeRemainingTiles(remainingTiles);
  const memo = new Map();
  const tenpaiMemo = new Map();
  const countsMemo = new Map();
  const huMemo = new Map();
  const waitsMemo = new Map();

  const getVisibleCounts = hand => {
    const key = handKey(hand);
    if (!countsMemo.has(key)) countsMemo.set(key, visibleCounts(hand));
    return countsMemo.get(key);
  };

  const getRemainingCount = (hand, tileId) =>
    Object.prototype.hasOwnProperty.call(remainingOverrides, tileId)
      ? remainingOverrides[tileId]
      : Math.max(0, 4 - getVisibleCounts(hand)[tileId]);

  const judgeHuCached = hand => {
    const key =
      countKey(hand) +
      "/" +
      (hand.winningTile ? hand.winningTile.GetId() : 0) +
      "/" +
      (hand.context && hand.context.zimo ? 1 : 0) +
      "/" +
      (hand.context && hand.context.juezhang ? 1 : 0);
    if (!huMemo.has(key)) huMemo.set(key, judgeHu(hand));
    return huMemo.get(key);
  };

  const findTenpaiWaitsCached = hand => {
    const key = handKey(hand);
    if (waitsMemo.has(key)) return waitsMemo.get(key);

    const waits = [];
    for (let tileId = TILE_MIN; tileId <= TILE_MAX; tileId++) {
      if (getRemainingCount(hand, tileId) <= 0) continue;

      const testHand = {
        ...addTileToHand(hand, tileId),
        winningTile: new Tile(tileId)
      };

      if (judgeHuCached(testHand)) waits.push(tileId);
    }

    waitsMemo.set(key, waits);
    return waits;
  };

  const tenpaiSummaryCached = hand => {
    const waits = findTenpaiWaitsCached(hand);
    const quality = evaluateWaitQuality(hand, waits, exhaustedTiles);

    const summary = {
      shanten: 0,
      isTenpai: true,
      waits,
      realWaitCount: quality.realWaitCount,
      fakeWaitCount: quality.fakeWaitCount,
      totalWaits: quality.totalWaits,
      acceptanceCount: quality.realWaitCount,
      acceptanceTileCount: waits.reduce(
        (sum, tileId) => sum + getRemainingCount(hand, tileId),
        0
      ),
      efficiency: quality.details.reduce(
        (sum, detail) =>
          sum +
          (detail.efficiency || 0) *
            (getRemainingCount(hand, detail.tileId) / 4),
        0
      ),
      weightedFan: quality.details.reduce(
        (sum, detail) =>
          sum +
          (detail.expectedFan || 0) *
            (detail.efficiency || 0) *
            (getRemainingCount(hand, detail.tileId) / 4),
        0
      ),
      avgFan: quality.avgFan,
      avgRealFan: quality.avgRealFan,
      mainFans: getMainFans(quality.details),
      details: quality.details
    };
    summary.expectedFan = expectedFanFromWeight(
      summary.weightedFan,
      summary.efficiency
    );
    return summary;
  };

  const quickTenpaiSummaryCached = hand => {
    const waits = findTenpaiWaitsCached(hand);
    const quality = evaluateWaitQuality(hand, waits, exhaustedTiles);

    const efficiency = quality.details.reduce(
      (sum, detail) =>
        sum +
        (detail.efficiency || 0) * (getRemainingCount(hand, detail.tileId) / 4),
      0
    );
    const weightedFan = quality.details.reduce(
      (sum, detail) =>
        sum +
        (detail.expectedFan || 0) *
          (detail.efficiency || 0) *
          (getRemainingCount(hand, detail.tileId) / 4),
      0
    );

    const summary = {
      shanten: 0,
      isTenpai: true,
      waits,
      realWaitCount: quality.realWaitCount,
      fakeWaitCount: quality.fakeWaitCount,
      totalWaits: quality.totalWaits,
      acceptanceCount: quality.realWaitCount,
      acceptanceTileCount: waits.reduce(
        (sum, tileId) => sum + getRemainingCount(hand, tileId),
        0
      ),
      efficiency,
      weightedFan,
      avgFan: quality.avgFan,
      avgRealFan: quality.avgRealFan,
      mainFans: getMainFans(quality.details),
      details: quality.details
    };
    summary.expectedFan = expectedFanFromWeight(
      summary.weightedFan,
      summary.efficiency
    );
    return summary;
  };

  const buildQuickDrawsCached = (hand, shanten) => {
    const draws = [];

    for (let tileId = TILE_MIN; tileId <= TILE_MAX; tileId++) {
      const count = getRemainingCount(hand, tileId);
      if (count <= 0) continue;

      const drawnHand = addTileToHand(hand, tileId);
      const drawnShanten = judgeHuCached(drawnHand)
        ? -1
        : minShanten(drawnHand, shantenOptions);
      if (drawnShanten >= shanten) continue;

      const discards = uniqueTileIds(drawnHand)
        .map(discardTileId => {
          const afterDiscard = cloneWithDiscard(drawnHand, discardTileId);
          const discardShanten = minShanten(afterDiscard, shantenOptions);
          if (discardShanten > drawnShanten) return null;

          // 当切牌后听牌时，检查能否达到 8 番
          if (discardShanten === 0) {
            const waits = findTenpaiWaitsCached(afterDiscard);
            const quality = evaluateWaitQuality(
              afterDiscard,
              waits,
              exhaustedTiles
            );
            if (quality.realWaitCount === 0) return null;
          }

          // 当切牌后听牌时，使用 tenpaiSummaryCached 计算真实番数
          const summary =
            discardShanten === 0
              ? tenpaiSummaryCached(afterDiscard)
              : emptySummary(discardShanten);

          return {
            discardTileId,
            shanten: discardShanten,
            summary,
            tenpai: discardShanten === 0 ? summary : null,
            improvements: null
          };
        })
        .filter(Boolean)
        .sort(sortByQuality);

      if (discards.length === 0) continue;

      draws.push({
        tileId,
        remainingCount: count,
        shanten: drawnShanten,
        summary: summarizeDiscards(drawnShanten, discards),
        discards
      });
    }

    return draws.sort(sortByQuality);
  };

  const analyze13Full = hand => {
    const key = handKey(hand);
    if (memo.has(key)) return memo.get(key);

    const shanten = minShanten(hand, shantenOptions);

    if (fast) {
      const draws = shanten <= 0 ? [] : buildQuickDrawsCached(hand, shanten);
      const summary =
        shanten <= 0
          ? quickTenpaiSummaryCached(hand)
          : summarizeDraws(shanten, draws);
      const result = {
        shanten,
        summary,
        tenpai: shanten <= 0 ? summary : null,
        draws,
        improvements: null
      };
      memo.set(key, result);
      return result;
    }

    if (shanten <= 0) {
      const key = handKey(hand);
      const summary = tenpaiMemo.has(key)
        ? tenpaiMemo.get(key)
        : fast
        ? quickTenpaiSummaryCached(hand)
        : tenpaiSummaryCached(hand);
      tenpaiMemo.set(key, summary);
      const result = {
        shanten: 0,
        summary,
        tenpai: summary,
        draws: [],
        improvements: null
      };
      memo.set(key, result);
      return result;
    }

    const draws = [];

    for (let tileId = TILE_MIN; tileId <= TILE_MAX; tileId++) {
      const startedAt = now();
      const count = getRemainingCount(hand, tileId);
      if (count <= 0) continue;

      const drawnHand = addTileToHand(hand, tileId);
      const drawnShanten = judgeHuCached(drawnHand)
        ? -1
        : minShanten(drawnHand, shantenOptions);
      if (drawnShanten >= shanten) continue;

      const discards = enumerateNonRegressingDiscards(
        drawnHand,
        drawnShanten,
        false
      );
      if (discards.length === 0) continue;

      const summary = summarizeDiscards(drawnShanten, discards);
      draws.push({
        tileId,
        remainingCount: count,
        shanten: drawnShanten,
        summary,
        discards,
        elapsedMs: now() - startedAt
      });
    }

    draws.sort(sortByQuality);

    const result = {
      shanten,
      summary: summarizeDraws(shanten, draws),
      tenpai: null,
      draws,
      improvements: null
    };
    memo.set(key, result);
    return result;
  };

  const summarize13Zero = hand => {
    if (fast) {
      const shanten = minShanten(hand, shantenOptions);
      if (shanten <= 0) {
        const summary = quickTenpaiSummaryCached(hand);
        return { shanten: 0, summary, tenpai: summary, improvements: null };
      }

      const draws = buildQuickDrawsCached(hand, shanten);
      const summary = summarizeDraws(shanten, draws);
      return { shanten, summary, tenpai: null, draws, improvements: null };
    }

    const result = analyze13Full(hand);
    return {
      shanten: result.shanten,
      summary: result.summary,
      tenpai: result.tenpai,
      draws: result.draws,
      improvements: null
    };
  };

  const enumerateNonRegressingDiscards = (
    hand,
    baseShanten,
    recurseSummaries
  ) => {
    const discards = [];

    for (const discardTileId of uniqueTileIds(hand)) {
      const startedAt = now();
      const afterDiscard = cloneWithDiscard(hand, discardTileId);
      if (!afterDiscard) continue;

      const waits = baseShanten <= 0 ? findTenpaiWaitsCached(afterDiscard) : [];
      const shanten =
        waits.length > 0 ? 0 : minShanten(afterDiscard, shantenOptions);
      if (shanten > baseShanten) continue;

      const result =
        recurseSummaries && maxDepth > 0
          ? analyze13Full(afterDiscard)
          : summarize13Zero(afterDiscard);
      discards.push({
        discardTileId,
        shanten,
        summary: result.summary,
        tenpai: result.tenpai || null,
        improvements: null,
        elapsedMs: now() - startedAt
      });
    }

    discards.sort(sortByQuality);
    return discards;
  };

  return {
    analyze13Full,
    summarize13Zero,
    enumerate14: hand => {
      const candidates = uniqueTileIds(hand)
        .map(discardTileId => {
          const afterDiscard = cloneWithDiscard(hand, discardTileId);
          const shanten = minShanten(afterDiscard, shantenOptions);
          return { discardTileId, afterDiscard, shanten };
        })
        .filter(candidate => candidate.afterDiscard);
      const baseShanten =
        candidates.length > 0
          ? Math.min(...candidates.map(candidate => candidate.shanten))
          : 2;

      return candidates
        .filter(
          candidate => allowRegression || candidate.shanten <= baseShanten
        )
        .map(candidate => {
          const startedAt = now();
          const result = summarize13Zero(candidate.afterDiscard);
          const elapsedMs = now() - startedAt;
          return {
            discardTileId: candidate.discardTileId,
            shanten: result.shanten,
            summary: result.summary,
            tenpai: result.tenpai || null,
            improvements: null,
            debug: debug ? compactDebug(result) : undefined,
            elapsedMs
          };
        })
        .sort(sortByQuality);
    }
  };
};

const analyzeWinningHand = (hand, exhaustedTiles, handStr) => {
  const fanResult = evaluateFanRules(hand);
  const analyzer = createAnalyzer({
    exhaustedTiles,
    maxDepth: 0,
    shantenOptions: {},
    fast: false,
    allowRegression: false,
    debug: false,
    remainingTiles: {}
  });
  const baseShanten14 = 0;

  return {
    shanten: -1,
    isHu: true,
    totalFan: fanResult.totalFan,
    fanIds: fanResult.fanIds,
    tileCount: totalTileCount(hand),
    hand: handStr,
    discards: analyzer.enumerate14(hand, baseShanten14)
  };
};

const analyzeHandDetailed = (input, options = {}) => {
  const startedAt = now();
  const hand = normalizeHandInput(input, options);
  const exhaustedTiles = options.exhaustedTiles || [];
  const maxDepth = options.maxShanten === undefined ? 99 : options.maxShanten;
  const shantenOptions = options.shantenModes
    ? { modes: options.shantenModes }
    : {};
  const fast = Boolean(options.fast);
  const allowRegression = Boolean(options.allowRegression);
  const debug = Boolean(options.debug);
  const remainingTiles = options.remainingTiles || {};
  const tiles = hand.tiles.map(t => t.GetId());
  const tileCount = totalTileCount(hand);
  const handStr = formatTileIds(tiles);

  if (judgeHu(hand)) {
    const result = analyzeWinningHand(hand, exhaustedTiles, handStr);
    result.elapsedMs = now() - startedAt;
    return options.compact ? compactResult(result) : result;
  }

  const analyzer = createAnalyzer({
    exhaustedTiles,
    maxDepth,
    shantenOptions,
    fast,
    allowRegression,
    debug,
    remainingTiles
  });

  if (tileCount === 13) {
    const result = analyzer.analyze13Full(hand);

    const output = {
      shanten: result.shanten,
      isHu: false,
      tileCount,
      hand: handStr,
      summary: result.summary,
      tenpai: result.tenpai,
      acceptance: result.draws,
      draws: result.draws,
      improvements: result.improvements,
      debug: debug ? compactDebug(result) : undefined,
      elapsedMs: now() - startedAt
    };
    return options.compact ? compactResult(output) : output;
  }

  if (tileCount === 14) {
    const discards = analyzer.enumerate14(hand);
    const shanten =
      discards.length > 0 ? Math.min(...discards.map(d => d.shanten)) : 2;

    const output = {
      shanten,
      isHu: false,
      tileCount,
      hand: handStr,
      discards,
      improvements: null,
      elapsedMs: now() - startedAt
    };
    return options.compact ? compactResult(output) : output;
  }

  const output = {
    shanten: minShanten(hand, shantenOptions),
    isHu: false,
    tileCount,
    hand: handStr,
    summary: emptySummary(minShanten(hand, shantenOptions)),
    discards: [],
    improvements: null,
    elapsedMs: now() - startedAt
  };
  return options.compact ? compactResult(output) : output;
};

module.exports = { analyzeHandDetailed };
