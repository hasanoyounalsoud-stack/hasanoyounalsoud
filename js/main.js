/* الموقع التعريفي — حسن عيون السود
   تبديل اللغة، تحويل الأرقام، ظهور تدريجي، وحالة الهيدر. */

(function () {
  "use strict";

  var LANG_KEY = "site-lang";
  var html = document.documentElement;
  var langBtn = document.getElementById("langBtn");

  var AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

  /* الأرقام مكتوبة بالعربي بالـHTML. بالإنجليزي لازم تتحول لأرقام لاتينية،
     وإلا بتطلع «١٥٠k» — نص إنجليزي وأرقام عربية بنفس السطر. */
  function convertDigits(root, toArabic) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      node.nodeValue = node.nodeValue.replace(/[0-9٠-٩]/g, function (d) {
        var i = AR_DIGITS.indexOf(d);
        if (toArabic) return i >= 0 ? d : AR_DIGITS[+d];
        return i >= 0 ? String(i) : d;
      });
    }
  }

  function applyLang(lang) {
    var isAr = lang === "ar";

    html.lang = isAr ? "ar" : "en";
    html.dir = isAr ? "rtl" : "ltr";

    var nodes = document.querySelectorAll("[data-ar][data-en]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var text = isAr ? el.getAttribute("data-ar") : el.getAttribute("data-en");
      if (el.tagName === "META") el.setAttribute("content", text);
      else el.textContent = text;
    }

    // بعد ما ينتبدّل النص — الأرقام اللي مش جوّا data-ar/data-en
    var numeric = document.querySelectorAll(".num, .when, .fig .cap, .time p, .store p, #lessons p, .clips .n, #year");
    for (var j = 0; j < numeric.length; j++) convertDigits(numeric[j], isAr);

    if (langBtn) {
      langBtn.textContent = isAr ? "EN" : "عربي";
      langBtn.setAttribute("aria-label", isAr ? "Switch to English" : "التبديل للعربية");
    }

    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* تصفح خاص */ }
  }

  var saved = null;
  try { saved = localStorage.getItem(LANG_KEY); } catch (e) { /* تجاهل */ }
  if (saved === "en") applyLang("en");

  if (langBtn) {
    langBtn.addEventListener("click", function () {
      applyLang(html.lang === "ar" ? "en" : "ar");
    });
  }

  /* ===== ظهور تدريجي =====
     بدون IntersectionObserver بنعرض كل شي على طول بدل ما تضل الصفحة فاضية. */
  var reveals = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    for (var k = 0; k < reveals.length; k++) reveals[k].classList.add("shown");
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("shown");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });

    for (var m = 0; m < reveals.length; m++) io.observe(reveals[m]);
  }


  /* ===== عدّ الأرقام =====
     الأرقام هي أقوى إشي بالصفحة، فبتعدّ لما توصلها بدل ما تكون ثابتة.
     بتشتغل مرة وحدة لكل رقم، وبتحترم تقليل الحركة. */
  var slow = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function toDigits(n, arabic) {
    var t = String(n);
    return arabic ? t.replace(/[0-9]/g, function (d) { return AR_DIGITS[+d]; }) : t;
  }

  function countUp(el) {
    // النص الظاهر ممكن يكون عربي أو لاتيني — بناخد الرقم من النسخة اللاتينية
    var raw = el.firstChild && el.firstChild.nodeValue ? el.firstChild.nodeValue.trim() : "";
    var latin = raw.replace(/[٠-٩]/g, function (d) { return String(AR_DIGITS.indexOf(d)); });
    var target = parseInt(latin, 10);
    if (!target || slow) return;

    var start = null;
    var dur = 1100;

    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 3);          // بيبطّئ بالآخر
      var val = Math.round(target * eased);
      if (el.firstChild) el.firstChild.nodeValue = toDigits(val, html.lang === "ar");
      if (t < 1) window.requestAnimationFrame(step);
    }

    if (el.firstChild) el.firstChild.nodeValue = toDigits(0, html.lang === "ar");
    window.requestAnimationFrame(step);
  }

  var figures = document.querySelectorAll(".num");
  if ("IntersectionObserver" in window) {
    var numObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        countUp(e.target);
        numObs.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    for (var f = 0; f < figures.length; f++) numObs.observe(figures[f]);
  }

  /* ===== حالة الهيدر ===== */
  var nav = document.getElementById("nav");
  if (nav) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        nav.classList.toggle("scrolled", window.scrollY > 6);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ===== سنة الفوتر ===== */
  var year = document.getElementById("year");
  if (year) {
    var y = String(new Date().getFullYear());
    year.textContent = html.lang === "ar" ? y.replace(/[0-9]/g, function (d) { return AR_DIGITS[+d]; }) : y;
  }

  /* ===== نسخ البريد الإلكتروني بنقرة واحدة ===== */
  var mailLinks = document.querySelectorAll('a[href^="mailto:"]');
  for (var mIdx = 0; mIdx < mailLinks.length; mIdx++) {
    mailLinks[mIdx].addEventListener("click", function (evt) {
      var email = this.getAttribute("href").replace("mailto:", "");
      if (navigator.clipboard) {
        navigator.clipboard.writeText(email);
        showToast(html.lang === "ar" ? "تم نسخ البريد الإلكتروني بنجاح!" : "Email copied to clipboard!");
      }
    });
  }

  function showToast(msg) {
    var toast = document.createElement("div");
    toast.className = "toast-msg";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add("show"); }, 10);
    setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, 2500);
  }
})();
