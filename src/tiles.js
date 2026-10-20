import { typeOf, typeName } from "./engine.js";

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const colors = ["#295967", "#bf4e45", "#26735a"];
const dot = (x, y, color, radius = 4.7) => `<circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="${color}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${radius * 0.36}" fill="${color}"/>`;
function dots(n) {
  if (n === 1) return `<circle cx="22" cy="30" r="13" fill="none" stroke="#26735a" stroke-width="2.5"/><circle cx="22" cy="30" r="9.5" fill="none" stroke="#bf4e45" stroke-width="1.5"/>${dot(22, 30, colors[0], 5.5)}<path d="M22 13v4m0 26v4M5 30h4m26 0h4" stroke="#26735a" stroke-width="1.6"/>`;
  const pips = {
    2: [
      [22, 17],
      [22, 43],
    ],
    3: [
      [12, 15],
      [22, 30],
      [32, 45],
    ],
    4: [
      [12, 16],
      [32, 16],
      [12, 44],
      [32, 44],
    ],
    5: [
      [12, 16],
      [32, 16],
      [22, 30],
      [12, 44],
      [32, 44],
    ],
    6: [
      [12, 14],
      [32, 14],
      [12, 30],
      [32, 30],
      [12, 46],
      [32, 46],
    ],
    7: [
      [10, 12],
      [22, 17],
      [34, 22],
      [12, 35],
      [32, 35],
      [12, 49],
      [32, 49],
    ],
    8: [
      [12, 11],
      [32, 11],
      [12, 24],
      [32, 24],
      [12, 37],
      [32, 37],
      [12, 50],
      [32, 50],
    ],
    9: [
      [10, 13],
      [22, 13],
      [34, 13],
      [10, 30],
      [22, 30],
      [34, 30],
      [10, 47],
      [22, 47],
      [34, 47],
    ],
  }[n];
  return pips.map(([x, y], i) => dot(x, y, (n === 5 && i === 2) || (n === 9 && i >= 3 && i <= 5) ? colors[1] : n === 2 || n === 6 || n === 8 ? colors[2] : colors[i % 3], n >= 8 ? 3.6 : 4.5)).join("");
}
function bamboo(n) {
  if (n === 1)
    return `<path d="m14 40-4 10 11-8m2-20c-9-9-17-1-14 8 2 7 13 12 21 6l-9-2c5-3 9-6 6-11" fill="#327c60"/><path d="M19 23c2-13 13-15 16-6l5 3-7 2c-1 4-6 5-10 3" fill="#357c62"/><circle cx="30" cy="17" r="1.3" fill="#152e31"/><path d="m17 39 8 5m-1-19 8 3m-18 3 7 4m5 7 1 7m-7-7-3 7" stroke="#bc5147" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const coords =
    n === 2
      ? [
          [22, 16],
          [22, 43],
        ]
      : n === 3
        ? [
            [22, 13],
            [12, 42],
            [32, 42],
          ]
        : n === 4
          ? [
              [12, 15],
              [32, 15],
              [12, 44],
              [32, 44],
            ]
          : n === 5
            ? [
                [12, 13],
                [32, 13],
                [22, 30],
                [12, 47],
                [32, 47],
              ]
            : n === 6
              ? [
                  [12, 12],
                  [32, 12],
                  [12, 30],
                  [32, 30],
                  [12, 48],
                  [32, 48],
                ]
              : n === 7
                ? [
                    [22, 10],
                    [10, 29],
                    [22, 29],
                    [34, 29],
                    [10, 48],
                    [22, 48],
                    [34, 48],
                  ]
                : n === 8
                  ? [
                      [11, 11],
                      [33, 11],
                      [11, 25],
                      [33, 25],
                      [11, 39],
                      [33, 39],
                      [11, 53],
                      [33, 53],
                    ]
                  : [
                      [10, 12],
                      [22, 12],
                      [34, 12],
                      [10, 30],
                      [22, 30],
                      [34, 30],
                      [10, 48],
                      [22, 48],
                      [34, 48],
                    ];
  return coords.map(([x, y], i) => `<g stroke="${n === 7 && i === 0 ? colors[1] : colors[2]}" stroke-width="3" stroke-linecap="round"><path d="M${x} ${y - 5}v10m-2-8h4m-4 6h4"/></g>`).join("");
}
function flower(type) {
  const index = type - 34;
  const cx = 22,
    cy = 25;
  return `<g stroke="#34745e" fill="none" stroke-width="1.5"><path d="M22 47V28m0 9c-9 1-11-4-11-7 7 0 10 4 11 7m0 5c9 0 11-5 11-8-8 1-10 5-11 8"/></g>${Array.from({ length: 5 }, (_, i) => `<ellipse cx="${cx}" cy="${cy - 6}" rx="4.2" ry="7" fill="${index < 4 ? "#bc665e" : "#80966c"}" transform="rotate(${i * 72} ${cx} ${cy})"/>`).join("")}<circle cx="22" cy="25" r="3" fill="#d8b35c"/><text x="36" y="57" font-size="9" fill="#8b7864" text-anchor="end" font-family="serif">${["春", "夏", "秋", "冬", "梅", "兰", "竹", "菊"][index]}</text>`;
}
export function faceSvg(type) {
  let body;
  if (type < 9)
    body = `<text x="22" y="29" text-anchor="middle" fill="#233b42" font-size="25" font-weight="700" font-family="STKaiti,KaiTi,serif">${["一", "二", "三", "四", "五", "六", "七", "八", "九"][type]}</text><text x="22" y="52" text-anchor="middle" fill="#bd4f45" font-size="25" font-weight="700" font-family="STKaiti,KaiTi,serif">萬</text>`;
  else if (type < 18) body = dots(type - 8);
  else if (type < 27) body = bamboo(type - 17);
  else if (type === 33) body = `<rect x="9" y="13" width="26" height="34" rx="2" stroke="#49657c" stroke-width="2.3" fill="none"/><rect x="12" y="16" width="20" height="28" rx="1" stroke="#49657c" stroke-width=".8" fill="none"/>`;
  else if (type < 34) body = `<text x="22" y="43" text-anchor="middle" fill="${type === 31 ? colors[1] : type === 32 ? colors[2] : "#24434b"}" font-size="34" font-weight="700" font-family="STKaiti,KaiTi,serif">${["東", "南", "西", "北", "中", "發"][type - 27]}</text>`;
  else body = flower(type);
  return `<svg viewBox="0 0 44 60" aria-hidden="true">${body}</svg>`;
}
export const databaseMark = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><ellipse cx="16" cy="8" rx="10" ry="4"/><path d="M6 8v15c0 5.3 20 5.3 20 0V8M6 15c0 5.3 20 5.3 20 0"/></svg>`;
export function tileHtml(tile, { back = false, size = "", selected = false, suggested = false, drawn = false, clickable = false, muted = false, extra = "" } = {}) {
  const classes = ["tile", back && "tile-back", size, selected && "selected", suggested && "suggested", drawn && "drawn", muted && "tile-muted", extra].filter(Boolean).join(" ");
  const body = back ? `<span class="back-mark">${databaseMark}<span>DBX</span></span>` : faceSvg(typeOf(tile));
  return clickable
    ? `<button type="button" class="${classes}" data-tile="${tile}" aria-label="${escapeHtml(typeName(typeOf(tile)))}${drawn ? "，刚摸到" : ""}" aria-pressed="${selected}">${body}</button>`
    : `<span class="${classes}" ${back ? 'aria-hidden="true"' : `role="img" aria-label="${escapeHtml(typeName(typeOf(tile)))}"`}>${body}</span>`;
}
export function icon(name) {
  const paths = {
    play: '<path d="m9 5 11 7-11 7z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    settings: '<path d="m9.5 4 .8-2h3.4l.8 2 2.3 1.3 2.1-.3 1.7 3-1.3 1.7v2.6l1.3 1.7-1.7 3-2.1-.3-2.3 1.3-.8 2h-3.4l-.8-2L7.2 17l-2.1.3-1.7-3 1.3-1.7V10L3.4 8.3l1.7-3 2.1.3z"/><circle cx="12" cy="10.9" r="3"/>',
    sound: '<path d="M11 4 6 8H3v8h3l5 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    mute: '<path d="M11 4 6 8H3v8h3l5 4zM16 9l6 6m0-6-6 6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4.5 1.8c-1.2.7-2 1.3-2 2.7M12 17h.01"/>',
    history: '<path d="M3 11a9 9 0 1 1 3 7M3 4v7h7M12 7v5l3 2"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    hint: '<path d="M8 16c0-3-3-3-3-7a7 7 0 0 1 14 0c0 4-3 4-3 7zM9 20h6M9 16h6M12 2v2"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    leaf: '<path d="M20 3c0 9-2 16-10 16-8 0-8-13 10-16ZM5 21 17 8"/>',
    robot: '<rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 7V3m-3 9h.01M15 12h.01M9 16h6M1 11v5m22-5v5"/>',
    back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    check: '<path d="m5 12 4 4L20 5"/>',
    flower: '<path d="M12 20v-8m0 5c-5 0-6-3-6-3 4-1 6 3 6 3m0-2c5 0 6-3 6-3-4-1-6 3-6 3"/><circle cx="12" cy="7" r="4"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.help}</svg>`;
}
