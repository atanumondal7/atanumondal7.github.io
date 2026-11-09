/* =====================================================================
   Shared behaviour for every page.

   SITE SWITCH
   Change SITE_STATUS below to "offline" and commit to turn every page into a
   503 error page. Set it back to "online" to restore the site.
   To preview the error page without changing anything, add ?offline to any
   address, for example https://atanumondal.me/?offline
   ===================================================================== */

(function () {
  "use strict";

  var SITE_STATUS = "online"; // "online" or "offline"

  var root = document.documentElement;
  root.classList.add("js");

  var offline = SITE_STATUS === "offline" || /[?&]offline(&|=|$)/.test(location.search);
  if (offline) {
    root.setAttribute("data-site", "offline");
    document.title = "Site offline | Atanu Mondal";
  }

  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    if (offline && !document.querySelector(".fault")) injectFault();
    initViewer();
    initSkills();
    initReveals();
    initLightbox();
  });

  /* ---------- error screen ---------- */

  function injectFault() {
    var el = document.createElement("div");
    el.className = "fault";
    el.setAttribute("role", "status");
    el.innerHTML =
      '<div class="wrap"><div class="panel fault-panel">' +
      '<div class="panel-bar"><span>atanu.wdb</span><span>t = unknown</span></div>' +
      '<div class="fault-body">' +
      '<div class="frow"><span class="fsig">clk</span><span class="fwave" aria-hidden="true"></span></div>' +
      '<div class="frow"><span class="fsig">status</span>' +
      '<div class="hexbus is-x fbus"><div class="in"><h1>503 Site offline</h1></div></div></div>' +
      '<p class="fmsg">This portfolio is temporarily unavailable. Please check back soon.</p>' +
      '<p class="flinks"><a href="mailto:2007atanu.mondal@gmail.com">Email me</a>' +
      '<a href="https://github.com/atanumondal7">GitHub</a></p>' +
      "</div></div></div>";
    document.body.appendChild(el);
  }

  /* ---------- landing page: the waveform viewer ---------- */

  function initViewer() {
    var v = document.querySelector("[data-viewer]");
    if (!v) return;

    var body = v.querySelector(".vbody");
    var track = v.querySelector(".cursor-track");
    var cursor = v.querySelector(".cursor");
    var readout = v.querySelector("[data-readout]");
    var replay = v.querySelector("[data-replay]");
    var traces = [].slice.call(v.querySelectorAll(".vtrace"));
    var vals = {
      clk: v.querySelector('[data-val="clk"]'),
      rst: v.querySelector('[data-val="rst"]'),
      name: v.querySelector('[data-val="name"]'),
      focus: v.querySelector('[data-val="focus"]')
    };

    var RESET_AT = 280; // ns: reset releases and the signals resolve from X

    function valuesAt(t) {
      var live = t >= RESET_AT;
      return {
        clk: Math.floor(t / 25) % 2 ? "1" : "0",
        rst: live ? "1" : "0",
        name: live ? "Atanu Mondal" : "X",
        focus: !live ? "X" : t < 520 ? "VLSI design" : t < 760 ? "SystemVerilog" : "UVM"
      };
    }

    var current = 1;

    function paint(f) {
      current = f;
      cursor.style.left = f * 100 + "%";
      var t = Math.min(999, Math.round(f * 1000));
      if (readout) readout.textContent = "t = " + t + " ns";
      var s = valuesAt(t);
      for (var k in vals) if (vals[k]) vals[k].textContent = s[k];
    }

    function reveal(p) {
      var hidden = (100 - p * 100).toFixed(2) + "%";
      traces.forEach(function (w) { w.style.clipPath = "inset(0 " + hidden + " 0 0)"; });
    }

    var raf = 0;
    var running = false;

    function done() {
      running = false;
      cancelAnimationFrame(raf);
      traces.forEach(function (w) { w.style.clipPath = "none"; });
      paint(1);
    }

    function run() {
      cancelAnimationFrame(raf);
      running = true;
      reveal(0);
      paint(0);
      var DELAY = 350, DURATION = 2800, start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.max(0, Math.min(1, (ts - start - DELAY) / DURATION));
        reveal(p);
        paint(p);
        if (p < 1) raf = requestAnimationFrame(step);
        else done();
      }
      raf = requestAnimationFrame(step);
    }

    function scrubTo(clientX) {
      var r = track.getBoundingClientRect();
      var f = (clientX - r.left) / r.width;
      paint(Math.max(0, Math.min(1, f)));
    }

    body.addEventListener("pointermove", function (e) {
      if (running) done();
      scrubTo(e.clientX);
    });

    body.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? 0.1 : 0.02;
      var f = current;
      if (e.key === "ArrowRight") f += step;
      else if (e.key === "ArrowLeft") f -= step;
      else if (e.key === "Home") f = 0;
      else if (e.key === "End") f = 1;
      else return;
      e.preventDefault();
      if (running) done();
      paint(Math.max(0, Math.min(1, f)));
    });

    if (replay) {
      if (reduceMotion) replay.hidden = true;
      replay.addEventListener("click", run);
    }

    if (reduceMotion) done();
    else run();
  }

  /* ---------- landing page: skills as a testbench ---------- */

  function initSkills() {
    var box = document.querySelector("[data-skills]");
    if (!box) return;

    var items = [].slice.call(box.querySelectorAll(".skill-item"));
    var nodes = [].slice.call(box.querySelectorAll(".node"));

    function select(id) {
      var activeNode = null;
      items.forEach(function (it) {
        var on = it.getAttribute("data-skill") === id;
        it.classList.toggle("is-active", on);
        it.querySelector(".skill-btn").setAttribute("aria-expanded", on ? "true" : "false");
        if (on) activeNode = it.getAttribute("data-node");
      });
      nodes.forEach(function (n) {
        n.classList.toggle("is-active", n.getAttribute("data-node") === activeNode);
      });
    }

    function nodeFor(el) {
      while (el && el !== box) {
        if (el.classList && el.classList.contains("node")) return el;
        el = el.parentNode;
      }
      return null;
    }

    function chooseNode(n) {
      var id = n.getAttribute("data-node");
      for (var i = 0; i < items.length; i++) {
        if (items[i].getAttribute("data-node") === id) { select(items[i].getAttribute("data-skill")); return; }
      }
    }

    items.forEach(function (it) {
      var btn = it.querySelector(".skill-btn");
      var id = it.getAttribute("data-skill");
      btn.addEventListener("click", function () {
        select(it.classList.contains("is-active") ? null : id);
      });
      var nid = it.getAttribute("data-node");
      function hover(on) {
        nodes.forEach(function (n) {
          if (n.getAttribute("data-node") === nid) n.classList.toggle("is-hover", on);
        });
      }
      it.addEventListener("mouseenter", function () { hover(true); });
      it.addEventListener("mouseleave", function () { hover(false); });
    });

    box.addEventListener("click", function (e) {
      var n = nodeFor(e.target);
      if (n) chooseNode(n);
    });

    box.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var n = nodeFor(e.target);
      if (!n || e.target !== n) return;
      e.preventDefault();
      chooseNode(n);
    });

    var first = box.querySelector(".skill-item.is-active");
    select(first ? first.getAttribute("data-skill") : null);
  }

  /* ---------- credential image viewer ----------
     Every [data-view] button opens a dialog showing the image for that
     badge or certificate. The image is looked up as <data-image>.png, .jpg,
     .jpeg or .webp, so upload it under assets/badges/ or assets/certificates/
     with the file name shown in data-image. */

  function initLightbox() {
    var triggers = [].slice.call(document.querySelectorAll("[data-view]"));
    if (!triggers.length || !window.HTMLDialogElement) return;

    var EXT = ["png", "jpg", "jpeg", "webp"];
    var dlg = document.createElement("dialog");
    dlg.className = "lb";
    dlg.setAttribute("aria-labelledby", "lb-title");
    dlg.innerHTML =
      '<div class="panel-bar lb-bar"><span id="lb-title"></span>' +
      '<span class="bar-right"><span class="lb-count" aria-hidden="true"></span>' +
      '<button type="button" class="replay lb-close">Close</button></span></div>' +
      '<div class="lb-stage"></div>' +
      '<div class="lb-foot"><span class="lb-nav">' +
      '<button type="button" class="btn sm" data-prev>Previous</button>' +
      '<button type="button" class="btn sm" data-next>Next</button></span>' +
      '<a class="btn sm primary lb-verify" target="_blank" rel="noopener" hidden></a></div>';
    document.body.appendChild(dlg);

    var title = dlg.querySelector("#lb-title");
    var count = dlg.querySelector(".lb-count");
    var stage = dlg.querySelector(".lb-stage");
    var verify = dlg.querySelector(".lb-verify");
    var prev = dlg.querySelector("[data-prev]");
    var next = dlg.querySelector("[data-next]");
    var index = 0, token = 0, opener = null;

    if (triggers.length < 2) { prev.hidden = true; next.hidden = true; }

    function missing(t, base) {
      var kind = t.getAttribute("data-kind") || "badge";
      var box = document.createElement("div");
      box.className = "lb-missing";
      box.innerHTML =
        '<div class="hexseal" aria-hidden="true"><span>X</span></div>' +
        "<p></p><p class=\"hint\"></p>";
      box.querySelectorAll("p")[0].textContent =
        "The image of this " + kind + " hasn't been added yet." +
        (t.getAttribute("data-verify") ? " You can still verify it with the button below." : "");
      box.querySelectorAll("p")[1].textContent = "Expected file: " + base + ".png";
      stage.innerHTML = "";
      stage.appendChild(box);
    }

    function show(i) {
      var n = triggers.length;
      index = (i + n) % n;
      var t = triggers[index];
      var base = t.getAttribute("data-image");
      var kind = t.getAttribute("data-kind") || "badge";
      title.textContent = t.getAttribute("data-title");
      count.textContent = index + 1 + " of " + n;

      var vurl = t.getAttribute("data-verify");
      if (vurl) {
        verify.href = vurl;
        verify.textContent = t.getAttribute("data-verify-label") || "Verify";
        verify.hidden = false;
      } else {
        verify.hidden = true;
      }

      stage.innerHTML = '<span class="lb-loading">Loading</span>';
      var mine = ++token, tried = 0, img = new Image();
      function tryNext() {
        if (mine !== token) return;
        if (tried >= EXT.length) { missing(t, base); return; }
        img.src = base + "." + EXT[tried++];
      }
      img.onload = function () {
        if (mine !== token) return;
        img.alt = t.getAttribute("data-title") + " " + kind;
        // Siemens badges are transparent with black text: put every image on a light mat.
        img.style.cssText = "box-sizing:border-box;padding:20px;border-radius:12px;background:#eef2f8";
        stage.innerHTML = "";
        stage.appendChild(img);
      };
      img.onerror = tryNext;
      tryNext();
    }

    triggers.forEach(function (t) {
      t.addEventListener("click", function () {
        opener = t;
        show(triggers.indexOf(t));
        dlg.showModal();
      });
    });

    prev.addEventListener("click", function () { show(index - 1); });
    next.addEventListener("click", function () { show(index + 1); });
    dlg.querySelector(".lb-close").addEventListener("click", function () { dlg.close(); });

    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });

    dlg.addEventListener("keydown", function (e) {
      if (triggers.length < 2) return;
      if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1); }
    });

    dlg.addEventListener("close", function () {
      token++;
      if (opener) opener.focus();
    });
  }

  /* ---------- reveal on scroll (results log, meters, journey stages) ---------- */

  function initReveals() {
    var els = [].slice.call(document.querySelectorAll("[data-reveal], .stage"));
    if (!els.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.35 });

    els.forEach(function (el) { io.observe(el); });
  }
})();
