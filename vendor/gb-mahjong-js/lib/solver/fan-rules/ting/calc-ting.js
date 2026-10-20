/* eslint-disable new-cap */
"use strict";

const constants = require("../../../core/constants");
const { isNumberedTile, tileRank } = require("../core/helpers");

const calcTing = hand => {
  const handWithoutWin = hand.tiles.slice(0, -1);
  const counts = new Array(constants.TILE_P + 1).fill(0);
  for (const tile of handWithoutWin) {
    counts[tile.GetId()]++;
  }

  const tingTiles = [];
  for (let t = constants.TILE_1m; t <= constants.TILE_P; t++) {
    counts[t]++;
    if (canFormMelds(counts, hand.packs.length)) {
      tingTiles.push(t);
    }

    counts[t]--;
  }

  return tingTiles;
};

const canFormMelds = (counts, meldCount) => {
  const c = counts.slice();
  const target = 4 - meldCount;

  for (let t = constants.TILE_1m; t <= constants.TILE_P; t++) {
    if (c[t] < 2) continue;
    c[t] -= 2;
    if (canFormNMelds(c, target)) {
      c[t] += 2;
      return true;
    }

    c[t] += 2;
  }

  return false;
};

const canFormNMelds = (counts, n) => {
  if (n === 0) {
    return counts.every(c => c === 0);
  }

  let first = -1;
  for (let t = constants.TILE_1m; t <= constants.TILE_P; t++) {
    if (counts[t] > 0) {
      first = t;
      break;
    }
  }

  if (first === -1) return n === 0;

  if (counts[first] >= 3) {
    counts[first] -= 3;
    const ok = canFormNMelds(counts, n - 1);
    counts[first] += 3;
    if (ok) return true;
  }

  if (
    isNumberedTile(first) &&
    tileRank(first) <= 7 &&
    counts[first + 1] > 0 &&
    counts[first + 2] > 0
  ) {
    counts[first]--;
    counts[first + 1]--;
    counts[first + 2]--;
    const ok = canFormNMelds(counts, n - 1);
    counts[first]++;
    counts[first + 1]++;
    counts[first + 2]++;
    if (ok) return true;
  }

  return false;
};

module.exports = {
  calcTing,
  canFormMelds,
  canFormNMelds
};
