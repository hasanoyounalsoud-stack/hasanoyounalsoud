/* الموقع التعريفي — حسن يونا السعود
   ثلاث وظائف بس: تبديل اللغة، ظهور تدريجي للأقسام، وحالة الهيدر عند النزول. */

(function () {
  "use strict";

  /* ===== تبديل اللغة =====
     كل عنصر بيحمل data-ar و data-en. التبديل بيبدّل النص، واتجاه الصفحة،
     وبيحفظ الاختيار عشان يضل ثابت لما يرجع الزائر. */

  var LANG_KEY = "site-lang";
  var htmlEl = document.documentElement;
  var langBtn = document.getElementById("langBtn");

  function applyLang(lang) {
    var isAr = lang === "ar";

    htmlEl.lang = isAr ? "ar" : "en";
    htmlEl.dir = isAr ? "rtl" : "ltr";

    var nodes = document.querySelectorAll("[data-ar][data-en]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var text = isAr ? el.getAttribute("data-ar") : el.getAttribute("data-en");

      // الميتا ما إلها نص ظاهر — بتتعدّل بخاصية content
      if (el.tagName === "META") el.setAttribute("content", text);
      else el.textContent = text;
    }

    if (langBtn) {
      // الزر بيعرض اللغة اللي رايح إلها، مش اللغة الحالية
      langBtn.textContent = isAr ? "EN" : "عربي";
      langBtn.setAttribute("aria-label", isAr ? "Switch to English" : "التبديل للعربية");
    }

    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* وضع التصفح الخاص */ }
  }

  var saved = null;
  try { saved = localStorage.getItem(LANG_KEY); } catch (e) { /* تجاهل */ }
  if (saved === "en") applyLang("en");

  if (langBtn) {
    langBtn.addEventListener("click", function () {
      applyLang(htmlEl.lang === "ar" ? "en" : "ar");
    });
  }

  /* ===== ظهور تدريجي =====
     IntersectionObserver مش موجود بالمتصفحات القديمة — بهاي الحالة
     بنعرض كل شي على طول بدل ما يضل الموقع فاضي. */

  var reveals = document.querySelectorAll(".reveal");

  function showAll() {
    for (var i = 0; i < reveals.length; i++) reveals[i].classList.add("shown");
  }

  if (!("IntersectionObserver" in window)) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("shown");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

    for (var j = 0; j < reveals.length; j++) io.observe(reveals[j]);
  }

  /* ===== حالة الهيدر عند النزول ===== */

  var nav = document.getElementById("nav");
  if (nav) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        nav.classList.toggle("scrolled", window.scrollY > 8);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ===== سنة الفوتر ===== */

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
