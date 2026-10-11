/* kwonsoonjae.github.io — chapters, motion, IS Atlas live data.
   Without this file every section shows one after another (no-JS / print). */
(() => {
  const root = document.documentElement;
  root.classList.add("js");
  let drawn = false;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];

  /* ---------- top bar + scroll progress ---------- */
  const bar = $("#topbar"), prog = $("#progress");
  const onScroll = () => {
    bar.classList.toggle("scrolled", scrollY > 10);
    const max = root.scrollHeight - innerHeight;
    prog.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };
  addEventListener("scroll", onScroll, { passive: true });

  /* ---------- reveal + stagger (first time a block is seen) ---------- */
  const reveal = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); reveal.unobserve(e.target); }
  }), { threshold: .06 });
  $$(".reveal").forEach(el => reveal.observe(el));
  $$(".stag").forEach(g => {
    [...g.children].forEach((c, k) => c.style.transitionDelay = Math.min(k, 8) * 60 + "ms");
    if (!g.closest(".reveal")) reveal.observe(g);
  });

  /* ---------- headline: words rise in ---------- */
  const h1 = $(".hero h1");
  if (h1 && !calm) {
    let i = 0;
    [...h1.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
          const w = document.createElement("span"); w.className = "w"; w.textContent = t;
          w.style.transitionDelay = (i++ * 70) + "ms"; frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeName === "EM") {
        n.classList.add("w"); n.style.transitionDelay = (i++ * 70) + "ms";
      }
    });
    requestAnimationFrame(() => requestAnimationFrame(() => h1.classList.add("go")));
  }

  /* ---------- chapters ---------- */
  const book = $("#book");
  const chapters = $$(".chapter", book);
  const keys = chapters.map(c => c.dataset.ch);
  const navLinks = $$("[data-ch]", $("#nav")).concat($$("[data-ch]", $("#toc")));

  // mobile bottom tab bar, built from the chapters
  const tabbar = document.createElement("nav");
  tabbar.className = "tabbar"; tabbar.setAttribute("aria-label", "Chapters");
  tabbar.innerHTML = chapters.map((c, i) =>
    `<a href="#${c.id || c.querySelector("section[id]").id}" data-ch="${c.dataset.ch}"><i>0${i + 1}</i>${c.dataset.short || c.dataset.label}</a>`).join("")
    + `<a href="#contact" class="tb-contact">Contact</a>`;
  document.body.appendChild(tabbar);
  navLinks.push(...$$("[data-ch]", tabbar));

  // sliding underline in the top nav
  const nav = $("#nav");
  const ink = document.createElement("span"); ink.className = "nav-ink"; nav.appendChild(ink);
  const moveInk = a => {
    if (!a || !a.offsetWidth) { ink.style.opacity = 0; return; }
    ink.style.opacity = 1; ink.style.width = a.offsetWidth + "px";
    ink.style.transform = `translateX(${a.offsetLeft}px)`;
  };

  let cur = -1;
  const show = (i, { scroll = true, push = true } = {}) => {
    if (i < 0 || i >= chapters.length) return;
    const dir = i > cur ? 1 : -1;
    if (i !== cur) {
      chapters.forEach((c, j) => {
        c.classList.toggle("on", j === i);
        c.hidden = j !== i;
      });
      const c = chapters[i];
      if (!calm && cur !== -1) {
        c.classList.remove("enter-l", "enter-r"); void c.offsetWidth;
        c.classList.add(dir > 0 ? "enter-r" : "enter-l");
      }
      $$(".reveal, .stag", c).forEach(el => el.classList.add("in"));
      if (c.dataset.ch === "atlas") drawNet();
    }
    cur = i;
    const key = keys[i];
    navLinks.forEach(a => a.classList.toggle("on", a.dataset.ch === key));
    moveInk($(`a[data-ch="${key}"]`, nav));
    const tocOn = $(`#toc a[data-ch="${key}"]`);
    if (tocOn) tocOn.scrollIntoView({ block: "nearest", inline: "center", behavior: calm ? "auto" : "smooth" });
    const tbOn = $(`a[data-ch="${key}"]`, tabbar);
    if (tbOn) tbOn.scrollIntoView({ block: "nearest", inline: "center" });
    if (push) history.replaceState(null, "", "#" + (chapters[i].id || chapters[i].querySelector("section[id]").id));
    if (scroll) {
      const top = book.getBoundingClientRect().top + scrollY - 64;
      if (scrollY > top || scroll === "force") scrollTo({ top, behavior: calm ? "auto" : "smooth" });
    }
  };

  const chapterOf = id => {
    const el = id && document.getElementById(id);
    const c = el && (el.classList.contains("chapter") ? el : el.closest(".chapter"));
    return c ? chapters.indexOf(c) : -1;
  };
  const toContact = () => $("#contact").scrollIntoView({ behavior: calm ? "auto" : "smooth" });

  document.addEventListener("click", e => {
    const a = e.target.closest("a[href^='#']");
    const next = e.target.closest(".ch-next");
    if (next) {
      e.preventDefault();
      if (next.dataset.go === "contact") return toContact();
      return show(keys.indexOf(next.dataset.go), { scroll: "force" });
    }
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    if (id === "contact") { e.preventDefault(); return toContact(); }
    if (id === "top") return;
    const i = chapterOf(id);
    if (i >= 0) { e.preventDefault(); show(i, { scroll: a.closest(".toc") ? true : "force" }); }
  });

  addEventListener("hashchange", () => {
    const i = chapterOf(location.hash.slice(1));
    if (i >= 0 && i !== cur) show(i, { push: false });
  });

  // swipe between chapters on touch screens
  let sx = 0, sy = 0, st = 0;
  book.addEventListener("touchstart", e => {
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now();
  }, { passive: true });
  book.addEventListener("touchend", e => {
    if (e.target.closest("input, .toc, .atlas-art")) return;
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Date.now() - st < 600 && Math.abs(dx) > 70 && Math.abs(dy) < 45)
      show(cur + (dx < 0 ? 1 : -1), { scroll: "force" });
  }, { passive: true });

  // keyboard: left / right arrows when focus is not in a field
  addEventListener("keydown", e => {
    if (e.target.closest("input, textarea") || e.altKey || e.metaKey || e.ctrlKey) return;
    if (e.key === "ArrowRight") show(cur + 1, { scroll: "force" });
    if (e.key === "ArrowLeft") show(cur - 1, { scroll: "force" });
  });

  const start = chapterOf(location.hash.slice(1));
  show(start >= 0 ? start : 0, { scroll: false, push: start >= 0 });
  if (start >= 0) requestAnimationFrame(() => show(start, { scroll: "force", push: false }));
  addEventListener("resize", () => moveInk($(`a[data-ch="${keys[cur]}"]`, nav)));
  onScroll();

  /* ---------- IS Atlas: coauthor network draws itself ---------- */
  function drawNet() {
    if (drawn || calm) return;
    drawn = true;
    const svg = $(".atlas-net");
    if (!svg) return;
    $$("line", svg).forEach((l, k) => {
      const len = Math.hypot(l.x2.baseVal.value - l.x1.baseVal.value, l.y2.baseVal.value - l.y1.baseVal.value);
      l.style.strokeDasharray = len; l.style.strokeDashoffset = len;
      l.style.transition = `stroke-dashoffset 1.1s cubic-bezier(.2,.7,.2,1) ${300 + k * 22}ms`;
    });
    $$("circle", svg).forEach((c, k) => { c.style.transitionDelay = (k * 35) + "ms"; });
    svg.classList.add("pre");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      svg.classList.remove("pre"); svg.classList.add("drawn");
      $$("line", svg).forEach(l => l.style.strokeDashoffset = 0);
    }));
  }

  /* ---------- IS Atlas live data (isatlas.org/showcase.json, CORS for this site only) ---------- */
  (async () => {
    try {
      const r = await fetch("https://isatlas.org/showcase.json", { mode: "cors" });
      if (!r.ok) return;
      const d = await r.json();
      const fmt = n => Number(n).toLocaleString("en-US");
      $$(".atlas-stats dd[data-k]").forEach(el => { if (d[el.dataset.k]) el.textContent = fmt(d[el.dataset.k]); });
      const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
      const mon = x => x ? new Date(x + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
      if (d.latest && d.latest.length) {
        $("#atlas-latest").innerHTML = d.latest.map(p =>
          `<li><a href="${esc(p.url)}" target="_blank" rel="noopener"><span class="v">${esc(p.venue)}</span><span class="t">${esc(p.title)}</span><span class="d">${mon(p.date)}</span></a></li>`).join("");
        $(".atlas-dot").hidden = false;
      }
      if (d.rising && d.rising.length) {
        $("#atlas-rising").innerHTML = d.rising.map(t => {
          const sp = t.spark ? `<svg viewBox="0 0 ${t.spark.w} ${t.spark.h}" preserveAspectRatio="none" aria-hidden="true"><polyline class="all" points="${esc(t.spark.all)}"/><polyline class="rec" points="${esc(t.spark.recent)}"/></svg>` : "";
          return `<li><a href="${esc(t.url || "https://isatlas.org/field")}" target="_blank" rel="noopener"><span class="n">${esc(t.name)}</span>${sp}<b>×${esc(t.ratio)}</b></a></li>`;
        }).join("");
        if (d.recent && d.base) $("#atlas-cap").textContent = `share of papers, ${d.recent[0]}–${d.recent[1]} vs ${d.base[0]}–${d.base[1]}`;
      }
      if (d.updated) $("#atlas-foot").textContent = `Live from isatlas.org · digest of ${mon(d.updated)}`;
    } catch (e) { /* the static fallback stays */ }
  })();
})();
