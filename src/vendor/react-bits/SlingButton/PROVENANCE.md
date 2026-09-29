# SlingButton

- Upstream: David Haz, React Bits, `src/ts-default/Micro/SlingButton`.
- Cached revision: `5d0c00e7594c898e989b250d022806961f4c8478`.
- Registry entry: `SlingButton-TS-CSS`.
- License: MIT + Commons Clause; see `LICENSE.md`.
- Original TSX SHA-256: `379c0a48783d20daf17e993dd593dc8476838b2da3a4576c7786db0b8dc141bb`.
- Original CSS SHA-256: `c433b5c3bd08bc3e8490263c2fa885c427eff66fbe3ef22b61245e08c98f59c9`.

Local changes: types split into `types.ts`; Hugeicons replaced with an original inline arrow; particles default to zero and are capped at eight; animation frames, transient timers and particle animations are cleaned up; reduced-motion settling is immediate; returning a pull to its origin disarms it; pointer release samples the final position; consumer callbacks run after internal scheduling so synchronous unmount can clean everything up.

The original xʸ adapter in `src/genes/slingButton.tsx` uses the official public props only and always disables particles. Downloaded kits include that adapter and its stylesheet, referencing a separately installed official registry component. These modified vendor files are not included in downloadable kits.
