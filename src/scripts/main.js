import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const root = document.documentElement
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* Progressive enhancement. With no JS or reduced motion, the page is the
   static shell: solid register grounds, all copy visible, native scroll. The
   motion layer is added only when it is safe to. If this script never runs,
   nothing is hidden. */
if (!reduceMotion) {
  root.classList.add('motion')
  initMotion()
}

function cssVar(name) {
  return getComputedStyle(root).getPropertyValue(name).trim()
}

function initMotion() {
  const backdrop = document.getElementById('backdrop')

  /* Smooth scroll. Lenis is driven by a single GSAP ticker (no second RAF),
     and ScrollTrigger updates on every Lenis scroll. */
  const lenis = new Lenis({ lerp: 0.1 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  /* Scroll weight. Resistance increases through the descent (lower lerp =
     heavier) to the deepest point, then lightens on the return (higher lerp).
     Held inside the brief's 0.08-0.12 band. NADIR is the approximate scroll
     fraction of the deepest point; it is feel, not physics, and is yours to
     tune. */
  const NADIR = 0.6
  lenis.on('scroll', () => {
    const p = lenis.progress || 0
    lenis.options.lerp =
      p <= NADIR
        ? 0.105 - (0.105 - 0.08) * (p / NADIR)
        : 0.08 + (0.12 - 0.08) * ((p - NADIR) / (1 - NADIR))
  })

  /* The Doré progression. A single fixed backdrop crossfades through the
     registers. The crossfade is driven by each chapter's own scroll progress
     (onUpdate below), NOT by a wall-clock tween, so the background colour and
     the copy reveal are locked to the same scroll position. That is what keeps
     a fast flick through a light/dark flip from ever showing copy mid-crossfade
     against the wrong luminance. The eventual cinematic clips (Phase 4) slot in
     over this same backdrop. */
  gsap.set(backdrop, { backgroundColor: cssVar('--stone-bg') })

  /* Each chapter: from-register -> to-register as it pins. Order is the descent
     and return arc. Chapter I holds stone (no change); the flips are entering
     the descent (II) and the return (IV). */
  const flow = [
    ['.chapter--threshold', '--stone-bg', '--stone-bg'],
    ['.chapter--descent', '--stone-bg', '--descent-bg'],
    ['.chapter--nadir', '--descent-bg', '--nadir-bg'],
    ['.chapter--return', '--nadir-bg', '--return-bg'],
  ]
  const CROSSFADE = 0.15 // fraction of the pin spent crossfading the ground

  flow.forEach(([selector, fromVar, toVar]) => {
    const section = document.querySelector(selector)
    if (!section) return
    const content = section.querySelector('.measure')
    const tint = gsap.utils.interpolate(cssVar(fromVar), cssVar(toVar))

    gsap
      .timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=120%',
          pin: true,
          scrub: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            backdrop.style.backgroundColor = tint(Math.min(self.progress / CROSSFADE, 1))
          },
        },
      })
      /* Reveal only after the ground has settled (0.18 > CROSSFADE), hold, then
         dissolve before release. Scrubbed, so it is reversible. The hold is the
         gap between the two tweens. */
      .fromTo(
        content,
        { autoAlpha: 0, y: 28 },
        { autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.3 },
        0.18,
      )
      .to(content, { autoAlpha: 0, y: -16, ease: 'power2.in', duration: 0.2 }, 0.82)
  })

  /* The creator is the settled close. Both it and the return are light grounds,
     so this transition is not a luminance flip; a quiet timed crossfade and a
     single reveal are enough. Hidden first so it never flashes before reveal. */
  gsap.set('.creator .measure', { autoAlpha: 0 })
  const toClose = () =>
    gsap.to(backdrop, {
      backgroundColor: cssVar('--close-bg'),
      duration: 0.8,
      ease: 'power1.inOut',
      overwrite: 'auto',
    })
  ScrollTrigger.create({
    trigger: '.creator',
    start: 'top 78%',
    onEnter: () => {
      toClose()
      gsap.fromTo(
        '.creator .measure',
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.9 },
      )
    },
    onEnterBack: toClose,
  })

  /* Dev-only handle for headless smoke tests. Stripped from production builds
     (import.meta.env.DEV is statically false there). */
  if (import.meta.env.DEV) {
    window.__kb = { ScrollTrigger, lenis }
  }
}
