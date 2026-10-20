import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createGame, seededRandom, winningShape, waitingTypes, legalActions, act, step, assertGame, settleResult, nextGame } from "../src/engine.js";
import { scoreRequest } from "../src/scoring.js";

const binary = fileURLToPath(new URL("../bin/darwin-arm64/maledb", import.meta.url));
const nativeScore = (hand) => JSON.parse(execFileSync(binary, ["--score", hand], { encoding: "utf8", timeout: 10000 }));
const require = createRequire(import.meta.url);
const constants = require("../vendor/gb-mahjong-js/lib/core/constants.js");

function physical(types) {
  const used = new Map();
  return types.map((t) => {
    const n = used.get(t) || 0;
    used.set(t, n + 1);
    assert.ok(n < 4);
    return t * 4 + n;
  });
}
function fixture(hands, current = 0) {
  const g = createGame({ random: seededRandom(9) }),
    used = new Set();
  g.players.forEach((p, seat) => {
    p.hand = hands[seat].map((t) => {
      let id = t * 4;
      while (used.has(id)) id++;
      assert.equal(Math.floor(id / 4), t);
      used.add(id);
      return id;
    });
    p.melds = [];
    p.flowers = [];
    p.discards = [];
  });
  g.wall = Array.from({ length: 144 }, (_, i) => i).filter((id) => !used.has(id));
  g.current = current;
  g.phase = "turn";
  g.pending = null;
  g.result = null;
  g.events = [];
  g.revision = 0;
  g.drawn = g.players[current].hand.at(-1);
  g.afterKong = false;
  return g;
}
const spreadA = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 29];
const spreadB = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 30];

test("dealing replaces all flowers and preserves every physical tile", () => {
  for (let seed = 1; seed <= 80; seed++) {
    const g = createGame({ random: seededRandom(seed), dealer: seed % 4 });
    assertGame(g);
    g.players.forEach((p, s) => {
      assert.equal(p.hand.length, s === g.dealer ? 14 : 13);
      assert.ok(p.hand.every((id) => id < 136));
      assert.ok(p.flowers.every((id) => id >= 136));
    });
    assert.equal(g.wall.length + g.players.reduce((n, p) => n + p.hand.length + p.flowers.length, 0), 144);
  }
});
test("standard, seven pairs, orphans and knitted patterns are recognized", () => {
  assert.ok(winningShape(physical([0, 1, 2, 3, 4, 5, 9, 10, 11, 18, 19, 20, 27, 27])));
  assert.equal(winningShape(physical([0, 0, 1, 1, 2, 2, 9, 9, 18, 18, 27, 27, 31, 31])), "七对");
  assert.equal(winningShape(physical([0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33, 33])), "十三幺");
  assert.equal(winningShape(physical([0, 3, 6, 10, 13, 16, 20, 27, 28, 29, 30, 31, 32, 33])), "全不靠");
  assert.equal(winningShape(physical([0, 1, 2, 3, 4, 5, 9, 10, 11, 18, 19, 20, 27])), null);
  assert.equal(winningShape(physical([0, 1, 2, 3, 4, 5, 9, 10, 11, 18, 19, 20, 27, 28])), null);
});
test("waiting tiles and illegal actions do not mutate the hand", () => {
  const hand = physical([0, 1, 2, 3, 4, 5, 9, 10, 11, 18, 19, 20, 27]);
  assert.deepEqual(waitingTypes(hand), [27]);
  const g = createGame({ random: seededRandom(5) }),
    before = JSON.stringify(g);
  assert.throws(() => act(g, 1, { type: "discard", tile: g.players[1].hand[0] }));
  assert.equal(JSON.stringify(g), before);
  assert.throws(() => act(g, 0, { type: "discard", tile: 999 }));
  assert.equal(JSON.stringify(g), before);
});
test("a human can claim a winning discard, then settle exactly once", () => {
  const g = fixture([[0, 1, 2, 3, 4, 5, 9, 10, 11, 18, 19, 20, 27], [0, 3, 6, 9, 12, 15, 18, 21, 24, 28, 29, 30, 31, 27], spreadA, spreadB], 1);
  assertGame(g);
  const tile = g.players[1].hand.at(-1);
  act(g, 1, { type: "discard", tile });
  assert.ok(legalActions(g).some((a) => a.type === "hu"));
  act(g, 0, { type: "hu" });
  step(g);
  assert.equal(g.result.winner, 0);
  assert.equal(g.result.kind, "ron");
  assertGame(g);
  assert.equal(g.events.at(-1).kind, "end");
  assert.equal(g.events.at(-1).winKind, "ron");
  const scoring = nativeScore(g.result.request.hand),
    before = g.players.map((p) => p.score);
  assert.equal(settleResult(g, scoring), true);
  assert.equal(settleResult(g, scoring), false);
  assert.equal(
    g.result.delta.reduce((a, b) => a + b, 0),
    0,
  );
  assert.equal(g.players[0].score - before[0], scoring.total);
  assert.equal(g.players[1].score - before[1], -scoring.total);
});
test("chi is restricted to the next seat, concealed kongs draw replacement tiles", () => {
  const g = fixture([[0, 1, 4, 5, 9, 10, 12, 14, 18, 20, 22, 27, 31], [2, 3, 6, 9, 12, 15, 18, 21, 24, 28, 29, 30, 31, 2], spreadA, spreadB], 1);
  act(g, 1, { type: "discard", tile: g.players[1].hand.at(-1) });
  assert.ok(!legalActions(g).some((a) => a.type === "chi"));
  const k = fixture([[0, 0, 0, 0, 2, 4, 6, 9, 11, 13, 18, 20, 22, 27], spreadA, spreadB, [1, 3, 5, 7, 10, 12, 14, 16, 19, 21, 23, 25, 28]], 0);
  const kong = legalActions(k).find((a) => a.kind === "angang");
  assert.ok(kong);
  const before = k.wall.length;
  act(k, 0, kong);
  assertGame(k);
  assert.equal(k.players[0].melds[0].tiles.length, 4);
  assert.equal(k.players[0].hand.length, 11);
  assert.ok(k.wall.length < before);
  assert.ok(k.events.some((e) => e.kind === "gang" && e.kongKind === "angang"));
});
test("score adapter sends flowers and situational flags to the native scorer", () => {
  const g = fixture([[0, 1, 2, 3, 4, 5, 9, 10, 11, 18, 19, 20, 27, 27], spreadA, spreadB, [1, 3, 5, 7, 10, 12, 14, 16, 19, 21, 23, 25, 28]], 0);
  g.players[0].flowers = [136, 140];
  g.wall = g.wall.filter((id) => id !== 136 && id !== 140);
  const request = scoreRequest(g, 0, { kind: "zimo", from: 0, tile: g.drawn });
  assert.match(request.hand, /\|EE1000\|ea$/);
  const result = nativeScore(request.hand);
  const flowers = result.fans.find((f) => f.name === "花牌");
  assert.equal(flowers.count, 2);
  assert.equal(
    result.fans.reduce((n, f) => n + f.value * f.count, 0),
    result.total,
  );
});
test("the native scorer passes 130 upstream fan and exclusion fixtures", () => {
  const data = JSON.parse(readFileSync(new URL("../vendor/gb-mahjong-js/lib/test-data/generated-unit-test-cases.json", import.meta.url)));
  for (const item of data.fanCases) {
    const result = nativeScore(item.input),
      actual = result.fans.flatMap((f) => Array(f.count).fill(f.id)).sort((a, b) => a - b);
    const options = [item.expectedNames, ...(item.altExpectedNames ? [item.altExpectedNames] : [])].map((names) => names.map((name) => constants[name]).sort((a, b) => a - b));
    assert.ok(
      options.some((ids) => JSON.stringify(ids) === JSON.stringify(actual)),
      `${item.input}: ${JSON.stringify(result)}`,
    );
    assert.equal(
      result.fans.reduce((n, f) => n + f.value * f.count, 0),
      result.total,
    );
  }
});
test("100 complete bot games preserve tiles at every transition and settle with the native scorer", { timeout: 120000 }, () => {
  const outcomes = { wins: 0, draws: 0, chi: 0, peng: 0, gang: 0, flowers: 0, steps: 0 };
  for (let seed = 1; seed <= 100; seed++) {
    const g = createGame({ random: seededRandom(seed) });
    assertGame(g);
    for (let i = 0; i < 700 && g.phase !== "ended"; i++) {
      assert.equal(step(g, { autoHuman: true }), true);
      assertGame(g);
      outcomes.steps++;
    }
    assert.equal(g.phase, "ended", `seed ${seed} stalled`);
    assert.equal(g.events.at(-1).kind, "end", `seed ${seed} must notify the UI to score and present the result`);
    if (g.result.winner !== null) {
      settleResult(g, nativeScore(g.result.request.hand));
      outcomes.wins++;
    } else outcomes.draws++;
    for (const p of g.players) {
      outcomes.flowers += p.flowers.length;
      for (const m of p.melds) outcomes[m.kind.includes("gang") ? "gang" : m.kind]++;
    }
    assertGame(JSON.parse(JSON.stringify(g)));
    assert.equal(
      g.players.reduce((n, p) => n + p.score, 0),
      0,
    );
    assertGame(nextGame(g, seededRandom(seed + 100)));
  }
  assert.ok(outcomes.wins > 20);
  assert.ok(outcomes.chi > 0 && outcomes.peng > 0 && outcomes.gang > 0 && outcomes.flowers > 0);
  console.log("Self-play:", outcomes);
});
test("DBX sidecar initialize and score RPCs work without a browser", { timeout: 15000 }, async () => {
  const child = spawn(binary, [], { stdio: ["pipe", "pipe", "pipe"] });
  const lines = createInterface({ input: child.stdout });
  let id = 0;
  const pending = new Map();
  lines.on("line", (line) => {
    const result = JSON.parse(line);
    pending.get(result.id)?.(result);
    pending.delete(result.id);
  });
  const request = (method, params) =>
    new Promise((resolve, reject) => {
      const current = ++id;
      const timer = setTimeout(() => reject(Error("RPC timeout")), 5000);
      pending.set(current, (value) => {
        clearTimeout(timer);
        resolve(value);
      });
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: current, method, params }) + "\n");
    });
  try {
    const init = await request("plugin/initialize", { host: { protocolVersions: [1] } });
    assert.equal(init.result.plugin.id, "dev.maledb.mahjong");
    const result = await request("mahjong/score", { hand: "123m456m789p234sEE|EE1000" });
    assert.equal(result.result.total, 6);
    const invalid = await request("mahjong/score", { hand: "not-a-hand" });
    assert.equal(invalid.error.code, -32602);
    const concurrent = await Promise.all(Array.from({ length: 16 }, () => request("mahjong/score", { hand: "123m456m789p234sEE|EE1000" })));
    assert.ok(concurrent.every((r) => r.result.total === 6));
  } finally {
    child.stdin.end();
    child.kill();
    lines.close();
  }
});
