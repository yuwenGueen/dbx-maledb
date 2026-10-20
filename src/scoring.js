// The scorer is the vendored GB-Mahjong native core. This module serializes
// game state only; no credentials, network service or third-party API is used.
const type = (tile) => Math.floor(tile / 4);
function token(tile) {
  const t = type(tile);
  return t < 27 ? `${(t % 9) + 1}${["m", "p", "s"][Math.floor(t / 9)]}` : "ESWNCFP"[t - 27];
}
function packText(meld, seat) {
  const tiles = [...meld.tiles].sort((a, b) => a - b);
  const t = type(tiles[0]);
  const body = t < 27 ? tiles.map((id) => (type(id) % 9) + 1).join("") + ["m", "p", "s"][Math.floor(t / 9)] : tiles.map(token).join("");
  const offer = meld.kind === "angang" ? "" : `,${((seat - meld.from + 4) % 4) + (meld.kind === "jiagang" ? 4 : 0)}`;
  return `[${body}${offer}]`;
}
export function scoreRequest(game, seat, source) {
  const player = game.players[seat];
  const hand = source.kind === "zimo" ? player.hand.filter((id) => id !== source.tile) : player.hand;
  const exposed = game.players.flatMap((p) => [...p.discards.filter((d) => !d.claimed).map((d) => d.tile), ...p.melds.filter((m) => m.kind !== "angang").flatMap((m) => m.tiles)]).filter((id) => type(id) === type(source.tile) && id !== source.tile).length;
  const winds = "ESWN";
  const flags = [source.kind === "zimo", exposed >= 3, game.wall.length === 0, source.kind === "rob-kong" || (source.kind === "zimo" && game.afterKong)].map(Number).join("");
  const flowers = player.flowers.map((id) => "efghabcd"[id - 136]).join("");
  return { hand: player.melds.map((m) => packText(m, seat)).join("") + hand.map(token).join("") + token(source.tile) + `|${winds[Math.floor(game.dealerPasses / 4) % 4]}${winds[(seat - game.dealer + 4) % 4]}${flags}|${flowers}` };
}
