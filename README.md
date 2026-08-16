# hasanoyounalsoud

الموقع التعريفي لحسن يونا السعود.

موقع ثابت بالكامل — بدون build، بدون npm، وبدون أي طلب لخادم خارجي.
افتح `index.html` بالمتصفح وبيشتغل.

## البنية

```
index.html        كل محتوى الصفحة (عربي/إنجليزي بنفس الملف)
css/style.css     كل التنسيق — نيلي #4C6EF5، أسود، أبيض
js/main.js        تبديل اللغة + الظهور التدريجي + حالة الهيدر
assets/logo.svg   المونوجرام (حرف H مرسوم بأشكال، مش نص)
assets/fonts/     خط Tajawal محمّل محليًا (٦ ملفات، ~٥٨ كيلوبايت)
.nojekyll         يمنع GitHub Pages من معالجة الملفات بـ Jekyll
```

## تعديل المحتوى

كل نص بالموقع مكتوب مرتين بنفس العنصر:

```html
<h3 data-ar="النص العربي" data-en="English text">النص العربي</h3>
```

- `data-ar` — النص العربي
- `data-en` — النص الإنجليزي
- النص اللي جوّا العنصر — هاد اللي بيظهر قبل ما يشتغل الجافاسكربت، فخليه مطابق لـ `data-ar`

يعني لو بدك تغيّر أي جملة، عدّلها **بثلاث أماكن**: `data-ar`، النص الداخلي، و`data-en`.

### روابط التواصل

بقسم `#contact` بآخر `index.html` — فوقه تعليق `<!-- ✏️ عدّل روابط التواصل من هون -->`.
حاليًا في رابط إيميل واحد. لإضافة واتساب أو لينكدإن أو إنستغرام، ضيف روابط جنبه بنفس
الشكل:

```html
<a class="btn btn-ghost" href="https://wa.me/9665XXXXXXXX">واتساب</a>
```

### إضافة مشروع جديد

انسخ بلوك `<article class="project">` كامل بقسم `#work` وعدّل نصوصه.

## النشر على GitHub Pages

من إعدادات الريبو: `Settings → Pages → Source: Deploy from a branch`، واختر
البرانش والمجلد `/ (root)`.

⚠️ GitHub Pages بيخلي المتصفح يخزّن الملفات ١٠ دقايق. فمع **كل** تعديل على CSS أو JS
لازم تزوّد رقم النسخة بـ `index.html`:

```bash
sed -i 's/?v=1"/?v=2"/g' index.html
```

بدون هاد ممكن يفتح HTML جديد مع CSS قديم والصفحة تطلع مكسورة.

## نقل المشروع لريبو مستقل

المشروع حاليًا ساكن بمجلد `hasanoyounalsoud/` جوّا ريبو `hasan` — مؤقتًا، لأنه ما كان
في صلاحية إنشاء ريبو جديد وقت البناء. المجلد مستقل بالكامل: ما بيستورد ولا ملف من برا،
فنقله ما بيكسر إشي.

لما ينفتح الريبو الجديد، في طريقتين:

**الأسهل — نسخ الملفات:**

```bash
git clone https://github.com/<USER>/hasanoyounalsoud.git
cp -r hasan/hasanoyounalsoud/. hasanoyounalsoud/
cd hasanoyounalsoud && git add -A && git commit -m "Initial site" && git push
```

**أو مع الحفاظ على تاريخ الكوميتات:**

```bash
git subtree split --prefix=hasanoyounalsoud -b site-only
git push https://github.com/<USER>/hasanoyounalsoud.git site-only:main
```

بالحالتين بيصير محتوى الريبو الجديد هاي الملفات بس، والمجلد بينحذف من `hasan` بعدها.
