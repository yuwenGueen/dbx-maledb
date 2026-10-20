/* eslint-disable new-cap */
/* global BigInt */
"use strict";

const { isShunzi, isGang, isKezi, isJiang, packTileId } = require("./helpers");
const constants = require("../../../core/constants");

const collectBitmap = packs => {
  let bitmap = 0n;
  for (const pack of packs) {
    if (!pack) continue;
    const tid = packTileId(pack);
    if (tid === null || tid === undefined) continue;
    if (isShunzi(pack)) {
      bitmap |= 1n << BigInt(tid - 1);
      bitmap |= 1n << BigInt(tid);
      bitmap |= 1n << BigInt(tid + 1);
    } else if (isGang(pack) || isKezi(pack) || isJiang(pack)) {
      bitmap |= 1n << BigInt(tid);
    }
  }

  return bitmap;
};

const collectTileBitmap = tiles => {
  let bitmap = 0n;
  for (const tile of tiles) {
    bitmap |= tile.GetBitmap();
  }

  return bitmap;
};

const handTileCount = (hand, tileId) => {
  const { packType, packTileId: getPackTileId } = require("./helpers");
  let count = 0;
  for (const tile of hand.tiles) {
    if (tile.GetId() === tileId) count++;
  }

  for (const pack of hand.packs) {
    const type = packType(pack);
    const tid = getPackTileId(pack);
    if (type === constants.PACK_TYPE_SHUNZI) {
      if (tid - 1 === tileId || tid === tileId || tid + 1 === tileId) count++;
    } else if (type === constants.PACK_TYPE_KEZI) {
      if (tid === tileId) count += 3;
    } else if (type === constants.PACK_TYPE_GANG) {
      if (tid === tileId) count += 4;
    }
  }

  return count;
};

const isMenqing = hand => {
  const { isAnshou } = require("./helpers");
  return hand.packs.length === 0 || hand.packs.every(p => isAnshou(p));
};

const bitPopCount = n => {
  let c = 0;
  let val = n;
  while (val) {
    val &= val - 1n;
    c++;
  }

  return c;
};

module.exports = {
  collectBitmap,
  collectTileBitmap,
  handTileCount,
  isMenqing,
  bitPopCount
};
