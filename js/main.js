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
    var numeric = document.querySelectorAll(".when, .time p, .store p, .feats li, #lessons p, .clips .n, #year");
    for (var j = 0; j < numeric.length; j++) convertDigits(numeric[j], isAr);

    /* التسميات المخفية للقارئ الصوتي — بتنتبدّل بخاصية مش بنص، فبتحتاج
       معالجة لحالها. بدونها المكفوف بيسمع "التنقل" وهو بالوضع الإنجليزي. */
    var labelled = document.querySelectorAll("[data-ar-label][data-en-label]");
    for (var L = 0; L < labelled.length; L++) {
      labelled[L].setAttribute("aria-label",
        isAr ? labelled[L].getAttribute("data-ar-label") : labelled[L].getAttribute("data-en-label"));
    }

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
})();
