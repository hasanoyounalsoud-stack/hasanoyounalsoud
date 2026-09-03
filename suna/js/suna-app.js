/**
 * SUNA (سونا) — Application Core: Language Switcher (AR/EN), Investor Deck Modal, Tabs & Scrollspy
 */

const SunaApp = (function() {
  let currentLang = "ar"; // default Arabic

  function init() {
    setupLanguageSwitcher();
    setupInvestorModal();
    setupTabs();
    setupScrollspy();
    setupSmoothScroll();
  }

  // Language Switcher (AR / EN)
  function setupLanguageSwitcher() {
    const langBtns = document.querySelectorAll(".lang-toggle-btn");
    langBtns.forEach(btn => {
      btn.addEventListener("click", function() {
        const targetLang = this.getAttribute("data-lang");
        setLanguage(targetLang);
      });
    });
  }

  function setLanguage(lang) {
    currentLang = lang;
    const html = document.documentElement;

    if (lang === "ar") {
      html.setAttribute("dir", "rtl");
      html.setAttribute("lang", "ar");
      document.body.classList.remove("ltr-mode");
      document.body.classList.add("rtl-mode");
    } else {
      html.setAttribute("dir", "ltr");
      html.setAttribute("lang", "en");
      document.body.classList.remove("rtl-mode");
      document.body.classList.add("ltr-mode");
    }

    // Toggle active state on buttons
    document.querySelectorAll(".lang-toggle-btn").forEach(btn => {
      if (btn.getAttribute("data-lang") === lang) {
        btn.classList.add("btn-gold");
        btn.classList.remove("btn-outline");
      } else {
        btn.classList.remove("btn-gold");
        btn.classList.add("btn-outline");
      }
    });

    // Translate all elements with data-ar and data-en
    document.querySelectorAll("[data-ar][data-en]").forEach(el => {
      const text = el.getAttribute(`data-${lang}`);
      if (text) {
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
          el.placeholder = text;
        } else {
          el.innerHTML = text;
        }
      }
    });

    // Notify calculator if needed
    if (window.SunaCalculator && typeof window.SunaCalculator.calculate === "function") {
      window.SunaCalculator.calculate();
    }
  }

  // Investor Quick Mode Modal
  function setupInvestorModal() {
    const modal = document.getElementById("investor-modal");
    const openBtns = document.querySelectorAll(".btn-open-investor-modal");
    const closeBtn = document.getElementById("close-investor-modal");

    if (!modal) return;

    openBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modal.classList.remove("active");
        document.body.style.overflow = "";
      });
    }

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
      }
    });
  }

  // Tab Components
  function setupTabs() {
    const tabGroups = document.querySelectorAll("[data-tab-group]");
    tabGroups.forEach(group => {
      const buttons = group.querySelectorAll(".tab-btn");
      const targetContainerId = group.getAttribute("data-tab-target");
      const container = document.getElementById(targetContainerId);

      buttons.forEach(btn => {
        btn.addEventListener("click", function() {
          const tabId = this.getAttribute("data-tab");
          buttons.forEach(b => b.classList.remove("active"));
          this.classList.add("active");

          if (container) {
            container.querySelectorAll(".tab-pane").forEach(pane => {
              pane.classList.remove("active");
            });
            const activePane = container.querySelector(`[data-pane="${tabId}"]`);
            if (activePane) activePane.classList.add("active");
          }
        });
      });
    });
  }

  // Scrollspy for Jump Bar
  function setupScrollspy() {
    const jumpLinks = document.querySelectorAll(".jump-link");
    const sections = document.querySelectorAll("section[id]");

    if (jumpLinks.length === 0 || sections.length === 0) return;

    window.addEventListener("scroll", () => {
      let currentSectionId = "";
      const scrollPos = window.scrollY + 140;

      sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          currentSectionId = section.getAttribute("id");
        }
      });

      jumpLinks.forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("href") === `#${currentSectionId}`) {
          link.classList.add("active");
        }
      });
    }, { passive: true });
  }

  // Smooth Scroll
  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener("click", function(e) {
        const targetId = this.getAttribute("href");
        if (targetId === "#") return;
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          const navHeight = 120;
          const targetPos = targetEl.getBoundingClientRect().top + window.pageYOffset - navHeight;
          window.scrollTo({
            top: targetPos,
            behavior: "smooth"
          });
        }
      });
    });
  }

  return {
    init,
    setLanguage
  };
})();

document.addEventListener("DOMContentLoaded", function() {
  SunaApp.init();
});
