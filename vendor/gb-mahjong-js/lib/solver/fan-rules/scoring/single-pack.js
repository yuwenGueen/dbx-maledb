"use strict";

const constants = require("../../../core/constants");
const { isKeGang, isJian, isYaojiu, packTileId } = require("../core/helpers");

const countSinglePackFans = (acc, hand, packs) => {
  for (let i = 0; i < packs.length; i++) {
    const p = packs[i];
    if (!isKeGang(p)) continue;

    const tid = packTileId(p);

    if (isJian(tid)) {
      acc.addFan(constants.FAN_JIANKE, [i]);
      acc.excludeFan(constants.FAN_YAOJIUKE, [i]);
    }

    if (tid === hand.context.quanfeng) {
      acc.addFan(constants.FAN_QUANFENGKE, [i]);
      acc.excludeFan(constants.FAN_YAOJIUKE, [i]);
    }

    if (tid === hand.context.menfeng) {
      acc.addFan(constants.FAN_MENFENGKE, [i]);
      acc.excludeFan(constants.FAN_YAOJIUKE, [i]);
    }

    if (isYaojiu(tid)) {
      acc.addFan(constants.FAN_YAOJIUKE, [i]);
    }
  }
};

module.exports = { countSinglePackFans };
