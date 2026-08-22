/* الموقع التخصفي لحسن عيون السود — تشغيل مطاعم وتطوير مشاريع
   تبديل اللغة، ظهور تدريجي، نسخ البريد، تحميل السيرة الذاتية، وحالة الهيدر. */

(function () {
  "use strict";

  var LANG_KEY = "site-lang";
  var html = document.documentElement;
  var langBtn = document.getElementById("langBtn");
  var AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

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
      else if (el.tagName === "TITLE") document.title = text;
      else el.textContent = text;
    }

    var numeric = document.querySelectorAll(".when, .time p, .store-card p, .sys-card p, #lessons p, .clips .n, #year");
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

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pointerFine = window.matchMedia("(pointer:fine)").matches;
  var hasGsap = !!(window.gsap);

  /* ===== البريلودر: كتابة الاسم فوق صورة، ثم انزلاق يكشف الموقع ===== */
  (function () {
    var pre = document.getElementById("preloader");
    if (!pre) return;

    if (reduceMotion) { pre.remove(); return; }

    var word = "حسن عيون السود";
    var el = document.getElementById("preWord");
    var caret = document.getElementById("preCaret");
    var i = 0;

    function finish() {
      if (caret) caret.style.display = "none";
      if (hasGsap) {
        gsap.to(pre, {
          yPercent: -100, duration: .8, ease: "power4.inOut", delay: .2,
          onComplete: function () { pre.remove(); }
        });
      } else {
        pre.style.transition = "transform .5s ease";
        pre.style.transform = "translateY(-100%)";
        setTimeout(function () { pre.remove(); }, 520);
      }
    }
    function type() {
      if (i <= word.length) {
        el.textContent = word.slice(0, i++);
        setTimeout(type, 65);
      } else {
        setTimeout(finish, 320);
      }
    }
    setTimeout(type, 550); /* تبدأ الكتابة بعد ظهور الصورة */
  })();

  /* ===== ظهور تدريجي ===== */
  var reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    for (var k = 0; k < reveals.length; k++) reveals[k].classList.add("shown");
  } else if (hasGsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    reveals.forEach(function (el) {
      el.classList.add("shown"); /* الفولباك CSS يبقى شغّال لو تأخّر GSAP */
      gsap.fromTo(el,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: .6, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true, markers: false } });
    });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("shown");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

    for (var m = 0; m < reveals.length; m++) io.observe(reveals[m]);
  }

  /* ===== أزرار مغناطيسية — الدعوات الأساسية فقط ===== */
  if (hasGsap && pointerFine && !reduceMotion) {
    var magnets = document.querySelectorAll(".btn.solid, .cv-cta, .cv-btn");
    magnets.forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = this.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        gsap.to(this, { x: x * .25, y: y * .35, duration: .35, ease: "power3.out" });
      });
      btn.addEventListener("mouseleave", function () {
        gsap.to(this, { x: 0, y: 0, duration: .5, ease: "elastic.out(1,.5)" });
      });
    });
  }

  /* ===== حالة الهيدر ===== */
  var nav = document.getElementById("nav");
  if (nav) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        nav.classList.toggle("scrolled", window.scrollY > 10);
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

  /* ===== زر تحميل السيرة الذاتية (CV Download) ===== */
  var cvBtns = document.querySelectorAll('.cv-btn, .cv-cta, .cv-download-btn');
  for (var cIdx = 0; cIdx < cvBtns.length; cIdx++) {
    cvBtns[cIdx].addEventListener("click", function (evt) {
      // إذا كان الملف غير مرفق محلياً، أظهر إشعار للمستخدم بالاستعداد للتواصل المباشر
      showToast(html.lang === "ar" ? "جاري فتح السيرة الذاتية..." : "Downloading CV...");
    });
  }

  /* ===== النافذة التفاعلية لاستعراض شاشات برو هاوس (SYSTEM LIGHTBOX MODAL) ===== */
  var phModal = document.getElementById("phSystemModal");
  var closePhModalBtn = document.getElementById("closePhModalBtn");

  function openSystemModal() {
    if (!phModal) return;
    phModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeSystemModal() {
    if (!phModal) return;
    phModal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  var caseStudyBtns = document.querySelectorAll(".ph-case-study-btn, #expandSystemModalBtn, #openPhCaseStudyBtn");
  for (var bIdx = 0; bIdx < caseStudyBtns.length; bIdx++) {
    caseStudyBtns[bIdx].addEventListener("click", openSystemModal);
  }
  if (closePhModalBtn) closePhModalBtn.addEventListener("click", closeSystemModal);

  if (phModal) {
    phModal.addEventListener("click", function (e) {
      if (e.target === phModal) closeSystemModal();
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
