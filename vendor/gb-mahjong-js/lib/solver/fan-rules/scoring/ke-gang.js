/* eslint-disable complexity */
"use strict";

const constants = require("../../../core/constants");
const { isGang, isKezi, isAnshou, isJiang } = require("../core/helpers");

const countKeGangFans = (acc, packs) => {
  const angang = [];
  const minggang = [];
  const anke = [];

  for (let i = 0; i < packs.length; i++) {
    if (isGang(packs[i])) {
      if (isAnshou(packs[i])) {
        angang.push(i);
      } else {
        minggang.push(i);
      }
    } else if (isKezi(packs[i]) && isAnshou(packs[i])) {
      anke.push(i);
    }
  }

  const key = angang.length * 100 + minggang.length * 10 + anke.length;

  switch (key) {
    case 400:
      acc.addFan(constants.FAN_SIGANG, angang);
      acc.addFan(constants.FAN_SIANKE, angang);
      break;
    case 310:
      acc.addFan(constants.FAN_SIGANG, [
        angang[0],
        angang[1],
        angang[2],
        minggang[0]
      ]);
      acc.addFan(constants.FAN_SANANKE, angang);
      break;
    case 220:
      acc.addFan(constants.FAN_SIGANG, [
        angang[0],
        angang[1],
        minggang[0],
        minggang[1]
      ]);
      acc.addFan(constants.FAN_SHUANGANKE, angang);
      break;
    case 130:
      acc.addFan(constants.FAN_SIGANG, [
        angang[0],
        minggang[0],
        minggang[1],
        minggang[2]
      ]);
      break;
    case 301:
      acc.addFan(constants.FAN_SANGANG, angang);
      acc.addFan(constants.FAN_SIANKE, [
        angang[0],
        angang[1],
        angang[2],
        anke[0]
      ]);
      break;
    case 300:
      acc.addFan(constants.FAN_SANGANG, angang);
      acc.addFan(constants.FAN_SANANKE, angang);
      break;
    case 211:
      acc.addFan(constants.FAN_SANGANG, [angang[0], angang[1], minggang[0]]);
      acc.addFan(constants.FAN_SANANKE, [angang[0], angang[1], anke[0]]);
      break;
    case 210:
      acc.addFan(constants.FAN_SANGANG, [angang[0], angang[1], minggang[0]]);
      acc.addFan(constants.FAN_SHUANGANKE, [angang[0], angang[1]]);
      break;
    case 121:
      acc.addFan(constants.FAN_SANGANG, [angang[0], minggang[0], minggang[1]]);
      acc.addFan(constants.FAN_SHUANGANKE, [angang[0], anke[0]]);
      break;
    case 120:
      acc.addFan(constants.FAN_SANGANG, [angang[0], minggang[0], minggang[1]]);
      break;
    case 202:
      acc.addFan(constants.FAN_SHUANGANGANG, angang);
      acc.addFan(constants.FAN_SIANKE, [
        angang[0],
        angang[1],
        anke[0],
        anke[1]
      ]);
      break;
    case 201:
      acc.addFan(constants.FAN_SHUANGANGANG, angang);
      acc.addFan(constants.FAN_SANANKE, [angang[0], angang[1], anke[0]]);
      break;
    case 112:
      acc.addFan(constants.FAN_MINGANGANG, [angang[0], minggang[0]]);
      acc.addFan(constants.FAN_SANANKE, [angang[0], anke[0], anke[1]]);
      break;
    case 111:
      acc.addFan(constants.FAN_MINGANGANG, [angang[0], minggang[0]]);
      acc.addFan(constants.FAN_SHUANGANKE, [angang[0], anke[0]]);
      break;
    case 22:
      acc.addFan(constants.FAN_SHUANGMINGGANG, minggang);
      acc.addFan(constants.FAN_SHUANGANKE, anke);
      break;
    case 103:
      acc.addFan(constants.FAN_ANGANG, angang);
      acc.addFan(constants.FAN_SIANKE, [angang[0], anke[0], anke[1], anke[2]]);
      break;
    case 102:
      acc.addFan(constants.FAN_ANGANG, angang);
      acc.addFan(constants.FAN_SANANKE, [angang[0], anke[0], anke[1]]);
      break;
    case 101:
      acc.addFan(constants.FAN_ANGANG, angang);
      acc.addFan(constants.FAN_SHUANGANKE, [angang[0], anke[0]]);
      break;
    case 13:
      acc.addFan(constants.FAN_MINGGANG, minggang);
      acc.addFan(constants.FAN_SANANKE, anke);
      break;
    case 12:
      acc.addFan(constants.FAN_MINGGANG, minggang);
      acc.addFan(constants.FAN_SHUANGANKE, anke);
      break;
    default: {
      if (minggang.length === 4) acc.addFan(constants.FAN_SIGANG, minggang);
      else if (anke.length === 4) acc.addFan(constants.FAN_SIANKE, anke);
      else if (minggang.length === 3)
        acc.addFan(constants.FAN_SANGANG, minggang);
      else if (anke.length === 3) acc.addFan(constants.FAN_SANANKE, anke);
      else if (angang.length === 2)
        acc.addFan(constants.FAN_SHUANGANGANG, angang);
      else if (minggang.length === 2)
        acc.addFan(constants.FAN_SHUANGMINGGANG, minggang);
      else if (anke.length === 2) acc.addFan(constants.FAN_SHUANGANKE, anke);
      else if (minggang.length === 1 && angang.length === 1)
        acc.addFan(constants.FAN_MINGANGANG, [angang[0], minggang[0]]);
      else if (angang.length === 1) acc.addFan(constants.FAN_ANGANG, angang);
      else if (minggang.length === 1)
        acc.addFan(constants.FAN_MINGGANG, minggang);
      break;
    }
  }

  if (acc.hasFan(constants.FAN_SIGANG)) {
    acc.excludeFan(constants.FAN_PENGPENGHU);
    for (let i = 0; i < packs.length; i++) {
      if (isJiang(packs[i])) {
        acc.excludeFan(constants.FAN_DANDIAOJIANG, [i]);
        break;
      }
    }
  }

  if (acc.hasFan(constants.FAN_SHUANGANGANG)) {
    const entries = acc.fanTable.get(constants.FAN_SHUANGANGANG);
    if (entries && entries.length > 0) {
      acc.excludeFan(constants.FAN_SHUANGANKE, entries[0]);
    }
  }

  if (acc.hasFan(constants.FAN_SIANKE)) {
    acc.excludeFan(constants.FAN_PENGPENGHU);
    acc.excludeFan(constants.FAN_BUQIUREN);
    acc.excludeFan(constants.FAN_MENQIANQING);
  }
};

module.exports = { countKeGangFans };
