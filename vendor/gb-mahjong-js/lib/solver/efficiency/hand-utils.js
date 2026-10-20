/* eslint-disable new-cap */
"use strict";

const constants = require("../../core/constants");
const Tile = require("../../core/tile");
const { legacyFromHand } = require("../../parser/legacy-adapter");
const { countTilesFromHand } = require("../shanten/utils");
const { Step } = require("../shanten/normal");
const { PairStep } = require("../shanten/qidui");
const { OrphanStep } = require("../shanten/shisanyao");
const { Bukao16Count } = require("../shanten/quanbukao");
const { KnitDragonStep } = require("../shanten/zuhelong");

const TILE_MIN = constants.TILE_1m;
const TILE_MAX = constants.TILE_P;

const tileIdToName = id => {
  if (id >= 1 && id <= 9) return id + "m";
  if (id >= 10 && id <= 18) return id - 9 + "s";
  if (id >= 19 && id <= 27) return id - 18 + "p";
  if (id === 28) return "E";
  if (id === 29) return "S";
  if (id === 30) return "W";
  if (id === 31) return "N";
  if (id === 32) return "C";
  if (id === 33) return "F";
  if (id === 34) return "P";
  return "?" + id;
};

const formatTileIds = ids =>
  ids
    .slice()
    .sort((a, b) => a - b)
    .map(tileIdToName)
    .join(" ");

const cloneWithTiles = (hand, tileIds, winningTile = null) => ({
  ...hand,
  tiles: tileIds
    .slice()
    .sort((a, b) => a - b)
    .map(id => new Tile(id)),
  winningTile
});

const cloneWithDiscard = (hand, discardTileId) => {
  const tiles = hand.tiles.map(t => t.GetId());
  const idx = tiles.indexOf(discardTileId);
  if (idx === -1) return null;
  tiles.splice(idx, 1);
  return cloneWithTiles(hand, tiles);
};

const addTileToHand = (hand, tileId) => {
  const tiles = hand.tiles.map(t => t.GetId());
  tiles.push(tileId);
  return cloneWithTiles(hand, tiles);
};

const visibleCounts = hand => {
  const counts = new Array(TILE_MAX + 1).fill(0);
  for (const tile of hand.tiles) counts[tile.GetId()]++;
  for (const pack of hand.packs || []) {
    for (const tile of pack.GetAllTile()) counts[tile.GetId()]++;
  }

  return counts;
};

const countKey = hand => {
  const counts = new Array(TILE_MAX + 1).fill(0);
  for (const tile of hand.tiles) counts[tile.GetId()]++;
  for (const pack of hand.packs || []) {
    for (const tile of pack.GetAllTile()) counts[tile.GetId()]++;
  }

  return counts.slice(TILE_MIN).join("");
};

const uniqueTileIds = hand =>
  [...new Set(hand.tiles.map(t => t.GetId()))].sort((a, b) => a - b);

const totalTileCount = hand =>
  hand.tiles.length + (hand.packs || []).length * 3;

const normalizeRemainingTiles = remainingTiles => {
  if (!remainingTiles || typeof remainingTiles !== "object") return {};

  return Object.entries(remainingTiles).reduce((out, [tileId, count]) => {
    const id = Number(tileId);
    const value = Number(count);
    if (
      Number.isInteger(id) &&
      id >= TILE_MIN &&
      id <= TILE_MAX &&
      Number.isFinite(value)
    ) {
      out[id] = Math.max(0, Math.min(4, value));
    }

    return out;
  }, {});
};

const handKey = hand =>
  [
    hand.tiles
      .map(t => t.GetId())
      .sort((a, b) => a - b)
      .join(","),
    (hand.packs || [])
      .map(pack =>
        pack
          .GetAllTile()
          .map(tile => tile.GetId())
          .sort((a, b) => a - b)
          .join(".")
      )
      .join("|")
  ].join("/");

const shantenMemo = new Map();

const minShanten = (hand, shantenOptions = {}) => {
  const key = handKey(hand) + "/" + JSON.stringify(shantenOptions.modes || []);
  if (shantenMemo.has(key)) return shantenMemo.get(key);

  const legacy = legacyFromHand(hand);
  const tiles = countTilesFromHand(legacy);
  const tcnt = hand.tiles.length;
  const modes = shantenOptions.modes || [
    "normal",
    "qidui",
    "shisanyao",
    "quanbukao",
    "zuhelong"
  ];
  const hasFulu = hand.packs && hand.packs.length > 0;
  let value = Infinity;

  if (modes.includes("normal")) value = Math.min(value, Step(tiles, tcnt));
  if (!hasFulu && modes.includes("qidui") && (tcnt === 13 || tcnt === 14))
    value = Math.min(value, PairStep(tiles));
  if (!hasFulu && modes.includes("shisanyao") && (tcnt === 13 || tcnt === 14))
    value = Math.min(value, OrphanStep(tiles));
  if (!hasFulu && modes.includes("quanbukao") && tcnt === 14)
    value = Math.min(value, tcnt - 1 - Bukao16Count(tiles));
  if (!hasFulu && modes.includes("zuhelong") && tcnt >= 9)
    value = Math.min(value, KnitDragonStep(tiles, tcnt));

  shantenMemo.set(key, value);
  return value;
};

module.exports = {
  TILE_MIN,
  TILE_MAX,
  formatTileIds,
  cloneWithDiscard,
  addTileToHand,
  visibleCounts,
  countKey,
  uniqueTileIds,
  totalTileCount,
  normalizeRemainingTiles,
  handKey,
  minShanten
};
