/* eslint-disable new-cap, complexity, max-depth */
/* global BigInt */
"use strict";

const constants = require("../../../core/constants");
const {
  isShunzi,
  isJiang,
  isAnshou,
  tileRank,
  packType,
  packTileId
} = require("../core/helpers");
const { isMenqing } = require("../core/bitmap");
const { canFormMelds } = require("../ting/calc-ting");
const { packContainsWinningTile } = require("../detection/zuhelong");

const findJiangPackIdx = packs => {
  for (let i = 0; i < packs.length; i++) {
    if (isJiang(packs[i])) return i;
  }

  return -1;
};

const findZuhelongPackIdx = packs => {
  for (let i = 0; i < packs.length; i++) {
    if (packType(packs[i]) === constants.PACK_TYPE_ZUHELONG) return i;
  }

  return -1;
};

const removeZuhelongTiles = (tiles, zbm) => {
  const remaining = [];
  let bm = zbm;
  for (const tile of tiles) {
    const tbm = tile.GetBitmap();
    if (bm & tbm) {
      bm ^= tbm;
    } else {
      remaining.push(tile);
    }
  }

  return remaining;
};

const detectWaitInPacks = (packs, winTileId) => {
  for (let i = 0; i < packs.length; i++) {
    const p = packs[i];
    const pt = packType(p);
    if (pt === constants.PACK_TYPE_ZUHELONG) continue;
    if (!packContainsWinningTile(p, winTileId)) continue;

    if (isJiang(p)) {
      return { fanId: constants.FAN_DANDIAOJIANG, packIdx: i };
    }

    if (isShunzi(p)) {
      const midRank = tileRank(packTileId(p));
      const winRank = tileRank(winTileId);
      if (
        (midRank === 2 && winRank === 3) ||
        (midRank === 8 && winRank === 7)
      ) {
        return { fanId: constants.FAN_BIANZHANG, packIdx: i };
      }

      if (midRank === winRank) {
        return { fanId: constants.FAN_KANZHANG, packIdx: i };
      }
    }
  }

  return null;
};

const countWinModeFans = (acc, hand, packs, zuhelongType) => {
  const ctx = hand.context;

  if (ctx.haidi && ctx.zimo) {
    acc.addFan(constants.FAN_MIAOSHOUHUICHUN);
    acc.excludeFan(constants.FAN_ZIMO);
  }

  if (ctx.haidi && !ctx.zimo) {
    acc.addFan(constants.FAN_HAIDILAOYUE);
  }

  if (ctx.gang && ctx.zimo) {
    acc.addFan(constants.FAN_GANGSHANGKAIHUA);
    acc.excludeFan(constants.FAN_ZIMO);
  }

  if (ctx.gang && !ctx.zimo) {
    acc.addFan(constants.FAN_QIANGGANGHU);
    acc.excludeFan(constants.FAN_HUJUEZHANG);
  }

  const allFulu =
    hand.packs.length === 4 && hand.packs.every(p => !isAnshou(p));
  if (allFulu && !ctx.zimo) {
    acc.addFan(constants.FAN_QUANQIUREN);
    const jiangIdx = findJiangPackIdx(packs);
    if (jiangIdx >= 0) {
      acc.excludeFan(constants.FAN_DANDIAOJIANG, [jiangIdx]);
    }
  }

  if (isMenqing(hand) && ctx.zimo) {
    acc.addFan(constants.FAN_BUQIUREN);
    acc.excludeFan(constants.FAN_MENQIANQING);
    acc.excludeFan(constants.FAN_ZIMO);
  }

  if (ctx.juezhang) {
    acc.addFan(constants.FAN_HUJUEZHANG);
    const jiangIdx = findJiangPackIdx(packs);
    if (jiangIdx >= 0) {
      acc.excludeFan(constants.FAN_DANDIAOJIANG, [jiangIdx]);
    }
  }

  if (isMenqing(hand)) {
    acc.addFan(constants.FAN_MENQIANQING);
  }

  {
    const winTileId = hand.winningTile
      ? hand.winningTile.GetId()
      : hand.tiles[hand.tiles.length - 1].GetId();
    const zbm = zuhelongType > 0 ? constants.ZuhelongBitmap[zuhelongType] : 0n;

    let canDetectWait = false;
    let waitFanId = 0;
    let waitPackIdx = -1;

    const tileCountsForVerify = new Array(constants.TILE_P + 1).fill(0);
    for (let ti = 0; ti < hand.tiles.length - 1; ti++) {
      tileCountsForVerify[hand.tiles[ti].GetId()]++;
    }

    if (zuhelongType > 0) {
      const winBitmap = 1n << BigInt(winTileId);
      const winInZuhelong = (zbm & winBitmap) !== 0n;

      if (winInZuhelong) {
        const remaining = removeZuhelongTiles(hand.tiles, zbm);

        const zlTileIds = [];
        let bm3 = zbm;
        for (const tile of hand.tiles) {
          const tbm = tile.GetBitmap();
          if (bm3 & tbm) {
            bm3 ^= tbm;
            zlTileIds.push(tile.GetId());
          }
        }

        zlTileIds.sort((a, b) => a - b);

        let winGroup = null;
        for (let g = 0; g < 3; g++) {
          const group = zlTileIds.slice(g * 3, (g + 1) * 3);
          if (group.includes(winTileId)) {
            winGroup = group;
            break;
          }
        }

        if (winGroup) {
          const groupLow = Math.min(...winGroup);
          const posInGroup = winTileId - groupLow;
          waitFanId =
            posInGroup === 0 || posInGroup === 6
              ? constants.FAN_BIANZHANG
              : constants.FAN_KANZHANG;

          const remCounts = new Array(constants.TILE_P + 1).fill(0);
          for (const t of remaining) remCounts[t.GetId()]++;

          const hasRemPair = remCounts.some(c => c >= 2);
          if (!hasRemPair) {
            waitPackIdx = findZuhelongPackIdx(packs);
          }
        }
      } else {
        const detected = detectWaitInPacks(packs, winTileId);
        if (detected) {
          waitFanId = detected.fanId;
          waitPackIdx = detected.packIdx;
        }

        if (waitPackIdx < 0) {
          const remaining = removeZuhelongTiles(hand.tiles, zbm);

          const winIdx = remaining.findIndex(t => t.GetId() === winTileId);
          if (winIdx >= 0) remaining.splice(winIdx, 1);

          const hasPair = remaining.some(t => t.GetId() === winTileId);
          if (hasPair) {
            waitFanId = constants.FAN_DANDIAOJIANG;
            for (let i = 0; i < packs.length; i++) {
              if (isJiang(packs[i]) && packTileId(packs[i]) === winTileId) {
                waitPackIdx = i;
                break;
              }
            }

            if (waitPackIdx < 0) {
              waitPackIdx = findZuhelongPackIdx(packs);
            }
          } else {
            const allCounts = new Array(constants.TILE_P + 1).fill(0);
            for (const tile of hand.tiles) {
              if (tile.GetId() !== winTileId) allCounts[tile.GetId()]++;
            }

            const winRank = tileRank(winTileId);
            const isLow =
              winRank <= 7 &&
              allCounts[winTileId + 1] > 0 &&
              allCounts[winTileId + 2] > 0;
            const isMid =
              winRank >= 2 &&
              winRank <= 8 &&
              allCounts[winTileId - 1] > 0 &&
              allCounts[winTileId + 1] > 0;
            const isHigh =
              winRank >= 3 &&
              allCounts[winTileId - 1] > 0 &&
              allCounts[winTileId - 2] > 0;

            if (isLow || isMid || isHigh) {
              waitFanId =
                isMid && !isLow && !isHigh
                  ? constants.FAN_KANZHANG
                  : constants.FAN_BIANZHANG;

              waitPackIdx = findZuhelongPackIdx(packs);
              if (waitPackIdx < 0) waitPackIdx = packs.length - 1;
            }
          }
        }
      }

      if (waitPackIdx >= 0) {
        const zlVerify = new Array(constants.TILE_P + 1).fill(0);
        let bmZv = zbm;
        for (let ti = 0; ti < hand.tiles.length - 1; ti++) {
          const tid = hand.tiles[ti].GetId();
          const tbm = 1n << BigInt(tid);
          if (bmZv & tbm) {
            bmZv ^= tbm;
          } else {
            zlVerify[tid]++;
          }
        }

        const zlMeldCount = hand.packs.length + 3;
        canDetectWait = true;
        for (let t = constants.TILE_1m; t <= constants.TILE_P; t++) {
          if (t === winTileId) continue;
          zlVerify[t]++;
          if (canFormMelds(zlVerify, zlMeldCount)) {
            canDetectWait = false;
            zlVerify[t]--;
            break;
          }

          zlVerify[t]--;
        }
      }
    } else {
      const detected = detectWaitInPacks(packs, winTileId);
      if (detected) {
        waitFanId = detected.fanId;
        waitPackIdx = detected.packIdx;
      }

      if (waitPackIdx < 0) {
        for (let i = 0; i < packs.length; i++) {
          const p = packs[i];
          const pt = packType(p);
          if (pt === constants.PACK_TYPE_ZUHELONG) continue;
          if (isJiang(p) && packContainsWinningTile(p, winTileId)) {
            waitFanId = constants.FAN_DANDIAOJIANG;
            waitPackIdx = i;
            break;
          }
        }
      }

      if (waitPackIdx >= 0) {
        canDetectWait = true;
        for (let t = constants.TILE_1m; t <= constants.TILE_P; t++) {
          if (t === winTileId) continue;
          tileCountsForVerify[t]++;
          if (canFormMelds(tileCountsForVerify, hand.packs.length)) {
            canDetectWait = false;
            tileCountsForVerify[t]--;
            break;
          }

          tileCountsForVerify[t]--;
        }
      }
    }

    if (canDetectWait) {
      acc.addFan(waitFanId, waitPackIdx >= 0 ? [waitPackIdx] : []);
    }
  }

  if (ctx.zimo) {
    acc.addFan(constants.FAN_ZIMO);
    if (
      (acc.hasFan(constants.FAN_JIULIANBAODENG) ||
        acc.hasFan(constants.FAN_SIANKE)) &&
      !acc.hasFan(constants.FAN_MIAOSHOUHUICHUN) &&
      !acc.hasFan(constants.FAN_GANGSHANGKAIHUA)
    ) {
      acc.excludedTable.delete(constants.FAN_ZIMO);
    }
  }
};

module.exports = { countWinModeFans, packContainsWinningTile };
