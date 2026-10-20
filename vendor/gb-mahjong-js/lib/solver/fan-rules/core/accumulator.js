"use strict";

const constants = require("../../../core/constants");

class FanAccumulator {
  constructor() {
    this.fanTable = new Map();
    this.excludedTable = new Map();
  }

  addFan(fanId, matchedPacks = []) {
    if (!this.fanTable.has(fanId)) {
      this.fanTable.set(fanId, []);
    }

    this.fanTable.get(fanId).push(matchedPacks.slice().sort((a, b) => a - b));
  }

  excludeFan(fanId, matchedPacks = []) {
    if (!this.excludedTable.has(fanId)) {
      this.excludedTable.set(fanId, []);
    }

    this.excludedTable
      .get(fanId)
      .push(matchedPacks.slice().sort((a, b) => a - b));
  }

  hasFan(fanId) {
    const entries = this.fanTable.get(fanId);
    return Boolean(entries) && entries.length > 0;
  }

  applyExclusions() {
    for (const [fanId, excludedEntries] of this.excludedTable) {
      const fanEntries = this.fanTable.get(fanId);
      if (!fanEntries || fanEntries.length === 0) continue;

      const used = new Array(excludedEntries.length).fill(false);
      const keep = new Array(fanEntries.length).fill(true);

      for (let j = 0; j < excludedEntries.length; j++) {
        if (used[j]) continue;
        for (let k = 0; k < fanEntries.length; k++) {
          if (!keep[k]) continue;
          if (arraysEqual(fanEntries[k], excludedEntries[j])) {
            keep[k] = false;
            used[j] = true;
            break;
          }
        }
      }

      const remaining = fanEntries.filter((_, i) => keep[i]);
      if (remaining.length === 0) {
        this.fanTable.delete(fanId);
      } else {
        this.fanTable.set(fanId, remaining);
      }
    }
  }

  getTotal() {
    let total = 0;
    for (const [fanId, entries] of this.fanTable) {
      total += entries.length * constants.FAN_SCORE[fanId];
    }

    return total;
  }

  getFanIds() {
    const ids = [];
    for (const [fanId, entries] of this.fanTable) {
      for (let i = 0; i < entries.length; i++) {
        ids.push(fanId);
      }
    }

    return ids.sort((a, b) => a - b);
  }

  getFans() {
    const fans = [];
    for (const [fanId, entries] of this.fanTable) {
      for (const matchedPacks of entries) {
        fans.push({
          fanId,
          score: constants.FAN_SCORE[fanId],
          matchedPacks
        });
      }
    }

    return fans;
  }

  clear() {
    this.fanTable.clear();
    this.excludedTable.clear();
  }
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}

module.exports = { FanAccumulator, arraysEqual };
