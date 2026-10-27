import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import BorderGlow from './components/BorderGlow/BorderGlow'
import { experiences, miniProjects, projects, strengths } from './data'
import { detailImageHeights } from './detailImageHeights'
import { usePortfolioMotion } from './motion'
import { lockPageScroll } from './scrollLock'

const loadLiquidEther = () => import('./components/LiquidEther/LiquidEther')
const LiquidEther = lazy(loadLiquidEther)

function canUseLiquidEther() {
  const cores = navigator.hardwareConcurrency || 8
  const memory = navigator.deviceMemory || 8
  return !navigator.connection?.saveData && cores > 2 && memory > 2
}

const navItems = [
  { id: 'home', label: '首页', index: '00' },
  { id: 'profile', label: '关于', index: '01' },
  { id: 'work', label: '项目', index: '02' },
  { id: 'capabilities', label: '优势', index: '03' },
  { id: 'contact', label: '联系', index: '04' },
]

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19 19 5M8 5h11v11" />
    </svg>
  )
}

function OpeningSequence() {
  return (
    <div className="opening-screen" data-opening aria-hidden="true">
      <div className="opening-panel opening-panel--top" data-opening-panel />
      <div className="opening-panel opening-panel--bottom" data-opening-panel />

      <div className="opening-content" data-opening-content>
        <div className="opening-topline">
          <span>WANG YIFAN / PORTFOLIO</span>
          <span>CHENGDU · CN</span>
        </div>

        <div className="opening-logo" aria-label="WYF">
          {'WYF'.split('').map((letter) => (
            <span className="opening-letter-mask" key={letter}>
              <span data-opening-letter>{letter}</span>
            </span>
          ))}
        </div>

        <div className="opening-status">
          <span>BUILDING THE EXPERIENCE</span>
          <span>
            <b data-opening-count>000</b> / 100
          </span>
        </div>
        <div className="opening-progress-track">
          <span data-opening-progress />
        </div>
      </div>

      <div className="opening-edge-mark">
        <span>UI / UX / VISUAL</span>
        <span>2019—2026</span>
      </div>
    </div>
  )
}

function ChapterHeading({ index, label, note, lines, className = '' }) {
  return (
    <div className={`chapter-heading ${className}`.trim()}>
      <div className="chapter-title">
        <div className="chapter-meta" data-title-meta>
          <span>{index}</span>
          <span>{label}</span>
          <span>{note}</span>
        </div>
        <h2 className="chapter-display" data-title>
          {lines.map((line) => (
            <span className="title-line" key={`${line.text}-${line.accent || ''}`}>
              <span className="title-line-inner" data-title-line-inner>
                {line.text}
                {line.accent && <em>{line.accent}</em>}
              </span>
            </span>
          ))}
        </h2>
      </div>
    </div>
  )
}

function useScrollUI() {
  const [state, setState] = useState(() => ({
    active: 'home',
    pinned: window.scrollY >= window.innerHeight * 0.85,
  }))

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter(Boolean)
    let frame = 0
    let measureFrame = 0
    let viewportHeight = window.innerHeight
    let pageBottom = document.documentElement.scrollHeight
    let sectionPositions = sections.map((section) => ({
      id: section.id,
      top: section.offsetTop,
    }))

    const updateScrollUI = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = 0
        const scrollY = window.scrollY
        const scrollBottom = scrollY + viewportHeight
        const pinned = scrollY >= viewportHeight * 0.85
        let active = sectionPositions[0]?.id || 'home'

        if (scrollBottom >= pageBottom - 8) {
          active = 'contact'
        } else {
          const readingLine = scrollY + viewportHeight * 0.38
          sectionPositions.forEach((section) => {
            if (section.top <= readingLine) active = section.id
          })
        }

        setState((current) => (
          current.active === active && current.pinned === pinned
            ? current
            : { active, pinned }
        ))
      })
    }

    const measureLayout = () => {
      viewportHeight = window.innerHeight
      pageBottom = document.documentElement.scrollHeight
      sectionPositions = sections.map((section) => ({
        id: section.id,
        top: section.offsetTop,
      }))
      updateScrollUI()
    }

    const scheduleMeasure = () => {
      if (measureFrame) return
      measureFrame = requestAnimationFrame(() => {
        measureFrame = 0
        measureLayout()
      })
    }

    updateScrollUI()
    window.addEventListener('scroll', updateScrollUI, { passive: true })
    window.addEventListener('resize', scheduleMeasure, { passive: true })
    const resizeObserver = 'ResizeObserver' in window
      ? new ResizeObserver(scheduleMeasure)
      : null
    resizeObserver?.observe(document.body)
    document.fonts?.ready.then(scheduleMeasure)

    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(measureFrame)
      resizeObserver?.disconnect()
      window.removeEventListener('scroll', updateScrollUI)
      window.removeEventListener('resize', scheduleMeasure)
    }
  }, [])

  return state
}

function CursorGlow() {
  const glowRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return undefined
    let frame = 0

    const handleMove = (event) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (glowRef.current) {
          glowRef.current.style.transform = `translate3d(${event.clientX - 260}px, ${event.clientY - 260}px, 0)`
        }
      })
    }

    window.addEventListener('pointermove', handleMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', handleMove)
    }
  }, [])

  return <div className="cursor-glow" ref={glowRef} aria-hidden="true" />
}

function useViewportMotion() {
  useEffect(() => {
    const scopes = Array.from(document.querySelectorAll('[data-motion-scope]'))
    if (!scopes.length) return undefined

    if (!('IntersectionObserver' in window)) {
      scopes.forEach((scope) => scope.classList.add('is-motion-visible'))
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-motion-visible', entry.isIntersecting)
      })
    }, { rootMargin: '120px 0px', threshold: 0.01 })

    scopes.forEach((scope) => observer.observe(scope))
    return () => observer.disconnect()
  }, [])
}

function Header({ active, pinned, onContact, contactOpen }) {
  return (
    <header
      className={`site-header ${pinned ? 'is-pinned' : ''} ${
        active === 'contact' ? 'is-light' : ''
      }`}
    >
      <a className="brand" href="#home" aria-label="回到首页">
        <span className="brand-mark" aria-hidden="true">
          <img src="/brand-cat.webp" alt="" width="160" height="160" decoding="async" />
        </span>
        <span className="brand-copy">
          WANG YIFAN
          <small>UI / UX / VISUAL</small>
        </span>
      </a>

      <nav className="main-nav" aria-label="主导航">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={active === item.id ? 'is-active' : ''}
          >
            <span>{item.index}</span>
            {item.label}
          </a>
        ))}
      </nav>

      <button
        className="header-contact"
        type="button"
        onClick={onContact}
        aria-haspopup="dialog"
        aria-expanded={contactOpen}
      >
        联系我！
        <ArrowIcon />
      </button>
    </header>
  )
}

function Hero() {
  const sectionRef = useRef(null)
  const videoRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current
    const video = videoRef.current
    if (!section || !video) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let inView = true
    let pageVisible = document.visibilityState !== 'hidden'

    const syncPlayback = () => {
      if (!inView || !pageVisible || reduceMotion.matches) {
        video.pause()
        return
      }
      video.play().catch(() => {})
    }

    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting
          syncPlayback()
        },
        { rootMargin: '80px 0px', threshold: 0.01 },
      )
      : null

    const onVisibility = () => {
      pageVisible = document.visibilityState !== 'hidden'
      syncPlayback()
    }

    observer?.observe(section)
    reduceMotion.addEventListener?.('change', syncPlayback)
    document.addEventListener('visibilitychange', onVisibility)
    syncPlayback()

    return () => {
      observer?.disconnect()
      reduceMotion.removeEventListener?.('change', syncPlayback)
      document.removeEventListener('visibilitychange', onVisibility)
      video.pause()
    }
  }, [])

  return (
    <section className="hero" id="home" data-motion-scope ref={sectionRef}>
      <video
        ref={videoRef}
        className="hero-video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/media/hero-poster.webp"
        width="1280"
        height="720"
        aria-hidden="true"
      >
        <source src="/media/hero-user-1280.webm" type="video/webm" />
        <source src="/media/hero-user-1280.mp4" type="video/mp4" />
      </video>
      <div className="hero-vignette" />
      <div className="hero-grid" />

      <div className="hero-inner">
        <div className="hero-kicker">
          <span className="signal-dot" />
          BASED IN CHENGDU · AVAILABLE FOR SELECT PROJECTS
        </div>

        <div className="hero-title-block">
          <h1 aria-label="INTERFACE WITH INTENT.">
            <span className="hero-title-line">
              <span className="hero-title-line-inner">INTERFACE</span>
            </span>
            <span className="hero-title-line hero-title-line--offset">
              <span className="hero-title-line-inner outline">WITH</span>
            </span>
            <span className="hero-title-line hero-title-line--last">
              <span className="hero-title-line-inner">INTENT.</span>
            </span>
          </h1>
        </div>

        <div className="hero-footer">
          <div className="hero-role">
            <span>UI DESIGNER</span>
            <span>INTERACTION DESIGNER</span>
            <span>VISUAL DESIGNER</span>
          </div>
          <a className="scroll-mark" href="#profile" aria-label="向下浏览">
            <span>SCROLL TO EXPLORE</span>
            <i />
          </a>
          <span className="hero-year">PORTFOLIO © 2019—2026</span>
        </div>
      </div>
    </section>
  )
}

function StaticBackdrop() {
  return (
    <div className="liquid-backdrop is-static" aria-hidden="true">
      <div className="liquid-ether-fallback" />
      <div className="liquid-backdrop__veil" />
    </div>
  )
}

function LiquidBackdrop() {
  const lightweight = !canUseLiquidEther()
  const lowPower =
    (navigator.hardwareConcurrency || 8) <= 4 ||
    (navigator.deviceMemory || 8) <= 4

  return (
    <div className={`liquid-backdrop ${lightweight ? 'is-static' : ''}`} aria-hidden="true">
      {lightweight ? (
        <div className="liquid-ether-fallback" />
      ) : (
        <Suspense fallback={<div className="liquid-ether-fallback" />}>
          <LiquidEther
            colors={['#0a160e', '#214f35', '#69ad68', '#d1fb88']}
            intensity={1.08}
            mouseForce={lowPower ? 0 : 15}
            cursorSize={170}
            persistence={0.76}
            viscosity={0.16}
            resolution={lowPower ? 0.2 : 0.26}
            pressureSteps={lowPower ? 16 : 20}
            pixelBudget={lowPower ? 620000 : 900000}
            autoDemo
            autoSpeed={0.22}
            autoIntensity={1.45}
            autoResumeDelay={1200}
            clickBurst={false}
            bounceEdges={false}
            intro={!lowPower}
            lightMode={false}
            backgroundColor="#080b09"
            maxDevicePixelRatio={lowPower ? 1 : 1.1}
            maxFps={24}
            interactive={!lowPower}
          />
        </Suspense>
      )}
      <div className="liquid-backdrop__veil" />
    </div>
  )
}

function SectionLabel({ index, en, zh }) {
  return (
    <div className="section-label" data-reveal>
      <span>{index}</span>
      <span>{en}</span>
      <span>{zh}</span>
    </div>
  )
}

function Profile({ glowAnimated }) {
  return (
    <section className="section profile-section" id="profile">
      <div className="section-shell">
        <SectionLabel index="01" en="PROFILE / EXPERIENCE" zh="关于我" />

        <ChapterHeading
          index="01 / PROFILE"
          label="A PRACTICE IN CLARITY"
          note="DESIGNER · 2019—2026"
          lines={[
            { text: 'A PRACTICE' },
            { text: 'IN ', accent: 'CLARITY.' },
          ]}
          className="profile-chapter"
        />

        <div className="profile-glass-wrap" data-panel-reveal data-motion-scope>
          <BorderGlow
            className="profile-glass"
            edgeSensitivity={24}
            glowColor="88 82 68"
            backgroundColor="rgba(9, 10, 9, 0.94)"
            borderRadius={26}
            glowRadius={38}
            glowIntensity={0.95}
            coneSpread={28}
            animated={glowAnimated}
            colors={['#5b9e77', '#83c57d', '#d0fb88']}
            fillOpacity={0}
          >
          <div className="profile-glass-top">
            <div className="profile-glass-id">
              <span className="profile-status-dot" />
              PROFILE DOSSIER / 01
            </div>
            <div className="profile-glass-meta">
              <span>UI / UX / VISUAL DESIGNER</span>
              <span>CHENGDU · CN</span>
            </div>
          </div>

          <div className="profile-glass-body">
            <div className="portrait-card">
              <div className="portrait-frame">
                <img
                  src="/portrait-xiaofan.webp"
                  alt="王一凡的个人照片"
                  width="960"
                  height="960"
                  loading="lazy"
                  decoding="async"
                />
                <span className="image-reveal-mask" data-image-mask aria-hidden="true" />
                <span className="portrait-code">WYF—97</span>
                <span className="corner corner-a" />
                <span className="corner corner-b" />
              </div>
              <div className="portrait-caption">
                <span>王一凡 / Wang Yifan</span>
                <span>PROFILE · 2026</span>
              </div>
            </div>

            <div className="profile-dossier">
              <div className="profile-intro-head">
                <div>
                  <span className="content-tag">DESIGN PROFILE</span>
                  <h2>
                    Figma/Sketch/XD/PS
                    <br />
                    <em>SD/GPT/Codex/claude</em>
                  </h2>
                </div>
                <div className="profile-role-note">
                  <span>FOCUS</span>
                  <p>产品体验 · 视觉系统 · AIGC</p>
                </div>
              </div>

              <div className="profile-story">
                <p className="profile-lead">
                  我是<strong className="profile-highlight">王一凡</strong>，一名关注产品体验的
                  UI / UX 与视觉设计师。
                  <strong className="profile-highlight">6 年</strong>设计实践中，我习惯走进真实业务，理解需求、推演流程、建立规范，
                  再让设计真正落地。
                </p>
                <p className="profile-muted">
                  跨越医疗、商旅、能源与物流，在用户任务、商业目标和视觉表达之间寻找平衡；
                  也持续探索 AIGC 与动态视觉在产品体验中的应用。
                </p>
              </div>

              <div className="facts-grid">
                <div className="fact">
                  <strong className="fact-experience">
                    06<span className="fact-year-unit">年</span><sup>+</sup>
                  </strong>
                  <span>设计经验</span>
                </div>
                <div className="fact">
                  <strong>04</strong>
                  <span>段跨行业经历</span>
                </div>
                <div className="fact">
                  <strong className="fact-zero-one">
                    从<span>0</span>到<span>1</span>
                  </strong>
                  <span>产品落地经验</span>
                </div>
                <div className="fact fact-text">
                  <strong>APP · WEB</strong>
                  <span>小程序 · H5 · 大屏</span>
                </div>
              </div>

              <div className="contact-lines">
                <span className="contact-lines-label">LET&apos;S CONNECT</span>
                <a href="mailto:814606477@qq.com">
                  <span>EMAIL</span>
                  814606477@qq.com
                </a>
                <a href="tel:19183977105">
                  <span>PHONE</span>
                  191 8397 7105
                </a>
                <div>
                  <span>LOCATION</span>
                  四川 · 成都
                </div>
              </div>
            </div>
          </div>

          <div className="profile-glass-footer">
            <span>
              <i />
              AVAILABLE FOR SELECT PROJECTS
            </span>
            <span>DESIGN WITH INTENT / 2019—2026</span>
            <a href="#experience">VIEW EXPERIENCE ↓</a>
          </div>
          </BorderGlow>
        </div>

        <div className="experience-list" id="experience">
          <div className="experience-head" data-reveal>
            <span>SELECTED EXPERIENCE</span>
            <span>2019 — 2026</span>
          </div>
          {experiences.map((item, index) => (
            <article
              className="experience-row"
              key={item.company}
              data-reveal
              style={{ '--delay': `${index * 60}ms` }}
            >
              <span className="experience-period">{item.period}</span>
              <div className="experience-company">
                <h3>{item.company}</h3>
                <span>{item.role}</span>
              </div>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProjectCard({ project, onOpen, featured = false }) {
  const avifSource = project.image.replace(/\.webp$/i, '.avif')

  return (
    <button
      className={`project-card ${featured ? 'featured' : ''} theme-${project.theme}`}
      onClick={() => onOpen(project)}
      data-reveal
      aria-label={`查看项目：${project.name}`}
    >
      <div className="project-image">
        <picture>
          <source srcSet={avifSource} type="image/avif" />
          <img
            src={project.image}
            alt={`${project.name}项目作品预览`}
            width="1400"
            height="788"
            loading="lazy"
            decoding="async"
          />
        </picture>
        <span className="image-reveal-mask" data-image-mask aria-hidden="true" />
      </div>
      <div className="project-overlay" />
      <div className="project-topline">
        <span>{project.number}</span>
        <span>{project.year}</span>
      </div>
      <div className="project-info">
        <div>
          <span className="project-discipline">{project.discipline}</span>
          <h3>{project.name}</h3>
          <p>{project.english}</p>
        </div>
        <span className="project-action">
          查看项目
          <ArrowIcon />
        </span>
      </div>
      <div className="project-tags">
        {project.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </button>
  )
}

function MiniProjectCard({ project, onOpen }) {
  const avifSource = project.image.replace(/\.webp$/i, '.avif')

  return (
    <button
      className={`mini-project-card theme-${project.theme}`}
      onClick={() => onOpen(project)}
      data-reveal
      aria-label={`查看项目：${project.name}`}
    >
      <span className="mini-project-number">{project.number}</span>
      <div className="mini-project-thumb">
        <picture>
          <source srcSet={avifSource} type="image/avif" />
          <img
            src={project.image}
            alt={`${project.name}项目预览`}
            width="1400"
            height="788"
            loading="lazy"
            decoding="async"
          />
        </picture>
        <span className="image-reveal-mask" data-image-mask aria-hidden="true" />
      </div>
      <div className="mini-project-copy">
        <span>{project.discipline}</span>
        <h3>{project.name}</h3>
        <p>{project.english}</p>
      </div>
      <span className="mini-project-arrow">
        <ArrowIcon />
      </span>
    </button>
  )
}

function Work({ onOpen }) {
  return (
    <section className="section work-section" id="work">
      <div className="section-shell">
        <SectionLabel index="02" en="SELECTED WORKS" zh="精选项目" />

        <div className="work-heading">
          <div className="work-title-wrap">
            <div className="chapter-meta" data-title-meta>
              <span>02 / SELECTED</span>
              <span>RECENT PRACTICE</span>
              <span>2022—2026</span>
            </div>
            <h2 className="chapter-display work-display" data-title>
              <span className="title-line">
                <span className="title-line-inner" data-title-line-inner>Selected</span>
              </span>
              <span className="title-line">
                <span className="title-line-inner" data-title-line-inner>
                  <em>Work.</em>
                </span>
              </span>
            </h2>
          </div>
          <div className="work-intro">
            <p>
              从业务目标到界面表达，从一次操作到一套系统。
              这里收录了近几年最完整的几段产品设计实践。
            </p>
            <span className="work-count">05 LARGE / 03 SMALL</span>
          </div>
        </div>

        <div className="projects-grid">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={onOpen}
              featured={index === 0}
            />
          ))}
        </div>

        <div className="mini-projects">
          <div className="mini-projects-heading" data-reveal>
            <div>
              <span>SMALL WORKS</span>
              <h3>更多项目</h3>
            </div>
            <p>移动端、内容产品与垂直行业中的设计实践。</p>
            <span>03 / SELECTED</span>
          </div>
          <div className="mini-projects-grid">
            {miniProjects.map(project => (
              <MiniProjectCard key={project.id} project={project} onOpen={onOpen} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Strengths() {
  return (
    <section className="section capabilities-section" id="capabilities">
      <div className="section-shell">
        <SectionLabel index="03" en="HOW I WORK" zh="个人优势" />

        <ChapterHeading
          index="03 / APPROACH"
          label="FROM AMBIGUITY TO FORM"
          note="THINK / BUILD / REFINE"
          lines={[
            { text: 'THINK.' },
            { text: 'BUILD. ', accent: 'REFINE.' },
          ]}
          className="approach-chapter"
        />

        <div className="capabilities-heading" data-reveal>
          <h2>
            理性搭骨架,
            <br />
            <em>感性做表达。</em>
          </h2>
          <p>
            我擅长把模糊的问题逐步变得更具体，再用清晰、克制但不失个性的视觉方式交付出来。
          </p>
        </div>

        <div className="strength-grid">
          {strengths.map((item) => (
            <article
              className={`strength-card ${item.className || ''}`}
              key={item.index}
              data-reveal
              data-motion-scope
            >
              <div className="strength-head">
                <span>{item.index}</span>
                <i />
              </div>
              <div className="strength-copy">
                <span>{item.en}</span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </div>
              <StrengthVisual type={item.index} />
            </article>
          ))}
        </div>

        <div className="toolbelt" data-reveal>
          <div>
            <span>DESIGN TOOLS</span>
            <p>Figma · Sketch · XD · Photoshop · Rive</p>
          </div>
          <div>
            <span>AIGC PRACTICE</span>
            <p>Stable Diffusion · Midjourney</p>
          </div>
          <div>
            <span>FOCUS</span>
            <p>UI / UX · 视觉系统 · 动效 · 品牌表达</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Contact() {
  return (
    <footer className="contact-section" id="contact" data-motion-scope>
      <div className="contact-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="contact-inner">
        <div className="contact-topline">
          <span>04 / CONTACT</span>
          <span className="availability">
            <i />
            OPEN FOR OPPORTUNITIES
          </span>
        </div>

        <div className="contact-main">
          <p className="contact-kicker" data-reveal>
            HAVE A COMPLEX PROBLEM?
          </p>
          <h2 className="contact-display" data-title>
            <span className="title-line">
              <span className="title-line-inner" data-title-line-inner>LET&apos;S MAKE</span>
            </span>
            <span className="title-line">
              <span className="title-line-inner" data-title-line-inner>
                IT <em>CLEAR.</em>
              </span>
            </span>
          </h2>
          <a className="email-link" href="mailto:814606477@qq.com" data-reveal>
            <span>谢谢参观 小凡个人网站</span>
            <ArrowIcon />
          </a>
        </div>

        <div className="contact-bottom">
          <div>
            <span>PHONE</span>
            <a href="tel:19183977105">191 8397 7105</a>
          </div>
          <div>
            <span>LOCATION</span>
            <p>四川 · 成都 / CHENGDU</p>
          </div>
          <div>
            <span>PROFILE</span>
            <p>UI / UX / VISUAL DESIGNER</p>
          </div>
          <a href="#home" className="back-top">
            BACK TO TOP
            <span>↑</span>
          </a>
        </div>

        <div className="footer-line">
          <span>© 2026 WANG YIFAN</span>
          <span>DESIGNED WITH INTENT</span>
        </div>
      </div>
    </footer>
  )
}

function StrengthVisual({ type }) {
  if (type === 'A') {
    const orderModules = [
      [328, 72], [386, 72], [444, 72],
      [328, 130], [386, 130], [444, 130],
      [328, 188], [386, 188], [444, 188],
    ]

    return (
      <div className="strength-visual visual-clarity" aria-hidden="true">
        <span className="visual-caption">COMPLEX / ORDER</span>
        <svg className="clarity-map" viewBox="0 0 520 300">
          <defs>
            <linearGradient id="clarity-link" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#405d30" />
              <stop offset="52%" stopColor="#bdfc5f" />
              <stop offset="100%" stopColor="#718d52" />
            </linearGradient>
          </defs>

          <g className="clarity-links">
            <path d="M 72 66 C 142 70 176 116 252 148" />
            <path d="M 50 134 C 132 130 166 138 252 148" />
            <path d="M 88 214 C 148 196 188 164 252 148" />
            <path d="M 252 148 C 282 148 292 92 328 94" />
            <path d="M 252 148 C 284 148 296 152 328 152" />
            <path d="M 252 148 C 282 148 292 210 328 210" />
          </g>

          <g className="clarity-chaos">
            <circle cx="72" cy="66" r="5" />
            <circle cx="50" cy="134" r="4" />
            <circle cx="88" cy="214" r="6" />
            <circle cx="138" cy="92" r="3" />
            <circle cx="154" cy="174" r="3.5" />
          </g>

          <circle className="clarity-orbit" cx="386" cy="150" r="112" />
          <circle className="clarity-orbit clarity-orbit-inner" cx="386" cy="150" r="72" />

          <g className="clarity-modules">
            {orderModules.map(([x, y], index) => (
              <rect
                className="clarity-module"
                key={`${x}-${y}`}
                x={x}
                y={y}
                width="40"
                height="40"
                rx="3"
                style={{ '--module-delay': `${index * -0.32}s` }}
              />
            ))}
          </g>

          <circle className="clarity-core" cx="252" cy="148" r="9" />
          <circle className="clarity-core-ring" cx="252" cy="148" r="22" />
          <circle className="clarity-packet" r="4">
            <animateMotion
              dur="4.8s"
              repeatCount="indefinite"
              path="M 72 66 C 142 70 176 116 252 148 C 282 148 292 92 328 94"
            />
          </circle>
        </svg>
        <span className="clarity-label clarity-label-input">CHAOS / INPUT</span>
        <span className="clarity-label clarity-label-output">ORDER / SYSTEM</span>
      </div>
    )
  }

  if (type === 'B') {
    return (
      <div className="strength-visual visual-system" aria-hidden="true">
        <span className="visual-caption">SYSTEM / SCALE</span>
        <span className="system-orbit system-orbit-a" />
        <span className="system-orbit system-orbit-b" />
        <div className="system-stack">
          <span className="system-plane system-plane-1" />
          <span className="system-plane system-plane-2" />
          <span className="system-plane system-plane-3">
            <i />
          </span>
        </div>
        <span className="system-token token-ui">UI</span>
        <span className="system-token token-ux">UX</span>
        <span className="system-token token-system">SYS</span>
      </div>
    )
  }

  if (type === 'C') {
    return (
      <div className="strength-visual visual-vision" aria-hidden="true">
        <span className="visual-caption">VISUAL / TRUST</span>
        <span className="vision-halo vision-halo-a" />
        <span className="vision-halo vision-halo-b" />
        <div className="vision-prism">
          <span className="vision-sheet vision-sheet-a" />
          <span className="vision-sheet vision-sheet-b" />
          <span className="vision-mark">Vi</span>
        </div>
        <span className="vision-swatch vision-swatch-a" />
        <span className="vision-swatch vision-swatch-b" />
        <span className="vision-swatch vision-swatch-c" />
      </div>
    )
  }

  return (
    <div className="strength-visual visual-delivery" aria-hidden="true">
      <span className="visual-caption">IDEA / SHIP</span>
      <svg className="delivery-map" viewBox="0 0 260 210">
        <defs>
          <linearGradient id="delivery-route" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#527c33" />
            <stop offset="62%" stopColor="#bdfc5f" />
            <stop offset="100%" stopColor="#eef9df" />
          </linearGradient>
        </defs>
        <path
          className="delivery-route-base"
          d="M 22 175 C 55 160 54 112 94 118 C 132 124 139 74 176 86 C 205 95 210 48 238 31"
        />
        <path
          className="delivery-route-live"
          d="M 22 175 C 55 160 54 112 94 118 C 132 124 139 74 176 86 C 205 95 210 48 238 31"
        />
        <circle className="delivery-node node-start" cx="22" cy="175" r="5" />
        <circle className="delivery-node node-mid" cx="94" cy="118" r="4" />
        <circle className="delivery-node node-end" cx="238" cy="31" r="7" />
        <circle className="delivery-flow-dot" r="5">
          <animateMotion
            dur="4.2s"
            repeatCount="indefinite"
            path="M 22 175 C 55 160 54 112 94 118 C 132 124 139 74 176 86 C 205 95 210 48 238 31"
          />
        </circle>
      </svg>
      <div className="delivery-badge">
        <i />
        SHIP / READY
      </div>
    </div>
  )
}

function ContactQRModal({ onClose }) {
  useEffect(() => {
    const unlockScroll = lockPageScroll()

    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKey)
    return () => {
      unlockScroll()
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return (
    <div className="contact-qr-modal" role="dialog" aria-modal="true" aria-labelledby="contact-qr-title">
      <button className="contact-qr-backdrop" onClick={onClose} aria-label="关闭二维码" />
      <div className="contact-qr-card">
        <button className="contact-qr-close" onClick={onClose}>
          关闭
          <span>×</span>
        </button>

        <div className="contact-qr-topline">
          <span>LET&apos;S CONNECT / 04</span>
          <span>CONTACT CARD · CHENGDU</span>
        </div>

        <div className="contact-qr-heading">
          <span>WECHAT / SCAN</span>
          <h2 id="contact-qr-title">
            扫码加俺，
            <br />
            <em>联系小凡。</em>
          </h2>
          <p>保存联系方式，或直接发邮件聊聊你的项目。</p>
        </div>

        <div className="contact-qr-code">
          <div className="contact-qr-frame">
            <img
              src="/contact-xiaofan-wechat.webp"
              alt="王一凡的微信二维码"
              width="589"
              height="579"
              decoding="async"
            />
            <span className="qr-corner qr-corner-a" />
            <span className="qr-corner qr-corner-b" />
            <span className="qr-corner qr-corner-c" />
            <span className="qr-corner qr-corner-d" />
          </div>
          <span className="contact-qr-hint">
            <i />
            SCAN TO CONNECT
          </span>
        </div>

        <div className="contact-qr-footer">
          <a href="mailto:814606477@qq.com">814606477@qq.com</a>
          <span>UI / UX / VISUAL DESIGNER</span>
          <a href="tel:19183977105">191 8397 7105</a>
        </div>
      </div>
    </div>
  )
}

function ProjectModal({ project, onClose }) {
  const galleryRef = useRef(null)

  useEffect(() => {
    if (!project) return undefined
    const unlockScroll = lockPageScroll()
    if (galleryRef.current) galleryRef.current.scrollTop = 0

    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKey)
    return () => {
      unlockScroll()
      window.removeEventListener('keydown', handleKey)
    }
  }, [project, onClose])

  if (!project) return null

  const detailPages = project.detailPages || []
  const formatPage = (page) => String(page).padStart(2, '0')

  return (
    <div className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="关闭项目详情" />
      <div className="modal-panel">
        <button className="modal-close" onClick={onClose}>
          关闭
          <span>×</span>
        </button>
        <div className="modal-gallery-column">
          <div className="modal-gallery-head">
            <span>PROJECT ARCHIVE / {project.name}</span>
            <span>
              PAGES {formatPage(detailPages[0])}—{formatPage(detailPages.at(-1))}
            </span>
            <span>SCROLL ↓</span>
          </div>
          <div
            className="modal-image"
            ref={galleryRef}
            tabIndex={0}
            aria-label={`${project.name}项目页面，可纵向滚动浏览`}
          >
            <div className="modal-gallery">
              {detailPages.map((page, index) => {
                const pageNumber = formatPage(page)
                return (
                  <figure className="modal-page" key={page}>
                    <picture>
                      <source
                        srcSet={`/projects/detail/${pageNumber}.avif`}
                        type="image/avif"
                      />
                      <img
                        src={`/projects/detail/${pageNumber}.webp`}
                        alt={`${project.name}项目页面 ${pageNumber}`}
                        width="1600"
                        height={detailImageHeights[pageNumber] || 900}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        fetchpriority={index === 0 ? 'high' : 'low'}
                        decoding="async"
                      />
                    </picture>
                    <figcaption>
                      <span>PAGE {pageNumber}</span>
                      <span>{String(index + 1).padStart(2, '0')} / {detailPages.length}</span>
                    </figcaption>
                  </figure>
                )
              })}
            </div>
          </div>
        </div>
        <div className="modal-copy">
          <div className="modal-index">
            <span>PROJECT {project.number}</span>
            <span>{project.year}</span>
          </div>
          <h2 id="project-title">{project.name}</h2>
          <span className="modal-english">{project.english}</span>
          <p>{project.summary}</p>
          <div className="modal-tags">
            {project.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const rootRef = useRef(null)
  const { active, pinned: headerPinned } = useScrollUI()
  const [selectedProject, setSelectedProject] = useState(null)
  const [contactOpen, setContactOpen] = useState(false)
  usePortfolioMotion(rootRef)
  useViewportMotion()

  return (
    <div className="site-root" ref={rootRef}>
      <OpeningSequence />
      <CursorGlow />
      <Header
        active={active}
        pinned={headerPinned}
        contactOpen={contactOpen}
        onContact={() => setContactOpen(true)}
      />
      <main>
        <Hero />
        {headerPinned && active !== 'contact' && (
          active === 'profile'
            ? <LiquidBackdrop />
            : <StaticBackdrop />
        )}
        <Profile glowAnimated={active === 'profile'} />
        <Work onOpen={setSelectedProject} />
        <Strengths />
      </main>
      <Contact />
      {contactOpen && <ContactQRModal onClose={() => setContactOpen(false)} />}
      <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
    </div>
  )
}
