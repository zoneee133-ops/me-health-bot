/* Pin-scroll 3D roulette (vanilla JS — no framer-motion/GSAP dependency,
   this is a static site with no build step) + staggered reveal on scroll.
   Tab switch stays as before. */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var viewTabs = document.getElementById('promoViewTabs');
    if (viewTabs) {
      viewTabs.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-view]');
        if (!btn) return;
        var view = btn.getAttribute('data-view');
        Array.prototype.forEach.call(viewTabs.querySelectorAll('button'), function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        Array.prototype.forEach.call(document.querySelectorAll('.promo-view'), function (panel) {
          panel.classList.toggle('is-shown', panel.getAttribute('data-view') === view);
        });
      });
    }

    /* ---------- roulette ---------- */
    var pin = document.getElementById('roulettePin');
    var items = pin ? Array.prototype.slice.call(pin.querySelectorAll('.promo-r-item')) : [];
    if (pin && items.length) {
      var N = items.length;
      var titleEl = document.getElementById('rouletteTitle');
      var val3El = document.getElementById('rouletteVal3');
      var quoteTextEl = document.getElementById('rouletteQuoteText');
      var ctaEl = document.getElementById('rouletteCta');

      var BOT = 'https://t.me/me_abouthealth_bot?startapp=';
      var DATA = {
        halat: { title: 'Заключение врача', val3: 'Расшифровка снимков', quote: '«Me распознаёт снимки МРТ и КТ и сохраняет заключение в понятном разделе».', cta: BOT + 'health' },
        syringe: { title: 'Анализ крови', val3: 'Расшифровка данных', quote: '«Me разбирает анализ крови по фото бланка и сравнивает каждый показатель с нормой».', cta: BOT + 'health' },
        rx: { title: 'Рецепт врача', val3: 'Расшифровка рецептов', quote: '«Me помогает понять, что на самом деле имел в виду врач — без гадания в поисковике».', cta: BOT + 'health' },
        pills: { title: 'Лекарства', val3: 'Контроль приёма', quote: '«Me отмечает, что уже принято, и напоминает вовремя — без пропущенных доз».', cta: BOT + 'meds' },
        bloodbag: { title: 'История анализов', val3: 'История анализов', quote: '«Me хранит все анализы в одном месте, и видно, как показатель менялся со временем».', cta: BOT + 'health' }
      };

      /* cross-fade + blur swap for the two dynamic text nodes (headline,
         quote): outgoing text blurs/fades upward, incoming blurs in from
         below — 0.5s cubic-bezier(0.16,1,0.3,1), driven by CSS classes
         .is-out/.is-in defined in promo.css (see .promo-meta-fade). */
      function fadeSwap(el, text) {
        if (el.textContent === text) return;
        el.classList.add('is-out');
        setTimeout(function () {
          el.textContent = text;
          el.classList.remove('is-out');
          el.classList.add('is-in');
          void el.offsetWidth; // force reflow so the is-in start state paints
          requestAnimationFrame(function () { el.classList.remove('is-in'); });
        }, 250);
      }

      var lastActiveIdx = -1;
      function setActive(idx) {
        if (idx === lastActiveIdx) return;
        lastActiveIdx = idx;
        var card = items[idx].getAttribute('data-card');
        var d = DATA[card];
        items.forEach(function (it, i) { it.classList.toggle('is-active', i === idx); });
        if (d && titleEl) {
          fadeSwap(titleEl, d.title);
          fadeSwap(val3El, d.val3);
          fadeSwap(quoteTextEl, d.quote);
          if (ctaEl) ctaEl.href = d.cta;
        }
      }

      // static per-object tilt (baked personality, not scroll-driven) —
      // gives each item a "just set down" feel instead of a flat grid
      var TILT = { halat: -15, syringe: 12, rx: -8, pills: 15, bloodbag: -12 };
      var BASE_Y = 16; // vh — shifts the whole diagonal down so items pass
                        // below the pinned headline instead of behind it

      var ticking = false;
      function layoutRoulette() {
        ticking = false;
        var rect = pin.getBoundingClientRect();
        var scrollable = rect.height - window.innerHeight;
        var progress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
        var activePos = progress * (N - 1); // continuous position across the 5 slots

        items.forEach(function (item, i) {
          var d = i - activePos; // signed distance in slots from the active center
          var ad = Math.min(Math.abs(d), 3);
          var rotY = Math.max(-40, Math.min(40, d * -30));
          var x = d * 34; // vw-ish spacing along the diagonal's horizontal run
          var y = BASE_Y + d * -18; // vh-ish rise — negative d (past, lower
                            // left) sits lower, positive d (upcoming, upper
                            // right) sits higher: bottom-left -> top-right
                            // diagonal (~18-20deg), offset down under the text.
          var scale = Math.max(0.55, 1.05 - ad * 0.18);
          var opacity = Math.max(0.3, 1 - ad * 0.35);
          var blur = ad > 0.4 ? (ad - 0.4) * 2.2 : 0;
          var tilt = TILT[item.getAttribute('data-card')] || 0;
          item.style.transform = 'translate(-50%,-50%) translate(' + x + 'vw,' + y + 'vh) perspective(1400px) rotateY(' + rotY + 'deg) rotate(' + tilt + 'deg) scale(' + scale + ')';
          item.style.opacity = String(opacity);
          item.style.filter = blur > 0.05 ? 'blur(' + blur.toFixed(2) + 'px)' : 'none';
          item.style.zIndex = String(100 - Math.round(ad * 10));
        });

        setActive(Math.round(activePos));
      }
      function onScroll() {
        if (!ticking) { ticking = true; requestAnimationFrame(layoutRoulette); }
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      layoutRoulette();
    }

    /* ---------- staggered reveal on scroll into view ---------- */
    var revealSections = document.querySelectorAll('.promo-reveal');
    if (revealSections.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2 });
      Array.prototype.forEach.call(revealSections, function (s) { io.observe(s); });
    } else {
      Array.prototype.forEach.call(revealSections, function (s) { s.classList.add('is-visible'); });
    }
  });
})();
