"use strict";

const constants = require("../../core/constants");

const getMainFans = details => {
  if (!details || details.length === 0) return [];

  const allFanMap = new Map();

  for (const detail of details) {
    if (!detail.fanIds || detail.fanIds.length === 0) continue;

    let maxFan = 0;
    for (const fanId of detail.fanIds) {
      const score = constants.FAN_SCORE[fanId] || 0;
      if (score > maxFan) maxFan = score;
    }

    for (const fanId of detail.fanIds) {
      const score = constants.FAN_SCORE[fanId] || 0;
      if (score === maxFan) {
        if (!allFanMap.has(fanId)) {
          allFanMap.set(fanId, {
            id: fanId,
            name: constants.FAN_NAME[fanId] || String(fanId),
            score
          });
        }
      }
    }
  }

  return [...allFanMap.values()].sort((a, b) => b.score - a.score);
};

const getMainFanNames = details => {
  const fans = getMainFans(details);
  return fans.map(f => f.name + "(" + f.score + ")");
};

module.exports = { getMainFans, getMainFanNames };
