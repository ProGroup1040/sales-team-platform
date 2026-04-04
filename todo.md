# Sales Dashboard - TODO

## قاعدة البيانات والـ Backend
- [x] تصميم schema لجداول: customers, products, sales, sale_items
- [x] إنشاء migration SQL وتطبيقها
- [x] إضافة query helpers في server/db.ts
- [x] بناء tRPC routers: dashboard, sales, customers, products
- [x] إنشاء بيانات تجريبية (seed data)

## واجهة المستخدم
- [x] تصميم الألوان والـ theme في index.css (أسلوب أنيق داكن/فاتح)
- [x] تحديث App.tsx بالمسارات والـ DashboardLayout
- [x] صفحة Dashboard الرئيسية مع KPI cards
- [x] رسوم بيانية تفاعلية (Recharts): المبيعات عبر الزمن، توزيع المنتجات
- [x] صفحة إدارة المبيعات مع جدول وتصفية وبحث
- [x] صفحة إدارة العملاء (CRUD كامل)
- [x] صفحة إدارة المنتجات مع المخزون والأسعار
- [x] نظام تسجيل الدخول والصلاحيات

## الاختبارات
- [x] كتابة Vitest tests للـ routers الرئيسية
- [x] التحقق من عمل جميع الصفحات

## التسليم
- [ ] حفظ checkpoint نهائي
- [ ] تسليم النتيجة للمستخدم
