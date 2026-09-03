/**
 * SUNA (سونا) — Interactive Financial Engine & Dynamic Simulation Model
 */

const SunaCalculator = (function() {
  // State
  const state = {
    ordersPerDay: SUNA_DATA.financials.defaultOrdersPerDay,
    aov: SUNA_DATA.financials.defaultAov,
    foodCostPct: 36,
    staffCount: 4,
    deliverySharePct: 35,
    currency: "USD", // "USD" or "SYP"
    capex: SUNA_DATA.financials.startupCapex,
    exchangeRate: SUNA_DATA.meta.exchangeRate
  };

  // Presets
  const presets = {
    conservative: { ordersPerDay: 55, aov: 4.60, foodCostPct: 38, staffCount: 3, deliverySharePct: 25 },
    base: { ordersPerDay: 95, aov: 5.20, foodCostPct: 36, staffCount: 4, deliverySharePct: 35 },
    optimistic: { ordersPerDay: 150, aov: 5.80, foodCostPct: 33, staffCount: 5, deliverySharePct: 42 },
    stress: { ordersPerDay: 42, aov: 4.20, foodCostPct: 44, staffCount: 4, deliverySharePct: 40 }
  };

  function init() {
    bindInputs();
    bindPresets();
    bindCurrencyToggle();
    calculate();
  }

  function bindInputs() {
    const ordersInput = document.getElementById("input-orders");
    const aovInput = document.getElementById("input-aov");
    const foodCostInput = document.getElementById("input-food-cost");
    const staffInput = document.getElementById("input-staff");
    const deliveryInput = document.getElementById("input-delivery");

    if (ordersInput) {
      ordersInput.addEventListener("input", function(e) {
        state.ordersPerDay = parseInt(e.target.value, 10);
        document.getElementById("val-orders").textContent = state.ordersPerDay;
        calculate();
      });
    }

    if (aovInput) {
      aovInput.addEventListener("input", function(e) {
        state.aov = parseFloat(e.target.value);
        document.getElementById("val-aov").textContent = formatMoney(state.aov, "USD", 2);
        calculate();
      });
    }

    if (foodCostInput) {
      foodCostInput.addEventListener("input", function(e) {
        state.foodCostPct = parseInt(e.target.value, 10);
        document.getElementById("val-food-cost").textContent = state.foodCostPct + "%";
        calculate();
      });
    }

    if (staffInput) {
      staffInput.addEventListener("input", function(e) {
        state.staffCount = parseInt(e.target.value, 10);
        document.getElementById("val-staff").textContent = state.staffCount;
        calculate();
      });
    }

    if (deliveryInput) {
      deliveryInput.addEventListener("input", function(e) {
        state.deliverySharePct = parseInt(e.target.value, 10);
        document.getElementById("val-delivery").textContent = state.deliverySharePct + "%";
        calculate();
      });
    }
  }

  function bindPresets() {
    const presetButtons = document.querySelectorAll("[data-preset]");
    presetButtons.forEach(btn => {
      btn.addEventListener("click", function() {
        const presetKey = this.getAttribute("data-preset");
        if (presets[presetKey]) {
          applyPreset(presets[presetKey]);
          presetButtons.forEach(b => b.classList.remove("active", "btn-primary"));
          presetButtons.forEach(b => b.classList.add("btn-outline"));
          this.classList.remove("btn-outline");
          this.classList.add("btn-primary");
        }
      });
    });
  }

  function applyPreset(p) {
    state.ordersPerDay = p.ordersPerDay;
    state.aov = p.aov;
    state.foodCostPct = p.foodCostPct;
    state.staffCount = p.staffCount;
    state.deliverySharePct = p.deliverySharePct;

    // Update UI controls
    const ordersInput = document.getElementById("input-orders");
    const aovInput = document.getElementById("input-aov");
    const foodCostInput = document.getElementById("input-food-cost");
    const staffInput = document.getElementById("input-staff");
    const deliveryInput = document.getElementById("input-delivery");

    if (ordersInput) ordersInput.value = state.ordersPerDay;
    if (aovInput) aovInput.value = state.aov;
    if (foodCostInput) foodCostInput.value = state.foodCostPct;
    if (staffInput) staffInput.value = state.staffCount;
    if (deliveryInput) deliveryInput.value = state.deliverySharePct;

    if (document.getElementById("val-orders")) document.getElementById("val-orders").textContent = state.ordersPerDay;
    if (document.getElementById("val-aov")) document.getElementById("val-aov").textContent = formatMoney(state.aov, "USD", 2);
    if (document.getElementById("val-food-cost")) document.getElementById("val-food-cost").textContent = state.foodCostPct + "%";
    if (document.getElementById("val-staff")) document.getElementById("val-staff").textContent = state.staffCount;
    if (document.getElementById("val-delivery")) document.getElementById("val-delivery").textContent = state.deliverySharePct + "%";

    calculate();
  }

  function bindCurrencyToggle() {
    const toggles = document.querySelectorAll(".currency-toggle-btn");
    toggles.forEach(btn => {
      btn.addEventListener("click", function() {
        state.currency = this.getAttribute("data-curr");
        toggles.forEach(b => b.classList.remove("active", "btn-gold"));
        toggles.forEach(b => b.classList.add("btn-outline"));
        this.classList.remove("btn-outline");
        this.classList.add("btn-gold");
        calculate();
      });
    });
  }

  function calculate() {
    const daysInMonth = 30;
    const monthlyOrders = state.ordersPerDay * daysInMonth;
    const monthlyRevenueUsd = monthlyOrders * state.aov;

    // Cost of Goods Sold (COGS)
    const foodCostUsd = monthlyRevenueUsd * (state.foodCostPct / 100);
    const packagingCostUsd = monthlyOrders * 0.28;
    const deliveryCommissionUsd = (monthlyOrders * (state.deliverySharePct / 100)) * (state.aov * 0.12);
    const totalCogsUsd = foodCostUsd + packagingCostUsd + deliveryCommissionUsd;

    const grossProfitUsd = monthlyRevenueUsd - totalCogsUsd;
    const grossMarginPct = (grossProfitUsd / monthlyRevenueUsd) * 100;

    // Operating Expenses (OPEX)
    const staffSalaryTotalUsd = state.staffCount * 190; // $190/mo average per employee in Homs
    const fixedOverheadUsd = 350 + 340 + 120 + 40 + 150 + 80; // Rent (350), Fuel (340), Maint (120), Tech (40), Mktg (150), Sundries (80)
    const totalOpexUsd = staffSalaryTotalUsd + fixedOverheadUsd;

    // Operating Profit (EBITDA)
    const ebitdaUsd = grossProfitUsd - totalOpexUsd;
    const netMarginPct = (ebitdaUsd / monthlyRevenueUsd) * 100;

    // Break-Even Metrics
    const contributionMarginPerOrder = state.aov - (state.aov * (state.foodCostPct / 100)) - 0.28 - ((state.deliverySharePct / 100) * state.aov * 0.12);
    const breakEvenOrdersDaily = contributionMarginPerOrder > 0 ? Math.ceil(totalOpexUsd / (contributionMarginPerOrder * daysInMonth)) : 999;
    const breakEvenRevenueMonthlyUsd = breakEvenOrdersDaily * daysInMonth * state.aov;

    // Payback & ROI
    let paybackMonths = "∞";
    let roi3YrPct = -100;

    if (ebitdaUsd > 0) {
      paybackMonths = (state.capex / ebitdaUsd).toFixed(1);
      const yr1Net = ebitdaUsd * 12;
      const yr2Net = yr1Net * 1.15; // 15% efficiency & brand gain
      const yr3Net = yr2Net * 1.10; // 10% gain
      const cumulativeNet3Yr = yr1Net + yr2Net + yr3Net;
      roi3YrPct = (((cumulativeNet3Yr - state.capex) / state.capex) * 100).toFixed(0);
    }

    // Render results to DOM
    renderOutputs({
      monthlyRevenueUsd,
      grossProfitUsd,
      grossMarginPct,
      totalOpexUsd,
      ebitdaUsd,
      netMarginPct,
      breakEvenOrdersDaily,
      breakEvenRevenueMonthlyUsd,
      paybackMonths,
      roi3YrPct
    });
  }

  function renderOutputs(m) {
    const isSyp = state.currency === "SYP";

    setElText("calc-out-revenue", formatMoney(m.monthlyRevenueUsd, state.currency));
    setElText("calc-out-gross", formatMoney(m.grossProfitUsd, state.currency));
    setElText("calc-out-gross-pct", m.grossMarginPct.toFixed(1) + "%");
    setElText("calc-out-opex", formatMoney(m.totalOpexUsd, state.currency));

    const ebitdaEl = document.getElementById("calc-out-ebitda");
    if (ebitdaEl) {
      ebitdaEl.textContent = formatMoney(m.ebitdaUsd, state.currency);
      ebitdaEl.style.color = m.ebitdaUsd >= 0 ? "#6BD49A" : "#FA7970";
    }

    setElText("calc-out-margin", m.netMarginPct.toFixed(1) + "%");
    setElText("calc-out-breakeven-orders", m.breakEvenOrdersDaily + " طلب/يوم (orders/day)");
    setElText("calc-out-breakeven-rev", formatMoney(m.breakEvenRevenueMonthlyUsd, state.currency));
    setElText("calc-out-payback", m.paybackMonths === "∞" ? "عجز تشغيلي (Deficit)" : m.paybackMonths + " شهر (months)");
    
    const roiEl = document.getElementById("calc-out-roi");
    if (roiEl) {
      roiEl.textContent = m.roi3YrPct + "%";
      roiEl.style.color = m.roi3YrPct >= 0 ? "#D49B38" : "#FA7970";
    }
  }

  function formatMoney(amountUsd, curr, decimals = 0) {
    if (curr === "SYP") {
      const sypVal = amountUsd * state.exchangeRate;
      return Math.round(sypVal).toLocaleString("en-US") + " ل.س";
    }
    return "$" + (decimals > 0 ? amountUsd.toFixed(decimals) : Math.round(amountUsd).toLocaleString("en-US"));
  }

  function setElText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  return {
    init,
    calculate,
    state
  };
})();

document.addEventListener("DOMContentLoaded", function() {
  SunaCalculator.init();
});
