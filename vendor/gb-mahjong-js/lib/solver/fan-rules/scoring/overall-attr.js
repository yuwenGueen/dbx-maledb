/* eslint-disable new-cap, complexity */
"use strict";

const constants = require("../../../core/constants");
const {
  isShu,
  isZi,
  isYaojiu,
  tileRank,
  isGang,
  isKeGang,
  isJiang,
  isShunzi,
  packType,
  packTileId
} = require("../core/helpers");
const {
  collectBitmap,
  collectTileBitmap,
  handTileCount,
  isMenqing
} = require("../core/bitmap");

const excludeYaojiuke = (acc, packs) => {
  for (let i = 0; i < packs.length; i++) {
    const tid = packTileId(packs[i]);
    const rank = tileRank(tid);
    const zi = isZi(tid);
    if (isKeGang(packs[i]) && (rank === 1 || rank === 9 || zi)) {
      acc.excludeFan(constants.FAN_YAOJIUKE, [i]);
    }
  }
};

const countOverallAttrFans = (acc, hand, packs, zuhelongType) => {
  let handBitmap = collectBitmap(hand.packs) | collectTileBitmap(hand.tiles);
  if (zuhelongType > 0) {
    handBitmap |= constants.ZuhelongBitmap[zuhelongType];
  }

  if (zuhelongType === 0) {
    if ((handBitmap & constants.TILE_TYPE_BITMAP_LV) === handBitmap) {
      acc.addFan(constants.FAN_LVYISE);
      acc.excludeFan(constants.FAN_HUNYISE);
    }

    if (isMenqing(hand)) {
      const tileTable = new Map();
      for (const tile of hand.tiles) {
        const id = tile.GetId();
        tileTable.set(id, (tileTable.get(id) || 0) + 1);
      }

      const winTileId = hand.winningTile
        ? hand.winningTile.GetId()
        : hand.tiles[hand.tiles.length - 1].GetId();
      tileTable.set(winTileId, tileTable.get(winTileId) - 1);

      let startTile = -1;
      if (tileTable.get(constants.TILE_1m) > 0) startTile = constants.TILE_1m;
      else if (tileTable.get(constants.TILE_1s) > 0)
        startTile = constants.TILE_1s;
      else if (tileTable.get(constants.TILE_1p) > 0)
        startTile = constants.TILE_1p;

      if (startTile > 0) {
        let flag = true;
        if (
          tileTable.get(startTile) !== 3 ||
          tileTable.get(startTile + 8) !== 3
        ) {
          flag = false;
        }

        for (let i = 2; i <= 8; i++) {
          if (tileTable.get(startTile - 1 + i) !== 1) {
            flag = false;
            break;
          }
        }

        if (flag) {
          acc.addFan(constants.FAN_JIULIANBAODENG);
          acc.excludeFan(constants.FAN_QINGYISE);
          acc.excludeFan(constants.FAN_BUQIUREN);
          acc.excludeFan(constants.FAN_MENQIANQING);
          acc.excludeFan(constants.FAN_WUZI);
          for (let i = 0; i < packs.length; i++) {
            if (isKeGang(packs[i]) && isYaojiu(packTileId(packs[i]))) {
              acc.excludeFan(constants.FAN_YAOJIUKE, [i]);
              break;
            }
          }
        }
      }
    }

    if (
      (handBitmap &
        (constants.TILE_TYPE_BITMAP_YAOJIU &
          ~constants.TILE_TYPE_BITMAP_ZI)) ===
      handBitmap
    ) {
      acc.addFan(constants.FAN_QINGYAOJIU);
      acc.excludeFan(constants.FAN_PENGPENGHU);
      acc.excludeFan(constants.FAN_QUANDAIYAO);
      acc.excludeFan(constants.FAN_WUZI);
      for (let i = 0; i < packs.length; i++) {
        for (let j = i + 1; j < packs.length; j++) {
          if (
            isKeGang(packs[i]) &&
            isKeGang(packs[j]) &&
            tileRank(packTileId(packs[i])) === tileRank(packTileId(packs[j]))
          ) {
            acc.excludeFan(constants.FAN_SHUANGTONGKE, [i, j]);
          }
        }
      }

      excludeYaojiuke(acc, packs);
    }

    if ((handBitmap & constants.TILE_TYPE_BITMAP_ZI) === handBitmap) {
      acc.addFan(constants.FAN_ZIYISE);
      acc.excludeFan(constants.FAN_PENGPENGHU);
      acc.excludeFan(constants.FAN_QUANDAIYAO);
      excludeYaojiuke(acc, packs);
    }

    if (
      handBitmap &
        constants.TILE_TYPE_BITMAP_YAOJIU &
        ~constants.TILE_TYPE_BITMAP_ZI &&
      handBitmap & constants.TILE_TYPE_BITMAP_ZI &&
      (handBitmap & constants.TILE_TYPE_BITMAP_YAOJIU) === handBitmap
    ) {
      acc.addFan(constants.FAN_HUNYAOJIU);
      acc.excludeFan(constants.FAN_PENGPENGHU);
      acc.excludeFan(constants.FAN_QUANDAIYAO);
      excludeYaojiuke(acc, packs);
    }

    if (packs.length === 5) {
      let flag = true;
      for (const p of packs) {
        if (
          !(
            (isKeGang(p) || isJiang(p)) &&
            isShu(packTileId(p)) &&
            tileRank(packTileId(p)) % 2 === 0
          )
        ) {
          flag = false;
          break;
        }
      }

      if (flag) {
        acc.addFan(constants.FAN_QUANSHUANGKE);
        acc.excludeFan(constants.FAN_PENGPENGHU);
        acc.excludeFan(constants.FAN_DUANYAO);
        acc.excludeFan(constants.FAN_WUZI);
      }
    }

    if (
      (handBitmap & constants.TILE_TYPE_BITMAP_WAN) === handBitmap ||
      (handBitmap & constants.TILE_TYPE_BITMAP_TIAO) === handBitmap ||
      (handBitmap & constants.TILE_TYPE_BITMAP_BING) === handBitmap
    ) {
      acc.addFan(constants.FAN_QINGYISE);
      acc.excludeFan(constants.FAN_WUZI);
    }

    if ((handBitmap & constants.TILE_TYPE_BITMAP_QUANDA) === handBitmap) {
      acc.addFan(constants.FAN_QUANDA);
      acc.excludeFan(constants.FAN_DAYUWU);
      acc.excludeFan(constants.FAN_WUZI);
    }

    if ((handBitmap & constants.TILE_TYPE_BITMAP_QUANZHONG) === handBitmap) {
      acc.addFan(constants.FAN_QUANZHONG);
      acc.excludeFan(constants.FAN_DUANYAO);
      acc.excludeFan(constants.FAN_WUZI);
    }

    if ((handBitmap & constants.TILE_TYPE_BITMAP_QUANXIAO) === handBitmap) {
      acc.addFan(constants.FAN_QUANXIAO);
      acc.excludeFan(constants.FAN_XIAOYUWU);
      acc.excludeFan(constants.FAN_WUZI);
    }

    if (packs.length === 5) {
      let flag = true;
      for (const p of packs) {
        const rank = tileRank(packTileId(p));
        if (
          !(
            (isShunzi(p) && rank >= 4 && rank <= 6) ||
            ((isKeGang(p) || isJiang(p)) && rank === 5)
          )
        ) {
          flag = false;
          break;
        }
      }

      if (flag) {
        acc.addFan(constants.FAN_QUANDAIWU);
        acc.excludeFan(constants.FAN_DUANYAO);
        acc.excludeFan(constants.FAN_WUZI);
      }
    }

    if ((handBitmap & constants.TILE_TYPE_BITMAP_DAYUWU) === handBitmap) {
      acc.addFan(constants.FAN_DAYUWU);
      acc.excludeFan(constants.FAN_WUZI);
    }

    if ((handBitmap & constants.TILE_TYPE_BITMAP_XIAOYUWU) === handBitmap) {
      acc.addFan(constants.FAN_XIAOYUWU);
      acc.excludeFan(constants.FAN_WUZI);
    }

    if ((handBitmap & constants.TILE_TYPE_BITMAP_TUIBUDAO) === handBitmap) {
      acc.addFan(constants.FAN_TUIBUDAO);
      acc.excludeFan(constants.FAN_QUEYIMEN);
    }

    if (packs.length === 5 && packs.every(p => isKeGang(p) || isJiang(p))) {
      acc.addFan(constants.FAN_PENGPENGHU);
    }

    {
      const bitmapNozi = handBitmap & ~constants.TILE_TYPE_BITMAP_ZI;
      if (
        handBitmap & constants.TILE_TYPE_BITMAP_ZI &&
        handBitmap & constants.TILE_TYPE_BITMAP_SHU &&
        ((bitmapNozi & constants.TILE_TYPE_BITMAP_WAN) === bitmapNozi ||
          (bitmapNozi & constants.TILE_TYPE_BITMAP_TIAO) === bitmapNozi ||
          (bitmapNozi & constants.TILE_TYPE_BITMAP_BING) === bitmapNozi)
      ) {
        acc.addFan(constants.FAN_HUNYISE);
      }
    }

    if (packs.length === 5) {
      let flag = true;
      for (const p of packs) {
        const rank = tileRank(packTileId(p));
        const yaojiu = isYaojiu(packTileId(p));
        if (
          !(
            (isShunzi(p) && (rank === 2 || rank === 8)) ||
            ((isKeGang(p) || isJiang(p)) && yaojiu)
          )
        ) {
          flag = false;
          break;
        }
      }

      if (flag) {
        acc.addFan(constants.FAN_QUANDAIYAO);
      }
    }

    if ((handBitmap & ~constants.TILE_TYPE_BITMAP_YAOJIU) === handBitmap) {
      acc.addFan(constants.FAN_DUANYAO);
      acc.excludeFan(constants.FAN_WUZI);
    }

    {
      const suitCount =
        ((handBitmap & constants.TILE_TYPE_BITMAP_WAN) === 0n ? 0 : 1) +
        ((handBitmap & constants.TILE_TYPE_BITMAP_TIAO) === 0n ? 0 : 1) +
        ((handBitmap & constants.TILE_TYPE_BITMAP_BING) === 0n ? 0 : 1);
      if (suitCount === 2) {
        acc.addFan(constants.FAN_QUEYIMEN);
      }
    }
  }

  {
    const hasWan = (handBitmap & constants.TILE_TYPE_BITMAP_WAN) !== 0n;
    const hasTiao = (handBitmap & constants.TILE_TYPE_BITMAP_TIAO) !== 0n;
    const hasBing = (handBitmap & constants.TILE_TYPE_BITMAP_BING) !== 0n;
    const hasFeng = (handBitmap & constants.TILE_TYPE_BITMAP_FENG) !== 0n;
    const hasJian = (handBitmap & constants.TILE_TYPE_BITMAP_JIAN) !== 0n;
    if (
      (hasWan ? 1 : 0) +
        (hasTiao ? 1 : 0) +
        (hasBing ? 1 : 0) +
        (hasFeng ? 1 : 0) +
        (hasJian ? 1 : 0) ===
      5
    ) {
      acc.addFan(constants.FAN_WUMENQI);
    }
  }

  {
    const regularPacks = packs.filter(
      p => packType(p) !== constants.PACK_TYPE_ZUHELONG
    );
    if (
      regularPacks.length !== 7 &&
      regularPacks.length > 0 &&
      regularPacks.every(
        p => isShunzi(p) || (isJiang(p) && isShu(packTileId(p)))
      )
    ) {
      acc.addFan(constants.FAN_PINGHU);
      acc.excludeFan(constants.FAN_WUZI);
    }
  }

  for (let i = constants.TILE_1m; i <= constants.TILE_P; i++) {
    let hasGang = false;
    for (const p of packs) {
      if (isGang(p) && packTileId(p) === i) {
        hasGang = true;
        break;
      }
    }

    if (hasGang) continue;
    if (handTileCount(hand, i) === 4) {
      acc.addFan(constants.FAN_SIGUIYI);
    }
  }

  if ((handBitmap & ~constants.TILE_TYPE_BITMAP_ZI) === handBitmap) {
    acc.addFan(constants.FAN_WUZI);
  }
};

module.exports = { countOverallAttrFans, excludeYaojiuke };
