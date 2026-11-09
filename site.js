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
