/*
 * web-ui – beteendet: egna element utan shadow DOM och utan beroenden. Utseendet står i kh.css.
 *
 * Filen exporterar inget, så att den fungerar både länkad rakt av (<script src=".../kh.js"></script>,
 * Husjakt) och importerad (import '@kodhast/web-ui/kh.js', Veckans mat). Den definierar:
 *
 * - <kh-dots>       Kodhästs två prickar (BrandDots); attributet bouncing får dem att hoppa.
 * - <kh-header>     Sidhuvudet som krymper när innehållet rullas (AppHeader).
 * - <kh-toolbar>    Flikraden med huvudknappen och dess meny (AppFloatingToolbar).
 * - <kh-refresh>    Dra ned för att uppdatera (AppPullToRefresh med prickar).
 * - <kh-segmented>  Segmentvalet, ett val i taget (AppSegmentedChoice).
 *
 * Val meddelas med händelsen kh-select (detail: { index, value }), en dragning med kh-refresh.
 */
(() => {
  if (customElements.get('kh-dots')) return;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, fraction) => from + (to - from) * fraction;
  const px = (value) => `${Math.round(value * 100) / 100}px`;

  /** Ett tal ur tokens.css, t.ex. --kh-header-expanded, i px. */
  const token = (element, name, fallback) => {
    const value = parseFloat(getComputedStyle(element).getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };

  /** Närmaste förälder som rullar, annars sidan. */
  const scrollerOf = (element) => {
    for (let node = element.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      const overflow = getComputedStyle(node).overflowY;
      if (overflow === 'auto' || overflow === 'scroll') return node;
    }
    return document.scrollingElement;
  };
  const scrollTarget = (scroller) => (scroller === document.scrollingElement ? window : scroller);

  /* ---------- Prickarna (BrandDots) ---------- */

  class KhDots extends HTMLElement {
    connectedCallback() {
      if (!this.querySelector(':scope > i')) this.append(document.createElement('i'), document.createElement('i'));
    }
  }
  customElements.define('kh-dots', KhDots);

  /* ---------- Sidhuvudet (AppHeader) ---------- */

  // Appnamnet tonar bort på första 40 % av ihopfällningen, undertiteln på första 33 %; i sidled hinner
  // rubriken fram till ikonen på första halvan (som i android-ui). Fäller ut först högst upp.
  const SIDEWAYS_BY = 0.5;

  /**
   * <kh-header> med barnen .kh-header__icon, .kh-header__name, .kh-header__trailing,
   * .kh-header__title (gärna <kh-dots> och ett <span> med texten) och .kh-header__subtitle – alla utom
   * rubriken valfria. Rullar sidan (eller närmaste förälder som rullar, eller den som attributet
   * scroller pekar ut) krymper huvudet med fingret från 144 till 64 och får kortens färg och skugga när
   * innehåll ligger under (data-raised). Huvudet tar alltid 144 i flödet, så innehållet hoppar inte.
   */
  class KhHeader extends HTMLElement {
    #scroller = null;
    #target = null;
    #frame = 0;
    #metrics = null;
    #resize = new ResizeObserver(() => this.#measure());
    #onScroll = () => {
      if (!this.#frame) this.#frame = requestAnimationFrame(() => this.#update());
    };

    connectedCallback() {
      const selector = this.getAttribute('scroller');
      this.#scroller = (selector && document.querySelector(selector)) || scrollerOf(this);
      this.#target = scrollTarget(this.#scroller);
      this.#target.addEventListener('scroll', this.#onScroll, { passive: true });
      this.#resize.observe(this);
      const trailing = this.querySelector(':scope > .kh-header__trailing');
      if (trailing) this.#resize.observe(trailing);
      this.#measure();
      document.fonts?.ready.then(() => this.isConnected && this.#measure());
    }

    disconnectedCallback() {
      this.#target?.removeEventListener('scroll', this.#onScroll);
      this.#resize.disconnect();
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
    }

    /** Hur långt huvudet fällts ihop, 0–1. */
    get collapsedFraction() {
      return this.#metrics ? this.#fraction() : 0;
    }

    #fraction() {
      const { expanded, collapsed } = this.#metrics;
      return clamp(this.#scroller.scrollTop / (expanded - collapsed), 0, 1);
    }

    /** Rubrikens två stilar (screen-title i vila, section-title ihopfälld) och huvudets mått. */
    #measure() {
      const probe = (font, tracking) => {
        const element = document.createElement('span');
        element.className = 'kh-header__probe';
        element.textContent = 'Åg';
        element.style.font = font;
        element.style.letterSpacing = tracking;
        this.append(element);
        const style = getComputedStyle(element);
        const result = {
          size: parseFloat(style.fontSize),
          lineHeight: parseFloat(style.lineHeight) || element.getBoundingClientRect().height,
          weight: parseFloat(style.fontWeight),
          tracking: parseFloat(style.letterSpacing) || 0,
          height: element.getBoundingClientRect().height
        };
        element.remove();
        return result;
      };
      this.#metrics = {
        expanded: token(this, '--kh-header-expanded', 144),
        collapsed: token(this, '--kh-header-collapsed', 64),
        icon: token(this, '--kh-header-app-icon', 40),
        collapsedIcon: token(this, '--kh-header-collapsed-app-icon', 32),
        start: token(this, '--kh-space-l', 16),
        end: token(this, '--kh-space-xs', 4),
        gap: token(this, '--kh-space-m', 12),
        trailingGap: token(this, '--kh-space-s', 8),
        large: probe('var(--kh-type-screen-title)', 'var(--kh-tracking-screen-title)'),
        small: probe('var(--kh-type-section-title)', 'normal')
      };
      this.#update();
    }

    #update() {
      this.#frame = 0;
      const m = this.#metrics;
      if (!m) return;
      const f = this.#fraction();
      const width = this.clientWidth;
      const hasIcon = !!this.querySelector(':scope > .kh-header__icon');
      const trailing = this.querySelector(':scope > .kh-header__trailing');
      const trailingWidth = trailing?.offsetWidth ?? 0;

      const iconSize = lerp(m.icon, m.collapsedIcon, f);
      const beside = hasIcon ? m.start + m.collapsedIcon + m.gap : m.start;
      const endClearance = trailingWidth > 0 ? trailingWidth + m.end + m.trailingGap : m.start;
      const nameX = m.start + (hasIcon ? iconSize + m.gap : 0);
      const restWidth = Math.max(0, width - 2 * m.start);
      const sideways = Math.min(1, f / SIDEWAYS_BY);
      const titleWidth = lerp(restWidth, Math.max(0, width - beside - endClearance), sideways);
      const titleHeight = lerp(m.large.height, m.small.height, f);
      const titleY = lerp(m.collapsed, (m.collapsed - titleHeight) / 2, f);

      const s = this.style;
      s.setProperty('--kh-header-f', String(Math.round(f * 1000) / 1000));
      s.setProperty('--kh-header-height', px(lerp(m.expanded, m.collapsed, f)));
      s.setProperty('--kh-header-rest', px(m.expanded));
      s.setProperty('--kh-header-row', px(m.collapsed));
      s.setProperty('--kh-header-icon-size', px(iconSize));
      s.setProperty('--kh-header-name-x', px(nameX));
      s.setProperty('--kh-header-name-max', px(Math.max(0, width - nameX - endClearance)));
      s.setProperty('--kh-header-title-x', px(lerp(m.start, beside, sideways)));
      s.setProperty('--kh-header-title-y', px(titleY));
      s.setProperty('--kh-header-title-max', px(titleWidth));
      s.setProperty('--kh-header-title-size', px(lerp(m.large.size, m.small.size, f)));
      s.setProperty('--kh-header-title-line', px(lerp(m.large.lineHeight, m.small.lineHeight, f)));
      s.setProperty('--kh-header-title-weight', String(Math.round(lerp(m.large.weight, m.small.weight, f))));
      s.setProperty('--kh-header-title-tracking', px(lerp(m.large.tracking, m.small.tracking, f)));
      s.setProperty('--kh-header-subtitle-y', px(titleY + titleHeight));
      s.setProperty('--kh-header-subtitle-max', px(restWidth));
      // Upphöjt: ihopfällt och innehåll har rullat in under huvudet.
      this.toggleAttribute('data-raised', this.#scroller.scrollTop > m.expanded - m.collapsed + 0.5);
    }
  }
  customElements.define('kh-header', KhHeader);

  /* ---------- Val i en grupp: flikarna och segmenten ---------- */

  const SELECTED = ['aria-selected', 'aria-checked', 'aria-pressed', 'aria-current'];

  /** Vilket attribut gruppens barn bär sitt val i; [fallback] om inget barn har något. */
  const selectionAttribute = (items, fallback) => SELECTED.find((name) => items.some((item) => item.hasAttribute(name))) ?? fallback;

  /** Markerar [target] som valt bland [items] och meddelar kh-select från [host]. */
  const select = (host, items, target, fallback) => {
    const attribute = selectionAttribute(items, fallback);
    const before = items.find((item) => item.getAttribute(attribute) === (attribute === 'aria-current' ? 'page' : 'true'));
    for (const item of items) {
      if (attribute === 'aria-current') {
        if (item === target) item.setAttribute(attribute, 'page');
        else item.removeAttribute(attribute);
      } else {
        item.setAttribute(attribute, String(item === target));
      }
    }
    if (before !== target) {
      host.dispatchEvent(new CustomEvent('kh-select', {
        bubbles: true,
        detail: { index: items.indexOf(target), value: target.value || target.dataset.value || target.textContent.trim() }
      }));
    }
  };

  /* ---------- Flikraden (AppFloatingToolbar) ---------- */

  let anchors = 0;

  /**
   * <kh-toolbar> med .kh-toolbar__tabs (flikarna .kh-toolbar__tab) och valfritt huvudknappen
   * .kh-toolbar__action. En flik som är en knapp väljs vid tryck (aria-selected) och meddelar kh-select;
   * en flik som är en länk lämnar valet åt appen (aria-current="page"). Huvudknappen med popovertarget
   * öppnar en .kh-menu som förankras vid knappen; ett val i menyn stänger den.
   */
  class KhToolbar extends HTMLElement {
    #onClick = (event) => {
      const tab = event.target.closest('.kh-toolbar__tab');
      if (tab && this.contains(tab) && tab.localName === 'button') {
        select(this, this.#tabs(), tab, 'aria-selected');
      }
    };

    connectedCallback() {
      this.addEventListener('click', this.#onClick);
      const action = this.querySelector('.kh-toolbar__action[popovertarget]');
      const menu = action && document.getElementById(action.getAttribute('popovertarget'));
      if (action && menu && !menu.dataset.khAnchored) {
        const name = `--kh-anchor-${++anchors}`;
        action.style.anchorName = name;
        menu.style.positionAnchor = name;
        menu.dataset.khAnchored = '';
        menu.classList.add('kh-menu--above');
        action.setAttribute('aria-expanded', 'false');
        menu.addEventListener('toggle', (event) => action.setAttribute('aria-expanded', String(event.newState === 'open')));
        menu.addEventListener('click', (event) => {
          const item = event.target.closest('.kh-menu__item');
          if (item && !item.matches('[role=menuitemcheckbox]')) menu.hidePopover();
        });
      }
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.#onClick);
    }

    #tabs() {
      return [...this.querySelectorAll('.kh-toolbar__tab')];
    }
  }
  customElements.define('kh-toolbar', KhToolbar);

  /* ---------- Segmentvalet (AppSegmentedChoice) ---------- */

  /**
   * <kh-segmented> (eller en .kh-segmented som appen gör till ett) med knappar som barn: ett val i taget,
   * i barnens aria-checked (standard), aria-pressed eller aria-selected. Pilarna flyttar valet.
   */
  class KhSegmented extends HTMLElement {
    #onClick = (event) => {
      const item = [...this.children].find((child) => child.contains(event.target));
      if (item && !item.disabled) select(this, [...this.children], item, 'aria-checked');
    };
    #onKey = (event) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (!step) return;
      const items = [...this.children].filter((child) => !child.disabled);
      const current = items.indexOf(document.activeElement);
      if (current < 0) return;
      // Vänster och höger följer läsriktningen; upp och ned gör det inte.
      const mirrored = (event.key === 'ArrowLeft' || event.key === 'ArrowRight') && getComputedStyle(this).direction === 'rtl';
      const next = items[(current + (mirrored ? -step : step) + items.length) % items.length];
      event.preventDefault();
      next.focus();
      select(this, [...this.children], next, 'aria-checked');
    };

    connectedCallback() {
      this.classList.add('kh-segmented');
      this.addEventListener('click', this.#onClick);
      this.addEventListener('keydown', this.#onKey);
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.#onClick);
      this.removeEventListener('keydown', this.#onKey);
    }
  }
  customElements.define('kh-segmented', KhSegmented);

  /* ---------- Dra ned för att uppdatera (AppPullToRefresh) ---------- */

  // Som Material 3:s PullToRefreshState: fingrets väg räknas till hälften, och tröskeln är 80.
  const DRAG_MULTIPLIER = 0.5;
  const THRESHOLD = 80;
  // Så länge en dragning väntar på att appens uppdatering ska starta.
  const PULL_WAIT = 5000;

  /**
   * <kh-refresh> runt listan under sidhuvudet. Dras sidan (eller närmaste förälder som rullar) nedåt
   * högst upp visas prickarna i en rund behållare som följer fingret; släpps den efter tröskeln
   * meddelas kh-refresh, och prickarna står kvar medan appen sätter attributet refreshing (startar
   * uppdateringen inom 5 s). En uppdatering appen startat själv visar inga prickar här.
   */
  class KhRefresh extends HTMLElement {
    static observedAttributes = ['refreshing'];

    #indicator = null;
    #scroller = null;
    #startY = null;
    #pulling = false;
    #pulled = false;
    #wait = 0;

    #onStart = (event) => {
      if (event.touches.length !== 1 || this.#scroller.scrollTop > 0 || (this.hasAttribute('refreshing') && this.#pulled)) return;
      this.#startY = event.touches[0].clientY;
      this.#pulling = false;
    };

    #onMove = (event) => {
      if (this.#startY === null) return;
      const distance = event.touches[0].clientY - this.#startY;
      if (!this.#pulling) {
        // Uppåt eller redan rullad: vanlig rullning, ingen dragning.
        if (distance < 0 || this.#scroller.scrollTop > 0) {
          this.#startY = null;
          return;
        }
        if (distance === 0) return;
        this.#pulling = true;
      }
      if (event.cancelable) event.preventDefault();
      this.#show(Math.max(0, distance) * DRAG_MULTIPLIER / THRESHOLD, 'pulling');
    };

    #onEnd = () => {
      if (this.#startY === null) return;
      const fraction = this.#fraction;
      this.#startY = null;
      if (!this.#pulling) return;
      this.#pulling = false;
      if (fraction >= 1) {
        this.#pulled = true;
        this.#show(1, 'refreshing');
        clearTimeout(this.#wait);
        // Startar appen ingen uppdatering i tid, släpps dragningen – annars fick nästa körning prickarna.
        this.#wait = setTimeout(() => {
          if (!this.hasAttribute('refreshing')) this.#release();
        }, PULL_WAIT);
        this.dispatchEvent(new CustomEvent('kh-refresh', { bubbles: true }));
      } else {
        this.#release();
      }
    };

    #fraction = 0;

    connectedCallback() {
      if (!this.#indicator) {
        this.#indicator = this.querySelector(':scope > .kh-refresh__indicator');
        if (!this.#indicator) {
          this.#indicator = document.createElement('div');
          this.#indicator.className = 'kh-refresh__indicator';
          this.#indicator.append(document.createElement('kh-dots'));
          this.#indicator.firstChild.setAttribute('bouncing', '');
          this.prepend(this.#indicator);
        }
      }
      this.#scroller = scrollerOf(this);
      this.addEventListener('touchstart', this.#onStart, { passive: true });
      this.addEventListener('touchmove', this.#onMove, { passive: false });
      this.addEventListener('touchend', this.#onEnd);
      this.addEventListener('touchcancel', this.#onEnd);
    }

    disconnectedCallback() {
      this.removeEventListener('touchstart', this.#onStart);
      this.removeEventListener('touchmove', this.#onMove);
      this.removeEventListener('touchend', this.#onEnd);
      this.removeEventListener('touchcancel', this.#onEnd);
      clearTimeout(this.#wait);
    }

    attributeChangedCallback(name, before, after) {
      // Uppdateringen man själv dragit fram är klar: prickarna går.
      if (name === 'refreshing' && before !== null && after === null && this.#pulled) this.#release();
    }

    #show(fraction, state) {
      this.#fraction = fraction;
      this.style.setProperty('--kh-refresh-fraction', String(Math.min(1, fraction)));
      this.dataset.state = state;
    }

    #release() {
      clearTimeout(this.#wait);
      this.#pulled = false;
      this.#fraction = 0;
      this.style.setProperty('--kh-refresh-fraction', '0');
      delete this.dataset.state;
    }
  }
  customElements.define('kh-refresh', KhRefresh);
})();
