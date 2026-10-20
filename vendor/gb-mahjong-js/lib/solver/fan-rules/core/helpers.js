/* eslint-disable new-cap */
/* global BigInt */
"use strict";

const constants = require("../../../core/constants");

const tileIdOf = tile => {
  if (tile === null || tile === undefined) return 0;
  return typeof tile.GetId === "function" ? tile.GetId() : tile;
};

const isShu = tileId =>
  ((1n << BigInt(tileId)) & constants.TILE_TYPE_BITMAP_SHU) ===
  1n << BigInt(tileId);

const isZi = tileId =>
  ((1n << BigInt(tileId)) & constants.TILE_TYPE_BITMAP_ZI) ===
  1n << BigInt(tileId);

const isFeng = tileId =>
  tileId >= constants.TILE_E && tileId <= constants.TILE_N;

const isJian = tileId =>
  tileId >= constants.TILE_C && tileId <= constants.TILE_P;

const isHonorTile = tileId =>
  tileId >= constants.TILE_E && tileId <= constants.TILE_P;

const isNumberedTile = tileId =>
  tileId >= constants.TILE_1m && tileId <= constants.TILE_9p;

const isYaojiu = tileId =>
  ((1n << BigInt(tileId)) & constants.TILE_TYPE_BITMAP_YAOJIU) ===
  1n << BigInt(tileId);

const tileRank = tileId => constants.TILES_RANK[tileId];
const tileSuit = tileId => constants.TILES_SUIT[tileId];

const packType = pack =>
  typeof pack.GetType === "function" ? pack.GetType() : pack.type;
const packTile = pack =>
  typeof pack.GetMiddleTile === "function" ? pack.GetMiddleTile() : pack.tile;
const packOffer = pack =>
  typeof pack.GetOffer === "function" ? pack.GetOffer() : pack.offer;

const isKezi = pack => packType(pack) === constants.PACK_TYPE_KEZI;
const isGang = pack => packType(pack) === constants.PACK_TYPE_GANG;
const isKeGang = pack => isKezi(pack) || isGang(pack);
const isJiang = pack => packType(pack) === constants.PACK_TYPE_JIANG;
const isShunzi = pack => packType(pack) === constants.PACK_TYPE_SHUNZI;
const isAnshou = pack => {
  const offer = packOffer(pack);
  return offer === 0 || offer === -1;
};

const packTileId = pack => tileIdOf(packTile(pack));

const packsEqual = (a, b) =>
  packType(a) === packType(b) && packTileId(a) === packTileId(b);

module.exports = {
  tileIdOf,
  isShu,
  isZi,
  isFeng,
  isJian,
  isHonorTile,
  isNumberedTile,
  isYaojiu,
  tileRank,
  tileSuit,
  packType,
  packTile,
  packOffer,
  isKezi,
  isGang,
  isKeGang,
  isJiang,
  isShunzi,
  isAnshou,
  packTileId,
  packsEqual
};
