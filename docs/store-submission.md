## Plugin submission

- Plugin ID: `dev.maledb.mahjong`
- Version: `0.1.0`
- Publisher ID: `yuwengueen` (existing publisher record)

## Source repository and tag

https://github.com/yuwenGueen/dbx-maledb/tree/v0.1.0

Unsigned candidate metadata: https://github.com/yuwenGueen/dbx-maledb/releases/download/v0.1.0/release-candidates.json

The exact release candidate URL, SHA-256 and size are pinned in `candidates/dev.maledb.mahjong.json`. Only `darwin-arm64` is submitted.

## Capabilities and user workflow

MaLeDB / 麻了DB is a standalone Mahjong workbench in DBX: open the workbench, start a four-player local game with three computer opponents, and play through chi/peng/kong/hu and native fan scoring. Includes hints, auto-play, sounds, pause, saved games and recent results. The UI is Simplified Chinese; listing metadata includes English and zh-CN.

Exact fixed room rules are documented in the source README. This is an independent implementation, with no Tencent affiliation and no claim of matching every Tencent room. No online/LAN play, accounts, payments or redeemable currency.

## Permissions, data access, and network access

Only `host.storage`, scoped to this plugin, for nickname/preferences, current game state, game scores, recent results and duplicate-settlement markers. No database connections/content, credentials, clipboard or host-file APIs are accessed. No telemetry or external requests. All UI assets and synthesized sounds are local.

Privacy/native behavior disclosure: https://github.com/yuwenGueen/dbx-maledb/blob/v0.1.0/docs/security.md

## Native sidecar behavior

A bundled Go/C++ `darwin-arm64` executable accepts bounded `mahjong/score` JSONL RPC calls over stdin/stdout and returns fan names and scores. The default plugin entry does not launch subprocesses, invoke shell commands, listen on sockets, access the internet or write user files. Native code has normal user OS privileges; Manifest permissions do not imply an OS sandbox.

An explicit developer-only `--preview 127.0.0.1:<port>` mode serves local UI and scoring HTTP requests with Host/Origin checks. It is not started in normal plugin mode. Game persistence is handled by the host storage bridge.

## Validation

Nine tests pass, including 130 upstream fan/exclusion fixtures and 100 complete self-play games with tile conservation and zero-sum settlement checked. Browser QA verified actual DBX SDK/CSP opaque iframe storage, chi/peng/kong/hu, native scoring, result display and next-round scores. The package was installed and its UI/icon read through the actual DBX installer/registry in an isolated temporary directory. Actual desktop WebView installation testing is still outstanding and is disclosed in `VALIDATION.md`.

![Homepage](https://raw.githubusercontent.com/yuwenGueen/dbx-maledb/v0.1.0/designs/runtime-home-1280.png)

![Table](https://raw.githubusercontent.com/yuwenGueen/dbx-maledb/v0.1.0/designs/runtime-table-1280x800.png)

![Native scoring in the DBX SDK sandbox](https://raw.githubusercontent.com/yuwenGueen/dbx-maledb/v0.1.0/designs/runtime-sandbox-win.png)

## License

Apache-2.0 for original code/assets. Bundled GB-Mahjong/gb-mahjong-js components are MIT; the unchanged DBX Go SDK is Apache-2.0. Copyright and license notices are retained in the source and package.

## Homepage or support URL

https://github.com/yuwenGueen/dbx-maledb

https://github.com/yuwenGueen/dbx-maledb/issues

## Confirmation

- [x] The candidate packages are unsigned and match the disclosed source tag.
- [x] I have not included private keys, tokens, credentials, or proprietary data.
- [x] The candidates are listed in `candidates/dev.maledb.mahjong.json`; `plugins/` and `catalog/` were not edited manually.
