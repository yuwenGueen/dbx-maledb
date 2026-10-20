/* eslint-disable new-cap, complexity */
"use strict";

const constants = require("../../core/constants");
const { normalizeHandInput } = require("../../api/normalize-hand");
const { enumerateDecompositions } = require("../decomposition");
const {
  canonicalizeCandidate,
  createEmptyFanResult
} = require("../fan-optimizer");

const { FanAccumulator } = require("./core/accumulator");
const { collectTileBitmap } = require("./core/bitmap");
const { countOverallAttrFans } = require("./scoring/overall-attr");
const { countKeGangFans } = require("./scoring/ke-gang");
const { countAssociatedCombinationFans } = require("./scoring/combination");
const { countSinglePackFans } = require("./scoring/single-pack");
const { countWinModeFans } = require("./scoring/win-mode");
const {
  judgeCompleteSpecialHu,
  judgeQidui,
  isQuanbukao,
  isQixingbukao,
  isCompleteClosedHand
} = require("./detection/special-hands");
const {
  judgeZuhelong,
  enumerateZuhelongDecompositions,
  markWinningTilePacks
} = require("./detection/zuhelong");
const { calcTing } = require("./ting/calc-ting");

const countBasicFans = (acc, hand, packs, zuhelongType) => {
  countOverallAttrFans(acc, hand, packs, zuhelongType);
  countKeGangFans(acc, packs);
  countAssociatedCombinationFans(acc, packs);
  countSinglePackFans(acc, hand, packs);
  countWinModeFans(acc, hand, packs, zuhelongType);
};

const buildResult = (acc, hand, packs) => {
  const fans = acc.getFans();
  const fanIds = acc.getFanIds();
  const totalFan = acc.getTotal();

  return canonicalizeCandidate({
    isHu: true,
    totalFan,
    fanIds,
    fans,
    decomposition: packs ? { packs } : null
  });
};

const evaluateFanRules = (input, overrides = {}) => {
  const hand = normalizeHandInput(input, overrides);

  let bestResult = null;
  let bestTotal = 0;

  const tileBitmap = collectTileBitmap(hand.tiles);
  const zuhelongType = judgeZuhelong(tileBitmap);

  if (isCompleteClosedHand(hand)) {
    const specialFan = judgeCompleteSpecialHu(hand);
    if (specialFan) {
      const acc = new FanAccumulator();
      acc.addFan(specialFan);
      countWinModeFans(acc, hand, [], 0);

      if (zuhelongType > 0) {
        acc.addFan(constants.FAN_ZUHELONG, []);
      }

      acc.excludeFan(constants.FAN_BUQIUREN);
      acc.excludeFan(constants.FAN_MENQIANQING);
      if (hand.context.zimo) {
        acc.fanTable.delete(constants.FAN_ZIMO);
        acc.excludedTable.delete(constants.FAN_ZIMO);
        acc.addFan(constants.FAN_ZIMO);
      }

      acc.applyExclusions();
      if (acc.getTotal() === 0) {
        acc.addFan(constants.FAN_WUFANHU);
      }

      if (acc.getTotal() > bestTotal) {
        bestTotal = acc.getTotal();
        bestResult = buildResult(acc, hand, null);
      }
    }
  }

  if (isCompleteClosedHand(hand)) {
    const qiduiFan = judgeQidui(hand);
    if (qiduiFan) {
      const acc = new FanAccumulator();
      acc.addFan(qiduiFan);
      countOverallAttrFans(acc, hand, [], 0);
      countWinModeFans(acc, hand, [], 0);
      acc.excludeFan(constants.FAN_BUQIUREN);
      acc.excludeFan(constants.FAN_MENQIANQING);
      if (qiduiFan === constants.FAN_LIANQIDUI) {
        acc.excludeFan(constants.FAN_QINGYISE);
        acc.excludeFan(constants.FAN_WUZI);
      }

      if (hand.context.zimo) {
        acc.fanTable.delete(constants.FAN_ZIMO);
        acc.excludedTable.delete(constants.FAN_ZIMO);
        acc.addFan(constants.FAN_ZIMO);
      }

      acc.applyExclusions();
      if (acc.getTotal() === 0) {
        acc.addFan(constants.FAN_WUFANHU);
      }

      if (acc.getTotal() > bestTotal) {
        bestTotal = acc.getTotal();
        bestResult = buildResult(acc, hand, null);
      }
    }
  }

  const isBukao = isQuanbukao(hand) || isQixingbukao(hand);
  let zuhelongBitmap =
    zuhelongType > 0 ? constants.ZuhelongBitmap[zuhelongType] : 0n;

  let sortedTiles = hand.tiles.slice();
  if (zuhelongBitmap && !isBukao) {
    const remaining = [];
    let bm = zuhelongBitmap;
    for (const tile of sortedTiles) {
      const tbm = tile.GetBitmap();
      if (bm & tbm) {
        bm ^= tbm;
      } else {
        remaining.push(tile);
      }
    }

    sortedTiles = remaining;
  }

  const decompositions = enumerateDecompositions({
    ...hand,
    tiles: sortedTiles
  });

  const winTileId = hand.winningTile
    ? hand.winningTile.GetId()
    : hand.tiles.length > 0
    ? hand.tiles[hand.tiles.length - 1].GetId()
    : 0;

  if (winTileId > 0) {
    markWinningTilePacks(
      decompositions,
      winTileId,
      hand.packs.length,
      hand.context.zimo
    );
  }

  for (const packs of decompositions) {
    const acc = new FanAccumulator();
    countBasicFans(acc, hand, packs, 0);
    acc.applyExclusions();
    if (acc.getTotal() === 0) {
      acc.addFan(constants.FAN_WUFANHU);
    }

    if (acc.getTotal() > bestTotal) {
      bestTotal = acc.getTotal();
      bestResult = buildResult(acc, hand, packs);
    }
  }

  if (zuhelongBitmap && !isBukao) {
    const zuhelongDecomps = enumerateZuhelongDecompositions(hand, zuhelongType);
    for (const { packs: decompPacks, zuhelongPack } of zuhelongDecomps) {
      const packs = [...hand.packs, ...decompPacks];
      markWinningTilePacks(
        [packs],
        winTileId,
        hand.packs.length,
        hand.context.zimo
      );
      const acc = new FanAccumulator();
      countBasicFans(acc, hand, packs, zuhelongType);
      acc.applyExclusions();

      if (acc.hasFan(constants.FAN_WUFANHU)) {
        acc.fanTable.delete(constants.FAN_WUFANHU);
      }

      const zlIdx = packs.indexOf(zuhelongPack);
      acc.addFan(constants.FAN_ZUHELONG, zlIdx >= 0 ? [zlIdx] : []);

      if (acc.getTotal() > bestTotal) {
        bestTotal = acc.getTotal();
        bestResult = buildResult(acc, hand, packs);
      }
    }
  }

  if (bestResult && hand.flowers && hand.flowers.length > 0) {
    for (let i = 0; i < hand.flowers.length; i++) {
      bestResult.fans.push({
        fanId: constants.FAN_HUAPAI,
        score: constants.FAN_SCORE[constants.FAN_HUAPAI],
        matchedPacks: []
      });
      bestResult.fanIds.push(constants.FAN_HUAPAI);
    }

    bestResult.totalFan += hand.flowers.length;
    bestResult.fanIds.sort((a, b) => a - b);
  }

  if (!bestResult) {
    return createEmptyFanResult();
  }

  return bestResult;
};

module.exports = {
  evaluateFanRules,
  calcTing
};
