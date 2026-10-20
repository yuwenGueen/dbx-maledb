/* eslint-disable new-cap, no-unused-vars, no-negated-condition, complexity */
"use strict";

const constants = require("../../core/constants");
const Tile = require("../../core/tile");
const { judgeHu } = require("../judge-hu");
const { evaluateFanRules } = require("../fan-rules");
const { evaluateWaitQuality, MIN_FAN } = require("./wait-quality");

const TILE_MIN = constants.TILE_1m;
const TILE_MAX = constants.TILE_P;

const cloneHandWithDiscard = (hand, discardTileId) => {
  const tiles = hand.tiles.map(t => t.GetId());
  const idx = tiles.indexOf(discardTileId);
  if (idx === -1) return null;
  tiles.splice(idx, 1);
  tiles.sort((a, b) => a - b);
  return {
    ...hand,
    tiles: tiles.map(id => new Tile(id)),
    winningTile: null
  };
};

const countVisibleTiles = (hand, tileId) => {
  let count = 0;
  for (const tile of hand.tiles) {
    if (tile.GetId() === tileId) count++;
  }

  for (const pack of hand.packs) {
    for (const tile of pack.GetAllTile()) {
      if (tile.GetId() === tileId) count++;
    }
  }

  return count;
};

const findTenpaiWaits = hand => {
  const tiles = hand.tiles.map(t => t.GetId());
  const waits = [];

  for (let t = TILE_MIN; t <= TILE_MAX; t++) {
    const countInHand = tiles.filter(id => id === t).length;
    if (countInHand >= 4) continue;

    const testTiles = [...tiles, t].sort((a, b) => a - b);
    const testHand = {
      ...hand,
      tiles: testTiles.map(id => new Tile(id)),
      winningTile: new Tile(t)
    };

    if (judgeHu(testHand)) waits.push(t);
  }

  return waits;
};

const findTenpaiWaitsFromFullHand = hand => {
  const tiles = hand.tiles.map(t => t.GetId());
  const waits = new Set();

  for (let discardIdx = 0; discardIdx < tiles.length; discardIdx++) {
    const remaining = [
      ...tiles.slice(0, discardIdx),
      ...tiles.slice(discardIdx + 1)
    ];

    for (let t = TILE_MIN; t <= TILE_MAX; t++) {
      const countInRemaining = remaining.filter(id => id === t).length;
      if (countInRemaining >= 4) continue;

      const testTiles = [...remaining, t].sort((a, b) => a - b);
      const testHand = {
        ...hand,
        tiles: testTiles.map(id => new Tile(id)),
        winningTile: new Tile(t)
      };

      if (judgeHu(testHand)) waits.add(t);
    }
  }

  return [...waits];
};

const isHandTenpai = hand => {
  const tiles = hand.tiles.map(t => t.GetId());

  for (let discardIdx = 0; discardIdx < tiles.length; discardIdx++) {
    const remaining = [
      ...tiles.slice(0, discardIdx),
      ...tiles.slice(discardIdx + 1)
    ];

    for (let t = TILE_MIN; t <= TILE_MAX; t++) {
      const countInRemaining = remaining.filter(id => id === t).length;
      if (countInRemaining >= 4) continue;

      const testTiles = [...remaining, t].sort((a, b) => a - b);
      const testHand = {
        ...hand,
        tiles: testTiles.map(id => new Tile(id)),
        winningTile: new Tile(t)
      };

      if (judgeHu(testHand)) return true;
    }
  }

  return false;
};

const findAcceptanceForShanten0 = (hand, discardTileId) => {
  const afterDiscard = cloneHandWithDiscard(hand, discardTileId);
  if (!afterDiscard) return null;

  const waitTileIds = findTenpaiWaits(afterDiscard);
  if (waitTileIds.length === 0) return null;

  const quality = evaluateWaitQuality(afterDiscard, waitTileIds);

  return {
    discardTileId,
    shanten: 0,
    acceptanceCount: quality.realWaitCount,
    fakeAcceptanceCount: quality.fakeWaitCount,
    totalWaits: quality.totalWaits,
    avgFan: quality.avgFan,
    avgRealFan: quality.avgRealFan,
    details: quality.details
  };
};

const findAcceptanceForShanten1 = (hand, discardTileId) => {
  const afterDiscard = cloneHandWithDiscard(hand, discardTileId);
  if (!afterDiscard) return null;

  const acceptanceDetails = [];
  let realAcceptanceCount = 0;
  let fakeAcceptanceCount = 0;
  let totalRealFan = 0;
  let realFanSamples = 0;

  for (let t = TILE_MIN; t <= TILE_MAX; t++) {
    const countInHand = afterDiscard.tiles.filter(tile => tile.GetId() === t)
      .length;
    if (countInHand >= 4) continue;

    const drawnTiles = [...afterDiscard.tiles.map(ti => ti.GetId()), t].sort(
      (a, b) => a - b
    );
    const drawnHand = {
      ...afterDiscard,
      tiles: drawnTiles.map(id => new Tile(id)),
      winningTile: null
    };

    if (!isHandTenpai(drawnHand)) continue;

    const waits = findTenpaiWaitsFromFullHand(drawnHand);
    if (waits.length === 0) continue;

    const quality = evaluateWaitQuality(drawnHand, waits);

    if (quality.realWaitCount > 0) {
      realAcceptanceCount++;
      totalRealFan += quality.avgRealFan;
      realFanSamples++;
    } else {
      fakeAcceptanceCount++;
    }

    acceptanceDetails.push({
      tileId: t,
      realWaits: quality.realWaitCount,
      fakeWaits: quality.fakeWaitCount,
      totalWaits: quality.totalWaits,
      avgFan: quality.avgFan,
      avgRealFan: quality.avgRealFan,
      details: quality.details
    });
  }

  const avgRealFan = realFanSamples > 0 ? totalRealFan / realFanSamples : 0;

  return {
    discardTileId,
    shanten: 1,
    acceptanceCount: realAcceptanceCount,
    fakeAcceptanceCount,
    totalAcceptance: realAcceptanceCount + fakeAcceptanceCount,
    avgRealFan,
    details: acceptanceDetails
  };
};

const analyzeHand = (input, options = {}) => {
  const { normalizeHandInput } = require("../../api/normalize-hand");
  const hand = normalizeHandInput(input, options);
  const maxShanten = options.maxShanten !== undefined ? options.maxShanten : 2;

  const isHu = judgeHu(hand);
  if (isHu) {
    const fanResult = evaluateFanRules(hand);
    return {
      shanten: -1,
      isHu: true,
      totalFan: fanResult.totalFan,
      fanIds: fanResult.fanIds,
      recommendations: []
    };
  }

  const tiles = hand.tiles.map(t => t.GetId());
  const counts = new Array(TILE_MAX + 1).fill(0);
  for (const id of tiles) counts[id]++;

  const isClosedHand = hand.packs.length === 0;
  const is13TileHand = isClosedHand && tiles.length === 13;
  const is14TileHand = tiles.length === 14;

  let currentWaits = [];
  let currentIsTenpai = false;

  if (is13TileHand) {
    currentWaits = findTenpaiWaits(hand);
    currentIsTenpai = currentWaits.length > 0;
  } else if (is14TileHand) {
    currentWaits = findTenpaiWaitsFromFullHand(hand);
    currentIsTenpai = currentWaits.length > 0;
  }

  const recommendations = [];
  const processedDiscards = new Set();

  if (currentIsTenpai && maxShanten >= 0) {
    if (is13TileHand) {
      const quality = evaluateWaitQuality(hand, currentWaits);
      recommendations.push({
        discardTileId: null,
        shanten: 0,
        acceptanceCount: quality.realWaitCount,
        fakeAcceptanceCount: quality.fakeWaitCount,
        totalWaits: quality.totalWaits,
        avgFan: quality.avgFan,
        avgRealFan: quality.avgRealFan,
        details: quality.details
      });
    }
  }

  for (let discard = TILE_MIN; discard <= TILE_MAX; discard++) {
    if (counts[discard] === 0) continue;
    if (processedDiscards.has(discard)) continue;
    processedDiscards.add(discard);

    if (currentIsTenpai && maxShanten >= 0) {
      const result = findAcceptanceForShanten0(hand, discard);
      if (result) {
        recommendations.push(result);
        continue;
      }
    }

    if (maxShanten >= 1) {
      const result = findAcceptanceForShanten1(hand, discard);
      if (result && result.acceptanceCount > 0) {
        recommendations.push(result);
      }
    }
  }

  recommendations.sort((a, b) => {
    if (a.shanten !== b.shanten) return a.shanten - b.shanten;
    if (a.acceptanceCount !== b.acceptanceCount)
      return b.acceptanceCount - a.acceptanceCount;
    return b.avgRealFan - a.avgRealFan;
  });

  const shanten =
    recommendations.length > 0
      ? recommendations[0].shanten
      : currentIsTenpai
      ? 0
      : 2;

  return {
    shanten,
    isHu: false,
    recommendations
  };
};

module.exports = {
  analyzeHand,
  findAcceptanceForShanten0,
  findAcceptanceForShanten1,
  analyzeHandDetailed: require("./detailed").analyzeHandDetailed
};
