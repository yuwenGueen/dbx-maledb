/* eslint-disable new-cap */
"use strict";

const constants = require("../../../core/constants");
const { isHonorTile, tileSuit } = require("../core/helpers");
const { collectTileBitmap, bitPopCount } = require("../core/bitmap");
const { judgePartOfZuhelong } = require("./zuhelong");

const isCompleteClosedHand = hand =>
  Boolean(hand) && hand.packs.length === 0 && hand.tiles.length === 14;

const buildTileCounts = tiles => {
  const counts = new Map();
  for (const tile of tiles) {
    const id = tile.GetId();
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return counts;
};

const isQidui = hand => {
  if (!isCompleteClosedHand(hand)) return false;
  let pairCount = 0;
  for (const count of buildTileCounts(hand.tiles).values()) {
    if (count !== 2 && count !== 4) return false;
    pairCount += count / 2;
  }

  return pairCount === 7;
};

const isLianqidui = hand => {
  if (!isQidui(hand)) return false;
  const uniqueIds = [...new Set(hand.tiles.map(t => t.GetId()))].sort(
    (a, b) => a - b
  );
  for (let i = 1; i < uniqueIds.length; i++) {
    if (
      uniqueIds[i] !== uniqueIds[i - 1] + 1 ||
      tileSuit(uniqueIds[i]) !== tileSuit(uniqueIds[i - 1])
    ) {
      return false;
    }
  }

  return true;
};

const isMeaningfulTile = tileId =>
  tileId >= constants.TILE_1m && tileId <= constants.TILE_P;

const isBukaoStructure = hand => {
  if (!isCompleteClosedHand(hand)) return false;
  const tileIds = hand.tiles.map(t => t.GetId());
  const uniqueTiles = new Set(tileIds);
  if (uniqueTiles.size !== 14 || !tileIds.every(isMeaningfulTile)) return false;
  const bitmap = collectTileBitmap(hand.tiles);
  return judgePartOfZuhelong(bitmap);
};

const isQuanbukao = hand => {
  if (!isBukaoStructure(hand)) return false;
  const honorCount = hand.tiles.filter(t => isHonorTile(t.GetId())).length;
  return honorCount < 7;
};

const isQixingbukao = hand => {
  if (!isBukaoStructure(hand)) return false;
  const honorCount = hand.tiles.filter(t => isHonorTile(t.GetId())).length;
  return honorCount === 7;
};

const judgeCompleteSpecialHu = hand => {
  if (!isCompleteClosedHand(hand)) return 0;
  const bitmap = collectTileBitmap(hand.tiles);
  const cnt = bitPopCount(bitmap);

  if ((bitmap & constants.TILE_TYPE_BITMAP_YAOJIU) === bitmap && cnt === 13) {
    return constants.FAN_SHISANYAO;
  }

  if (
    judgePartOfZuhelong(bitmap) &&
    (bitmap & constants.TILE_TYPE_BITMAP_MEANINGFUL) === bitmap &&
    cnt === 14
  ) {
    if (
      (bitmap & constants.TILE_TYPE_BITMAP_ZI) ===
      constants.TILE_TYPE_BITMAP_ZI
    ) {
      return constants.FAN_QIXINGBUKAO;
    }

    return constants.FAN_QUANBUKAO;
  }

  return 0;
};

const judgeQidui = hand => {
  if (!isQidui(hand)) return 0;
  return isLianqidui(hand) ? constants.FAN_LIANQIDUI : constants.FAN_QIDUI;
};

module.exports = {
  isCompleteClosedHand,
  buildTileCounts,
  isQidui,
  isLianqidui,
  isMeaningfulTile,
  isBukaoStructure,
  isQuanbukao,
  isQixingbukao,
  judgeCompleteSpecialHu,
  judgeQidui
};
