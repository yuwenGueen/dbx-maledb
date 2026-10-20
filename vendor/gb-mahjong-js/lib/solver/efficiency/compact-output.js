"use strict";

const { getMainFans } = require("./main-fan");

const compactMainFans = fans => (fans || []).map(fan => fan.name);

const compactWaitDetails = details =>
  (details || []).map(detail => ({
    tileId: detail.tileId,
    fan: detail.fan || 0,
    ronFan: detail.ronFan || 0,
    tsumoFan: detail.tsumoFan || 0,
    efficiency: detail.efficiency || 0,
    expectedFan: detail.expectedFan ?? null,
    isRealWait: Boolean(detail.isRealWait),
    isExhausted: Boolean(detail.isExhausted),
    mainFans: compactMainFans(getMainFans([detail]))
  }));

const compactDebugDraw = draw => ({
  tileId: draw.tileId,
  remainingCount: draw.remainingCount,
  shanten: draw.shanten,
  efficiency: draw.summary ? draw.summary.efficiency || 0 : 0,
  expectedFan: draw.summary ? draw.summary.expectedFan ?? null : null,
  avgFan: draw.summary ? draw.summary.avgFan ?? null : null,
  avgRealFan: draw.summary ? draw.summary.avgRealFan ?? null : null,
  mainFans: draw.summary ? compactMainFans(draw.summary.mainFans) : [],
  waits:
    draw.tenpai && draw.tenpai.details
      ? compactWaitDetails(draw.tenpai.details)
      : draw.summary && draw.summary.details
      ? compactWaitDetails(draw.summary.details)
      : [],
  discards: (draw.discards || []).map(discard => ({
    discardTileId: discard.discardTileId,
    shanten: discard.shanten,
    efficiency: discard.summary ? discard.summary.efficiency || 0 : 0,
    expectedFan: discard.summary ? discard.summary.expectedFan ?? null : null,
    avgFan: discard.summary ? discard.summary.avgFan ?? null : null,
    avgRealFan: discard.summary ? discard.summary.avgRealFan ?? null : null,
    mainFans: discard.summary ? compactMainFans(discard.summary.mainFans) : [],
    waits:
      discard.tenpai && discard.tenpai.details
        ? compactWaitDetails(discard.tenpai.details)
        : discard.summary && discard.summary.details
        ? compactWaitDetails(discard.summary.details)
        : []
  }))
});

const compactDebug = item => {
  const draws = item.draws || item.acceptance || [];
  return {
    draws: draws.map(compactDebugDraw)
  };
};

const compactSummary = summary => {
  if (!summary) return null;

  return {
    shanten: summary.shanten,
    isTenpai: Boolean(summary.isTenpai),
    waits: summary.waits || undefined,
    acceptanceCount: summary.acceptanceCount || 0,
    acceptanceTileCount: summary.acceptanceTileCount || 0,
    efficiency: summary.efficiency || 0,
    expectedFan: summary.expectedFan ?? null,
    realAcceptanceCount: summary.realAcceptanceCount || 0,
    fakeAcceptanceCount: summary.fakeAcceptanceCount || 0,
    realWaitCount: summary.realWaitCount || 0,
    fakeWaitCount: summary.fakeWaitCount || 0,
    totalWaits: summary.totalWaits || 0,
    avgFan: summary.avgFan ?? null,
    avgRealFan: summary.avgRealFan ?? null,
    mainFans: compactMainFans(summary.mainFans),
    details: []
  };
};

const compactDiscard = discard => ({
  discardTileId: discard.discardTileId,
  shanten: discard.shanten,
  summary: compactSummary(discard.summary),
  tenpai: compactSummary(discard.tenpai),
  improvements: null,
  debug: discard.debug || undefined,
  elapsedMs: discard.elapsedMs || 0
});

const compactDraw = draw => ({
  tileId: draw.tileId,
  remainingCount: draw.remainingCount,
  shanten: draw.shanten,
  summary: compactSummary(draw.summary),
  discards: (draw.discards || []).map(compactDiscard),
  debug: draw.debug || undefined,
  elapsedMs: draw.elapsedMs || 0
});

const compactResult = result => {
  if (result.summary) result.summary = compactSummary(result.summary);
  if (result.tenpai) result.tenpai = compactSummary(result.tenpai);
  if (result.draws) result.draws = result.draws.map(compactDraw);
  if (result.acceptance) result.acceptance = result.acceptance.map(compactDraw);
  if (result.discards) result.discards = result.discards.map(compactDiscard);
  result.elapsedMs = result.elapsedMs || 0;
  return result;
};

module.exports = { compactDebug, compactResult };
