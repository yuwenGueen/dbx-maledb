"use strict";

const { getMainFans } = require("./main-fan");

const realAverage = (items, selector) => {
  const values = items
    .map(selector)
    .filter(value => typeof value === "number" && value >= 8);
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
};

const weightedExpectedFan = (items, selector) =>
  items.reduce((sum, item) => {
    const value = selector(item);
    return typeof value === "number" ? sum + value : sum;
  }, 0);

const expectedFanFromWeight = (weightedFan, efficiency) =>
  efficiency > 0 ? weightedFan / efficiency : null;

const emptySummary = shanten => ({
  shanten,
  isTenpai: false,
  acceptanceCount: 0,
  acceptanceTileCount: 0,
  realAcceptanceCount: 0,
  fakeAcceptanceCount: 0,
  efficiency: 0,
  weightedFan: 0,
  expectedFan: null,
  avgFan: null,
  avgRealFan: null,
  mainFans: [],
  details: []
});

const mergeMainFans = summaries =>
  getMainFans(summaries.flatMap(summary => summary.details || []));

const bestSummaryByEfficiency = summaries => {
  if (summaries.length === 0) return null;
  return summaries.slice().sort((left, right) => {
    if ((left.efficiency || 0) !== (right.efficiency || 0))
      return (right.efficiency || 0) - (left.efficiency || 0);
    if ((left.acceptanceTileCount || 0) !== (right.acceptanceTileCount || 0))
      return (right.acceptanceTileCount || 0) - (left.acceptanceTileCount || 0);
    if ((left.acceptanceCount || 0) !== (right.acceptanceCount || 0))
      return (right.acceptanceCount || 0) - (left.acceptanceCount || 0);
    return (right.avgRealFan || 0) - (left.avgRealFan || 0);
  })[0];
};

const summarizeDraws = (shanten, draws) => {
  if (draws.length === 0) return emptySummary(shanten);

  const efficiency = draws.reduce(
    (sum, draw) => sum + (draw.summary.efficiency || 0),
    0
  );
  const weightedFan = weightedExpectedFan(
    draws,
    draw => draw.summary.weightedFan
  );
  return {
    shanten,
    isTenpai: false,
    acceptanceCount: draws.length,
    acceptanceTileCount: draws.reduce(
      (sum, draw) => sum + draw.remainingCount,
      0
    ),
    realAcceptanceCount: draws.filter(draw => draw.summary.avgRealFan >= 8)
      .length,
    fakeAcceptanceCount: draws.filter(draw => !(draw.summary.avgRealFan >= 8))
      .length,
    avgFan: realAverage(draws, draw => draw.summary.avgFan),
    avgRealFan: realAverage(draws, draw => draw.summary.avgRealFan),
    efficiency,
    weightedFan,
    expectedFan: expectedFanFromWeight(weightedFan, efficiency),
    mainFans: mergeMainFans(draws.map(draw => draw.summary)),
    details: draws.flatMap(draw => draw.summary.details || [])
  };
};

const summarizeDiscards = (shanten, discards) => {
  if (discards.length === 0) return emptySummary(shanten);

  const bestSummary = bestSummaryByEfficiency(
    discards.map(discard => discard.summary)
  );
  const efficiency = bestSummary.efficiency || 0;
  const weightedFan = bestSummary.weightedFan || 0;
  return {
    shanten,
    isTenpai: shanten === 0,
    acceptanceCount: Math.max(
      ...discards.map(discard => discard.summary.acceptanceCount || 0)
    ),
    acceptanceTileCount: Math.max(
      ...discards.map(discard => discard.summary.acceptanceTileCount || 0)
    ),
    realAcceptanceCount: Math.max(
      ...discards.map(discard => discard.summary.realAcceptanceCount || 0)
    ),
    fakeAcceptanceCount: Math.max(
      ...discards.map(discard => discard.summary.fakeAcceptanceCount || 0)
    ),
    avgFan: bestSummary.avgFan ?? null,
    avgRealFan: bestSummary.avgRealFan ?? null,
    efficiency,
    weightedFan,
    expectedFan: expectedFanFromWeight(weightedFan, efficiency),
    mainFans: bestSummary.mainFans || [],
    details: bestSummary.details || []
  };
};

const sortByQuality = (left, right) => {
  if (left.shanten !== right.shanten) return left.shanten - right.shanten;
  const leftSummary = left.summary || left;
  const rightSummary = right.summary || right;
  if ((leftSummary.efficiency || 0) !== (rightSummary.efficiency || 0))
    return (rightSummary.efficiency || 0) - (leftSummary.efficiency || 0);
  if (leftSummary.acceptanceTileCount !== rightSummary.acceptanceTileCount)
    return rightSummary.acceptanceTileCount - leftSummary.acceptanceTileCount;
  if (leftSummary.acceptanceCount !== rightSummary.acceptanceCount)
    return rightSummary.acceptanceCount - leftSummary.acceptanceCount;
  if ((leftSummary.avgRealFan || 0) !== (rightSummary.avgRealFan || 0))
    return (rightSummary.avgRealFan || 0) - (leftSummary.avgRealFan || 0);
  return (
    (left.tileId || left.discardTileId || 0) -
    (right.tileId || right.discardTileId || 0)
  );
};

module.exports = {
  expectedFanFromWeight,
  emptySummary,
  summarizeDraws,
  summarizeDiscards,
  sortByQuality
};
