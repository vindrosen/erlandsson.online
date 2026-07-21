# Hero Animation — Design

**Date:** 2026-07-20
**Goal:** Enhance the home hero with premium, subtle ambient motion while preserving the
existing artwork, composition, and zero-dependency architecture.

## Approach

Three options were considered:

1. **AI-regenerated layered artwork** (bildgen MCP): split the scene into sky / city /
   foreground layers and animate real parallax. Rejected — generated layers cannot
   pixel-match the existing painting (identity drift), and 3-4 full-size images would
   multiply the LCP payload.
2. **WebGL shader scene** (three.js or raw WebGL). Rejected — a dependency or a large
   amount of bespoke code for effects achievable far cheaper; worst maintainability.
3. **Procedural overlay on the original artwork** — keep `hero-home.webp` untouched and
   composite lightweight animated layers on top: one `<canvas>` for particles plus a few
   CSS-animated glow divs anchored to features of the painting. **Chosen** — perfect
   identity preservation, ~0 extra network payload, GPU-friendly, zero dependencies.

## Architecture

```
js/hero-scene.js      new module — builds + drives the scene, self-cleaning
js/views/home.js      swaps heroBackground() for heroBackdrop() + heroStatus()
css/pages.css         hs-* layer styles, keyframes, entrance animations
```

### The stage

`object-fit: cover; object-position: center 30%` means the artwork's on-screen crop
changes with viewport ratio, so overlays positioned in hero coordinates would drift off
the moon/ship/consoles. Instead a `.hs-stage` div is JS-sized to the exact cover box of
the image (same math the browser uses), the `<img>` fills the stage 100%, and every
overlay is positioned in **percent of the artwork** — guaranteed registration at any
viewport. A ResizeObserver on the hero re-runs the fit math.

### Layers (bottom → top)

| Layer | Tech | Motion |
|---|---|---|
| Placeholder gradient | existing div | crossfades out when img loads |
| Artwork img | existing webp | one-time fade-in |
| Nebula drift | CSS div, screen blend | 60s translate/opacity drift |
| Moon glow | CSS div, screen blend | 14s breathing opacity |
| Ship engine glow | CSS div, screen blend | 3.5s pulse at the ship's thruster |
| City beam shimmer | 3 CSS divs, screen blend | staggered 7-11s opacity shimmer |
| HUD console sheen | 2 CSS divs | slow scanline sweep + glow breathing |
| Particle canvas | one `<canvas>`, rAF | twinkling stars, shooting stars, distant traffic ship, city window glints |
| Hero gradient (existing `::after`) | unchanged | — |
| Hero content | existing markup + typed status line | staggered entrance; scroll parallax |

### Artwork anchor map (percent of image)

Moon center ~(22, 24); ship engine ~(76, 31); HUD consoles bottom-left/right corners;
city band y 62-75; beams near x 13 / 34 / 72 / 86 (fine-tuned visually). Stars spawn in
the sky region only, excluding the moon disk, ship box, and the figure's silhouette.
Constants live in one `SCENE` block at the top of `hero-scene.js` for easy tuning.

### Interaction

- **Pointer** (fine pointers only): stage translates up to ±8px x / ±5px y, lerped in
  the rAF loop; stage is scaled 1.03 so edges never show. Stars get a per-particle depth
  multiplier for micro-parallax.
- **Scroll**: hero content translates down at 0.2× scroll and fades, giving depth
  against the fixed scene. Transform/opacity only.
- **Idle life**: shooting star every ~14-28s, a tiny blinking traffic ship crossing the
  sky every ~35-60s, continuous low-alpha city glints.
- **Typed status line**: a small JetBrains Mono terminal line under the blurb cycling
  short phrases (code/AI/games themed) with a blinking cursor — reinforces "software
  developer" storytelling without altering composition.

## Performance & lifecycle

- Single rAF loop; skips all work (draw + lerp) when the hero is off-screen
  (IntersectionObserver) or the tab is hidden; CSS animations pause via a `.hs-paused`
  class. Loop self-terminates and removes window listeners when the router wipes the
  view (`stage.isConnected` check), so repeated navigation cannot leak.
- Canvas backing store capped at DPR 2; star count scales with viewport (~50-110).
- All CSS animation is opacity/transform; gradients are pre-computed (no filter anims).
- `prefers-reduced-motion: reduce` → static hero exactly as today (no canvas, no
  listeners, keyframes gated behind `no-preference`); typed line renders as static text.
- No new network requests; `fetchpriority="high"` added to the LCP hero image.
- No layout shift: overlays are absolute; status line reserves its height.

## v2 additions (2026-07-21, after user feedback: "the ship should move, more moving light")

- **The painted ship now truly moves.** The image MCP has no inpainting, so the ship was
  extracted with `sharp`: a feathered hand-traced mask cuts the ship + engine trail out
  of the artwork into `assets/art/hero-ship.webp` (100% original pixels, alpha edges),
  and `assets/art/hero-sky-patch.webp` fills the hole with sky cloned from directly
  above the ship (only a thin border around the drifting sprite is ever exposed). Both
  swap in only when loaded (`hs-ship-live`), so the painted ship is the fallback. The
  sprite gets a 34s patrol drift (translate + ±0.6° rotate), carries the engine glow,
  and sits at 1.45× pointer-parallax depth for a 2.5D feel. ~47 KB total added.
- **More moving light**: the 6 brightest stars sparkle with cross glints; shooting stars
  every 7-16s with occasional twins; up to 5 air-traffic lights gliding along both
  skylines (fading at corridor ends as if behind buildings); red anti-collision beacons
  blinking on the two tallest spires; energy pulses periodically travel up the city
  light beams; a fifth beam added at x=88.3%.

## Testing

No test infra exists in this zero-dependency site; verification is behavioral via the
browser: console clean, overlay registration at multiple viewport sizes, reduced-motion
path, navigation teardown, and smooth frame pacing.
