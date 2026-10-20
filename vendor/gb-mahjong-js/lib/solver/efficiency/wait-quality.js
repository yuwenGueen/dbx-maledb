/* eslint-disable new-cap, no-unused-vars, max-depth */
"use strict";

const constants = require("../../core/constants");
const { evaluateFanRules } = require("../fan-rules");
const { judgeHu } = require("../judge-hu");
const Tile = require("../../core/tile");

const MIN_FAN = 8;
const TSUMO_PROBABILITY = 0.25;

const scoreWinningHand = (hand, tileId, isExhausted, zimo) => {
  const testHand = {
    ...hand,
    winningTile: new Tile(tileId),
    context: { ...hand.context, juezhang: isExhausted, zimo }
  };

  const result = evaluateFanRules(testHand);
  return result.isHu ? result : null;
};

const pickBestFanResult = (ronResult, tsumoResult) => {
  const ronFan = ronResult ? ronResult.totalFan : 0;
  const tsumoFan = tsumoResult ? tsumoResult.totalFan : 0;
  return {
    ronFan,
    tsumoFan,
    fanResult: tsumoFan > ronFan ? tsumoResult : ronResult || tsumoResult
  };
};

const scoreBaseHand = (baseHand, tileId, isExhausted) =>
  pickBestFanResult(
    scoreWinningHand(baseHand, tileId, isExhausted, false),
    scoreWinningHand(baseHand, tileId, isExhausted, true)
  );

const waitEfficiency = (ronFan, tsumoFan) =>
  ronFan >= MIN_FAN ? 1 : tsumoFan >= MIN_FAN ? TSUMO_PROBABILITY : 0;

const waitExpectedFan = (ronFan, tsumoFan) =>
  ronFan >= MIN_FAN
    ? ronFan * (1 - TSUMO_PROBABILITY) +
      (tsumoFan >= MIN_FAN ? tsumoFan : ronFan) * TSUMO_PROBABILITY
    : tsumoFan >= MIN_FAN
    ? tsumoFan
    : 0;

const totalTileCount = hand =>
  hand.tiles.length + (hand.packs || []).length * 3;

const evaluateWaitQuality = (hand, waitTileIds, exhaustedTiles = []) => {
  const results = [];
  let realWaitCount = 0;
  let fakeWaitCount = 0;
  let totalFan = 0;
  let realWaitFanSum = 0;

  const handTileIds = hand.tiles.map(t => t.GetId());
  const meldTileIds = hand.packs
    ? hand.packs.flatMap(p => p.GetAllTile().map(t => t.GetId()))
    : [];
  const allHandTileIds = [...handTileIds, ...meldTileIds];

  for (const tileId of waitTileIds) {
    const isExhausted =
      !allHandTileIds.includes(tileId) && exhaustedTiles.includes(tileId);

    let bestRonFan = 0;
    let bestTsumoFan = 0;
    let bestFanResult = null;
    let foundHu = false;

    if (hand.winningTile) {
      // 13张听牌：移除winningTile，添加听牌
      const tiles = hand.tiles.map(t => t.GetId());
      const winIdx = tiles.lastIndexOf(hand.winningTile.GetId());
      if (winIdx !== -1) tiles.splice(winIdx, 1);
      tiles.push(tileId);
      tiles.sort((a, b) => a - b);

      const baseHand = {
        ...hand,
        tiles: tiles.map(id => new Tile(id)),
        winningTile: new Tile(tileId)
      };

      const score = scoreBaseHand(baseHand, tileId, isExhausted);
      if (score.fanResult) {
        foundHu = true;
        bestRonFan = score.ronFan;
        bestTsumoFan = score.tsumoFan;
        bestFanResult = score.fanResult;
      }
    } else if (totalTileCount(hand) === 13) {
      // 13张牌无winningTile：直接添加听牌
      const tiles = hand.tiles.map(t => t.GetId());
      tiles.push(tileId);
      tiles.sort((a, b) => a - b);

      const baseHand = {
        ...hand,
        tiles: tiles.map(id => new Tile(id)),
        winningTile: new Tile(tileId)
      };

      const score = scoreBaseHand(baseHand, tileId, isExhausted);
      if (score.fanResult) {
        foundHu = true;
        bestRonFan = score.ronFan;
        bestTsumoFan = score.tsumoFan;
        bestFanResult = score.fanResult;
      }
    } else {
      // 14张牌：尝试每种切牌
      const tiles = hand.tiles.map(t => t.GetId());
      for (let di = 0; di < tiles.length; di++) {
        const rem = [...tiles.slice(0, di), ...tiles.slice(di + 1)];
        rem.push(tileId);
        rem.sort((a, b) => a - b);

        const baseHand = {
          ...hand,
          tiles: rem.map(id => new Tile(id)),
          winningTile: new Tile(tileId)
        };

        const score = scoreBaseHand(baseHand, tileId, isExhausted);
        if (score.fanResult) {
          foundHu = true;
          const bestFan = Math.max(score.ronFan, score.tsumoFan);
          if (bestFan > Math.max(bestRonFan, bestTsumoFan)) {
            bestRonFan = score.ronFan;
            bestTsumoFan = score.tsumoFan;
            bestFanResult = score.fanResult;
          }
        }
      }
    }

    if (!foundHu) {
      results.push({
        tileId,
        fan: 0,
        isRealWait: false,
        isExhausted,
        reason: "not-hu"
      });
      fakeWaitCount++;
      continue;
    }

    const fan = Math.max(bestRonFan, bestTsumoFan);
    const isReal = bestRonFan >= MIN_FAN || bestTsumoFan >= MIN_FAN;
    const efficiency = waitEfficiency(bestRonFan, bestTsumoFan);
    const expectedFan = waitExpectedFan(bestRonFan, bestTsumoFan);

    results.push({
      tileId,
      fan,
      ronFan: bestRonFan,
      tsumoFan: bestTsumoFan,
      efficiency,
      expectedFan,
      isRealWait: isReal,
      isExhausted,
      fanIds: bestFanResult.fanIds,
      fanNames: bestFanResult.fans
    });

    if (isReal) {
      realWaitCount++;
      realWaitFanSum += fan;
    } else {
      fakeWaitCount++;
    }

    if (isReal) totalFan += fan;
  }

  const avgFan = realWaitCount > 0 ? totalFan / realWaitCount : 0;
  const avgRealFan = realWaitCount > 0 ? realWaitFanSum / realWaitCount : 0;

  return {
    totalWaits: results.length,
    realWaitCount,
    fakeWaitCount,
    avgFan,
    avgRealFan,
    details: results
  };
};

module.exports = { evaluateWaitQuality, MIN_FAN };
