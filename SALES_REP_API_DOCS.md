# 📚 Sales Module API Documentation — Sales Representative Role (`sales` )

> **ملاحظة للمطور**: هذا المستند يحتوي على توثيق كامل وشامل لجميع الـ Endpoints والعمليات الخاصة بمندوب المبيعات (`sales` أ في نظام مبيعات Taskito).
> يتم تطبيق شرط الحصر الشخصي تلقائياً على مستوى الباك إند: `WHERE sales_id = user.id` (بحيث يرى المندوب ويدير بياناته الخاصة فقط).

---

## 🌐 1. القواعد العامة والـ Headers المشتركة (Global Headers & Base URL)

### Base URL:
- **Local Development**: `http://localhost:5000/api/admin/sales`
- **Production Server**: `https://taskitobcknd.wegostation.com/api/admin/sales`

### Headers المطلوبة في كل طلب:
| Header Name | Type | Description | Required |
|---|---|---|---|
| `Authorization` | `string` | توكن تسجيل الدخول: `Bearer <JWT_TOKEN>` | **نعم** |
| `x-sales-project-id` | `string (UUID)` | معرف مشروع المبيعات المراد جلب بياناته | **نعم** (أو كـ query param `?sales_project_id=UUID`) |
| `Content-Type` | `string` | `application/json` (أو `multipart/form-data` عند رفع صور) | **نعم** |

---

## 📊 2. لوحة تحكم المندوب ومؤشرات الأداء (Personal Sales Dashboard)
المسار الأساسي: `/api/admin/sales/dashboard`

### 2.1 عرض إحصائيات الأداء والتارجت الشخصي (View Personal Dashboard)
- **Method**: `GET` أو `POST`
- **Endpoint**: `/`
- **Query Parameters**:
  - `from` *(string, YYYY-MM-DD, optional)*: تاريخ بداية الفلترة
  - `to` *(string, YYYY-MM-DD, optional)*: تاريخ نهاية الفلترة
- **سلوك الدور (`sales` )**:
  - يتم استرجاع إحصائيات الزيارات والمبيعات الخاصة بالمندوب فقط (`sales_id = user.id`).
  - يتم مقارنة الإنجاز بالأهداف الشخصية المحددة للمندوب في جدول التارجت (`target_sales.user_id = user.id`).
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "allVisitStatuss": [
      { "id": "status-1", "name": "Negotiation", "count": 6 },
      { "id": "status-2", "name": "Sales", "count": 2 },
      { "id": "status-3", "name": "Delivered", "count": 1 }
    ],
    "negotiation": 6,
    "sales": 2,
    "delivered": 1,
    "targetAchievedSales": 3,
    "targetAchievedVisits": 6,
    "targetAchievedPoints": 100,
    "total_visits_target": 15,
    "total_sales_target": 5,
    "total_points_target": 150
  }
}
```

---

## 📍 3. الزيارات الميدانية الشخصية (Visits Module)
المسار الأساسي: `/api/admin/sales/visits`

### 3.1 جلب القوائم المنسدلة للزيارات (Lists)
- **Method**: `GET`
- **Endpoint**: `/lists`
- **سلوك الدور**:
  - يعيد حالات الزيارات النشطة + حقل `sales` يحتوي على المندوب نفسه فقط (لا يرى زملاءه).
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "visit_status": [
      { "id": "status-uuid-1", "name": "Negotiation" },
      { "id": "status-uuid-2", "name": "Sales" },
      { "id": "status-uuid-3", "name": "Delivered" }
    ],
    "sales": [
      { "id": "my-user-uuid", "name": "My Name", "phone": "01012345678" }
    ]
  }
}
```

---

### 3.2 جلب زيارات المندوب الميدانية (Get My Visits)
- **Method**: `GET`
- **Endpoint**: `/`
- **Query Parameters**:
  - `page` *(number, default: 1)*
  - `limit` *(number, default: 10)*
  - `search` *(string)*: بحث باسم العميل أو هاتفه
  - `status_id` *(UUID, optional)*: فلترة بحالة الزيارة
  - `from` *(YYYY-MM-DD)* & `to` *(YYYY-MM-DD)*
  - `year` *(string)* & `months` *(comma-separated)*
- **سلوك الدور**: يعيد حصراً الزيارات المسجلة بواسطة المندوب (`visits.sales_id = user.id`) والتي حالتها الحالية `status = 'visit'`.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "allVisits": [
      {
        "id": "visit-uuid-1",
        "name": "Al-Safwa Dental Clinic",
        "owner_name": "Dr. Tarek",
        "owner_phone": "01001234567",
        "phone": "01001234567",
        "address": "Nasr City, Cairo",
        "lat": 30.0561,
        "lng": 31.3301,
        "notes": "Discussed Cloud Solution package",
        "status": "visit",
        "status_name": "Negotiation",
        "points": 0,
        "product": "Dental Management System (1 Year)",
        "createdAt": "2026-10-21T11:00:00.000Z"
      }
    ],
    "pagination": { "total": 6, "page": 1, "limit": 10, "totalPages": 1 }
  }
}
```

---

### 3.3 تسجيل زيارة ميدانية جديدة (Create Visit)
- **Method**: `POST`
- **Endpoint**: `/`
- **سلوك الدور**: يتم تثبيت `sales_id = user.id` تلقائياً ولا يمكن إسنادها لمندوب آخر.
- **Request Body**:
```json
{
  "name": "Cairo Scan Lab",
  "owner_name": "Dr. Ayman",
  "owner_phone": "01234567890",
  "phone": "01234567890",
  "address": "Maadi, Cairo",
  "lat": 29.9602,
  "lng": 31.2569,
  "notes": "Demo scheduled for next Monday",
  "status_id": "status-uuid-negotiation",
  "products": [
    { "product_id": "prod-uuid-1", "duration": "1 Year" }
  ]
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "message": "Visits created successfully"
  }
}
```

---

### 3.4 تفاصيل زيارة محددة (Get Visit By ID)
- **Method**: `GET`
- **Endpoint**: `/:id`
- **سلوك الدور**: محمي؛ لا يمكن للمندوب استعراض زيارة لا تخصه (يُرفض بـ 400 Bad Request).

---

### 3.5 تعديل زيارة أو طلب تغيير حالتها (Update Visit / Request Status Change)
- **Method**: `PUT`
- **Endpoint**: `/:id`
- **سلوك الدور المهم**:
  - إذا تم تعديل بيانات عادية (الاسم، العنوان، الهاتف، الملاحظات) يتم التحديث مباشرة.
  - إذا تم إرسال `status: "sales"` أو `status: "delivered"`، **لا يتم تغيير الحالة فوراً**؛ بل ينشئ النظام تلقائياً طلب تغيير حالة `statusRequest` بحالة `pending` ليصل إلى قائد الفريق (Team Leader) لاعتماده وتوزيع النقاط.
- **Request Body**:
```json
{
  "name": "Cairo Scan Lab - Updated",
  "status": "sales",
  "products": [
    { "product_id": "prod-uuid-1", "duration": "1 Year" }
  ]
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "message": "Visit updated successfully"
  }
}
```

---

### 3.6 حذف زيارة (Delete Visit)
- **Method**: `DELETE`
- **Endpoint**: `/:id`
- **سلوك الدور**: يحذف الزيارة فقط إذا كانت مسجلة باسم المندوب.

---

## 💼 4. العمليات والصفقات المغلقة (My Closed Deals)
المسار الأساسي: `/api/admin/sales/visits/sales`

### 4.1 جلب الصفقات المكتملة والمبيعات (Get My Closed Deals)
- **Method**: `GET`
- **Endpoint**: `/sales`
- **سلوك الدور**: يعيد حصراً الزيارات الخاصة بالمندوب التي تحولت إلى صفقات بيع ناجحة (`status = 'sales'` أو `'delivered'`) بعد اعتمادها، مع النقاط المحتسبة المضافة لرصيد المندوب (`points`).
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "allVisits": [
      {
        "id": "deal-uuid-1",
        "name": "Elite Pharmacy",
        "phone": "01099998888",
        "address": "Zamalek, Cairo",
        "status": "delivered",
        "status_name": "Delivered",
        "points": 50,
        "product": "Pharmacy ERP (1 Year)",
        "createdAt": "2026-10-18T10:00:00.000Z"
      }
    ],
    "pagination": { "total": 3, "page": 1, "limit": 10, "totalPages": 1 }
  }
}
```

---

## 🎯 5. العملاء المحتملين (My Leads)
المسار الأساسي: `/api/admin/sales/leads`

### 5.1 جلب القوائم المنسدلة للعملاء المحتملين
- **Method**: `GET`
- **Endpoint**: `/lists`

---

### 5.2 جلب جميع العملاء المحتملين للمندوب (Get My Leads)
- **Method**: `GET`
- **Endpoint**: `/`
- **سلوك الدور**: يعيد حصراً العملاء المحتملين التابعين للمندوب مع رابط موقع العميل على خرائط جوجل (`map_link`).
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "allLeads": [
      {
        "id": "lead-uuid-1",
        "name": "Nile Supermarket",
        "phone": "01155556666",
        "place_name": "Branch 2",
        "address": "Dokki, Giza",
        "lat": 30.0381,
        "lng": 31.2118,
        "product": "POS Retail (1 Year)",
        "map_link": "https://www.google.com/maps/search/?api=1&query=30.0381,31.2118",
        "createdAt": "2026-10-21T15:00:00.000Z"
      }
    ]
  }
}
```

---

### 5.3 إضافة عميل محتمل جديد (Create Lead)
- **Method**: `POST`
- **Endpoint**: `/`
- **سلوك الدور**: يتم ربط العميل بالمندوب الحالي تلقائياً.
- **Request Body**:
```json
{
  "name": "Al-Hoda Optics",
  "phone": "01077778888",
  "address": "Haram, Giza",
  "lat": 29.9981,
  "lng": 31.1895,
  "notes": "Looking for optical store billing system",
  "products": [
    { "product_id": "prod-uuid-optics", "duration": "1 Year" }
  ]
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "message": "Lead created successfully",
    "lead": { "id": "new-lead-uuid", "name": "Al-Hoda Optics" }
  }
}
```

---

### 5.4 تحويل العميل المحتمل إلى زيارة ميدانية (Convert Lead to Visit)
- **Method**: `POST`
- **Endpoint**: `/:id/convert`
- **Request Body**:
```json
{
  "status_id": "status-uuid-negotiation",
  "products": [
    { "product_id": "prod-uuid-optics", "duration": "1 Year" }
  ]
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "message": "Lead converted to visit successfully",
    "visitId": "new-visit-uuid"
  }
}
```

---

## 📋 6. قائمة الرغبات الشخصية (My Wish List)
المسار الأساسي: `/api/admin/sales/wishlist` (أو `/api/admin/sales/wish_list`)

### 6.1 جلب عناصر قائمة الرغبات الخاصة بالمندوب
- **Method**: `GET`
- **Endpoint**: `/`
- **سلوك الدور**: جلب الـ WishLists حيث `sales_id = user.id`.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "WishLists": [
      {
        "id": "wish-uuid-1",
        "name": "Al-Shorouk Printing Press",
        "description": "Expressed interest during phone call",
        "createdAt": "2026-10-19T12:00:00.000Z"
      }
    ],
    "pagination": { "total": 2, "page": 1, "limit": 10, "totalPages": 1 }
  }
}
```

---

### 6.2 إنشاء عنصر جديد في قائمة الرغبات (Create WishList)
- **Method**: `POST`
- **Endpoint**: `/`
- **Request Body**:
```json
{
  "name": "Al-Shorouk Printing Press",
  "description": "Requires industrial inventory software quotation"
}
```

---

### 6.3 تحويل عنصر قائمة الرغبات إلى زيارة ميدانية (Convert WishList to Visit)
- **Method**: `POST`
- **Endpoint**: `/:id/convert`
- **Path Parameters**: `id`
- **Request Body**:
```json
{
  "address": "Industrial Zone B, Obour City",
  "lat": 30.2211,
  "lng": 31.4729,
  "phone": "01088889999",
  "owner_name": "Eng. Essam",
  "owner_phone": "01088889999",
  "status_id": "status-uuid-negotiation",
  "products": [
    { "product_id": "prod-uuid-inventory", "duration": "1 Year" }
  ]
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "message": "WishList converted to visit successfully"
  }
}
```

---

## 📦 7. المنتجات وحالات الزيارات المتاحة (Reference Lists)

### 7.1 قائمة المنتجات ونقاطها
- **Method**: `GET`
- **Endpoint**: `/api/admin/sales/products`

### 7.2 حالات الزيارات المعتمدة
- **Method**: `GET`
- **Endpoint**: `/api/admin/sales/visit_status`
