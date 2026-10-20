/* eslint-disable complexity */
"use strict";

const constants = require("../../../core/constants");
const {
  isFeng,
  isJian,
  isShu,
  isShunzi,
  isKeGang,
  isJiang,
  tileRank,
  tileSuit,
  packTileId,
  packsEqual
} = require("../core/helpers");

const countAssociatedCombinationFans = (acc, packs) => {
  const candidates = [];
  const shunziIds = [];
  const kegangIds = [];
  const jiangIds = [];

  for (let i = 0; i < packs.length; i++) {
    if (isShunzi(packs[i])) shunziIds.push(i);
    else if (isKeGang(packs[i])) kegangIds.push(i);
    else if (isJiang(packs[i])) jiangIds.push(i);
  }

  {
    const fengKegang = [];
    const fengJiang = [];
    for (let i = 0; i < packs.length; i++) {
      if (isFeng(packTileId(packs[i]))) {
        if (isKeGang(packs[i])) fengKegang.push(i);
        else fengJiang.push(i);
      }
    }

    if (fengKegang.length === 4) {
      candidates.push({ fanId: constants.FAN_DASIXI, packs: fengKegang });
    }

    if (fengKegang.length === 3 && fengJiang.length === 1) {
      candidates.push({
        fanId: constants.FAN_XIAOSIXI,
        packs: [fengKegang[0], fengKegang[1], fengKegang[2], fengJiang[0]]
      });
    }

    if (fengKegang.length === 3) {
      candidates.push({
        fanId: constants.FAN_SANFENGKE,
        packs: [fengKegang[0], fengKegang[1], fengKegang[2]]
      });
    }
  }

  {
    const jianKegang = [];
    const jianJiang = [];
    for (let i = 0; i < packs.length; i++) {
      if (isJian(packTileId(packs[i]))) {
        if (isKeGang(packs[i])) jianKegang.push(i);
        else jianJiang.push(i);
      }
    }

    if (jianKegang.length === 3) {
      candidates.push({ fanId: constants.FAN_DASANYUAN, packs: jianKegang });
    }

    if (jianKegang.length === 2 && jianJiang.length === 1) {
      candidates.push({
        fanId: constants.FAN_XIAOSANYUAN,
        packs: [jianKegang[0], jianKegang[1], jianJiang[0]]
      });
    }

    if (jianKegang.length === 2) {
      candidates.push({
        fanId: constants.FAN_SHUANGJIANKE,
        packs: [jianKegang[0], jianKegang[1]]
      });
    }
  }

  {
    const shunzi123 = [];
    const shunzi789 = [];
    for (const id of shunziIds) {
      const rank = tileRank(packTileId(packs[id]));
      if (rank === 2) shunzi123.push(id);
      else if (rank === 8) shunzi789.push(id);
    }

    if (
      shunzi123.length === 2 &&
      shunzi789.length === 2 &&
      jiangIds.length > 0 &&
      tileRank(packTileId(packs[jiangIds[0]])) === 5
    ) {
      const suit123a = tileSuit(packTileId(packs[shunzi123[0]]));
      const suit123b = tileSuit(packTileId(packs[shunzi123[1]]));
      const suit789a = tileSuit(packTileId(packs[shunzi789[0]]));
      const suit789b = tileSuit(packTileId(packs[shunzi789[1]]));
      const suitJiang = tileSuit(packTileId(packs[jiangIds[0]]));

      if (
        suit123a === suit123b &&
        suit123a === suit789a &&
        suit123a === suit789b &&
        suit123a === suitJiang
      ) {
        candidates.push({
          fanId: constants.FAN_YISESHUANGLONGHUI,
          packs: [
            shunzi123[0],
            shunzi123[1],
            shunzi789[0],
            shunzi789[1],
            jiangIds[0]
          ]
        });
      } else if (
        ((suit123a === suit789a && suit123b === suit789b) ||
          (suit123a === suit789b && suit123b === suit789a)) &&
        suit123a !== suit123b &&
        suit123a !== suitJiang &&
        suit123b !== suitJiang
      ) {
        candidates.push({
          fanId: constants.FAN_SANSESHUANGLONGHUI,
          packs: [
            shunzi123[0],
            shunzi123[1],
            shunzi789[0],
            shunzi789[1],
            jiangIds[0]
          ]
        });
      }
    }
  }

  for (let i = 0; i < shunziIds.length; i++) {
    for (let j = i + 1; j < shunziIds.length; j++) {
      if (packsEqual(packs[shunziIds[i]], packs[shunziIds[j]])) {
        candidates.push({
          fanId: constants.FAN_YIBANGAO,
          packs: [shunziIds[i], shunziIds[j]]
        });
        for (let k = j + 1; k < shunziIds.length; k++) {
          if (packsEqual(packs[shunziIds[j]], packs[shunziIds[k]])) {
            candidates.push({
              fanId: constants.FAN_YISESANTONGSHUN,
              packs: [shunziIds[i], shunziIds[j], shunziIds[k]]
            });
            for (let l = k + 1; l < shunziIds.length; l++) {
              if (packsEqual(packs[shunziIds[k]], packs[shunziIds[l]])) {
                candidates.push({
                  fanId: constants.FAN_YISESITONGSHUN,
                  packs: [
                    shunziIds[i],
                    shunziIds[j],
                    shunziIds[k],
                    shunziIds[l]
                  ]
                });
              }
            }
          }
        }
      }
    }
  }

  {
    const sortedKegang = kegangIds
      .filter(id => isShu(packTileId(packs[id])))
      .map(id => ({ rank: tileRank(packTileId(packs[id])), id }))
      .sort((a, b) => a.rank - b.rank);

    for (let i = 0; i < sortedKegang.length; i++) {
      for (let j = i + 1; j < sortedKegang.length; j++) {
        if (sortedKegang[j].rank !== sortedKegang[i].rank + 1) continue;
        for (let k = j + 1; k < sortedKegang.length; k++) {
          if (sortedKegang[k].rank !== sortedKegang[j].rank + 1) continue;
          const si = tileSuit(packTileId(packs[sortedKegang[i].id]));
          const sj = tileSuit(packTileId(packs[sortedKegang[j].id]));
          const sk = tileSuit(packTileId(packs[sortedKegang[k].id]));
          if (si !== sj && si !== sk && sj !== sk) {
            candidates.push({
              fanId: constants.FAN_SANSESANJIEGAO,
              packs: [
                sortedKegang[i].id,
                sortedKegang[j].id,
                sortedKegang[k].id
              ]
            });
          } else if (si === sj && si === sk) {
            candidates.push({
              fanId: constants.FAN_YISESANJIEGAO,
              packs: [
                sortedKegang[i].id,
                sortedKegang[j].id,
                sortedKegang[k].id
              ]
            });
          }

          for (let l = k + 1; l < sortedKegang.length; l++) {
            if (
              si === sj &&
              si === sk &&
              si === tileSuit(packTileId(packs[sortedKegang[l].id]))
            ) {
              candidates.push({
                fanId: constants.FAN_YISESIJIEGAO,
                packs: [
                  sortedKegang[i].id,
                  sortedKegang[j].id,
                  sortedKegang[k].id,
                  sortedKegang[l].id
                ]
              });
            }
          }
        }
      }
    }
  }

  {
    const sortedShunzi = shunziIds
      .map(id => ({ rank: tileRank(packTileId(packs[id])), id }))
      .sort((a, b) => a.rank - b.rank);

    for (let i = 0; i < sortedShunzi.length; i++) {
      for (let j = i + 1; j < sortedShunzi.length; j++) {
        const step1 = sortedShunzi[j].rank - sortedShunzi[i].rank;
        if (
          (step1 !== 1 && step1 !== 2) ||
          tileSuit(packTileId(packs[sortedShunzi[i].id])) !==
            tileSuit(packTileId(packs[sortedShunzi[j].id]))
        )
          continue;
        for (let k = j + 1; k < sortedShunzi.length; k++) {
          const step2 = sortedShunzi[k].rank - sortedShunzi[j].rank;
          if (
            (step2 !== 1 && step2 !== 2) ||
            tileSuit(packTileId(packs[sortedShunzi[j].id])) !==
              tileSuit(packTileId(packs[sortedShunzi[k].id]))
          )
            continue;
          if (step1 === step2) {
            candidates.push({
              fanId: constants.FAN_YISESANBUGAO,
              packs: [
                sortedShunzi[i].id,
                sortedShunzi[j].id,
                sortedShunzi[k].id
              ]
            });
          }

          for (let l = k + 1; l < sortedShunzi.length; l++) {
            const step3 = sortedShunzi[l].rank - sortedShunzi[k].rank;
            if (
              (step3 !== 1 && step3 !== 2) ||
              tileSuit(packTileId(packs[sortedShunzi[k].id])) !==
                tileSuit(packTileId(packs[sortedShunzi[l].id]))
            )
              continue;
            if (step1 === step2 && step1 === step3) {
              candidates.push({
                fanId: constants.FAN_YISESIBUGAO,
                packs: [
                  sortedShunzi[i].id,
                  sortedShunzi[j].id,
                  sortedShunzi[k].id,
                  sortedShunzi[l].id
                ]
              });
            }
          }
        }
      }
    }

    for (let i = 0; i < sortedShunzi.length; i++) {
      for (let j = i + 1; j < sortedShunzi.length; j++) {
        if (
          sortedShunzi[j].rank - sortedShunzi[i].rank !== 1 ||
          tileSuit(packTileId(packs[sortedShunzi[i].id])) ===
            tileSuit(packTileId(packs[sortedShunzi[j].id]))
        )
          continue;
        for (let k = j + 1; k < sortedShunzi.length; k++) {
          if (
            sortedShunzi[k].rank - sortedShunzi[j].rank !== 1 ||
            tileSuit(packTileId(packs[sortedShunzi[i].id])) ===
              tileSuit(packTileId(packs[sortedShunzi[k].id])) ||
            tileSuit(packTileId(packs[sortedShunzi[j].id])) ===
              tileSuit(packTileId(packs[sortedShunzi[k].id]))
          )
            continue;
          candidates.push({
            fanId: constants.FAN_SANSESANBUGAO,
            packs: [sortedShunzi[i].id, sortedShunzi[j].id, sortedShunzi[k].id]
          });
        }
      }
    }
  }

  {
    const rankMap = new Map();
    for (const id of shunziIds) {
      const rank = tileRank(packTileId(packs[id]));
      if (!rankMap.has(rank)) rankMap.set(rank, []);
      rankMap.get(rank).push(id);
    }

    if (rankMap.has(2) && rankMap.has(5) && rankMap.has(8)) {
      for (const i of rankMap.get(2)) {
        for (const j of rankMap.get(5)) {
          for (const k of rankMap.get(8)) {
            const s1 = tileSuit(packTileId(packs[i]));
            const s2 = tileSuit(packTileId(packs[j]));
            const s3 = tileSuit(packTileId(packs[k]));
            if (s1 === s2 && s1 === s3) {
              candidates.push({
                fanId: constants.FAN_QINGLONG,
                packs: [i, j, k]
              });
            }

            if (s1 !== s2 && s1 !== s3 && s2 !== s3) {
              candidates.push({
                fanId: constants.FAN_HUALONG,
                packs: [i, j, k]
              });
            }
          }
        }
      }
    }
  }

  for (let i = 0; i < kegangIds.length; i++) {
    for (let j = i + 1; j < kegangIds.length; j++) {
      if (
        isShu(packTileId(packs[kegangIds[i]])) &&
        tileRank(packTileId(packs[kegangIds[i]])) ===
          tileRank(packTileId(packs[kegangIds[j]]))
      ) {
        candidates.push({
          fanId: constants.FAN_SHUANGTONGKE,
          packs: [kegangIds[i], kegangIds[j]]
        });
        for (let k = j + 1; k < kegangIds.length; k++) {
          if (
            tileRank(packTileId(packs[kegangIds[j]])) ===
            tileRank(packTileId(packs[kegangIds[k]]))
          ) {
            candidates.push({
              fanId: constants.FAN_SANTONGKE,
              packs: [kegangIds[i], kegangIds[j], kegangIds[k]]
            });
          }
        }
      }
    }
  }

  for (let i = 0; i < shunziIds.length; i++) {
    for (let j = i + 1; j < shunziIds.length; j++) {
      if (
        tileRank(packTileId(packs[shunziIds[i]])) !==
          tileRank(packTileId(packs[shunziIds[j]])) ||
        tileSuit(packTileId(packs[shunziIds[i]])) ===
          tileSuit(packTileId(packs[shunziIds[j]]))
      )
        continue;
      for (let k = j + 1; k < shunziIds.length; k++) {
        if (
          tileRank(packTileId(packs[shunziIds[j]])) ===
            tileRank(packTileId(packs[shunziIds[k]])) &&
          tileSuit(packTileId(packs[shunziIds[i]])) !==
            tileSuit(packTileId(packs[shunziIds[k]])) &&
          tileSuit(packTileId(packs[shunziIds[j]])) !==
            tileSuit(packTileId(packs[shunziIds[k]]))
        ) {
          candidates.push({
            fanId: constants.FAN_SANSESANTONGSHUN,
            packs: [shunziIds[i], shunziIds[j], shunziIds[k]]
          });
        }
      }
    }
  }

  for (let i = 0; i < shunziIds.length; i++) {
    for (let j = i + 1; j < shunziIds.length; j++) {
      const si = tileSuit(packTileId(packs[shunziIds[i]]));
      const sj = tileSuit(packTileId(packs[shunziIds[j]]));
      const ri = tileRank(packTileId(packs[shunziIds[i]]));
      const rj = tileRank(packTileId(packs[shunziIds[j]]));
      if (si !== sj) {
        if (ri === rj) {
          candidates.push({
            fanId: constants.FAN_XIXIANGFENG,
            packs: [shunziIds[i], shunziIds[j]]
          });
        }
      } else if (ri === rj + 3 || ri === rj - 3) {
        candidates.push({
          fanId: constants.FAN_LIANLIU,
          packs: [shunziIds[i], shunziIds[j]]
        });
      } else if (ri === rj + 6 || ri === rj - 6) {
        candidates.push({
          fanId: constants.FAN_LAOSHAOFU,
          packs: [shunziIds[i], shunziIds[j]]
        });
      }
    }
  }

  if (candidates.length === 0) return;

  const bestState = bfsOptimize(candidates, packs.length);
  if (!bestState) return;

  for (const id of bestState.eids) {
    const c = candidates[id];
    acc.addFan(c.fanId, c.packs);

    switch (c.fanId) {
      case constants.FAN_DASIXI:
        acc.excludeFan(constants.FAN_PENGPENGHU);
        for (const pi of c.packs) {
          if (isFeng(packTileId(packs[pi]))) {
            acc.excludeFan(constants.FAN_QUANFENGKE, [pi]);
            acc.excludeFan(constants.FAN_MENFENGKE, [pi]);
            acc.excludeFan(constants.FAN_YAOJIUKE, [pi]);
          }
        }

        break;
      case constants.FAN_DASANYUAN:
      case constants.FAN_XIAOSANYUAN:
      case constants.FAN_SHUANGJIANKE:
        for (const pi of c.packs) {
          if (isJian(packTileId(packs[pi]))) {
            acc.excludeFan(constants.FAN_JIANKE, [pi]);
            acc.excludeFan(constants.FAN_YAOJIUKE, [pi]);
          }
        }

        break;
      case constants.FAN_XIAOSIXI:
      case constants.FAN_SANFENGKE:
        for (const pi of c.packs) {
          if (isFeng(packTileId(packs[pi]))) {
            acc.excludeFan(constants.FAN_YAOJIUKE, [pi]);
          }
        }

        break;
      case constants.FAN_YISESHUANGLONGHUI:
        acc.excludeFan(constants.FAN_QINGYISE);
        acc.excludeFan(constants.FAN_PINGHU);
        acc.excludeFan(constants.FAN_WUZI);
        break;
      case constants.FAN_YISESITONGSHUN:
        acc.excludeFan(constants.FAN_SIGUIYI);
        acc.excludeFan(constants.FAN_SIGUIYI);
        acc.excludeFan(constants.FAN_SIGUIYI);
        break;
      case constants.FAN_YISESIJIEGAO:
        acc.excludeFan(constants.FAN_PENGPENGHU);
        break;
      case constants.FAN_SANSESHUANGLONGHUI:
        acc.excludeFan(constants.FAN_PINGHU);
        break;
      default:
        break;
    }
  }
};

const bfsOptimize = (candidates, packCount) => {
  class UF {
    constructor(n) {
      this.f = Array.from({ length: n }, (_, i) => i);
    }

    find(x) {
      if (this.f[x] !== x) this.f[x] = this.find(this.f[x]);
      return this.f[x];
    }

    union(a, b) {
      const ra = this.find(a);
      const rb = this.find(b);
      if (ra === rb) return false;
      if (ra < rb) this.f[rb] = ra;
      else this.f[ra] = rb;
      return true;
    }

    clone() {
      const copy = new UF(0);
      copy.f = this.f.slice();
      return copy;
    }

    hash() {
      let h = 0;
      for (let i = 0; i < this.f.length; i++) {
        h = h * 5 + this.find(i);
      }

      return h;
    }
  }

  class State {
    constructor() {
      this.uf = new UF(packCount);
      this.eids = [];
      this.score = 0;
    }

    tryAdd(id) {
      const v = candidates[id].packs;
      for (let i = 0; i < v.length; i++) {
        for (let j = i + 1; j < v.length; j++) {
          if (this.uf.find(v[i]) === this.uf.find(v[j])) {
            return null;
          }
        }
      }

      const newState = new State();
      newState.uf = this.uf.clone();
      newState.eids = this.eids.slice();
      newState.score = this.score;
      for (let i = 1; i < v.length; i++) {
        newState.uf.union(v[i], v[i - 1]);
      }

      newState.eids.push(id);
      newState.score += constants.FAN_SCORE[candidates[id].fanId];
      return newState;
    }
  }

  const visited = new Map();
  let bestState = null;
  let bestScore = 0;

  const queue = [new State()];
  visited.set(new State().uf.hash(), 0);

  while (queue.length > 0) {
    const current = queue.shift();
    for (let i = 0; i < candidates.length; i++) {
      const next = current.tryAdd(i);
      if (!next) continue;
      const h = next.uf.hash();
      if (visited.has(h) && visited.get(h) >= next.score) continue;
      visited.set(h, next.score);
      queue.push(next);
      if (next.score > bestScore) {
        bestScore = next.score;
        bestState = next;
      }
    }
  }

  return bestState;
};

module.exports = { countAssociatedCombinationFans, bfsOptimize };
