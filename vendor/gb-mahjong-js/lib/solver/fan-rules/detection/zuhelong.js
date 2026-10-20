/* eslint-disable new-cap */
/* global BigInt */
"use strict";

const constants = require("../../../core/constants");
const {
  isNumberedTile,
  isShunzi,
  tileRank,
  packType,
  packTileId: getPackTileId
} = require("../core/helpers");

const judgeZuhelong = tileBitmap => {
  for (let i = 1; i <= 6; i++) {
    if (
      (tileBitmap & constants.ZuhelongBitmap[i]) ===
      constants.ZuhelongBitmap[i]
    ) {
      return i;
    }
  }

  return 0;
};

const judgePartOfZuhelong = bitmap => {
  const shuBitmap = bitmap & constants.TILE_TYPE_BITMAP_SHU;
  for (let i = 1; i <= 6; i++) {
    if (
      (constants.ZuhelongBitmap[i] | shuBitmap) ===
      constants.ZuhelongBitmap[i]
    ) {
      return true;
    }
  }

  return false;
};

const enumerateZuhelongDecompositions = (hand, zuhelongType) => {
  const results = [];
  const zuhelongBitmap = constants.ZuhelongBitmap[zuhelongType];

  const remaining = [];
  let bm = zuhelongBitmap;
  for (const tile of hand.tiles) {
    const tbm = tile.GetBitmap();
    if (bm & tbm) {
      bm ^= tbm;
    } else {
      remaining.push(tile);
    }
  }

  const counts = new Array(constants.TILE_P + 1).fill(0);
  for (const tile of remaining) {
    counts[tile.GetId()]++;
  }

  const zuhelongPack = {
    type: constants.PACK_TYPE_ZUHELONG,
    tile: { GetId: () => 0, GetBitmap: () => 0n },
    offer: 0,
    zuhelong: zuhelongType
  };

  const meldsNeeded = 1 - hand.packs.length;

  for (let t = constants.TILE_1m; t <= constants.TILE_P; t++) {
    if (counts[t] < 2) continue;
    counts[t] -= 2;

    const pairPack = {
      type: constants.PACK_TYPE_JIANG,
      tile: { GetId: () => t, GetBitmap: () => 1n << BigInt(t) },
      offer: 0
    };

    if (meldsNeeded <= 0) {
      results.push({ packs: [pairPack, zuhelongPack], zuhelongPack });
    } else {
      const melds = findNMelds(counts, meldsNeeded);
      if (melds) {
        results.push({
          packs: [...melds, pairPack, zuhelongPack],
          zuhelongPack
        });
      }
    }

    counts[t] += 2;
  }

  return results;
};

const findNMelds = (counts, n) => {
  if (n === 0) {
    for (let t = constants.TILE_1m; t <= constants.TILE_P; t++) {
      if (counts[t] !== 0) return null;
    }

    return [];
  }

  const c = counts.slice();
  const melds = [];
  for (let i = 0; i < n; i++) {
    const meld = findMeld(c);
    if (!meld) return null;
    melds.push(meld);
    const tid = meld.tile.GetId();
    if (meld.type === constants.PACK_TYPE_KEZI) {
      c[tid] -= 3;
    } else if (meld.type === constants.PACK_TYPE_SHUNZI) {
      c[tid - 1]--;
      c[tid]--;
      c[tid + 1]--;
    }
  }

  for (let t = constants.TILE_1m; t <= constants.TILE_P; t++) {
    if (c[t] !== 0) return null;
  }

  return melds;
};

const findMeld = counts => {
  for (let t = constants.TILE_1m; t <= constants.TILE_P; t++) {
    if (counts[t] === 0) continue;

    if (counts[t] >= 3) {
      return {
        type: constants.PACK_TYPE_KEZI,
        tile: { GetId: () => t, GetBitmap: () => 1n << BigInt(t) },
        offer: 0
      };
    }

    if (
      isNumberedTile(t) &&
      tileRank(t) <= 7 &&
      counts[t + 1] > 0 &&
      counts[t + 2] > 0
    ) {
      return {
        type: constants.PACK_TYPE_SHUNZI,
        tile: { GetId: () => t + 1, GetBitmap: () => 1n << BigInt(t + 1) },
        offer: 0
      };
    }

    break;
  }

  return null;
};

const packContainsWinningTile = (pack, winTileId) => {
  const tid = getPackTileId(pack);
  if (isShunzi(pack)) {
    return winTileId === tid - 1 || winTileId === tid || winTileId === tid + 1;
  }

  return tid === winTileId;
};

const markWinningTilePacks = (
  decompositions,
  winTileId,
  handPackCount,
  zimo
) => {
  for (const packs of decompositions) {
    for (let i = 0; i < packs.length; i++) {
      const p = packs[i];
      const type = packType(p);
      if (type === constants.PACK_TYPE_ZUHELONG) continue;
      if (!packContainsWinningTile(p, winTileId)) continue;

      if (i >= handPackCount) {
        const newOffer = zimo ? -1 : -2;
        if (typeof p.SetOffer === "function") {
          p.SetOffer(newOffer);
        } else {
          p.offer = newOffer;
        }

        break;
      }
    }
  }
};

module.exports = {
  judgeZuhelong,
  judgePartOfZuhelong,
  enumerateZuhelongDecompositions,
  findNMelds,
  findMeld,
  packContainsWinningTile,
  markWinningTilePacks
};
