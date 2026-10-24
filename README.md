# مملكة إيليت

موقع متعدد الصفحات مبني بـReact وTypeScript وVite. تعمل واجهات الإدارة عبر Netlify Functions؛ تُخزّن إعدادات الموقع العامة في Netlify Blobs، بينما تُحفظ بطاقات الصفحة وصورها كملفات في GitHub عبر GitHub REST API، دون قاعدة بيانات.

## التشغيل المحلي

1. ثبّت Node.js، ثم نفّذ `npm install`.
2. انسخ `.env.example` إلى `.env`، وغيّر كلمة مرور الإدارة والمفتاح السري إلى قيم محلية خاصة بك.
	لتجاوز شاشة الدخول أثناء التجربة المحلية فقط، أضف `ELITE_DEV_ADMIN_BYPASS=true` إلى `.env`؛ يعمل هذا الخيار مع Netlify Dev على `localhost` فقط.
3. لمعاينة الواجهة العامة فقط، نفّذ `npm run dev` وافتح العنوان الذي يعرضه Vite، عادة `http://localhost:5173`.
4. لاختبار تسجيل دخول لوحة الإدارة والحفظ والرفع، شغّل `npm run dev:netlify` وافتح `http://localhost:8888/admin.html`؛ تشغيل Vite وحده لا يشغّل واجهات الإدارة الخلفية.

يحاكي Netlify CLI مسارات API وإعدادات الدوال؛ تبقى البيانات المحلية منفصلة عن بيانات الموقع المنشور. يحتاج تسجيل الدخول إلى `ELITE_ADMIN_PASSWORD` و`ELITE_SESSION_SECRET`، ويتيح `ELITE_DEV_ADMIN_BYPASS=true` تجاوز كلمة المرور محليًا فقط. تتطلب عمليات البطاقات إعداد متغيرات GitHub المذكورة أدناه. استخدم `npm run build` للتحقق من TypeScript وإنشاء نسخة الإنتاج في `dist`.

## الإعدادات

- `ELITE_ADMIN_PASSWORD`: كلمة مرور لوحة الإدارة.
- `ELITE_SESSION_SECRET`: مفتاح عشوائي لا يقل عن 32 حرفًا لتوقيع جلسات الإدارة.
- `GITHUB_TOKEN`: Fine-grained Personal Access Token بصلاحية `Contents: Read and write` للمستودع.
- `GITHUB_OWNER`: اسم مستخدم GitHub أو المؤسسة المالكة للمستودع.
- `GITHUB_REPO`: اسم المستودع.
- `GITHUB_BRANCH`: الفرع الذي تُنشأ عليه commits (الافتراضي `main`).

يبقى ملف `.env` محليًا ولا يُرفع إلى GitHub. ضع كلمة المرور ومفتاح الجلسة والتوكن في بيئة Netlify أو في `.env` المحلي عند استخدام `npm run dev:netlify`. لا تستخدم بادئة `REACT_APP_` أو `VITE_` لهذه الأسرار؛ متغيرات الواجهة الأمامية تُضمّن في ملفات المتصفح ويمكن لأي زائر استخراجها. تسجيل الدخول والتحقق من CSRF يتمان في Netlify Function باستخدام جلسة `HttpOnly`.

## النشر عبر GitHub وNetlify

بعد نجاح الاختبارات المحلية، ارفع المشروع إلى GitHub ثم اربط المستودع بموقع Netlify. يقرأ Netlify إعداد البناء والنشر والدوال من `netlify.toml`، ويستخدم `npm run build` ومجلد `dist`. أضف `ELITE_ADMIN_PASSWORD` و`ELITE_SESSION_SECRET` و`GITHUB_TOKEN` و`GITHUB_OWNER` و`GITHUB_REPO` إلى متغيرات بيئة الموقع في Netlify ثم أعد النشر.

تُعرض البطاقات من `src/data/cards.json`. تتيح لوحة `/admin.html` إضافة البطاقات وتعديلها وحذفها؛ تحفظ التعديلات ملف JSON كـcommit في GitHub وترفع الصور إلى `public/images/`. يُنصح بتحديد صلاحية التوكن للمستودع المطلوب فقط.

يحفظ Netlify Blobs محتوى الموقع والصور دون قاعدة بيانات SQL. لا يحتاج التطوير المحلي إلى XAMPP.