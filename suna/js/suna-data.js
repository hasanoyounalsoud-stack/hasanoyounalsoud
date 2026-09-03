/**
 * SUNA (سونا) — Core Data, Financial Model Constants, Competitor Intelligence & Bilingual Content
 */

const SUNA_DATA = {
  meta: {
    projectName: "SUNA — سونا",
    conceptType: "Specialty Street Food Truck & Future Fast-Casual Scale Brand",
    location: "Homs, Syria (حمص، سوريا)",
    baseCurrency: "USD",
    localCurrency: "SYP",
    exchangeRate: 13800, // 1 USD = 13,800 SYP (Market Clearing Rate, Q3 2026)
    lastUpdated: "September 2026",
    founder: "Hasan Oyoun AlSoud (حسن عيون السود)"
  },

  // Key Financial Base Constants
  financials: {
    startupCapex: 24800, // USD
    workingCapitalReserve: 3000, // Included in capex package
    baseFixedCostsMonthly: 1850, // Rent, core salaries, generator diesel, licenses, maintenance
    foodCostTargetPct: 0.36, // 36% weighted average
    packagingCostAvg: 0.28, // USD per order
    deliveryShareAvg: 0.35, // 35% delivery, 65% walk-in/takeaway
    thirdPartyDeliveryCommission: 0.12, // 12% commission or delivery runner cost share
    defaultOrdersPerDay: 95,
    defaultAov: 5.20 // USD
  },

  // Unit Economics per Product
  products: [
    {
      id: "smash_burger",
      nameAr: "سونا سماش برغر دبل (SUNA Double Smash)",
      nameEn: "SUNA Signature Double Smash Burger",
      specsAr: "شريحتا لحم عجل بلدي (2 × 60 جم = 120 جم)، نسبة دهن 80/20، جبنة شيدر أمريكية ذائبة، بصل مكرمل مشوي بالضغط (Oklahoma style)، مخلل خيار مخمر منزلياً، صوص سونا الكهرماني، خبز بريوش بالبطاطا محمص بزبدة مصفاة.",
      specsEn: "Two 60g local beef patties (120g total, 80/20 chuck/brisket blend), melted American cheddar, smashed sweet white onions, house lacto-pickles, SUNA amber sauce, toasted potato-brioche bun.",
      portionWeight: "120g beef + 80g bun + toppings (~260g total)",
      foodCostUsd: 1.62,
      packagingUsd: 0.26,
      sellingPriceUsd: 3.60,
      sellingPriceSyp: 50000,
      comboPriceUsd: 4.90,
      comboPriceSyp: 68000,
      marginPct: 55.0,
      marginUsd: 1.98,
      complexityAr: "منخفضة إلى متوسطة — طهي سريع جداً (90 ثانية على الصاج عند 230 مئوية)",
      complexityEn: "Low to Moderate — Rapid sear (90s on 230°C flat-top griddle)"
    },
    {
      id: "entrecote_sandwich",
      nameAr: "ساندويش أنتركوت ستيك باريسي (Café de Paris Entrecôte)",
      nameEn: "Parisian Entrecôte Steak Sub",
      specsAr: "شرائح لحم بقري تندرلوين/ريب آي محلي مقطعة رفيعاً ومتبلة بملح خشن وفلفل مجروش، صوص كافيه دي باريس الأصلي (زبدة أعشاب فرنسية)، بطاطس مقرمشة رفيعة (Allumettes)، خبز صب غواصة خاص بسونا.",
      specsEn: "Thinly seared local tenderloin/ribeye steak ribbons, authentic Café de Paris herb-butter emulsion, crispy matchstick potato straws, inside SUNA custom soft sub baguette.",
      portionWeight: "130g premium steak ribbons + 90g sub roll",
      foodCostUsd: 2.45,
      packagingUsd: 0.30,
      sellingPriceUsd: 5.20,
      sellingPriceSyp: 72000,
      comboPriceUsd: 6.50,
      comboPriceSyp: 90000,
      marginPct: 52.9,
      marginUsd: 2.75,
      complexityAr: "متوسطة — تتطلب تحكماً دقيقاً بدرجة الاستواء لمنع الجفاف وسرعة التقطيع",
      complexityEn: "Moderate — Requires precise searing to prevent overcooking and quick slicing"
    },
    {
      id: "crispy_chicken",
      nameAr: "ساندويش الدجاج المقرمش الذهبي (Golden Crispy Thigh)",
      nameEn: "SUNA Golden Crispy Chicken Sandwich",
      specsAr: "قطعة فخذ دجاج كاملة منزوعة العظم والجلد (140 جم)، منقوعة 24 ساعة في محلول اللبن الرائب وماء المخلل، مغلفة بطبقة دقيق وتوابل خفية مقرمشة، صوص الثوم المستحلب، مخلل منزلي، سلطة كولسلو خفيفة.",
      specsEn: "140g boneless chicken thigh, 24hr buttermilk & pickle-brine bath, double-dredged golden crust, garlic aioli, house pickles, crisp honey-cider slaw in SUNA brioche bun.",
      portionWeight: "140g chicken thigh + bun & toppings (~280g total)",
      foodCostUsd: 1.38,
      packagingUsd: 0.24,
      sellingPriceUsd: 3.20,
      sellingPriceSyp: 44000,
      comboPriceUsd: 4.50,
      comboPriceSyp: 62000,
      marginPct: 56.9,
      marginUsd: 1.82,
      complexityAr: "منخفضة — قلي موحد في قلاية عميقة بمؤقت حراري (5 دقائق عند 175 مئوية)",
      complexityEn: "Low — Consistent deep frying with timed temperature controls (5 min at 175°C)"
    }
  ],

  // Startup Capex Detailed Breakdown
  capexItems: [
    { itemAr: "شاسيه وتجهيز شاحنة طعام مخصصة (4.5 × 2.2 م)", itemEn: "Custom Food Truck Chassis & Bodywork (4.5m × 2.2m)", costUsd: 9500, category: "Truck & Structure" },
    { itemAr: "صاج شواء مسطح ثقيل (90 سم) + قلاية مزدوجة 12 لتر", itemEn: "Heavy-duty 90cm Chrome Flat-top Griddle + Twin 12L Fryer", costUsd: 3200, category: "Cooking Line" },
    { itemAr: "ثلاجة تحضير سفلية استانلس ستيل + مجمدة تخزين", itemEn: "Under-counter Prep Chiller & Chest Storage Freezer", costUsd: 2000, category: "Refrigeration" },
    { itemAr: "مولد ديزل كاتم للصوت 12 kVA + نظام محول إنفرتر", itemEn: "12 kVA Silent Diesel Generator + Inverter/Battery Backup", costUsd: 2400, category: "Power & Utilities" },
    { itemAr: "هود شفط مع فلتر دهون ومروحة طرد مركزية ومكافحة حريق", itemEn: "Stainless Exhaust Hood, Centrifugal Blower & Fire Suppression", costUsd: 1200, category: "Safety & Ventilation" },
    { itemAr: "نظام كاشير POS وطابعات طلبات المطبخ وشبكة 4G", itemEn: "Cloud POS Hardware, Thermal KOT Printers & Local Network", costUsd: 650, category: "Technology" },
    { itemAr: "هوية بصرية، تجليد خارجي احترافي وإضاءة معمارية", itemEn: "Exterior Vinyl Wrap, Architectural Warm Lighting & Signage", costUsd: 1450, category: "Branding" },
    { itemAr: "جلسات خارجية متنقلة فاخرة (طاولات معدنية ومظلات)", itemEn: "Mobile Outdoor Seating (Bistro Sets, Planters & Umbrellas)", costUsd: 1200, category: "Seating & Ambience" },
    { itemAr: "مخزون أولي للتغليف المطبوع ومواد التشغيل (أسبوعان)", itemEn: "Initial Custom Packaging Inventory & Raw Ingredients (2 Wks)", costUsd: 1200, category: "Working Capital" },
    { itemAr: "حملة إطلاق تسويقية وإنتاج محتوى افتتاحي", itemEn: "Launch Marketing Production, Tasting Events & Promo Materials", costUsd: 700, category: "Marketing" },
    { itemAr: "احتياطي طوارئ ورأس مال تشغيلي نقدي (Safety Buffer)", itemEn: "Contingency Cash Reserve (Unforeseen expenses & repairs)", costUsd: 1300, category: "Contingency" }
  ],

  // Monthly Operating Costs (Base Case)
  monthlyOpex: [
    { itemAr: "إيجار الموقع وموافقات البلدية (حي الإنشاءات / الحمراء)", itemEn: "Pitch Lease & Municipal Food Truck Permit", costUsd: 350 },
    { itemAr: "رواتب الفريق (4 موظفين متفرغين + عامل تنظيف جزئي)", itemEn: "Kitchen & Counter Staff Salaries (4 FT + 1 PT)", costUsd: 820 },
    { itemAr: "وقود المولد (ديزل) وغاز الطهي للتشغيل اليومي", itemEn: "Diesel for 12kVA Generator & LPG Cooking Gas", costUsd: 340 },
    { itemAr: "صيانة دورية للمعدات وفلاتر الزيت والكهرباء", itemEn: "Preventive Equipment Maintenance & Oil Recycling", costUsd: 120 },
    { itemAr: "إنترنت عالي السرعة وباقات POS وخدمات سحابية", itemEn: "High-speed 4G SIM, POS SaaS & Cloud Subscriptions", costUsd: 40 },
    { itemAr: "ميزانية تسويق رقمي مستمرة وصناعة محتوى محلي", itemEn: "Ongoing Local Social Ads & Content Creation", costUsd: 150 },
    { itemAr: "نثريات واستهلاك منظفات وأدوات تعقيم", itemEn: "Sanitation Supplies, Uniform Cleaning & Sundries", costUsd: 80 }
  ],

  // Competitor Analysis Matrix in Homs
  competitors: [
    {
      name: "Chicago Burger (شيكاغو برغر)",
      location: "الوعر — بجوار حديقة الكواكبي",
      priceRangeUsd: "$5.80 – $6.80 (80,000 – 95,000 SYP)",
      concept: "برغر فاست فود أمريكي كلاسيكي بحجم كبير",
      strengths: "افتتاح ضخم، زخم إعلامي في الوعر، صالات جلوس عائلية",
      weaknesses: "خبز تقليدي غير مقرمش، طهي اللحم بشكل جاف، برغر سميك كلاسيكي وليس سماش برغر بطبقة كراميل مقرمشة",
      threatLevel: "متوسط إلى مرتفع"
    },
    {
      name: "Schizo Burger (سكيزو برغر)",
      location: "شارع الفرزدق / وسط المدينة",
      priceRangeUsd: "$4.50 – $6.00 (62,000 – 83,000 SYP)",
      concept: "برغر شبابي متنوع (سماش، شاورما برغر، إضافات شيتوس)",
      strengths: "تنوع خيارات الإضافات، شعبية بين الفئات الشبابية والطلابية",
      weaknesses: "قائمة طعام متضخمة وغير مركزة، استخدام صوصات جاهزة صناعية، هوية بصرية مبعثرة",
      threatLevel: "متوسط"
    },
    {
      name: "Delishis Fast Food (ديليشز)",
      location: "الدبلان — خلف حديقة الدبلان",
      priceRangeUsd: "$3.50 – $5.00 (48,000 – 69,000 SYP)",
      concept: "سناك فاست فود شامل (برغر دجاج، كرسبي، بطاطا)",
      strengths: "موقع مركزي مميز في الدبلان، خدمة توصيل واسعة",
      weaknesses: "غياب التميز النوعي، جودة خبز تجارية عادية، يعتمد على الأسعار وليس تجربة الذواقة",
      threatLevel: "منخفض إلى متوسط"
    },
    {
      name: "SUNA (سونا) — المقترح",
      location: "محيط الإنشاءات / امتداد الحمراء",
      priceRangeUsd: "$3.20 – $6.50 (44,000 – 90,000 SYP)",
      concept: "فود تراك متخصص ومركّز (سماش برغر مزدوج + أنتركوت باريسي + دجاج مقرمش)",
      strengths: "خبز بريوش حصري محمص، كراميل حواف السماش المقرمشة، لحم عجل طازج، تعبئة وتغليف تمنع الرطوبة، تسويق رقمي احترافي",
      weaknesses: "مساحة إنتاج محدودة داخل الشاحنة تتطلب كفاءة تشغيلية صارمة",
      threatLevel: "العلامة الرائدة الجديدة (Market Disruptor)"
    }
  ],

  // Risk Register & Mitigations
  risks: [
    {
      riskAr: "انقطاع الكهرباء وتذبذب شبكة الطاقة المحلية",
      riskEn: "Local power grid outages and fuel shortages",
      probability: "مرتفع جداً (High)",
      impact: "شديد (Severe)",
      mitigationAr: "الاعتماد الكامل على مولد ديزل كاتم 12 kVA مخصص مع نظام عاكس إنفرتر وبطاريات ليثيوم لتأمين خط التبريد والإضاءة لمدة 4 ساعات طارئة."
    },
    {
      riskAr: "تضخم أسعار المواد الأولية وتقلبات الليرة السورية",
      riskEn: "Raw ingredient inflation and currency fluctuations",
      probability: "مرتفع (High)",
      impact: "متوسط (Moderate)",
      mitigationAr: "تسعير المنتجات بهامش مساهمة مرن يتجاوز 52%، والربط العقدي الأسبوعي مع موردي لحوم ودواجن موثوقين بالدفع النقدي المسبق للحصول على حسومات."
    },
    {
      riskAr: "اختناق إنتاج الخبز داخل الشاحنة وتأثر الجودة",
      riskEn: "Bread production bottleneck inside the food truck",
      probability: "مرتفع (High)",
      impact: "حرج (Critical)",
      mitigationAr: "فصل خبيز البريوش والصب تماماً عن الشاحنة عبر اتفاقية حصرية مع مخبز حرفي في حمص بمواصفات سرية، أو استئجار غرفة تحضير منفصلة منخفضة التكلفة."
    },
    {
      riskAr: "اعتماد التسويق المفرط على شخص المؤسس ومقاطعه",
      riskEn: "Over-reliance on founder persona and content hype",
      probability: "متوسط (Moderate)",
      impact: "متوسط (Moderate)",
      mitigationAr: "تحويل الانتباه التسويقي من المشاهدات الشخصية إلى جودة المنتج وتجارب الزبائن الحقيقية (UGC)، وبناء علامة مؤسسية ذات استقلالية تامة."
    }
  ],

  // Kill Test Questions & Honest Investor Verdict
  killTest: {
    verdict: "CONDITIONAL INVEST — استثمار مشروط",
    badgeColor: "#C88E28",
    headlineAr: "مشروع واعد تجارياً شريطة عدم تقليص رأس المال وعدم خبز البريوش داخل الشاحنة",
    headlineEn: "Commercially viable subject to adequate capitalization ($24.8k) and off-truck baking",
    summaryAr: "فكرة سونا تمتلك فجوة سوقية حقيقية في حمص بفضل غياب البرغر السماش التخصصي وساندويش الأنتركوت الفاخر بسعر مدروس. ولكن الاستثمار يُعتبر عالي المخاطر وغير موصى به إذا تم حصر الميزانية في $10,000 فقط، أو إذا حاول الفريق تصنيع الخبز داخل المساحة الضيقة للشاحنة.",
    conditions: [
      {
        num: "01",
        titleAr: "تمويل كامل لا يقل عن 24,800 دولار",
        titleEn: "Minimum Capitalization of $24,800 USD",
        descAr: "أي محاولة لتقليص الميزانية دون $20,000 ستؤدي إلى شراء معدات تبريد أو توليد رديئة تسبب تلف اللحوم وتوقف العمل خلال أسابيع."
      },
      {
        num: "02",
        titleAr: "خَبز البريوش خارج الشاحنة",
        titleEn: "Out-of-Truck Bread Production",
        descAr: "حظر إدخال عجانات وأفران الخَبز داخل الشاحنة لتفادي غبار الطحين وحرارة الفرن الخانقة التي ستدمر كفاءة عمال خط الشواء."
      },
      {
        num: "03",
        titleAr: "تثبيت هامش ربح لا يقل عن 52%",
        titleEn: "Protecting Minimum 52% Contribution Margin",
        descAr: "مراجعة أسعار البيع بالليرة السورية كل أسبوعين لمواكبة تكاليف استيراد الزبدة والجبن ولحم العجل دون تآكل السيولة التشغيلية."
      }
    ]
  }
};
