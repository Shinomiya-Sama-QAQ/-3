import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { lockPageScroll, resetStaleScrollLock } from './scrollLock'

gsap.registerPlugin(useGSAP, ScrollTrigger)
ScrollTrigger.config({
  limitCallbacks: true,
  ignoreMobileResize: true,
})

const TITLE_FROM = {
  yPercent: 118,
  scaleX: 0.82,
  scaleY: 1.16,
  transformOrigin: 'left bottom',
  willChange: 'transform',
}

const TITLE_TO = {
  yPercent: 0,
  scaleX: 1,
  scaleY: 1,
  duration: 1.55,
  ease: 'expo.out',
}

function query(scope, selector) {
  return Array.from(scope.querySelectorAll(selector))
}

function clearTransform(targets) {
  gsap.set(targets, {
    clearProps: 'transform,visibility,opacity',
    willChange: 'auto',
  })
}

function showReducedMotionFallback(root) {
  const opening = root.querySelector('[data-opening]')
  gsap.set(opening, { autoAlpha: 0, display: 'none' })
  gsap.set(query(root, '[data-title-line-inner], [data-reveal], [data-panel-reveal]'), {
    clearProps: 'all',
  })
}

function buildOpening(root) {
  const opening = root.querySelector('[data-opening]')
  const counter = root.querySelector('[data-opening-count]')
  const introContent = root.querySelector('[data-opening-content]')
  const introLetters = query(root, '[data-opening-letter]')
  const panels = query(root, '[data-opening-panel]')
  const progress = root.querySelector('[data-opening-progress]')
  const header = root.querySelector('.site-header')
  const video = root.querySelector('.hero-video')
  const heroTitleLines = query(root, '.hero-title-line-inner')
  const heroKicker = root.querySelector('.hero-kicker')
  const heroFooter = root.querySelector('.hero-footer')
  const scrollMark = root.querySelector('.scroll-mark i')
  const number = { value: 0 }
  const previousRestoration = history.scrollRestoration

  history.scrollRestoration = 'manual'
  const unlockScroll = lockPageScroll()
  window.scrollTo(0, 0)

  gsap.set(opening, { autoAlpha: 1 })
  gsap.set(introLetters, { yPercent: 120, autoAlpha: 0 })
  gsap.set(progress, { scaleX: 0, transformOrigin: 'left center' })
  gsap.set(header, { y: -22, autoAlpha: 0 })
  gsap.set(video, { scale: 1.12, autoAlpha: 0.38, transformOrigin: 'center center' })
  gsap.set(heroTitleLines, TITLE_FROM)
  gsap.set([heroKicker, heroFooter], { y: 26, autoAlpha: 0 })
  gsap.set(scrollMark, { scaleY: 0.74, transformOrigin: 'top center' })

  const timeline = gsap.timeline({
    defaults: { ease: 'expo.out' },
    onComplete: () => {
      unlockScroll()
      history.scrollRestoration = previousRestoration
      gsap.set(opening, { display: 'none' })
      gsap.set(header, { clearProps: 'transform' })
      gsap.set(heroTitleLines, { clearProps: 'transform' })
      gsap.set(heroTitleLines, { willChange: 'auto' })
      ScrollTrigger.refresh()
    },
  })

  timeline
    .to(introLetters, {
      yPercent: 0,
      autoAlpha: 1,
      duration: 0.95,
      stagger: 0.075,
    }, 0.12)
    .to(progress, {
      scaleX: 1,
      duration: 1.2,
      ease: 'power2.inOut',
    }, 0.08)
    .to(number, {
      value: 100,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (counter) counter.textContent = String(Math.round(number.value)).padStart(3, '0')
      },
    }, 0.08)
    .to(introContent, {
      autoAlpha: 0,
      y: -18,
      duration: 0.5,
      ease: 'power2.inOut',
    }, 1.28)
    .to(panels[0], {
      yPercent: -101,
      duration: 1.45,
      ease: 'expo.inOut',
    }, 1.43)
    .to(panels[1], {
      yPercent: 101,
      duration: 1.45,
      ease: 'expo.inOut',
    }, 1.43)
    .to(video, {
      scale: 1,
      autoAlpha: 0.83,
      duration: 2.7,
    }, 1.55)
    .to(header, {
      y: 0,
      autoAlpha: 1,
      duration: 1.2,
    }, 1.74)
    .to(heroTitleLines, {
      ...TITLE_TO,
      duration: 1.82,
      stagger: 0.13,
    }, 1.8)
    .to(heroKicker, {
      y: 0,
      autoAlpha: 1,
      duration: 1.05,
    }, 2.08)
    .to(heroFooter, {
      y: 0,
      autoAlpha: 1,
      duration: 1.15,
    }, 2.3)
    .to(scrollMark, {
      scaleY: 1,
      duration: 0.9,
    }, 2.48)

  return () => {
    unlockScroll()
    history.scrollRestoration = previousRestoration
  }
}

function buildScrollMotion(root) {
  const genericReveals = query(
    root,
    '[data-reveal]:not(.project-card):not(.mini-project-card)',
  )
  const titles = query(root, '[data-title]')
  const projectCards = query(root, '.project-card')
  const miniCards = query(root, '.mini-project-card')
  const profileCard = root.querySelector('[data-panel-reveal]')
  const profileCopy = query(root, '.profile-dossier > *')
  const parallaxMedia = query(
    root,
    '.project-card, .mini-project-card, .portrait-frame',
  )

  gsap.set(genericReveals, {
    y: 34,
    autoAlpha: 0,
    willChange: 'transform,opacity',
  })
  gsap.set(projectCards, {
    y: 92,
    scale: 0.97,
    autoAlpha: 0,
    willChange: 'transform,opacity',
  })
  gsap.set(miniCards, {
    y: 56,
    scale: 0.98,
    autoAlpha: 0,
    willChange: 'transform,opacity',
  })

  titles.forEach((title, index) => {
    const lines = Array.from(title.querySelectorAll('[data-title-line-inner]'))
    const meta = title.parentElement?.querySelector('[data-title-meta]')
    if (!lines.length) return

    gsap.set(lines, TITLE_FROM)
    if (meta) gsap.set(meta, { y: 18, autoAlpha: 0 })

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: title,
        start: 'top 94%',
        once: true,
        id: `chapter-title-${index}`,
      },
    })

    if (meta) {
      timeline.to(meta, {
        y: 0,
        autoAlpha: 1,
        duration: 0.9,
        ease: 'power3.out',
      }, 0)
    }

    timeline.to(lines, {
      ...TITLE_TO,
      stagger: 0.11,
      onComplete: () => gsap.set(lines, { willChange: 'auto' }),
    }, meta ? 0.06 : 0)
  })

  if (genericReveals.length) {
    ScrollTrigger.batch(genericReveals, {
      start: 'top 84%',
      once: true,
      interval: 0.08,
      batchMax: 4,
      onEnter: (batch) => {
        gsap.to(batch, {
          y: 0,
          autoAlpha: 1,
          duration: 1.05,
          delay: 0.12,
          stagger: 0.09,
          ease: 'expo.out',
          onComplete: () => clearTransform(batch),
        })
      },
    })
  }

  function revealMediaCards(cards, options) {
    if (!cards.length) return

    const masks = cards.map((card) => card.querySelector('[data-image-mask]'))
    const images = cards.map((card) => card.querySelector('img'))
    gsap.set(masks, {
      scaleY: 1,
      transformOrigin: 'top center',
      willChange: 'transform',
    })
    gsap.set(images, {
      scale: 1.16,
      transformOrigin: 'center center',
      willChange: 'transform',
    })

    ScrollTrigger.batch(cards, {
      start: 'top 82%',
      once: true,
      interval: 0.08,
      batchMax: options.batchMax,
      onEnter: (batch) => {
        const batchMasks = batch.map((card) => card.querySelector('[data-image-mask]'))
        const batchImages = batch.map((card) => card.querySelector('img'))

        gsap.to(batch, {
          y: 0,
          scale: 1,
          autoAlpha: 1,
          duration: options.duration,
          delay: options.delay,
          stagger: options.stagger,
          ease: 'expo.out',
          onComplete: () => clearTransform(batch),
        })
        gsap.to(batchMasks, {
          scaleY: 0,
          duration: options.maskDuration,
          delay: options.delay + 0.12,
          stagger: options.stagger,
          ease: 'expo.out',
          onComplete: () => gsap.set(batchMasks, { willChange: 'auto' }),
        })
        gsap.to(batchImages, {
          scale: options.imageScale,
          duration: options.imageDuration,
          delay: options.delay + 0.12,
          stagger: options.stagger,
          ease: 'expo.out',
        })
      },
    })
  }

  revealMediaCards(projectCards, {
    batchMax: 3,
    duration: 1.25,
    maskDuration: 1.15,
    imageDuration: 1.5,
    imageScale: 1.04,
    stagger: 0.13,
    delay: 0.38,
  })

  revealMediaCards(miniCards, {
    batchMax: 3,
    duration: 1.05,
    maskDuration: 1,
    imageDuration: 1.3,
    imageScale: 1.07,
    stagger: 0.1,
    delay: 0.28,
  })

  if (profileCard) {
    const portraitMask = profileCard.querySelector('.portrait-frame [data-image-mask]')
    const portraitImage = profileCard.querySelector('.portrait-frame img')

    gsap.set(profileCard, {
      y: 100,
      scale: 0.975,
      autoAlpha: 0,
      willChange: 'transform,opacity',
    })
    gsap.set(profileCopy, {
      y: 26,
      autoAlpha: 0,
      willChange: 'transform,opacity',
    })
    gsap.set(portraitMask, {
      scaleY: 1,
      transformOrigin: 'top center',
      willChange: 'transform',
    })
    gsap.set(portraitImage, {
      scale: 1.18,
      transformOrigin: 'center center',
      willChange: 'transform',
    })

    const profileTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: profileCard,
        start: 'top 82%',
        once: true,
        id: 'profile-panel',
      },
    })

    profileTimeline
      .to(profileCard, {
        y: 0,
        scale: 1,
        autoAlpha: 1,
        duration: 1.35,
        delay: 0.34,
        ease: 'expo.out',
        onComplete: () => {
          clearTransform(profileCard)
          gsap.set(profileCard, { willChange: 'auto' })
        },
      })
      .to(portraitMask, {
        scaleY: 0,
        duration: 1.2,
        ease: 'expo.out',
        onComplete: () => gsap.set(portraitMask, { willChange: 'auto' }),
      }, 0.52)
      .to(portraitImage, {
        scale: 1,
        duration: 1.55,
        ease: 'expo.out',
      }, 0.52)
      .to(profileCopy, {
        y: 0,
        autoAlpha: 1,
        duration: 1,
        stagger: 0.09,
        ease: 'power3.out',
        onComplete: () => clearTransform(profileCopy),
      }, 0.76)
  }

  parallaxMedia.forEach((media) => {
    const image = media.querySelector('img')
    if (!image) return

    gsap.fromTo(
      image,
      { yPercent: -3.5 },
      {
        yPercent: 3.5,
        ease: 'none',
        scrollTrigger: {
          trigger: media,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.15,
          onToggle: (self) => {
            gsap.set(image, { willChange: self.isActive ? 'transform' : 'auto' })
          },
        },
      },
    )
  })

  const heroVideo = root.querySelector('.hero-video')
  const heroTitleBlock = root.querySelector('.hero-title-block')

  if (heroVideo) {
    gsap.to(heroVideo, {
      yPercent: 9,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.1,
        onToggle: (self) => {
          gsap.set(heroVideo, { willChange: self.isActive ? 'transform' : 'auto' })
        },
      },
    })
  }

  if (heroTitleBlock) {
    gsap.to(heroTitleBlock, {
      y: -54,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: '20% top',
        end: 'bottom top',
        scrub: 1.1,
        onToggle: (self) => {
          gsap.set(heroTitleBlock, { willChange: self.isActive ? 'transform' : 'auto' })
        },
      },
    })
  }
}

export function usePortfolioMotion(scopeRef) {
  useGSAP(() => {
    const root = scopeRef.current
    if (!root) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.documentElement.classList.add('has-gsap')
    resetStaleScrollLock()

    if (reduceMotion) {
      showReducedMotionFallback(root)
      return () => {
        document.documentElement.classList.remove('has-gsap')
      }
    }

    const cleanupOpening = buildOpening(root)
    buildScrollMotion(root)

    let active = true
    document.fonts?.ready.then(() => {
      if (active) ScrollTrigger.refresh()
    })

    return () => {
      active = false
      cleanupOpening()
      document.documentElement.classList.remove('has-gsap')
    }
  }, { scope: scopeRef })
}
