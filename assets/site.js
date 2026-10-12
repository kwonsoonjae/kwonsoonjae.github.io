/* kwonsoonjae.github.io — nav, motion, IS Atlas live data. */
(() => {
  const root = document.documentElement;
  root.classList.add("js");
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

  /* ---------- nav: current section + sliding underline ---------- */
  const nav = $("#nav");
  const links = $$("a", nav);
  const secs = links.map(a => document.querySelector(a.getAttribute("href")));
  const ink = document.createElement("span"); ink.className = "nav-ink"; nav.appendChild(ink);
  const moveInk = a => {
    if (!a || !a.offsetWidth) { ink.style.opacity = 0; return; }
    ink.style.opacity = 1; ink.style.width = a.offsetWidth + "px";
    ink.style.transform = `translateX(${a.offsetLeft}px)`;
  };
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const i = secs.indexOf(e.target);
    links.forEach((a, j) => a.classList.toggle("on", i === j));
    moveInk(links[i]);
  }), { rootMargin: "-30% 0px -60% 0px" });
  secs.forEach(x => x && spy.observe(x));
  links.forEach(a => {
    a.addEventListener("mouseenter", () => moveInk(a));
    a.addEventListener("mouseleave", () => moveInk($("a.on", nav)));
  });
  addEventListener("resize", () => moveInk($("a.on", nav)));
  onScroll();

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
      }
      if (d.fields && d.fields.length) {
        // each journal: the years it covers on one shared axis (1954 to now), paper count at the end
        const y0 = 1950, y1 = new Date().getFullYear(), span = y1 - y0;
        $("#cov-rows").innerHTML = d.fields.map(f =>
          `<div class="cov-grp">${esc(f.key)}</div>` + f.journals.map(j => {
            const w = Math.max(2, (y1 - j.since) / span * 100);
            return `<a class="cov-row" href="${esc(j.url)}" target="_blank" rel="noopener" title="${esc(j.name)}, ${esc(j.since)}–"><span class="cov-ab">${esc(j.abbr)}</span><span class="cov-bar"><i style="width:${w}%"></i></span><span class="cov-n">${fmt(j.n)}</span></a>`;
          }).join("")).join("");
        $("#cov-axis").innerHTML = [1960, 1980, 2000, 2020].map(t => `<span style="left:${(t - y0) / span * 100}%">${t}</span>`).join("");
        const cov = $("#atlas-cov"); cov.hidden = false;
        if (!calm) {
          cov.classList.add("pre");
          new IntersectionObserver((es, o) => es.forEach(e => {
            if (e.isIntersecting) { requestAnimationFrame(() => cov.classList.remove("pre")); o.disconnect(); }
          }), { threshold: .3 }).observe(cov);
        }
      }
      if (d.updated) $("#atlas-foot").textContent = `Live from isatlas.org · digest of ${mon(d.updated)}`;
    } catch (e) { /* the static fallback stays */ }
  })();
})();
