Source: https://reactbits.dev/micro/hold-button

React Bits revision: `5d0c00e7594c898e989b250d022806961f4c8478`. Variant: `HoldButton-TS-CSS`.
Original TSX SHA-256: `9c7324f2a344cebd0d9ee6ddf617e1598fbb4e1242ae1efbbbc50fbef6179039`.
Original CSS SHA-256: `f0f9075ad99c2599ef200aa681374c4802faa39bc851e5110f55c56c0a1ab712`.

Local changes: guard callbacks/frames after unmount, settle completion progress and cancel its frame, register reset before the consumer callback, clear pointer ownership on cancellation, and cancel when disabled. The original adapter in `src/genes/holdButton.tsx` supplies action deduplication, navigation/visibility/outside cancellation and accessibility click behavior; exported kits include only this original adapter and install HoldButton separately.
