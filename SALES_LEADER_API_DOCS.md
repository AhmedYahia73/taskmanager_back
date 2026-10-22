# 📚 Sales Module API Documentation — Leader Role (`leader_sales`)

> **ملاحظة للمطور**: هذا المستند يحتوي على توثيق كامل وشامل لجميع الـ Endpoints الخاصة بموديول المبيعات (Sales Module) المتاحة لدور قائد المبيعات (`leader_sales` / `leader` / `tester`).
> جميع الاستعلامات يتم تطبيق شرط الفريق عليها تلقائياً على مستوى الباك إند: `WHERE users.leader_id = current_user.id OR sales_id = current_user.id`.

---

## 🌐 1. القواعد العامة والـ Headers المشتركة (Global Headers & Base URL)

### Base URL:
- **Local Development**: `http://localhost:5000/api/admin/sales`
- **Production Server**: `https://taskitobcknd.wegostation.com/api/admin/sales`

### Headers المطلوبة في كل طلب:
| Header Name | Type | Description | Required |
|---|---|---|---|
| `Authorization` | `string` | توكن المصادقة بصيغة: `Bearer <JWT_TOKEN>` | **نعم** |
| `x-sales-project-id` | `string (UUID)` | معرف مشروع المبيعات المراد جلب بياناته | **نعم** (أو كـ query param `?sales_project_id=UUID`) |
| `Content-Type` | `string` | نوع البيانات المرسلة: `application/json` (أو `multipart/form-data` عند رفع صور) | **نعم** |

---

## 👥 2. إدارة مناديب المبيعات (Sales Representatives)
المسار الأساسي: `/api/admin/sales/sales`

### 2.1 جلب القوائم المنسدلة المساعدة (Dropdown Lists)
- **Method**: `GET`
- **Endpoint**: `/lists`
- **Query Parameters**:
  - `sales_project_id` *(optional)*: UUID معرف المشروع
- **سلوك الدور (`leader_sales`)**:
  - في حقل `leaders` يعيد الليدر نفسه فقط كقائد فريق متاح، ومشاريع المبيعات المسندة إليه، والتارجت الخاص بالمشروع.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "sales_projects": [
      { "id": "b6e09170-629f-49ea-9339-27d937412e12", "name": "Systego Main Project" }
    ],
    "targets": [
      { "id": "528e1d51-4091-49ea-b8ec-f5716bf963e1", "name": "Q4 Visits Target" }
    ],
    "leaders": [
      { "id": "a90df1a0-5cb2-4a0f-bd99-f2a89320b561", "name": "Leader Name", "phone": "01000000000" }
    ]
  }
}
```

---

### 2.2 جلب مناديب المبيعات التابعين لليدر (Get All Sales Reps)
- **Method**: `GET`
- **Endpoint**: `/`
- **Query Parameters**:
  - `page` *(number, default: 1)*: رقم الصفحة
  - `limit` *(number, default: 10)*: عدد العناصر
  - `search` *(string, optional)*: بحث بالاسم، البريد أو الهاتف
  - `sales_project_id` *(string, optional)*: فلترة بمشروع محدد
- **سلوك الدور (`leader_sales`)**:
  - يُجلب حصراً المناديب الذين يمتلكون `leader_id = current_user.id`.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "sales": [
      {
        "id": "e2c3d4f5-1111-2222-3333-444455556666",
        "name": "Ahmed Sales",
        "email": "ahmed.sales@systego.net",
        "phone": "01123456789",
        "image": "https://taskitobcknd.wegostation.com/uploads/SalesUsers/rep.jpg",
        "status": "active",
        "role": "sales",
        "leader_id": "a90df1a0-5cb2-4a0f-bd99-f2a89320b561",
        "leader_name": "Leader Name",
        "target_name": "Q4 Visits Target",
        "sales_projects": [
          { "id": "b6e09170-629f-49ea-9339-27d937412e12", "name": "Systego Main Project" }
        ],
        "createdAt": "2026-10-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 2.3 جلب بيانات مندوب محدد (Get Sales Rep By ID)
- **Method**: `GET`
- **Endpoint**: `/:id`
- **Path Parameters**:
  - `id`: UUID معرف المندوب
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "sales": {
      "id": "e2c3d4f5-1111-2222-3333-444455556666",
      "name": "Ahmed Sales",
      "email": "ahmed.sales@systego.net",
      "phone": "01123456789",
      "status": "active",
      "role": "sales",
      "leader_id": "a90df1a0-5cb2-4a0f-bd99-f2a89320b561"
    }
  }
}
```

---

### 2.4 إضافة مندوب مبيعات جديد لفريق الليدر (Create Sales Rep)
- **Method**: `POST`
- **Endpoint**: `/`
- **Content-Type**: `multipart/form-data` أو `application/json`
- **سلوك الدور**: يتم ربط المندوب تلقائياً بـ `leader_id = current_user.id` في حال عدم تمريره.
- **Request Body**:
```json
{
  "name": "Mahmoud Hassan",
  "email": "mahmoud@systego.net",
  "phone": "01098765432",
  "password": "Password123",
  "status": "active",
  "sales_project_ids": ["b6e09170-629f-49ea-9339-27d937412e12"],
  "target_id": "528e1d51-4091-49ea-b8ec-f5716bf963e1"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "message": "Sales Representative created successfully",
    "sales": { "id": "uuid-here", "name": "Mahmoud Hassan", "role": "sales" }
  }
}
```

---

### 2.5 تعديل بيانات مندوب (Update Sales Rep)
- **Method**: `PUT`
- **Endpoint**: `/:id`
- **Request Body**: (كل الحقول اختيارية)
```json
{
  "name": "Mahmoud Hassan Updated",
  "phone": "01098765433",
  "status": "active",
  "target_id": "528e1d51-4091-49ea-b8ec-f5716bf963e1"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "message": "Sales Representative updated successfully"
  }
}
```

---

### 2.6 حذف مندوب (Delete Sales Rep)
- **Method**: `DELETE`
- **Endpoint**: `/:id`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "message": "Sales Representative deleted successfully"
  }
}
```

---

## 📍 3. الزيارات الميدانية (Visits Module)
المسار الأساسي: `/api/admin/sales/visits`

### 3.1 جلب القوائم المنسدلة للزيارات (Lists)
- **Method**: `GET`
- **Endpoint**: `/lists`
- **سلوك الدور**: يعيد حالات الزيارات النشطة + قائمة مناديب المبيعات التابعين لهذا الليدر فقط بالإضافة لليدر نفسه.
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
      { "id": "sales-uuid-1", "name": "Ahmed Sales", "phone": "01123456789" }
    ]
  }
}
```

---

### 3.2 جلب الزيارات الميدانية (Get All Visits)
- **Method**: `GET`
- **Endpoint**: `/`
- **Query Parameters**:
  - `page` *(number, default: 1)*
  - `limit` *(number, default: 10)*
  - `search` *(string)*: بحث باسم العميل، الهاتف، أو اسم المندوب
  - `sales_id` *(UUID, optional)*: فلترة بمندوب محدد من أعضاء الفريق
  - `status_id` *(UUID, optional)*: فلترة بحالة الزيارة
  - `from` *(YYYY-MM-DD)*: تاريخ البدء
  - `to` *(YYYY-MM-DD)*: تاريخ الانتهاء
  - `year` *(string, e.g. "2026")* & `months` *(comma-separated, e.g. "01,02,03")*
- **سلوك الدور (`leader_sales`)**:
  - يعيد الزيارات حيث `status = 'visit'` وتكون مسجلة بواسطة الليدر نفسه أو أحد أعضاء فريقه (`users.leader_id = leader.id`).
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "allVisits": [
      {
        "id": "visit-uuid-1",
        "name": "Tech Corp",
        "owner_name": "Tamer Hosny",
        "owner_phone": "01234567890",
        "phone": "01234567890",
        "address": "Nasr City, Cairo",
        "lat": 30.0444,
        "lng": 31.2357,
        "notes": "Interested in ERP system",
        "status": "visit",
        "status_id": "status-uuid-1",
        "status_name": "Negotiation",
        "sales_id": "sales-uuid-1",
        "sales": "Ahmed Sales",
        "points": 0,
        "products": [
          { "product_id": "prod-1", "product_name": "Cloud ERP", "duration": "1 Year" }
        ],
        "product": "Cloud ERP (1 Year)",
        "createdAt": "2026-10-20T11:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 12,
      "page": 1,
      "limit": 10,
      "totalPages": 2
    }
  }
}
```

---

### 3.3 إنشاء زيارة جديدة (Create Visit)
- **Method**: `POST`
- **Endpoint**: `/`
- **سلوك الدور**: يمكن لليدر تسجيل الزيارة باسمه أو إسنادها لأحد أعضاء فريقه عبر `sales_id`.
- **Request Body**:
```json
{
  "name": "Al-Amal Hospital",
  "owner_name": "Dr. Mohamed",
  "owner_phone": "01011112222",
  "phone": "01011112222",
  "address": "Dokki, Giza",
  "lat": 30.0381,
  "lng": 31.2118,
  "notes": "Follow up next Tuesday",
  "status_id": "status-uuid-1",
  "sales_id": "sales-uuid-1",
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
- **Path Parameters**:
  - `id`: UUID الزيارة

---

### 3.5 تعديل زيارة (Update Visit)
- **Method**: `PUT`
- **Endpoint**: `/:id`
- **Request Body**: نفس حقول الـ Create (اختيارية).
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
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "message": "Visit deleted successfully"
  }
}
```

---

## 💼 4. العمليات والصفقات المغلقة (Closed Deals / Sales)
المسار الأساسي: `/api/admin/sales/visits/sales`

### 4.1 جلب الصفقات المغلقة (Get All Sales Deals)
- **Method**: `GET`
- **Endpoint**: `/sales`
- **Query Parameters**:
  - نفس معايير استعلام الزيارات (`page`, `limit`, `search`, `sales_id`, `status_id`, `from`, `to`, `year`, `months`).
- **سلوك الدور (`leader_sales`)**:
  - يعيد العمليات حيث `status != 'visit'` (مثل `sales` أو `delivered`) الخاصة بفريق الليدر، مع حساب نقاط التارجت المكتسبة (`points`).
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "allVisits": [
      {
        "id": "deal-uuid-1",
        "name": "Smart Solutions LLC",
        "owner_name": "Eng. Khaled",
        "owner_phone": "01199998888",
        "phone": "01199998888",
        "address": "New Cairo",
        "status": "delivered",
        "status_name": "Delivered",
        "sales": "Ahmed Sales",
        "points": 50,
        "product": "CRM Enterprise (2 Years)",
        "createdAt": "2026-10-18T14:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 8,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 4.2 ملخص وإحصائيات الزيارات والمبيعات (Visits Counts & Report)
- **Method**: `GET`
- **Endpoint**: `/counts`
- **Query Parameters**:
  - `sales_id` *(optional)*
  - `status_id` *(optional)*
  - `search` *(optional)*
  - `from` & `to` *(optional)*
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "visitCount": 15,
    "salesCount": 7,
    "total": 22,
    "wishListsCount": 4,
    "leadsCount": 11
  }
}
```

---

## 🎯 5. العملاء المحتملين (Leads Module)
المسار الأساسي: `/api/admin/sales/leads`

### 5.1 جلب القوائم المنسدلة للعملاء المحتملين (Lists)
- **Method**: `GET`
- **Endpoint**: `/lists`
- **Response (200 OK)**:
  - يعيد مناديب الفريق التابعين لليدر + المنتجات وحالات الزيارات.

---

### 5.2 جلب جميع العملاء المحتملين (Get All Leads)
- **Method**: `GET`
- **Endpoint**: `/`
- **سلوك الدور (`leader_sales`)**:
  - يتم استرجاع الـ Leads الخاصة بالليدر أو مناديب فريقه حصراً مع رابط خرائط جوجل (`map_link`).
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "allLeads": [
      {
        "id": "lead-uuid-1",
        "name": "Delta Trade",
        "phone": "01033334444",
        "place_name": "Store Branch 1",
        "place_phone": "0225555666",
        "address": "Alexandria, Smouha",
        "lat": 31.2001,
        "lng": 29.9187,
        "sales": "Ahmed Sales",
        "sales_phone": "01123456789",
        "product": "POS Retail (1 Year)",
        "map_link": "https://www.google.com/maps/search/?api=1&query=31.2001,29.9187",
        "createdAt": "2026-10-21T09:00:00.000Z"
      }
    ]
  }
}
```

---

### 5.3 إنشاء عميل محتمل جديد (Create Lead)
- **Method**: `POST`
- **Endpoint**: `/`
- **Request Body**:
```json
{
  "name": "Al-Nour Clinic",
  "phone": "01044445555",
  "sales_id": "sales-uuid-1",
  "place_name": "Main Clinic",
  "place_phone": "0237777888",
  "lat": 30.0131,
  "lng": 31.2089,
  "address": "Giza Square",
  "notes": "Needs medical management software",
  "products": [
    { "product_id": "prod-uuid-medical", "duration": "1 Year" }
  ]
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "message": "Lead created successfully",
    "lead": { "id": "lead-uuid-new", "name": "Al-Nour Clinic" }
  }
}
```

---

### 5.4 تحويل عميل محتمل إلى زيارة ميدانية (Convert Lead to Visit)
- **Method**: `POST`
- **Endpoint**: `/:id/convert`
- **Path Parameters**: `id` (معرف الـ Lead)
- **Request Body**:
```json
{
  "status_id": "status-uuid-negotiation",
  "products": [
    { "product_id": "prod-uuid-medical", "duration": "1 Year" }
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

## 📋 6. قائمة الرغبات (Wish List Module)
المسار الأساسي: `/api/admin/sales/wishlist` (أو `/api/admin/sales/wish_list`)

### 6.1 جلب القوائم المنسدلة للـ WishList (Lists)
- **Method**: `GET`
- **Endpoint**: `/lists`

---

### 6.2 جلب جميع عناصر الـ Wish List
- **Method**: `GET`
- **Endpoint**: `/`
- **Query Parameters**:
  - `page` *(number)*, `limit` *(number)*, `search` *(string)*, `sales_id` *(UUID)*
- **سلوك الدور (`leader_sales`)**:
  - جلب الـ WishLists التابعة لفريق الليدر فقط.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "WishLists": [
      {
        "id": "wish-uuid-1",
        "name": "Prospective Mall Client",
        "description": "Met at Cairo Tech Expo, wants demo",
        "sales_id": "sales-uuid-1",
        "sales": "Ahmed Sales",
        "createdAt": "2026-10-19T08:00:00.000Z"
      }
    ],
    "pagination": { "total": 3, "page": 1, "limit": 10, "totalPages": 1 }
  }
}
```

---

### 6.3 إنشاء WishList جديدة (Create WishList)
- **Method**: `POST`
- **Endpoint**: `/`
- **Request Body**:
```json
{
  "name": "Al-Ahram Logistics",
  "description": "Wants quotation for fleet tracking system",
  "sales_id": "sales-uuid-1"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "message": "WishList created successfully"
  }
}
```

---

### 6.4 تحويل WishList إلى زيارة ميدانية (Convert WishList to Visit)
- **Method**: `POST`
- **Endpoint**: `/:id/convert`
- **Path Parameters**: `id` (معرف الـ WishList)
- **Request Body**:
```json
{
  "address": "Industrial Zone, 6th of October",
  "lat": 29.9366,
  "lng": 30.9276,
  "phone": "01066667777",
  "owner_name": "Hassan Allam",
  "owner_phone": "01066667777",
  "notes": "First meeting on site",
  "status_id": "status-uuid-negotiation",
  "products": [
    { "product_id": "prod-uuid-fleet", "duration": "1 Year" }
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

## 📊 7. لوحة التحكم والإحصائيات (Sales Dashboard)
المسار الأساسي: `/api/admin/sales/dashboard`

### 7.1 عرض إحصائيات الأداء (View Dashboard)
- **Method**: `GET` أو `POST`
- **Endpoint**: `/`
- **Query Parameters**:
  - `from` *(string, YYYY-MM-DD)*: تاريخ بداية النطاق
  - `to` *(string, YYYY-MM-DD)*: تاريخ نهاية النطاق
- **سلوك الدور (`leader_sales`)**:
  - تحسب جميع الأرقام بناءً على زيارات ومبيعات أعضاء فريق الليدر فقط + التارجت المسند إليهم.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "allVisitStatuss": [
      { "id": "status-1", "name": "Negotiation", "count": 14 },
      { "id": "status-2", "name": "Sales", "count": 5 },
      { "id": "status-3", "name": "Delivered", "count": 3 }
    ],
    "negotiation": 14,
    "sales": 5,
    "delivered": 3,
    "targetAchievedSales": 8,
    "targetAchievedVisits": 14,
    "targetAchievedPoints": 240,
    "total_visits_target": 30,
    "total_sales_target": 12,
    "total_points_target": 400
  }
}
```

---

## 🔔 8. طلبات تغيير الحالة (Status Change Requests)
المسار الأساسي: `/api/admin/sales/status_requests` (أو `/api/admin/sales/requests`)

عندما يقوم المندوب بطلب تغيير حالة زيارة إلى (Sales أو Delivered)، يصل الطلب لليدر لمراجعته واعتماده.

### 8.1 جلب الطلبات المعلقة (Pending Requests)
- **Method**: `GET`
- **Endpoint**: `/pending`
- **Query Parameters**: `page`, `limit`, `search`
- **سلوك الدور (`leader_sales`)**:
  - يعيد الطلبات المقدمة من مناديب فريق هذا الليدر حصراً.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "pendingRequests": [
      {
        "id": "request-uuid-1",
        "user_name": "Ahmed Sales",
        "user_phone": "01123456789",
        "visit_name": "Al-Salam Hospital",
        "from": "visit",
        "to": "sales",
        "status": "pending",
        "createdAt": "2026-10-22T10:00:00.000Z"
      }
    ],
    "pagination": { "totalItems": 1, "totalPages": 1 }
  }
}
```

---

### 8.2 جلب سجل الطلبات السابقة (History Requests)
- **Method**: `GET`
- **Endpoint**: `/history`
- **Response (200 OK)**:
  - يعيد الطلبات التي تم اتخاذ قرار فيها (`approved` أو `rejected`).

---

### 8.3 اتخاذ قرار في الطلب (Approve / Reject Request)
- **Method**: `PUT`
- **Endpoint**: `/status/:id`
- **Path Parameters**: `id` (معرف الطلب)
- **Request Body**:
```json
{
  "status": "approve" // أو "reject"
}
```
- **سلوك النظام عند الموافقة (`approve`)**:
  - يتم تحديث حالة الزيارة المرتبطة إلى الحالة المطلوبة (`to`).
  - في حال كانت الحالة `sales` أو `delivered` يتم احتساب نقاط المنتجات وإضافتها إلى `visits.points` تلقائياً.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "message": "Status updated successfully"
  }
}
```

---

## 🎯 9. إدارة أهداف المبيعات (Targets Module)
المسار الأساسي: `/api/admin/sales/target` (أو `/api/admin/sales/targets`)

### 9.1 جلب المناديب المؤهلين للتارجت (Target Lists)
- **Method**: `GET`
- **Endpoint**: `/lists`
- **سلوك الدور (`leader_sales`)**: يعيد مناديب فريقه فقط.

---

### 9.2 جلب جميع التارجت (Get All Targets)
- **Method**: `GET`
- **Endpoint**: `/` (مع إمكانية الفلترة بنوع التارجت `?type=visit` أو `sales` أو `points`)

---

### 9.3 إنشاء تارجت جديد (Create Target)
- **Method**: `POST`
- **Endpoint**: `/`
- **Request Body**:
```json
{
  "name": "Q4 Visits Team Target",
  "type": "visit", // 'visit' | 'sales' | 'points'
  "items": [
    { "year": 2026, "month": 10, "number": 30 },
    { "year": 2026, "month": 11, "number": 35 },
    { "year": 2026, "month": 12, "number": 40 }
  ],
  "sales": [
    "sales-uuid-1",
    "sales-uuid-2"
  ]
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "target-uuid-new",
    "message": "Target along with items and sales assigned successfully"
  }
}
```

---

## 📦 10. القوائم المرجعية المساندة (Supporting Reference Lists)

### 10.1 قائمة المنتجات المتاحة (Products)
- **Method**: `GET`
- **Endpoint**: `/api/admin/sales/products`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "allProducts": [
      {
        "id": "prod-1",
        "name": "ERP Cloud System",
        "description": "Comprehensive ERP package",
        "points": [
          { "duration": "6 Months", "point": 25 },
          { "duration": "1 Year", "point": 50 }
        ]
      }
    ]
  }
}
```

---

### 10.2 حالات الزيارات المتاحة (Visit Statuses)
- **Method**: `GET`
- **Endpoint**: `/api/admin/sales/visit_status`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "visit_status": [
      { "id": "st-1", "name": "Negotiation", "status": true },
      { "id": "st-2", "name": "Sales", "status": true },
      { "id": "st-3", "name": "Delivered", "status": true }
    ]
  }
}
```

---

## ⚠️ 11. هيكل رسائل الخطأ القياسية (Standard Error Responses)

في حال حدوث خطأ في التحقق أو الصلاحيات، يرسل الباك إند الرد بالصيغة الموحدة:

### خطأ تحقق من البيانات (400 Bad Request):
```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Phone number is too short"
  }
}
```

### خطأ عدم تمرير مشروع المبيعات (400 Bad Request):
```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Sales Project ID is required. Please select a sales project."
  }
}
```

### خطأ عدم امتلاك صلاحية على المورد (403 Forbidden):
```json
{
  "success": false,
  "error": {
    "code": 403,
    "message": "You Must Login as Admin or Sales Leader"
  }
}
```
