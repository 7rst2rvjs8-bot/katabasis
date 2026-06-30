# Editorial review: run before every publish

A human pass against the proprietary boundary. Automation enforces the
allowlist; it cannot judge prose. This can. Every box must be checked. Any
ambiguity is resolved by withholding and asking Max, never by guessing.

## Boundary (the WITHHOLD list)

- [ ] No actual strategy, signal, or edge. Nothing about what is traded, when,
      or on what trigger.
- [ ] No specific parameters, thresholds, configs, or formulas. The only
      evaluation ideas named are the two abstract, published principles
      (cost-survival adjustment, overfitting-deflation), explained as principle
      only.
- [ ] No identity of any candidate strategy, and no verdict on a named strategy.
- [ ] No detail of the live system's execution, broker, data sources, or
      holdings.
- [ ] No code, file, or artifact from the trading system, in the repo or in the
      build output.
- [ ] No implementation specifics: signal logic, cost-model constants, kill or
      promotion numbers, trial counts, live-versus-paper internals.
- [ ] No quantified attrition. Kill rate, candidate counts, and throughput are
      shown qualitatively only ("most do not survive"), never as a number.

## Cockpit telemetry publication

- [ ] Public static site assets are assumed public. Anything shipped in `public/`,
      `src/`, `dist/`, or another static asset path is safe to expose to anyone.
- [ ] No client-side login or render gate is treated as protection for static
      JSON. Real telemetry requires private authenticated server-side
      authorization before bytes are returned.
- [ ] Redaction removes fields from exported payloads. It never means hiding,
      blurring, masking, or omitting data only in the DOM/UI after the browser has
      received it.
- [ ] Demo or synthetic telemetry is visibly labeled on the panel itself, not
      buried in copy, provenance, comments, or filenames.
- [ ] Public aggregates are irreversible and do not reveal withheld quantities,
      including universe size, kill-rate, candidate counts, throughput, or other
      reconstructable private values.
- [ ] Public static export contains no real P/L, trade rows, watchlists, contract
      inputs, strategy identities, parameter weights, thresholds, trigger logic,
      live execution flags, kill-rates, candidate counts, or reconstructable
      private values.
- [ ] Every future cockpit panel declares exactly one state: `READY`, `PARTIAL`,
      `MISSING`, `GATED`, `PROPRIETARY_REDACTED`, or `DEMO_SYNTHETIC`.

## Assets

- [ ] No raw screenshots of the live system.
- [ ] Diagrams are redrawn and abstracted, not captured.
- [ ] EXIF / metadata stripped from every raster asset and audited at full
      resolution.
- [ ] Production source maps disabled.
- [ ] Any cinematic footage is abstract, never imagery of the live system.

## Copy standard

- [ ] Frozen copy is verbatim and unaltered.
- [ ] No em-dashes anywhere in the copy.
- [ ] Body copy does not narrate the myth (no threshold / descent / above /
      below in the prose).
- [ ] Self-description under-claims. No exaggeration anywhere; every claim is
      exactly true.

## Sign-off

- [ ] Anything ambiguous was withheld and raised with Max, not guessed.
