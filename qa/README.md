# EarbudKit Layout QA

## Automated Static Checker
We run static analysis across all `.tsx` files in `app/` and `src/components/` to enforce touch targets (>= 48dp), flex-wrapping for action rows, single-line text bounds on buttons (`numberOfLines={1}`), and usage of shared layout primitives (`ButtonRow`, `ActionStack`, `EmptyState`).

```bash
npm run layout:check
```

## Screen Sweep Script
To capture high-resolution device screenshots across routes for visual inspection:

```bash
bash scripts/layout-sweep.sh
```

Screenshots are saved directly to `qa/screens/` (gitignored). If no device is connected, the script outputs a clear notice and exits cleanly.
