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
 * - <kh-time-picker> Tidsväljaren som rullhjul, timme och minut (TimePickerPopup).
 *
 * Val meddelas med händelsen kh-select (detail: { index, value }), en dragning med kh-refresh, en ny tid
 * i tidsväljaren med change.
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
   * .kh-header__version (appens version efter namnet), .kh-header__title (gärna <kh-dots> och ett <span> med
   * texten) och .kh-header__subtitle – alla utom
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

    /** Versionen efter namnets text; ryms den inte bredvid ett helt namn lämnas den bort helt. */
    #placeVersion(nameX, room) {
      const version = this.querySelector(':scope > .kh-header__version');
      if (!version) return;
      const name = this.querySelector(':scope > .kh-header__name');
      const nameWidth = name?.offsetWidth ?? 0;
      const whole = !name || name.scrollWidth <= name.clientWidth;
      const gap = this.#metrics.versionGap;
      const fits = whole && nameWidth + gap + version.offsetWidth <= room;
      this.style.setProperty('--kh-header-version-x', px(nameX + nameWidth + gap));
      this.style.setProperty('--kh-header-version-dy', px(this.#metrics.versionDy));
      version.toggleAttribute('data-fits', fits);
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
        pageMax: token(this, '--kh-page-max', Infinity),
        gap: token(this, '--kh-space-m', 12),
        versionGap: token(this, '--kh-space-xs', 4),
        versionDy: this.#versionDy(),
        trailingGap: token(this, '--kh-space-s', 8),
        large: probe('var(--kh-type-screen-title)', 'var(--kh-tracking-screen-title)'),
        small: probe('var(--kh-type-section-title)', 'normal')
      };
      this.#update();
    }

    /**
     * Hur långt versionen ska flyttas så att dess baslinje möter namnets: båda är centrerade i raden med
     * text-box trim, så baslinjen ligger (ascent - descent) / 2 under mitten i var sin stil.
     */
    #versionDy() {
      const name = this.querySelector(':scope > .kh-header__name');
      const version = this.querySelector(':scope > .kh-header__version');
      if (!name || !version) return 0;
      const context = document.createElement('canvas').getContext('2d');
      const offset = (element) => {
        const style = getComputedStyle(element);
        context.font = style.font;
        const metrics = context.measureText('Åg');
        return (metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2;
      };
      return offset(name) - offset(version);
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

      // Sidans spalt (--kh-page-max, som --kh-page-inset i kh.css): marginalen växer när fönstret är bredare.
      const start = Math.max(m.start, (width - m.pageMax) / 2);
      const end = m.end + start - m.start;
      const iconSize = lerp(m.icon, m.collapsedIcon, f);
      const beside = hasIcon ? start + m.collapsedIcon + m.gap : start;
      const endClearance = trailingWidth > 0 ? trailingWidth + end + m.trailingGap : start;
      const nameX = start + (hasIcon ? iconSize + m.gap : 0);
      const restWidth = Math.max(0, width - 2 * start);
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
      this.#placeVersion(nameX, Math.max(0, width - nameX - endClearance));
      s.setProperty('--kh-header-title-x', px(lerp(start, beside, sideways)));
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

  /* ---------- Menyn vid en knapp (AppDropdownMenu) ---------- */

  let anchors = 0;

  /**
   * En knapp med popovertarget mot en .kh-menu öppnar menyn förankrad vid knappen: under den och linjerad
   * med dess högerkant, eller ovanför när det inte ryms (eller alltid med .kh-menu--above). Förankringen
   * sätts vid varje tryck, så att en app som ritar om knappen eller menyn inte tappar den. Knappen får
   * aria-expanded, och ett val i menyn stänger den (utom menuitemcheckbox).
   */
  function anchorMenu(button, menu) {
    if (!button.style.anchorName) button.style.anchorName = `--kh-anchor-${++anchors}`;
    menu.style.positionAnchor = button.style.anchorName;
    if (menu.dataset.khAnchored === undefined) {
      menu.dataset.khAnchored = '';
      // beforetoggle kommer i samma tur som öppningen (toggle först efteråt), så knappens läge stämmer direkt.
      menu.addEventListener('beforetoggle', (event) => {
        const owner = document.querySelector(`[popovertarget="${CSS.escape(menu.id)}"]`);
        owner?.setAttribute('aria-expanded', String(event.newState === 'open'));
      });
      menu.addEventListener('click', (event) => {
        const item = event.target.closest('.kh-menu__item');
        if (item && !item.matches('[role=menuitemcheckbox]')) menu.hidePopover();
      });
    }
    button.setAttribute('aria-expanded', String(menu.matches(':popover-open')));
  }

  const menuFor = (button) => {
    const menu = button && document.getElementById(button.getAttribute('popovertarget'));
    return menu?.classList.contains('kh-menu') ? menu : null;
  };

  // Före knappens egen popover-öppning, så att menyn öppnar redan förankrad.
  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('[popovertarget]');
    const menu = menuFor(button);
    if (menu) anchorMenu(button, menu);
  }, true);

  /* ---------- Flikraden (AppFloatingToolbar) ---------- */

  /**
   * <kh-toolbar> med .kh-toolbar__tabs (flikarna .kh-toolbar__tab) och valfritt huvudknappen
   * .kh-toolbar__action. En flik som är en knapp väljs vid tryck (aria-selected) och meddelar kh-select;
   * en flik som är en länk lämnar valet åt appen (aria-current="page"). Huvudknappen med popovertarget
   * öppnar en .kh-menu ovanför sig (Menyn vid en knapp).
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
      const menu = menuFor(action);
      if (menu) {
        menu.classList.add('kh-menu--above');
        anchorMenu(action, menu);
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

  /* ---------- Svep åt vänster (SwipeToDelete, SwipeToHide) ---------- */

  /** Så nära skärmens kant startar inget svep: där ligger telefonens bakåtgest. */
  const SWIPE_EDGE = 24;
  /** Så långt fingret rör sig innan svepets riktning avgörs. */
  const SWIPE_DECIDE = 10;
  /** Så stor del av bredden ett långsamt drag måste gå. */
  const SWIPE_THRESHOLD = 1 / 3;
  /** Ett snabbt drag (px per ms) räcker även kort, men aldrig under SWIPE_FAST_MIN px. */
  const SWIPE_FAST = 0.5;
  const SWIPE_FAST_MIN = 40;

  /**
   * <kh-swipe label="Radera"> runt en rad (en kh-foldout eller kh-row på ett kort): svep åt vänster med finger
   * eller penna drar raden undan och visar label på felfärgen bakom. Släpps raden efter en tredjedel av bredden,
   * eller efter ett snabbt drag, meddelas kh-swipe (bubblar), och raden glider tillbaka – appen frågar i en
   * kh-dialog innan något raderas (android-ui:s SwipeToDelete). Med tone="hide" är bakgrunden primärtonen och appen
   * döljer raden direkt, med Ångra (SwipeToHide). Svep åt höger tas aldrig: det går vidare till sidan. Med musen
   * finns inget svep; raden ska alltid också ha Radera synligt (kh-btn--destructive-text sist i det utfällda).
   * Ett svep åt vänster som avgjorts här förbrukas (preventDefault), och elementet har data-own-swipe="left", så att
   * en sidas eget sidledssvep kan låta det vara.
   */
  class KhSwipe extends HTMLElement {
    static observedAttributes = ['label'];

    #background = null;
    #start = null;
    #direction = null;
    #offset = 0;
    #lastX = 0;
    #lastTime = 0;
    #speed = 0;

    #onStart = (event) => {
      if (event.touches.length !== 1) return;
      const { clientX, clientY } = event.touches[0];
      if (clientX < SWIPE_EDGE || clientX > innerWidth - SWIPE_EDGE) return;
      if (event.target.closest('input, textarea, select, [contenteditable]')) return;
      this.#start = { x: clientX, y: clientY };
      this.#direction = null;
      this.#lastX = clientX;
      this.#lastTime = event.timeStamp;
      this.#speed = 0;
    };

    #onMove = (event) => {
      if (!this.#start) return;
      const { clientX, clientY } = event.touches[0];
      const dx = clientX - this.#start.x;
      const dy = clientY - this.#start.y;
      if (!this.#direction) {
        if (Math.hypot(dx, dy) < SWIPE_DECIDE) return;
        // Lodrätt är rullning, åt höger är sidans; bara vänster är radens.
        this.#direction = Math.abs(dx) > Math.abs(dy) && dx < 0 ? 'left' : 'other';
        if (this.#direction === 'left') this.dataset.state = 'dragging';
      }
      if (this.#direction !== 'left') return;
      if (event.cancelable) event.preventDefault();
      const elapsed = event.timeStamp - this.#lastTime;
      if (elapsed > 0) this.#speed = (this.#lastX - clientX) / elapsed;
      this.#lastX = clientX;
      this.#lastTime = event.timeStamp;
      this.#move(Math.min(0, dx));
    };

    #onEnd = () => {
      if (!this.#start) return;
      const dragged = this.#direction === 'left';
      this.#start = null;
      this.#direction = null;
      if (!dragged) return;
      const distance = -this.#offset;
      const swiped = distance >= this.offsetWidth * SWIPE_THRESHOLD || (this.#speed >= SWIPE_FAST && distance >= SWIPE_FAST_MIN);
      this.dataset.state = 'returning';
      this.#move(0);
      if (swiped) this.dispatchEvent(new CustomEvent('kh-swipe', { bubbles: true }));
    };

    #onReturned = (event) => {
      if (event.target.parentElement === this && this.dataset.state === 'returning') delete this.dataset.state;
    };

    connectedCallback() {
      if (!this.#background) {
        this.#background = this.querySelector(':scope > .kh-swipe__background');
        if (!this.#background) {
          this.#background = document.createElement('div');
          this.#background.className = 'kh-swipe__background';
          this.#background.setAttribute('aria-hidden', 'true');
          this.prepend(this.#background);
        }
        this.#label();
      }
      this.dataset.ownSwipe = 'left';
      this.addEventListener('touchstart', this.#onStart, { passive: true });
      this.addEventListener('touchmove', this.#onMove, { passive: false });
      this.addEventListener('touchend', this.#onEnd);
      this.addEventListener('touchcancel', this.#onEnd);
      this.addEventListener('transitionend', this.#onReturned);
    }

    disconnectedCallback() {
      this.removeEventListener('touchstart', this.#onStart);
      this.removeEventListener('touchmove', this.#onMove);
      this.removeEventListener('touchend', this.#onEnd);
      this.removeEventListener('touchcancel', this.#onEnd);
      this.removeEventListener('transitionend', this.#onReturned);
    }

    attributeChangedCallback() {
      if (this.#background) this.#label();
    }

    #label() {
      this.#background.textContent = this.getAttribute('label') ?? 'Radera';
    }

    #move(offset) {
      this.#offset = offset;
      this.style.setProperty('--kh-swipe-offset', `${offset}px`);
    }
  }
  customElements.define('kh-swipe', KhSwipe);

  /* ---------- Tidsväljaren som rullhjul (TimePickerPopup) ---------- */

  // Hjulet går runt: talen står i flera varv (minst 200 tal, så att en snärt med fingret inte når änden), och
  // hjulet hoppar osynligt tillbaka till mittvarvet när det stannat.
  const lapsFor = (count) => Math.max(5, 2 * Math.ceil(100 / count) + 1);
  const pad = (value) => String(value).padStart(2, '0');

  /** Ett hjul med [values]; [onSettle] när hjulet stannat på ett nytt tal. */
  const timeWheel = (label, values, onSettle) => {
    const element = document.createElement('div');
    element.className = 'kh-time-picker__wheel';
    element.tabIndex = 0;
    element.setAttribute('role', 'spinbutton');
    element.setAttribute('aria-label', label);
    const count = values.length;
    const laps = lapsFor(count);
    for (let lap = 0; lap < laps; lap++) {
      for (const value of values) {
        const item = document.createElement('div');
        item.className = 'kh-time-picker__item';
        item.textContent = pad(value);
        element.append(item);
      }
    }
    let index = 0;
    const pitch = () => element.firstElementChild.offsetHeight;
    const middle = (i) => Math.floor(laps / 2) * count + i;
    const wrap = (i) => ((i % count) + count) % count;
    const position = () => Math.round(element.scrollTop / pitch());
    const show = (i) => {
      index = i;
      element.setAttribute('aria-valuenow', String(values[i]));
      element.setAttribute('aria-valuetext', pad(values[i]));
    };
    const scrollToPosition = (at, behavior) => element.scrollTo({ top: at * pitch(), behavior });

    element.addEventListener('scrollend', () => {
      if (!pitch()) return;
      const at = position();
      const next = wrap(at);
      if (at !== middle(next)) scrollToPosition(middle(next), 'instant');
      if (next !== index) {
        show(next);
        onSettle();
      }
    });
    element.addEventListener('keydown', (event) => {
      const step = { ArrowUp: -1, ArrowDown: 1 }[event.key];
      if (!step) return;
      event.preventDefault();
      scrollToPosition(position() + step, 'smooth');
    });
    // Ett tryck på ett tal ovanför eller under rullar dit.
    element.addEventListener('click', (event) => {
      const item = event.target.closest('.kh-time-picker__item');
      if (item) scrollToPosition([...element.children].indexOf(item), 'smooth');
    });
    // Ett hjul som inte syns (i en stängd dialog) har ingen höjd: talet ställs in när det får en.
    new ResizeObserver(() => pitch() && scrollToPosition(middle(index), 'instant')).observe(element);

    show(0);
    return {
      element,
      /** Talet i mitten, också medan hjulet rullar. */
      get value() {
        return values[pitch() ? wrap(position()) : index];
      },
      set(i) {
        show(wrap(i));
        if (pitch()) scrollToPosition(middle(index), 'instant');
      },
    };
  };

  /**
   * <kh-time-picker value="07:30" step="5">: timme och minut som rullhjul, 24 timmar. step är minuthjulets
   * steg (standard 1); en tid mellan stegen avrundas till närmaste. value läses och sätts som "HH:MM", och
   * change meddelas när användaren rullat fram en ny tid. Lägg den i en kh-dialog med Avbryt och OK.
   */
  class KhTimePicker extends HTMLElement {
    static observedAttributes = ['value'];
    #hours;
    #minutes;
    #step = 1;
    #pending = null;

    connectedCallback() {
      if (this.#hours) return;
      this.classList.add('kh-time-picker');
      this.#step = clamp(parseInt(this.getAttribute('step'), 10) || 1, 1, 30);
      const changed = () => this.dispatchEvent(new Event('change', { bubbles: true }));
      this.#hours = timeWheel(this.getAttribute('hour-label') ?? 'Timme', Array.from({ length: 24 }, (_, i) => i), changed);
      this.#minutes = timeWheel(this.getAttribute('minute-label') ?? 'Minut', Array.from({ length: Math.ceil(60 / this.#step) }, (_, i) => i * this.#step), changed);
      const colon = document.createElement('span');
      colon.className = 'kh-time-picker__colon';
      colon.setAttribute('aria-hidden', 'true');
      colon.textContent = ':';
      this.replaceChildren(this.#hours.element, colon, this.#minutes.element);
      this.value = this.#pending ?? this.getAttribute('value') ?? '00:00';
    }

    attributeChangedCallback(_name, _old, value) {
      if (value !== null) this.value = value;
    }

    get value() {
      if (!this.#hours) return this.#pending ?? this.getAttribute('value') ?? '00:00';
      return `${pad(this.#hours.value)}:${pad(this.#minutes.value)}`;
    }

    set value(text) {
      const match = /^(\d{1,2}):(\d{2})$/.exec(String(text).trim());
      if (!match) return;
      if (!this.#hours) {
        this.#pending = text;
        return;
      }
      const steps = Math.round(Number(match[2]) / this.#step);
      // 23:58 med steget 5 blir 00:00, inte 23:00.
      const carry = steps * this.#step >= 60 ? 1 : 0;
      this.#hours.set(Number(match[1]) + carry);
      this.#minutes.set(steps);
    }
  }
  customElements.define('kh-time-picker', KhTimePicker);
})();
