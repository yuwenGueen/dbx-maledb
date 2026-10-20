import { createGame, nextGame, act, step, legalActions, assertGame, settleResult, sortTiles, typeOf, tileName, typeName, countsOf, waitingTypes, suggestDiscard, visibleCounts, seatWind, roundWind, WINDS } from "./engine.js";
import { tileHtml, escapeHtml as esc, icon } from "./tiles.js";

const app = document.querySelector("#app");
const dialog = document.querySelector("#dialog");
const toastElement = document.querySelector("#toast");
const STORE_KEY = "maledb.session.v1";
const state = { game: null, view: "home", settings: { name: "我", sound: true, speed: 850, hints: true }, history: [], recorded: [], selected: null, hinted: null, modal: null, paused: false, auto: false, loaded: false, saving: false, saveError: "", scoreError: "", lastRevision: -1, effect: null };
let host = null,
  botTimer = null,
  toastTimer = null,
  effectTimer = null,
  scoreBusy = null,
  saveChain = Promise.resolve(),
  saveTimer = null,
  saveVersion = 0;
let audioContext = null,
  masterGain = null;
const avatarColors = ["#a2d0be", "#d6b19c", "#a7bdd0", "#bfc6a4"];
function avatar(seat, size = "") {
  const hair = ["#344e51", "#56433c", "#3d4657", "#504c3e"][seat];
  return `<span class="avatar ${size}" style="--avatar-color:${avatarColors[seat]}"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="${avatarColors[seat]}"/><path d="M6 48c0-14 9-17 18-17s18 3 18 17" fill="${hair}"/><path d="M19 28h10v9c-3 4-7 4-10 0" fill="#e5b99a"/><ellipse cx="24" cy="21" rx="11" ry="13" fill="#f1d1b5"/><path d="M13 22C7 4 37 0 36 22l-5-10c-4 5-10 4-15 4l-1 8" fill="${hair}"/><circle cx="20" cy="22" r="1" fill="#344247"/><circle cx="28" cy="22" r="1" fill="#344247"/><path d="M21 28q3 2 6 0" fill="none" stroke="#ab7564" stroke-width="1.2" stroke-linecap="round"/></svg></span>`;
}
function button(action, content, cls = "", attrs = "") {
  return `<button type="button" data-action="${action}" class="${cls}" ${attrs}>${content}</button>`;
}
function iconButton(action, symbol, label, active = false) {
  return button(action, icon(symbol), `icon-button${active ? " active" : ""}`, `title="${label}" aria-label="${label}"`);
}
function header() {
  return `<header class="app-header"><button class="brand" data-action="home" aria-label="麻了DB 首页"><span class="brand-tile">中</span><strong>麻了<span>DB</span></strong></button><span class="header-divider"></span><span class="header-label">${state.view === "home" ? "写麻了？摸两张。" : `大众麻将 <span class="header-dot">·</span> 第 ${state.game.round} 局`}</span><nav class="header-actions" aria-label="工具">${state.view === "table" ? iconButton("pause", state.paused ? "play" : "pause", state.paused ? "继续牌局" : "暂停牌局", state.paused) : ""}${button("history", icon("history") + "<span>牌谱</span>", "text-button")}${button("rules", icon("help") + "<span>玩法</span>", "text-button")}${iconButton("sound", state.settings.sound ? "sound" : "mute", state.settings.sound ? "关闭音效" : "开启音效", state.settings.sound)}${iconButton("settings", "settings", "设置")}</nav></header>`;
}
function home() {
  const active = state.game && state.game.phase !== "ended";
  return `<main class="home-screen"><div class="home-art" aria-hidden="true"></div><div class="home-shade" aria-hidden="true"></div><section class="home-copy"><div class="home-wordmark"><span class="wordmark-tile">中</span><div><strong>麻了DB</strong><span>M A &nbsp; D B</span></div></div><h1><span>写麻了？</span><span>摸两张<i>。</i></span></h1><p class="home-subtitle">先放下查询，开一桌麻将。</p><p class="home-mode"><span class="presence-dot"></span>大众麻将 <b>·</b> 四人 <b>·</b> 单机练习</p><div class="home-buttons">${button("start", "开始牌局" + icon("arrow"), "primary large", state.loaded ? "" : "disabled")}${button("resume", icon("history") + "继续上局", "secondary large", active ? "" : 'disabled title="还没有未完成的牌局"')}</div><div class="home-friends"><span class="friend-avatars">${[3, 2, 1].map((s) => avatar(s, "small")).join("")}</span><span>三位电脑牌友，随时就座</span></div></section><div class="mascot-bubble" aria-hidden="true"><span class="thinking-dots"></span>脑力缓冲中…</div><div class="home-terminal" aria-hidden="true"><span>›</span> 下班前，再胡一把 <i></i></div><footer class="home-footer"><span><span class="presence-dot"></span>${state.saveError ? "自动保存暂不可用" : "本地牌桌，随开随歇"}</span>${button("rules", "认识一下大众麻将 " + icon("chevron"), "quiet-link")}</footer></main>`;
}
function playerSeat(seat) {
  const g = state.game,
    p = g.players[seat],
    active = g.phase === "turn" && g.current === seat;
  return `<div class="seat seat-${seat} ${active ? "is-turn" : ""}">${avatar(seat)}<div class="seat-copy"><strong>${esc(seat === 0 ? state.settings.name : p.name)}${seat === 0 ? "<small>你</small>" : "<small>电脑</small>"}</strong><span><b class="seat-wind">${WINDS[seatWind(g, seat)]}</b>${seat === g.dealer ? "<em>庄</em>" : ""}<span class="seat-score">${p.score > 0 ? "+" : ""}${p.score} 分</span></span></div>${active ? '<span class="turn-dot"></span>' : ""}</div>`;
}
function meldsHtml(player, own = false) {
  return player.melds
    .map((m) => `<span class="meld" title="${{ chi: "吃", peng: "碰", angang: "暗杠", minggang: "明杠", jiagang: "补杠" }[m.kind]}">${m.tiles.map((id, i) => tileHtml(id, { back: m.kind === "angang" && (i === 0 || i === 3), size: own ? "meld-tile" : "tiny-tile" })).join("")}</span>`)
    .join("");
}
function rack(seat) {
  const p = state.game.players[seat];
  return `<div class="rack rack-${seat}" aria-label="${esc(p.name)}，${p.hand.length} 张手牌">${p.hand.map(() => tileHtml(0, { back: true, size: "back-small" })).join("")}</div><div class="opponent-melds opponent-melds-${seat}">${meldsHtml(p)}</div><div class="flowers flowers-${seat}" title="${p.flowers.length} 张花牌">${p.flowers.map((id) => tileHtml(id, { size: "flower-tile" })).join("")}</div>`;
}
function river(seat, fresh) {
  const g = state.game;
  return `<div class="river river-${seat}" aria-label="${esc(g.players[seat].name)}的弃牌">${g.players[seat].discards
    .filter((d) => !d.claimed)
    .map((d) => tileHtml(d.tile, { size: "river-tile", extra: (g.lastDiscard?.tile === d.tile ? "last-discard " : "") + (fresh && g.lastDiscard?.tile === d.tile ? "fresh" : "") }))
    .join("")}</div>`;
}
function compass() {
  const g = state.game;
  return `<div class="compass" aria-label="${g.phase === "claim" ? "等待响应" : g.phase === "ended" ? "本局结束" : `${g.players[g.current].name}的回合`}">${[0, 1, 2, 3].map((seat) => `<span class="compass-wind wind-${seat} ${g.phase === "turn" && g.current === seat ? "lit" : ""}">${WINDS[seatWind(g, seat)]}</span>`).join("")}<div class="compass-core"><small>${WINDS[roundWind(g)]}风${WINDS[g.dealerPasses % 4]}局</small><span>余牌 <strong>${g.wall.length}</strong></span><i>${g.phase === "claim" ? "待响应" : g.phase === "ended" ? "本局结束" : "MA DB"}</i></div></div>`;
}
function turnStatus() {
  const g = state.game,
    actions = legalActions(g),
    pending = g.pending;
  if (g.phase === "ended") return g.result.winner === null ? "牌摸完了，换个手气。" : `${g.players[g.result.winner].name} ${g.result.kind === "zimo" ? "自摸" : "胡牌"}了`;
  if (actions.some((a) => a.type === "pass")) return `${g.players[pending.from].name}${pending.kind === "rob-kong" ? "补杠" : "打出"}了 ${tileName(pending.tile)}，你可以响应`;
  if (state.auto) return "已托管，点一下随时接回来";
  if (g.phase === "turn" && g.current === 0) return actions.some((a) => a.type === "hu") ? "好牌来了，可以胡牌" : "轮到你出牌";
  if (g.phase === "claim") return "牌友正在响应…";
  return `${g.players[g.current].name}正在摸牌出牌…`;
}
function actionBar() {
  const g = state.game,
    actions = legalActions(g),
    claim = actions.some((a) => a.type === "pass"),
    turn = g.phase === "turn" && g.current === 0;
  let controls = "";
  if (g.phase === "ended") controls = button("result", "查看结算", "primary") + button("next", "再来一局 " + icon("arrow"), "secondary", !g.result.scored ? "disabled" : "");
  else if (claim) {
    controls = button("pass", "过", "secondary");
    for (const [index, a] of actions.entries())
      if (a.type !== "pass")
        controls += button(`claim:${index}`, a.type === "chi" ? `吃 <span class="chi-preview">${a.tiles.map((id) => tileHtml(id, { size: "mini-tile" })).join("")}</span>` : a.type === "peng" ? "碰" : a.type === "gang" ? "杠" : "胡", a.type === "hu" ? "primary hu-action" : "claim-button");
  } else {
    controls = button("hint", icon("hint") + "提示", "secondary", turn && !state.auto ? "" : "disabled");
    for (const [index, a] of actions.entries()) if (a.type === "gang") controls += button(`claim:${index}`, a.kind === "angang" ? "暗杠" : "补杠", "claim-button");
    if (actions.some((a) => a.type === "hu")) controls += button("hu", "胡", "primary hu-action");
    controls += button("discard", "出牌 " + icon("arrow"), "primary", turn && !state.auto && state.selected !== null ? "" : "disabled");
  }
  return `<div class="action-area"><div class="turn-status"><span class="presence-dot ${turn || claim ? "bright" : ""}"></span>${turnStatus()}</div><div class="action-controls">${controls}</div></div>`;
}
function ownHand(fresh) {
  const g = state.game,
    p = g.players[0],
    drawn = g.current === 0 && g.phase === "turn" ? g.drawn : null;
  const tiles = sortTiles(p.hand.filter((id) => id !== drawn));
  if (drawn !== null) tiles.push(drawn);
  const ready = p.hand.length === 13 - p.melds.length * 3 ? waitingTypes(p.hand, p.melds.length) : [];
  return `<section class="hand-zone" aria-label="你的手牌"><div class="hand-scroll"><div class="own-melds">${meldsHtml(p, true)}</div><div class="own-tiles" role="group" aria-label="点选手牌，双击或 Enter 出牌">${tiles.map((id) => tileHtml(id, { clickable: true, size: "hand-tile", selected: state.selected === id, suggested: state.hinted === id, drawn: id === drawn, extra: fresh && id === drawn ? "fresh-draw" : "" })).join("")}</div><div class="own-flowers">${p.flowers.map((id) => tileHtml(id, { size: "flower-tile" })).join("")}</div></div><div class="hand-caption"><span>${ready.length ? `<b>听牌</b> ${ready.map(typeName).join("、")}` : state.settings.hints ? "点选手牌，双击或 Enter 出牌" : ""}</span><span class="keyboard-hint"><kbd>←</kbd><kbd>→</kbd>选牌 <kbd>空格</kbd>提示</span></div></section>`;
}
function table() {
  const g = state.game,
    fresh = g.revision !== state.lastRevision;
  const markup = `<main class="game-screen"><div class="table-topline">${button("home", icon("back") + "歇一会儿", "text-button")}<span data-save-status>${state.saveError ? "暂未保存" : state.saving ? "保存中…" : "已自动保存"}</span>${button("auto", icon("robot") + (state.auto ? "取消托管" : "托管"), `text-button ${state.auto ? "active" : ""}`, g.phase === "ended" ? "disabled" : "")}</div><div class="mahjong-table"><div class="felt" aria-hidden="true"></div><div class="play-field">${[0, 1, 2, 3].map(playerSeat).join("")}${[1, 2, 3].map(rack).join("")}${[0, 1, 2, 3].map((s) => river(s, fresh)).join("")}${compass()}<div class="table-signature" aria-hidden="true">麻了DB <span>慢慢摸，总会胡。</span></div></div>${actionBar()}${ownHand(fresh)}${state.paused ? `<div class="pause-overlay"><div>${icon("pause")}<h2>歇一口气。</h2><p>牌局等你，不催。</p>${button("pause", "继续牌局", "primary large")}${button("home", "返回首页", "text-button")}</div></div>` : ""}${state.effect ? `<div class="call-effect" data-kind="${state.effect.kind}"><span>${state.effect.text}</span><small>${esc(state.effect.name || "")}</small></div>` : ""}</div><footer class="game-footer"><span><span class="presence-dot"></span>本地四人桌 · 电脑牌友</span><span>大众基础桌 <i>·</i> ${button("rules", "查看规则", "quiet-link")}</span></footer></main>`;
  state.lastRevision = g.revision;
  return markup;
}
function render() {
  const focusedTile = document.activeElement?.dataset?.tile;
  app.innerHTML = header() + (state.view === "home" ? home() : table());
  if (focusedTile) app.querySelector(`[data-tile="${focusedTile}"]`)?.focus({ preventScroll: true });
  for (const river of document.querySelectorAll(".river")) river.scrollTop = river.scrollHeight;
  document.body.dataset.view = state.view;
}
function toast(message) {
  toastElement.textContent = message;
  toastElement.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastElement.classList.remove("visible"), 3600);
}
function ensureAudio() {
  if (!state.settings.sound || document.hidden) return;
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.16;
      masterGain.connect(audioContext.destination);
    }
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  } catch {}
}
function tone(frequency, start, duration, kind = "sine", volume = 0.4) {
  if (!audioContext || audioContext.state !== "running") return;
  const oscillator = audioContext.createOscillator(),
    gain = audioContext.createGain(),
    at = audioContext.currentTime + start;
  oscillator.type = kind;
  oscillator.frequency.setValueAtTime(frequency, at);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.65, at + duration);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.01);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}
function sound(kind) {
  if (!state.settings.sound || document.hidden) return;
  ensureAudio();
  if (kind === "hu") {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.4, "sine", 0.3));
  } else if (kind === "gang") {
    tone(330, 0, 0.13, "triangle", 0.55);
    tone(660, 0.08, 0.18, "sine", 0.45);
  } else if (kind === "peng" || kind === "chi") {
    tone(480, 0, 0.08, "triangle", 0.55);
    tone(680, 0.07, 0.1, "triangle", 0.4);
  } else if (kind === "select") tone(980, 0, 0.045, "sine", 0.25);
  else {
    tone(680, 0, 0.065, "triangle", 0.65);
    tone(1550, 0.008, 0.025, "sine", 0.18);
  }
}
function scheduleSave(immediate = false) {
  clearTimeout(saveTimer);
  const save = () => {
    if (!state.loaded) return;
    const snapshot = JSON.parse(JSON.stringify({ schema: 1, settings: state.settings, game: state.game, history: state.history.slice(0, 30), recorded: state.recorded.slice(-80) }));
    state.saving = true;
    const version = ++saveVersion;
    const status = app.querySelector("[data-save-status]");
    if (status) status.textContent = "保存中…";
    saveChain = saveChain
      .catch(() => {})
      .then(async () => {
        if (host?.capabilities?.storage) await host.storage.set(STORE_KEY, snapshot);
        else if (host) throw new Error("宿主未提供本地保存能力");
        else localStorage.setItem(STORE_KEY, JSON.stringify(snapshot));
        state.saveError = "";
      })
      .catch(() => {
        state.saveError = "自动保存失败，牌局仍在当前页面中。请保持页面打开，检查存储空间。";
        toast(state.saveError);
      })
      .finally(() => {
        if (version === saveVersion) {
          state.saving = false;
          const label = app.querySelector("[data-save-status]");
          if (label) label.textContent = state.saveError ? "暂未保存" : "已自动保存";
        }
      });
  };
  if (immediate) save();
  else saveTimer = setTimeout(save, 120);
}
function addHistory() {
  const g = state.game;
  if (!g?.result?.scored || state.recorded.includes(g.id)) return;
  state.recorded.push(g.id);
  state.history.unshift({ id: g.id, date: new Date().toISOString(), round: g.round, winner: g.result.winner === null ? null : g.players[g.result.winner].name, kind: g.result.kind, total: g.result.scoring?.total || 0, delta: g.result.delta[0], fans: g.result.scoring?.fans || [] });
  state.history = state.history.slice(0, 30);
}
async function ensureScore() {
  const g = state.game;
  if (!g?.result || g.result.scored || scoreBusy === g.id) return;
  scoreBusy = g.id;
  state.scoreError = "";
  try {
    let result;
    if (host) result = await host.invoke("mahjong/score", g.result.request);
    else {
      const response = await fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(g.result.request) });
      result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || "算番服务未就绪");
    }
    if (state.game !== g) return;
    settleResult(g, result);
    addHistory();
    scheduleSave(true);
    render();
    if (state.modal === "result") renderDialog("result");
  } catch (error) {
    if (state.game === g) {
      state.scoreError = error.message || "算番暂未完成";
      if (state.modal === "result") renderDialog("result");
    }
  } finally {
    if (scoreBusy === g.id) scoreBusy = null;
  }
}
function showEffect(kind, seat, text) {
  clearTimeout(effectTimer);
  const game = state.game;
  state.effect = { kind, text, name: state.game.players[seat]?.name || "" };
  effectTimer = setTimeout(() => {
    if (state.game !== game) return;
    state.effect = null;
    render();
    if (game.phase === "ended" && state.view === "table" && !state.modal) openDialog("result");
  }, 950);
}
function afterChange(previousRevision) {
  const g = state.game,
    events = g.events.filter((e) => e.id > previousRevision);
  if (state.selected !== null && !g.players[0].hand.includes(state.selected)) state.selected = null;
  if (g.current === 0 && g.phase === "turn" && state.selected === null) state.selected = g.drawn;
  state.hinted = null;
  for (const e of events) {
    if (["discard", "gang", "peng", "chi"].includes(e.kind)) sound(e.kind);
    if (["gang", "peng", "chi"].includes(e.kind)) showEffect(e.kind, e.player, { gang: "杠", peng: "碰", chi: "吃" }[e.kind]);
    if (e.kind === "end") {
      state.auto = false;
      if (g.result.winner !== null) {
        sound("hu");
        showEffect("hu", g.result.winner, g.result.kind === "zimo" ? "自摸" : "胡了");
        ensureScore();
      } else {
        addHistory();
        setTimeout(() => {
          if (state.game === g && state.view === "table") openDialog("result");
        }, 400);
      }
    }
  }
  scheduleSave();
  render();
  scheduleBots();
}
function scheduleBots() {
  clearTimeout(botTimer);
  if (!state.game || state.view !== "table" || state.paused || state.modal || document.hidden || state.game.phase === "ended") return;
  const g = state.game;
  if ((g.phase === "turn" && g.current === 0 && !state.auto) || (g.phase === "claim" && g.pending.decisions[0] === null && !state.auto)) return;
  botTimer = setTimeout(
    () => {
      if (state.game !== g) return;
      const revision = g.revision;
      try {
        if (step(g, { autoHuman: state.auto })) afterChange(revision);
      } catch (error) {
        state.paused = true;
        toast("牌局已暂停：" + error.message);
        render();
      }
    },
    g.phase === "claim" ? 380 : state.settings.speed,
  );
}
function perform(action) {
  if (!state.game || state.paused || state.modal || state.auto) return;
  const revision = state.game.revision;
  try {
    act(state.game, 0, action);
    afterChange(revision);
  } catch (error) {
    toast(error.message);
  }
}
function startGame() {
  clearTimeout(effectTimer);
  state.effect = null;
  state.game = createGame({ name: state.settings.name });
  state.view = "table";
  state.paused = false;
  state.auto = false;
  state.selected = state.game.drawn;
  state.hinted = null;
  state.lastRevision = -1;
  state.scoreError = "";
  sound("discard");
  scheduleSave(true);
  render();
  scheduleBots();
}
function hint() {
  const g = state.game;
  if (!g || g.current !== 0 || g.phase !== "turn" || state.auto) return;
  const p = g.players[0],
    suggestion = suggestDiscard(p.hand, p.melds, visibleCounts(g));
  if (!suggestion) return;
  state.selected = state.hinted = suggestion.tile;
  const count = countsOf(p.hand)[typeOf(suggestion.tile)];
  toast(`建议打 ${tileName(suggestion.tile)}。${suggestion.waits.length ? "打出后可听 " + suggestion.waits.map(typeName).join("、") : typeOf(suggestion.tile) >= 27 && count === 1 ? "孤张字牌，暂未组成对子。" : "保留更容易组成顺子和刻子的搭子。"}`);
  render();
}
function rulesContent() {
  return `<div class="dialog-eyebrow">大众麻将 · 基础桌</div><h2>好好打牌，规则照常。</h2><p class="dialog-intro">参考欢乐麻将的大众玩法：四人一桌，成牌即可胡。番型在结算时自动计算。</p><div class="rules-grid"><section><h3>一副牌，四个人</h3><p>万、筒、条，东南西北、中发白，加春夏秋冬、梅兰竹菊，共 144 张。庄家 14 张，闲家 13 张；花牌自动亮出并从牌尾补牌。</p></section><section><h3>吃、碰、杠、胡</h3><p>只吃上家的牌；任意一家打出的牌都可碰或明杠。自己可暗杠、补杠，补杠可被抢胡。响应先后为胡、杠、碰、吃；同时可胡时按离放炮者最近的座位截胡。</p></section><section><h3>什么样的牌能胡</h3><p>四组顺子或刻子，加一对将牌。也识别七对、十三幺、全不靠和组合龙等牌型。可自摸或接炮，无 8 番起胡门槛。</p></section><section><h3>番数，清清楚楚</h3><p>采用国标番型核心识别与互斥计分，包含清一色、碰碰和、七对、杠上开花等，花牌每张加 1 番。基础桌固定底分和房间倍率为 1：自摸三家各付一份番数；接炮由放炮者付一份。</p></section></div><p class="rules-note">本桌固定不带财神、扎鸟、打漂、额外杠分或庄家翻倍；不使用国标比赛的 8 分起和与 8 分底分。牌分仅记录本地对局结果。当前是 1 位玩家与 3 位电脑牌友的单机桌。</p><div class="shortcut-row"><span><kbd>←</kbd><kbd>→</kbd>选牌</span><span><kbd>Enter</kbd>出牌</span><span><kbd>空格</kbd>提示</span><span><kbd>Esc</kbd>暂停 / 关闭</span></div>`;
}
function historyContent() {
  const wins = state.history.filter((h) => h.delta > 0).length;
  return `<div class="dialog-eyebrow">牌谱</div><h2>那些胡过的、差点胡的。</h2><p class="dialog-intro">最近 ${state.history.length} 局，赢了 ${wins} 局。</p>${state.history.length ? `<div class="history-list">${state.history.map((h) => `<article><span class="history-result ${h.delta > 0 ? "positive" : ""}">${h.kind === "draw" ? "流局" : h.delta > 0 ? "胡了" : "下次再胡"}</span><div><strong>${h.winner ? esc(h.winner) + (h.kind === "zimo" ? "自摸" : "胡牌") : "这一局，谁都没胡"}</strong><span>${new Date(h.date).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}${h.total ? ` · ${h.total} 番` : ""}</span></div><b class="${h.delta > 0 ? "positive" : ""}">${h.delta > 0 ? "+" : ""}${h.delta} 分</b></article>`).join("")}</div>` : `<div class="empty-state"><span class="wordmark-tile">中</span><p>牌谱还空着，先胡第一把。</p>${button("start", "开始牌局", "primary")}</div>`}`;
}
function resultContent() {
  const g = state.game,
    r = g.result,
    won = r.winner === 0;
  const hand = r.winner === null ? [] : [...g.players[r.winner].hand, ...(r.kind === "zimo" ? [] : [r.tile])];
  return `<div class="dialog-eyebrow">第 ${g.round} 局 · ${r.kind === "draw" ? "流局" : r.kind === "zimo" ? "自摸" : r.kind === "rob-kong" ? "抢杠胡" : "接炮"}</div><h2>${r.winner === null ? "这把没胡，下把一定。" : won ? "胡了，精神了。" : "差一点，下把摸回来。"}</h2><p class="dialog-intro">${r.winner !== null ? `${esc(g.players[r.winner].name)}${r.kind === "zimo" ? "自摸胡牌" : `胡了 ${esc(g.players[r.from].name)}的 ${tileName(r.tile)}`}` : "牌墙已经摸完，庄家继续坐庄。"}</p>${
    hand.length
      ? `<div class="winning-hand">${meldsHtml(g.players[r.winner], true)}${sortTiles(hand)
          .map((id) => tileHtml(id, { size: "result-tile", extra: id === r.tile ? "winning-tile" : "" }))
          .join("")}</div>`
      : ""
  }${r.scoring ? `<div class="fan-summary"><strong>${r.scoring.total}<span> 番</span></strong><div>${r.scoring.fans.map((f) => `<span>${esc(f.name)}${f.count > 1 ? ` ×${f.count}` : ""}<b>${f.value * f.count}</b></span>`).join("")}</div></div>` : !r.scored ? `<div class="score-pending">${state.scoreError ? `${esc(state.scoreError)} ${button("retry-score", "重试算番", "secondary")}` : "正在认真算番…"}</div>` : ""}<div class="score-list">${g.players.map((p, s) => `<div>${avatar(s, "tiny")}<span>${esc(s === 0 ? state.settings.name : p.name)}</span><strong class="${r.delta[s] > 0 ? "positive" : ""}">${r.delta[s] > 0 ? "+" : ""}${r.delta[s]}<small> 分</small></strong></div>`).join("")}</div><div class="dialog-buttons">${button("close-dialog", "看看牌桌", "secondary")}${button("next", "再来一局 " + icon("arrow"), "primary", r.scored ? "" : "disabled")}</div>`;
}
function renderDialog(kind) {
  let content;
  if (kind === "rules") content = rulesContent();
  else if (kind === "history") content = historyContent();
  else if (kind === "settings")
    content = `<div class="dialog-eyebrow">设置</div><h2>按你的节奏来。</h2><form id="settings-form"><label class="form-row"><span>牌桌昵称</span><input name="name" maxlength="12" value="${esc(state.settings.name)}" autocomplete="off" required></label><label class="form-row"><span>牌友出牌速度</span><select name="speed"><option value="1100" ${state.settings.speed === 1100 ? "selected" : ""}>慢慢来</option><option value="850" ${state.settings.speed === 850 ? "selected" : ""}>刚刚好</option><option value="450" ${state.settings.speed === 450 ? "selected" : ""}>快一点</option></select></label><label class="form-row"><span>摸牌与出牌音效</span><input type="checkbox" name="sound" ${state.settings.sound ? "checked" : ""}></label><label class="form-row"><span>显示操作提示</span><input type="checkbox" name="hints" ${state.settings.hints ? "checked" : ""}></label><p class="rules-note">切到其他页面或暂停牌局时，电脑牌友会等你回来。</p><button class="primary" type="submit">保存设置</button></form>`;
  else if (kind === "restart")
    content = `<div class="dialog-eyebrow">重新开局</div><h2>手里这把，还没打完。</h2><p class="dialog-intro">重新开局会结束当前这把牌，历史牌谱保留。</p><div class="dialog-buttons">${button("close-dialog", "继续这把", "secondary")}${button("confirm-start", "重新开局", "primary")}</div>`;
  else if (kind === "result") content = resultContent();
  dialog.className = `dialog dialog-${kind}`;
  dialog.innerHTML = iconButton("close-dialog", "close", "关闭") + content;
}
function openDialog(kind) {
  if (kind === "result" && !state.game?.result) return;
  state.modal = kind;
  clearTimeout(botTimer);
  renderDialog(kind);
  if (!dialog.open) dialog.showModal();
  if (kind === "result") ensureScore();
}
function closeDialog() {
  state.modal = null;
  if (dialog.open) dialog.close();
  scheduleBots();
}
function dispatch(action) {
  ensureAudio();
  if (action === "close-dialog") {
    closeDialog();
    return;
  }
  if (action === "rules" || action === "history" || action === "settings") {
    openDialog(action);
    return;
  }
  if (action === "home") {
    closeDialog();
    state.view = "home";
    clearTimeout(botTimer);
    scheduleSave(true);
    render();
    return;
  }
  if (action === "start") {
    closeDialog();
    if (state.game?.result && !state.game.result.scored) openDialog("result");
    else if (state.game && state.game.phase !== "ended") openDialog("restart");
    else startGame();
    return;
  }
  if (action === "confirm-start") {
    closeDialog();
    startGame();
    return;
  }
  if (action === "resume") {
    if (!state.game || state.game.phase === "ended") return;
    state.view = "table";
    state.paused = false;
    render();
    scheduleBots();
    return;
  }
  if (action === "pause") {
    state.paused = !state.paused;
    render();
    scheduleBots();
    return;
  }
  if (action === "sound") {
    state.settings.sound = !state.settings.sound;
    scheduleSave();
    render();
    if (state.settings.sound) sound("select");
    return;
  }
  if (action === "auto") {
    state.auto = !state.auto;
    render();
    scheduleBots();
    return;
  }
  if (action === "hint") {
    hint();
    return;
  }
  if (action === "discard") {
    if (state.selected !== null) perform({ type: "discard", tile: state.selected });
    return;
  }
  if (action === "hu") {
    perform({ type: "hu" });
    return;
  }
  if (action === "pass") {
    perform({ type: "pass" });
    return;
  }
  if (action.startsWith("claim:")) {
    const a = legalActions(state.game)[Number(action.split(":")[1])];
    if (a) perform(a);
    return;
  }
  if (action === "result") {
    openDialog("result");
    return;
  }
  if (action === "retry-score") {
    ensureScore();
    return;
  }
  if (action === "next") {
    if (!state.game?.result?.scored) return;
    closeDialog();
    state.game = nextGame(state.game, Math.random, state.settings.name);
    state.selected = state.game.current === 0 ? state.game.drawn : null;
    state.effect = null;
    state.paused = false;
    state.auto = false;
    state.lastRevision = -1;
    state.view = "table";
    scheduleSave(true);
    render();
    scheduleBots();
  }
}
document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (action && !action.disabled) {
    dispatch(action.dataset.action);
    return;
  }
  const tile = event.target.closest("[data-tile]");
  if (!tile || state.paused || state.modal || state.auto) return;
  state.selected = Number(tile.dataset.tile);
  state.hinted = null;
  sound("select");
  render();
});
document.addEventListener("dblclick", (event) => {
  const tile = event.target.closest("[data-tile]");
  if (tile) perform({ type: "discard", tile: Number(tile.dataset.tile) });
});
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeDialog();
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog();
  }
});
dialog.addEventListener("submit", (event) => {
  if (event.target.id !== "settings-form") return;
  event.preventDefault();
  const form = new FormData(event.target);
  const name =
    String(form.get("name") || "")
      .trim()
      .slice(0, 12) || "我";
  state.settings = { name, speed: Number(form.get("speed")), sound: form.get("sound") === "on", hints: form.get("hints") === "on" };
  if (state.game) state.game.players[0].name = name;
  closeDialog();
  scheduleSave(true);
  render();
  toast("设置已保存");
});
document.addEventListener("keydown", (event) => {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName) || state.modal) return;
  if (state.view !== "table") return;
  if (event.key === "Escape") {
    event.preventDefault();
    dispatch("pause");
    return;
  }
  if (state.paused || state.auto) return;
  if (event.key === "Enter" && document.activeElement?.tagName !== "BUTTON") {
    event.preventDefault();
    dispatch("discard");
  } else if (event.code === "Space" && (document.activeElement?.tagName !== "BUTTON" || document.activeElement?.dataset?.tile)) {
    event.preventDefault();
    hint();
  } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    const tiles = [...document.querySelectorAll(".own-tiles [data-tile]")];
    const index = tiles.findIndex((el) => Number(el.dataset.tile) === state.selected);
    const next = (index + (event.key === "ArrowLeft" ? -1 : 1) + tiles.length) % tiles.length;
    if (tiles[next]) {
      state.selected = Number(tiles[next].dataset.tile);
      render();
      document.querySelector(`[data-tile="${state.selected}"]`)?.focus({ preventScroll: true });
    }
  }
  if (event.key === "Enter" && document.activeElement?.dataset?.tile) {
    event.preventDefault();
    dispatch("discard");
  }
});
document.addEventListener("visibilitychange", () => {
  clearTimeout(botTimer);
  if (document.hidden) {
    scheduleSave(true);
    audioContext?.suspend().catch(() => {});
  } else scheduleBots();
});
window.addEventListener("pagehide", () => scheduleSave(true));
async function initialize() {
  render();
  try {
    if (window.dbxPlugin) {
      host = window.dbxPlugin;
      await host.ready;
    }
    const saved = host?.capabilities?.storage ? await host.storage.get(STORE_KEY) : host ? null : JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved?.schema === 1) {
      const preferences = saved.settings || {};
      state.settings = { name: typeof preferences.name === "string" ? preferences.name.slice(0, 12) || "我" : "我", sound: preferences.sound !== false, speed: [450, 850, 1100].includes(preferences.speed) ? preferences.speed : 850, hints: preferences.hints !== false };
      state.history = Array.isArray(saved.history) ? saved.history.filter((h) => h && typeof h.id === "string" && typeof h.date === "string" && Number.isFinite(h.delta)).slice(0, 30) : [];
      state.recorded = Array.isArray(saved.recorded) ? saved.recorded.filter((id) => typeof id === "string").slice(-80) : [];
      if (saved.game) {
        try {
          assertGame(saved.game);
          state.game = saved.game;
          state.game.players[0].name = state.settings.name;
        } catch {
          toast("上局存档不完整，已保留牌谱，可以重新开局。");
        }
      }
    }
  } catch {
    state.saveError = "本地存档暂时不可用，本次牌局可继续进行。";
    toast(state.saveError);
  }
  state.loaded = true;
  render();
  if (state.game?.result && !state.game.result.scored) ensureScore();
}
initialize();
