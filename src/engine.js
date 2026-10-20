import { scoreRequest } from "./scoring.js";

export const WINDS = ["东", "南", "西", "北"];
export const BOT_NAMES = ["我", "晚风", "阿宁", "小林"];
export const typeOf = (tile) => (tile < 136 ? Math.floor(tile / 4) : 34 + tile - 136);
export const isFlower = (tile) => tile >= 136;
export const sortTiles = (tiles) => [...tiles].sort((a, b) => a - b);
export const tileName = (tile) => typeName(typeOf(tile));
export function typeName(type) {
  if (type < 27) return ["一", "二", "三", "四", "五", "六", "七", "八", "九"][type % 9] + ["万", "筒", "条"][Math.floor(type / 9)];
  return ["东风", "南风", "西风", "北风", "红中", "发财", "白板", "春", "夏", "秋", "冬", "梅", "兰", "竹", "菊"][type - 27] || "未知牌";
}
export function countsOf(tiles) {
  const counts = Array(34).fill(0);
  for (const tile of tiles) if (!isFlower(tile)) counts[typeOf(tile)]++;
  return counts;
}
const SUIT_ORDERS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];
const ORPHANS = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

export function winningShape(tiles, meldCount = 0) {
  if (tiles.length !== 14 - meldCount * 3 || tiles.some(isFlower)) return null;
  const counts = countsOf(tiles);
  if (counts.some((n) => n > 4)) return null;
  if (!meldCount) {
    if (ORPHANS.every((t) => counts[t]) && ORPHANS.some((t) => counts[t] === 2)) return "十三幺";
    if (counts.every((n) => n % 2 === 0)) return "七对";
    if (counts.every((n) => n <= 1) && SUIT_ORDERS.some((suits) => counts.every((n, t) => !n || t >= 27 || t % 3 === suits[Math.floor(t / 9)]))) return "全不靠";
  }
  const canSets = (remaining) => {
    const first = counts.findIndex((n) => n > 0);
    if (first < 0) return remaining === 0;
    if (remaining <= 0) return false;
    if (counts[first] >= 3) {
      counts[first] -= 3;
      const ok = canSets(remaining - 1);
      counts[first] += 3;
      if (ok) return true;
    }
    if (first < 27 && first % 9 <= 6 && counts[first + 1] && counts[first + 2]) {
      counts[first]--;
      counts[first + 1]--;
      counts[first + 2]--;
      const ok = canSets(remaining - 1);
      counts[first]++;
      counts[first + 1]++;
      counts[first + 2]++;
      if (ok) return true;
    }
    return false;
  };
  const withPair = (setCount) => {
    for (let t = 0; t < 34; t++)
      if (counts[t] >= 2) {
        counts[t] -= 2;
        const ok = canSets(setCount);
        counts[t] += 2;
        if (ok) return true;
      }
    return false;
  };
  if (withPair(4 - meldCount)) return "基本和牌";
  if (meldCount <= 1)
    for (const suits of SUIT_ORDERS) {
      const knitted = suits.flatMap((residue, suit) => [0, 3, 6].map((n) => suit * 9 + residue + n));
      if (!knitted.every((t) => counts[t] > 0)) continue;
      knitted.forEach((t) => counts[t]--);
      const ok = withPair(1 - meldCount);
      knitted.forEach((t) => counts[t]++);
      if (ok) return "组合龙";
    }
  return null;
}

const shantenCache = new Map();
export function shanten(tiles, meldCount = 0) {
  const counts = countsOf(tiles);
  const key = meldCount + ":" + counts.join("");
  if (shantenCache.has(key)) return shantenCache.get(key);
  let best = 8;
  const search = (start, sets, partials, pair) => {
    while (start < 34 && !counts[start]) start++;
    if (start === 34) {
      best = Math.min(best, 8 - 2 * (sets + meldCount) - Math.min(partials, 4 - sets - meldCount) - pair);
      return;
    }
    if (sets + meldCount > 4) return;
    if (counts[start] >= 3) {
      counts[start] -= 3;
      search(start, sets + 1, partials, pair);
      counts[start] += 3;
    }
    if (start < 27 && start % 9 < 7 && counts[start + 1] && counts[start + 2]) {
      counts[start]--;
      counts[start + 1]--;
      counts[start + 2]--;
      search(start, sets + 1, partials, pair);
      counts[start]++;
      counts[start + 1]++;
      counts[start + 2]++;
    }
    if (counts[start] >= 2) {
      counts[start] -= 2;
      if (!pair) search(start, sets, partials, 1);
      search(start, sets, partials + 1, pair);
      counts[start] += 2;
    }
    if (start < 27)
      for (let gap = 1; gap <= 2; gap++)
        if ((start % 9) + gap < 9 && counts[start + gap]) {
          counts[start]--;
          counts[start + gap]--;
          search(start, sets, partials + 1, pair);
          counts[start]++;
          counts[start + gap]++;
        }
    counts[start]--;
    search(start, sets, partials, pair);
    counts[start]++;
  };
  search(0, 0, 0, 0);
  if (!meldCount) {
    const pairs = counts.filter((n) => n >= 2).length;
    const unique = counts.filter(Boolean).length;
    best = Math.min(best, 6 - pairs + Math.max(0, 7 - unique));
    best = Math.min(best, 13 - ORPHANS.filter((t) => counts[t]).length - Number(ORPHANS.some((t) => counts[t] > 1)));
  }
  if (shantenCache.size > 24000) shantenCache.clear();
  shantenCache.set(key, best);
  return best;
}

export function waitingTypes(tiles, meldCount = 0) {
  if (tiles.length !== 13 - meldCount * 3) return [];
  const counts = countsOf(tiles);
  return counts.flatMap((n, t) => (n < 4 && winningShape([...tiles, t * 4 + n], meldCount) ? [t] : []));
}
export function visibleCounts(game) {
  return countsOf(game.players.flatMap((p) => [...p.discards.filter((d) => !d.claimed).map((d) => d.tile), ...p.melds.flatMap((m) => (m.kind === "angang" ? [] : m.tiles))]));
}
export function suggestDiscard(hand, melds = [], visible = Array(34).fill(0)) {
  const counts = countsOf(hand);
  let best = null;
  const tried = new Set();
  for (const tile of hand) {
    const type = typeOf(tile);
    if (tried.has(type)) continue;
    tried.add(type);
    const after = hand.filter((id) => id !== tile);
    const distance = shanten(after, melds.length);
    let connection = counts[type] >= 2 ? 5 : 0;
    if (type < 27) for (const gap of [-2, -1, 1, 2]) if (Math.floor((type + gap) / 9) === Math.floor(type / 9)) connection += (counts[type + gap] || 0) * (Math.abs(gap) === 1 ? 2 : 1);
    const terminal = type >= 27 || type % 9 === 0 || type % 9 === 8;
    const value = distance * 100 + connection * 3 - Number(terminal) * 2 - visible[type] * 0.2;
    if (!best || value < best.value) best = { tile, value, shanten: distance, waits: distance === 0 ? waitingTypes(after, melds.length) : [] };
  }
  return best;
}

export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function event(game, kind, player, extra = {}) {
  game.events.push({ ...extra, id: ++game.revision, kind, player });
  if (game.events.length > 180) game.events.shift();
}
function draw(game, seat, replacement = false, dealing = false) {
  const player = game.players[seat];
  let fromTail = replacement,
    sawFlower = false;
  while (game.wall.length) {
    const tile = fromTail ? game.wall.pop() : game.wall.shift();
    if (isFlower(tile)) {
      sawFlower = true;
      player.flowers.push(tile);
      event(game, "flower", seat, { tile, dealing });
      fromTail = true;
      continue;
    }
    player.hand.push(tile);
    player.hand.sort((a, b) => a - b);
    game.drawn = tile;
    game.afterKong = replacement && !sawFlower;
    if (!dealing) event(game, "draw", seat, { replacement });
    return tile;
  }
  finish(game, null, null, "draw");
  return null;
}
export function createGame({ random = Math.random, dealer = 0, round = 1, dealerPasses = 0, scores = [0, 0, 0, 0], name = "我" } = {}) {
  const wall = Array.from({ length: 144 }, (_, i) => i);
  for (let i = wall.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [wall[i], wall[j]] = [wall[j], wall[i]];
  }
  const game = {
    version: 1,
    id: `hand-${Date.now()}-${Math.floor(random() * 1e9)}`,
    wall,
    dealer,
    dealerPasses,
    round,
    current: dealer,
    phase: "turn",
    drawn: null,
    pending: null,
    lastDiscard: null,
    afterKong: false,
    result: null,
    revision: 0,
    events: [],
    dice: [1 + Math.floor(random() * 6), 1 + Math.floor(random() * 6)],
    players: BOT_NAMES.map((n, seat) => ({ name: seat === 0 ? name : n, hand: [], melds: [], flowers: [], discards: [], score: scores[seat] })),
  };
  for (let i = 0; i < 13; i++) for (let offset = 0; offset < 4; offset++) draw(game, (dealer + offset) % 4, false, true);
  draw(game, dealer, false, true);
  event(game, "start", dealer);
  return game;
}
export function seatWind(game, seat) {
  return (seat - game.dealer + 4) % 4;
}
export function roundWind(game) {
  return Math.floor(game.dealerPasses / 4) % 4;
}
const distanceFrom = (seat, from) => (seat - from + 4) % 4;
const priority = (action) => ({ hu: 4, gang: 3, peng: 2, chi: 1, pass: 0 })[action.type] || 0;
const actionKey = (a) => JSON.stringify([a.type, a.tile ?? null, a.kind ?? null, a.meldIndex ?? null, a.tiles ?? null]);

function rawClaims(game, seat) {
  const pending = game.pending;
  if (!pending || seat === pending.from) return [];
  const player = game.players[seat],
    type = typeOf(pending.tile);
  const same = player.hand.filter((id) => typeOf(id) === type);
  const actions = [];
  if (winningShape([...player.hand, pending.tile], player.melds.length)) actions.push({ type: "hu" });
  if (pending.kind === "rob-kong") return actions;
  if (same.length >= 3 && game.wall.length) actions.push({ type: "gang", kind: "minggang", tiles: same.slice(0, 3) });
  if (same.length >= 2) actions.push({ type: "peng", tiles: same.slice(0, 2) });
  if (seat === (pending.from + 1) % 4 && type < 27)
    for (let start = type - 2; start <= type; start++) {
      if (start < 0 || start % 9 > 6 || Math.floor(start / 9) !== Math.floor(type / 9)) continue;
      const types = [start, start + 1, start + 2].filter((t) => t !== type);
      const ids = types.map((t) => player.hand.find((id) => typeOf(id) === t));
      if (ids.every((id) => id !== undefined)) actions.push({ type: "chi", tiles: ids });
    }
  return actions;
}
export function legalActions(game, seat = 0) {
  if (game.phase === "ended") return [];
  const player = game.players[seat];
  if (game.phase === "claim") {
    if (game.pending.decisions[seat] !== null) return [];
    return [...rawClaims(game, seat), { type: "pass" }];
  }
  if (game.current !== seat) return [];
  const actions = player.hand.map((tile) => ({ type: "discard", tile }));
  if (game.drawn !== null && winningShape(player.hand, player.melds.length)) actions.unshift({ type: "hu" });
  if (game.drawn !== null && game.wall.length) {
    countsOf(player.hand).forEach((n, type) => {
      if (n === 4) actions.push({ type: "gang", kind: "angang", tiles: player.hand.filter((id) => typeOf(id) === type) });
    });
    player.melds.forEach((meld, meldIndex) => {
      if (meld.kind !== "peng") return;
      const tile = player.hand.find((id) => typeOf(id) === typeOf(meld.tiles[0]));
      if (tile !== undefined) actions.push({ type: "gang", kind: "jiagang", tile, meldIndex });
    });
  }
  return actions;
}
function chooseClaim(game, seat, choices) {
  const hu = choices.find((a) => a.type === "hu");
  if (hu) return hu;
  const player = game.players[seat];
  const before = shanten(player.hand, player.melds.length);
  let best = { type: "pass" },
    bestDistance = before;
  for (const choice of choices) {
    if (!["chi", "peng", "gang"].includes(choice.type)) continue;
    const after = player.hand.filter((id) => !choice.tiles.includes(id));
    const result = choice.type === "gang" ? { shanten: shanten(after, player.melds.length + 1) } : suggestDiscard(after, [...player.melds, {}]);
    if (result && (result.shanten < bestDistance || (choice.type === "gang" && result.shanten <= bestDistance))) {
      best = choice;
      bestDistance = result.shanten;
    }
  }
  return best;
}
function beginClaims(game, pending) {
  game.pending = { ...pending, decisions: [null, null, null, null] };
  game.phase = "claim";
  for (let seat = 0; seat < 4; seat++) {
    const choices = rawClaims(game, seat);
    if (seat === pending.from || !choices.length) game.pending.decisions[seat] = { type: "pass" };
    else if (seat !== 0) game.pending.decisions[seat] = chooseClaim(game, seat, choices);
  }
  if (game.pending.decisions[0] === null) {
    const maxHuman = Math.max(...rawClaims(game, 0).map(priority));
    const unbeatable = game.pending.decisions.some((a, seat) => a && (priority(a) > maxHuman || (priority(a) === maxHuman && distanceFrom(seat, pending.from) < distanceFrom(0, pending.from))));
    if (unbeatable) game.pending.decisions[0] = { type: "pass" };
  }
}
function removeTiles(player, ids) {
  player.hand = player.hand.filter((tile) => !ids.includes(tile));
}
function applyKong(game, seat, action) {
  const player = game.players[seat];
  if (action.kind === "jiagang") {
    beginClaims(game, { kind: "rob-kong", from: seat, tile: action.tile, meldIndex: action.meldIndex });
    return;
  }
  removeTiles(player, action.tiles);
  player.melds.push({ kind: "angang", tiles: sortTiles(action.tiles), from: seat });
  event(game, "gang", seat, { kongKind: "angang", tile: action.tiles[0] });
  draw(game, seat, true);
}
export function act(game, seat, requested) {
  const action = legalActions(game, seat).find((a) => actionKey(a) === actionKey(requested));
  if (!action) throw new Error("当前不能执行这个操作");
  if (game.phase === "claim") {
    game.pending.decisions[seat] = action;
    event(game, "response", seat, { action: action.type });
    return game;
  }
  if (action.type === "hu") finish(game, seat, seat, "zimo");
  else if (action.type === "gang") applyKong(game, seat, action);
  else {
    const afterKong = game.afterKong;
    removeTiles(game.players[seat], [action.tile]);
    const discard = { tile: action.tile, claimed: false };
    game.players[seat].discards.push(discard);
    game.drawn = null;
    game.lastDiscard = { seat, tile: action.tile, revision: game.revision + 1 };
    event(game, "discard", seat, { tile: action.tile });
    beginClaims(game, { kind: "discard", from: seat, tile: action.tile, afterKong });
  }
  return game;
}
function settleClaims(game) {
  const pending = game.pending;
  if (pending.decisions.some((a) => a === null)) return false;
  const claims = pending.decisions
    .map((action, seat) => ({ ...action, seat }))
    .filter((a) => a.type !== "pass")
    .sort((a, b) => priority(b) - priority(a) || distanceFrom(a.seat, pending.from) - distanceFrom(b.seat, pending.from));
  const claim = claims[0];
  if (claim?.type === "hu") {
    if (pending.kind === "rob-kong") {
      removeTiles(game.players[pending.from], [pending.tile]);
      game.players[pending.from].discards.push({ tile: pending.tile, claimed: false });
    }
    finish(game, claim.seat, pending.from, pending.kind === "rob-kong" ? "rob-kong" : "ron");
    return true;
  }
  if (pending.kind === "rob-kong") {
    const player = game.players[pending.from];
    removeTiles(player, [pending.tile]);
    const meld = player.melds[pending.meldIndex];
    meld.tiles.push(pending.tile);
    meld.kind = "jiagang";
    game.phase = "turn";
    game.current = pending.from;
    game.pending = null;
    event(game, "gang", pending.from, { kongKind: "jiagang", tile: pending.tile });
    draw(game, pending.from, true);
    return true;
  }
  if (claim) {
    const player = game.players[claim.seat];
    game.players[pending.from].discards.at(-1).claimed = true;
    removeTiles(player, claim.tiles);
    player.melds.push({ kind: claim.type === "gang" ? "minggang" : claim.type, tiles: sortTiles([...claim.tiles, pending.tile]), from: pending.from, claimed: pending.tile });
    game.current = claim.seat;
    game.drawn = null;
    game.afterKong = false;
    game.phase = "turn";
    game.pending = null;
    event(game, claim.type, claim.seat, { tile: pending.tile });
    if (claim.type === "gang") draw(game, claim.seat, true);
    return true;
  }
  game.current = (pending.from + 1) % 4;
  game.phase = "turn";
  game.pending = null;
  draw(game, game.current);
  return true;
}
export function step(game, { autoHuman = false } = {}) {
  if (game.phase === "ended") return false;
  if (game.phase === "claim") {
    if (game.pending.decisions[0] === null && autoHuman) game.pending.decisions[0] = chooseClaim(game, 0, rawClaims(game, 0));
    return settleClaims(game);
  }
  if (game.current === 0 && !autoHuman) return false;
  const seat = game.current,
    player = game.players[seat],
    actions = legalActions(game, seat);
  let action = actions.find((a) => a.type === "hu") || actions.find((a) => a.type === "gang");
  if (!action) action = { type: "discard", tile: suggestDiscard(player.hand, player.melds, visibleCounts(game)).tile };
  act(game, seat, action);
  return true;
}
function finish(game, winner, from, kind) {
  if (game.result) return;
  const tile = winner === null ? null : kind === "zimo" ? game.drawn : game.pending.tile;
  game.result = { winner, from, kind, tile, scoring: null, scored: winner === null, request: winner === null ? null : scoreRequest(game, winner, { kind, from, tile }), delta: [0, 0, 0, 0] };
  game.phase = "ended";
  game.pending = null;
  event(game, "end", winner, { winKind: kind });
}
export function settleResult(game, scoring) {
  const result = game.result;
  if (!result || result.scored) return false;
  if (
    !scoring ||
    !Number.isInteger(scoring.total) ||
    scoring.total < 1 ||
    scoring.total > 1000 ||
    !Array.isArray(scoring.fans) ||
    !scoring.fans.length ||
    scoring.fans.some((f) => typeof f.name !== "string" || !Number.isInteger(f.value) || f.value < 1 || !Number.isInteger(f.count) || f.count < 1) ||
    scoring.fans.reduce((n, f) => n + f.value * f.count, 0) !== scoring.total
  )
    throw new Error("算番结果无效");
  const fan = scoring.total,
    winner = result.winner;
  if (result.kind === "zimo")
    for (let seat = 0; seat < 4; seat++) {
      if (seat !== winner) {
        result.delta[seat] -= fan;
        result.delta[winner] += fan;
      }
    }
  else {
    result.delta[result.from] -= fan;
    result.delta[winner] += fan;
  }
  game.players.forEach((p, seat) => (p.score += result.delta[seat]));
  result.scoring = scoring;
  result.scored = true;
  return true;
}
export function nextGame(game, random = Math.random, name = game.players[0].name) {
  const rotates = game.result?.winner !== null && game.result?.winner !== game.dealer;
  return createGame({ random, name, dealer: rotates ? (game.dealer + 1) % 4 : game.dealer, dealerPasses: game.dealerPasses + Number(rotates), round: game.round + 1, scores: game.players.map((p) => p.score) });
}
export function assertGame(game) {
  if (
    !game ||
    game.version !== 1 ||
    !["turn", "claim", "ended"].includes(game.phase) ||
    !Number.isInteger(game.current) ||
    game.current < 0 ||
    game.current > 3 ||
    !Number.isInteger(game.dealer) ||
    game.dealer < 0 ||
    game.dealer > 3 ||
    !Number.isInteger(game.round) ||
    game.round < 1 ||
    !Array.isArray(game.players) ||
    game.players.length !== 4 ||
    !Array.isArray(game.wall) ||
    !Array.isArray(game.events)
  )
    throw new Error("牌局存档格式无效");
  const tiles = [...game.wall];
  game.players.forEach((p, seat) => {
    if (typeof p.name !== "string" || p.name.length > 40 || !Number.isFinite(p.score) || !Array.isArray(p.hand) || !Array.isArray(p.melds) || !Array.isArray(p.flowers) || !Array.isArray(p.discards) || p.melds.length > 4 || p.hand.some(isFlower) || p.flowers.some((t) => !isFlower(t)))
      throw new Error("玩家存档格式无效");
    tiles.push(...p.hand, ...p.flowers, ...p.discards.filter((d) => !d.claimed).map((d) => d.tile));
    for (const m of p.melds) {
      if (!["chi", "peng", "minggang", "angang", "jiagang"].includes(m.kind) || !Array.isArray(m.tiles) || m.tiles.length !== (m.kind.includes("gang") ? 4 : 3)) throw new Error("副露格式无效");
      const types = m.tiles.map(typeOf).sort((a, b) => a - b);
      if (m.kind === "chi" ? types[0] >= 27 || Math.floor(types[0] / 9) !== Math.floor(types[2] / 9) || types[1] !== types[0] + 1 || types[2] !== types[0] + 2 : types.some((t) => t !== types[0])) throw new Error("副露牌型无效");
      tiles.push(...m.tiles);
    }
    if (game.phase !== "ended") {
      const expected = 13 - p.melds.length * 3 + Number(game.current === seat && (game.phase === "turn" || game.pending?.kind === "rob-kong"));
      if (p.hand.length !== expected) throw new Error(`座位 ${seat} 手牌张数无效`);
    }
  });
  if (tiles.length !== 144 || new Set(tiles).size !== 144 || tiles.some((id) => !Number.isInteger(id) || id < 0 || id >= 144)) throw new Error("牌局牌张不守恒");
  if (game.phase === "claim" && (!game.pending || !Array.isArray(game.pending.decisions) || game.pending.decisions.length !== 4 || !["discard", "rob-kong"].includes(game.pending.kind))) throw new Error("响应存档格式无效");
  if (game.phase === "ended" && (!game.result || !Array.isArray(game.result.delta) || game.result.delta.length !== 4 || game.result.delta.reduce((a, b) => a + b, 0) !== 0)) throw new Error("结算存档格式无效");
  return true;
}
