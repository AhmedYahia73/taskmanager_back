# 📙 Taskito API Documentation — Engineer Role (`auth engineer`)

توثيق كامل ودقيق لواجهات برمجة التطبيقات (APIs) المخصصة لصلاحية **المهندس / الموظف (Engineer / Employee)** في نظام Taskito.

---

## 🛡️ ضوابط وقواعد صلاحية المهندس (Business Rules & Permissions)

> [!IMPORTANT]
> يرجى الانتباه للشروط الصارمة المطبقة في السيرفر على صلاحية الـ Engineer:
> 1. **العمليات المحظورة (Forbidden - 403):**
>    * غير مسموح بإنشاء أو تعديل المشاريع (`POST/PUT /api/admin/project`).
>    * غير مسموح بإنشاء أو تعديل المجموعات (`POST/PUT /api/admin/projectGroup`).
>    * غير مسموح بنشر أو تعديل أو حذف ملاحظات اللوحة (`POST/PUT/DELETE /api/admin/notesBoard`).
> 2. **تحديد النطاق التلقائي (Self-Scoping Data):**
>    * عند طلب المهام (`/tasks`, `pendingTasks`, `delayTasks`, `todayTasks`)، يقوم النظام تلقائياً بتصفية النتائج وإرجاع المهام المسندة لهذا المهندس حصراً (`tasks.user_id = req.user.id`).
>    * عند طلب المشاريع (`/project`)، تظهر فقط المشاريع التي عُيّن فيها المهندس كعضو فريق.
> 3. **صلاحية تحديث المهام (`PUT /tasks/:id`):**
>    * مسموح بتحديث الحالة إلى قيد العمل (`inprogress`) أو منجزة ومسلمة للمراجعة (`done`) ورفع التوثيق `documentation`.
>    * **ممنوع قطعياً وضع الحالة `approve` (اعتماد) أو `edit` (طلب تعديل)** — السيرفر سيرجع كود `403 Forbidden`.
>    * **المهمة المعتمدة بالفعل (`status = 'approve'`) لا يمكن للمهندس تعديلها أبداً** — السيرفر سيرجع كود `403 Forbidden`.

---

## 🌐 الإعدادات العامة (General Config)

* **Base URL:** `https://taskitobcknd.wegostation.com`
* **المصادقة (Authentication):**
  ```http
  Authorization: Bearer <ENGINEER_JWT_TOKEN>
  ```
* **صيغة البيانات (Content-Type):**
  * افتراضياً: `Content-Type: application/json`
  * عند رفع ملفات التوثيق: `Content-Type: multipart/form-data`

---

## 📑 فهرس الـ APIs
1. [لوحة التحكم الشخصية (Personal Dashboard & Points)](#1-لوحة-التحكم-الشخصية-personal-dashboard--points)
2. [استعراض المشاريع والمجموعات (My Projects & Groups)](#2-استعراض-المشاريع-والمجموعات-my-projects--groups)
3. [متابعة وتسليم المهام (My Tasks)](#3-متابعة-وتسليم-المهام-my-tasks)
4. [الحضور والانصراف والطلبات الذاتية (Attendance & HR Requests)](#4-الحضور-والانصراف-والطلبات-الذاتية-attendance--hr-requests)

---

## 1. لوحة التحكم الشخصية (Personal Dashboard & Points)

### 1.1 إحصائيات لوحة المهندس — Personal Dashboard Stats
* **الوصف:** جلب إحصائيات المهام الخاصة بالمهندس الحالي (مهامه المعلقة، المنجزة، المعتمدة، مهام اليوم المسندة إليه).
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/dashboard`
* **Headers:**
  ```http
  Authorization: Bearer <TOKEN>
  Accept: application/json
  ```
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "pending_tasks": 4,
    "all_projects": 0,
    "delay_tasks": 1,
    "engineers_count": 8,
    "done_tasks": 3,
    "approve_tasks": 12,
    "total_tasks": 19,
    "today_tasks": 2,
    "all_today_tasks": 3,
    "today_done_tasks": 1,
    "today_approve_tasks": 0
  }
}
```

---

### 1.2 نقاط الإنجاز الخاصة بالمهندس — Personal Points Chart
* **الوصف:** جلب إجمالي النقاط المحققة للمهندس مع تفصيل شهري للعام المحدد.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/dashboard/points-chart`
* **Query Parameters:**
  * `year` *(number, اختياري)*: مثال `2026`
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "totalPointsAllTime": 140,
    "selectedYearPoints": [
      { "month": 1, "total_points": 20 },
      { "month": 2, "total_points": 35 },
      { "month": 3, "total_points": 15 },
      { "month": 4, "total_points": 40 },
      { "month": 5, "total_points": 0 },
      { "month": 6, "total_points": 0 },
      { "month": 7, "total_points": 0 },
      { "month": 8, "total_points": 0 },
      { "month": 9, "total_points": 0 },
      { "month": 10, "total_points": 0 },
      { "month": 11, "total_points": 0 },
      { "month": 12, "total_points": 0 }
    ]
  }
}
```

---

### 1.3 مسميات الأدوار ومعلومات الشركة العامة
* `GET /api/admin/dashboard/usersName`: جلب مسميات الأدوار باللغة المفعلة.
* `GET /api/admin/auth/settings/names`: جلب أسماء تبويبات المستخدم والليدر.
* `GET /api/admin/company`: جلب الملف العام للشركة وشعارها.

---

## 2. استعراض المشاريع والمجموعات (My Projects & Groups)

### 2.1 المشاريع المسندة للمهندس — Get My Projects
* **الوصف:** استعراض المشاريع التي عُيّن فيها المهندس فقط، مع نسبة إنجاز مهامه.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/project`
* **Query Parameters:**
  * `page` *(number, افتراضي 1)*
  * `limit` *(number, افتراضي 9)*
  * `search` *(string, اختياري)*
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "77e05bb5-d4f0-4264-94fa-5195b8e2c566",
        "name": "Taskito Management System",
        "description": "Internal enterprise task tracking tool",
        "documentation": "https://taskitobcknd.wegostation.com/uploads/projects/doc.pdf",
        "logo": "https://taskitobcknd.wegostation.com/uploads/projects/logo.png",
        "createdAt": "2026-01-10T12:00:00.000Z",
        "tester_id": "99b05bb5-d4f0-4264-94fa-5195b8e2c111",
        "tester_name": "Eng. Ahmed Leader",
        "tester_image": "https://taskitobcknd.wegostation.com/uploads/users/ahmed.jpg",
        "tester_role": "tester",
        "progress": 65.5,
        "done_progress": 80.0
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 9,
      "totalPages": 1
    }
  }
}
```

---

### 2.2 تفاصيل المشروع وأعضاء الفريق — Project Details & Team
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/project/:id`
* **الرابط:** `/api/admin/project/:id/users`
* **الوصف:** استعراض وصف المشروع، قائد المشروع (Leader)، والزملاء المشاركين فيه.

---

### 2.3 مستخدمو مجموعة المشروع — Get Group Users
* **الوصف:** استعراض أعضاء الفريق في المجموعة الحالية.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/projectGroup/:id/users`
* **Path Parameters:**
  * `id` *(UUID)*: معرف المجموعة.
* **Response `(200 OK)`:** قائمة بأسماء وأدوار الزملاء داخل المجموعة.

---

### 2.4 لوحة الملاحظات والتوجيهات — View Group Notes (Read-Only)
* **الوصف:** قراءة الملاحظات والتعليمات التي وضعها قائد المشروع (Leader) للمجموعة.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/notesBoard/group/:groupId`
* **Path Parameters:**
  * `groupId` *(UUID)*: معرف المجموعة.
* **Query Parameters:** `page`, `limit`
* **Response `(200 OK)`:** قائمة بالملاحظات وتواريخ إضافتها من قبل الليدر.

---

## 3. متابعة وتسليم المهام (My Tasks)

### 3.1 مهامي في المجموعة — Get My Tasks in Group
* **الوصف:** جلب المهام المسندة لهذا المهندس حصراً داخل المجموعة المحددة مع حالاتها وأولوياتها.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/tasks`
* **Query Parameters:**
  * `group_id` *(UUID, إجباري عند عرض مهام مجموعة معينة)*
  * `status` *(string, اختياري)*: `pending` | `inprogress` | `done` | `edit` | `approve`
  * `page` *(number)*, `limit` *(number)*, `search` *(string)*
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "86c4f096-90d2-449c-9add-6d96050e5f08",
        "name": "Implement Role Based Authentication",
        "description": "Protect routes using JWT middleware and checkPermission.",
        "documentation": null,
        "status": "inprogress",
        "importanc_status": "urgent",
        "delivery_date": "2026-10-25",
        "tester_note": "Ensure forbidden roles return 403.",
        "sort": 1,
        "createdAt": "2026-10-20T08:00:00.000Z",
        "user_id": "3c748055-4f40-410c-96b6-a21237a3c301",
        "user_name": "Mohamed Ali",
        "project_group": "Sprint 1 - Core",
        "project_name": "Taskito Management System"
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 50, "totalPages": 1 }
  }
}
```

---

### 3.2 مهامي المعلقة — My Pending Tasks
* **الوصف:** استعراض مهام المهندس التي لم تُعتمد بعد.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/tasks/pendingTasks`
* **Query Parameters:** `page`, `limit`, `search`, `project_id`, `status`
* **Response `(200 OK)`:** مهام المهندس المعلقة مع الـ Pagination.

---

### 3.3 مهامي المتأخرة — My Delayed Tasks
* **الوصف:** المهام التي تجاوزت تاريخ التسليم الخاص بها.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/tasks/delayTasks`
* **Query Parameters:** `page`, `limit`, `search`, `project_id`, `status`
* **Response `(200 OK)`:** قائمة المهام المتأخرة للمهندس.

---

### 3.4 مهام اليوم — My Today Tasks
* **الوصف:** المهام التي موعد تسليمها محدد اليوم.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/tasks/todayTasks`
* **Query Parameters:** `page`, `limit`, `search`, `project_id`, `status`
* **Response `(200 OK)`:** مهام اليوم.

---

### 3.5 تفاصيل المهمة وملاحظات الليدر — Get Task Details
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/tasks/:id`
* **Path Parameters:**
  * `id` *(UUID, إجباري)*: معرف المهمة.
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "86c4f096-90d2-449c-9add-6d96050e5f08",
      "name": "Implement Role Based Authentication",
      "description": "Protect routes using JWT middleware and checkPermission.",
      "status": "inprogress",
      "importanc_status": "urgent",
      "delivery_date": "2026-10-25",
      "tester_note": "Please make sure to write clean comments.",
      "documentation": null,
      "project_name": "Taskito Management System",
      "group_name": "Sprint 1 - Core",
      "user_name": "Mohamed Ali",
      "createdAt": "2026-10-20T08:00:00.000Z"
    }
  }
}
```

---

### 3.6 إنشاء مهمة ذاتية — Create Self Task
* **الوصف:** مسموح للمهندس بإنشاء مهمة عمل لنفسه، وسيقوم النظام تلقائياً بتعيين حسابه حصراً كمسؤول عن المهمة.
* **الطريقة:** `POST`
* **الرابط:** `/api/admin/tasks`
* **Request Body:**
```json
{
  "name": "Write Unit Tests for Auth Middleware",
  "description": "Cover all roles: engineer, tester, and admin.",
  "project_id": "77e05bb5-d4f0-4264-94fa-5195b8e2c566",
  "group_id": "6e117485-9bdd-445e-aacc-5c4703b433db",
  "delivery_date": "2026-10-25",
  "status": "pending",
  "importanc_status": "medium",
  "users_ids": ["MY_USER_ID"]
}
```
* **Response `(201 Created)`:**
```json
{
  "success": true,
  "data": {
    "message": "Task created successfully",
    "id": "86c4f096-90d2-449c-9add-6d96050e5f08"
  }
}
```

---

### 3.7 تحديث حالة المهمة وتسليمها للمراجعة — Update Task Status (Submit Work)
* **الوصف:**
  * عند بدء العمل: إرسال `"status": "inprogress"`.
  * عند إنهاء المهمة وتسليمها للـ Leader: إرسال `"status": "done"` مع رابط أو صورة التوثيق `documentation`.
* **الطريقة:** `PUT`
* **الرابط:** `/api/admin/tasks/:id`
* **Path Parameters:**
  * `id` *(UUID, إجباري)*: معرف المهمة.
* **Content-Type:** `multipart/form-data` أو `application/json`
* **Request Body (تسليم المهمة كـ Done):**
```json
{
  "status": "done",
  "documentation": "https://github.com/company/repo/pull/42"
}
```
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "message": "Task updated successfully"
  }
}
```
> [!CAUTION]
> **ردود الأخطاء والصلاحيات المحمية:**
> * عند محاولة وضع الحالة `approve` أو `edit`:
>   ```json
>   {
>     "success": false,
>     "data": { "message": "You don't have permission to approve or edit tasks" }
>   }
>   ```
> * عند محاولة تعديل مهمة تم اعتمادها مسبقاً (`status = 'approve'`):
>   ```json
>   {
>     "success": false,
>     "data": { "message": "You don't have permission to modify approved tasks" }
>   }
>   ```

---

## 4. الحضور والانصراف والطلبات الذاتية (Attendance & HR Requests)

### 4.1 فحص حالة الحضور اليومية — My Attendance Status
* **الوصف:** التأكد من تسجيل الحضور الحالي وحالة البصمة.
* **الطريقة:** `GET`
* **الرابط:** `/api/user/attendance/status`
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "isCheckedIn": true,
    "record": {
      "id": "18c4f096-90d2-449c-9add-6d96050e5f99",
      "userId": "3c748055-4f40-410c-96b6-a21237a3c301",
      "from": "2026-10-21T09:05:00.000Z",
      "to": null,
      "onsite": true,
      "isRequestOnline": false
    },
    "settings": {
      "face_id": true,
      "router_ip_status": false
    }
  }
}
```

---

### 4.2 تقرير الحضور الذاتي — My Attendance Report
* **الوصف:** كشف ساعات العمل، التأخير، الإضافي (Overtime)، والبدلات والخصومات للمهندس.
* **الطريقة:** `GET`
* **الرابط:** `/api/user/attendance/report`
* **Query Parameters:**
  * `from` *(YYYY-MM-DD)*: مثال `2026-09-30`
  * `to` *(YYYY-MM-DD)*: مثال `2026-10-30`
  * `page` *(number, افتراضي 1)*
  * `limit` *(number, افتراضي 15)*
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "report": [
      {
        "date": "2026-10-20",
        "day": "tuesday",
        "status": "present",
        "shift": { "from": "09:00", "to": "17:00" },
        "attendance": {
          "id": "18c4f096-90d2-449c-9add-6d96050e5f99",
          "from": "2026-10-20T09:05:00.000Z",
          "to": "2026-10-20T17:01:00.000Z",
          "hours": 7.93,
          "delay": 5,
          "onsite": true,
          "isRequestOnline": false,
          "over_time": 0
        }
      }
    ],
    "summary": {
      "totalDays": 30,
      "presentDays": 22,
      "absentDays": 0,
      "totalDelayMinutes": 15
    },
    "pagination": { "total": 30, "page": 1, "limit": 15, "totalPages": 2 }
  }
}
```

---

### 4.3 تقديم طلب إجازة — Submit Holiday Request
* **الطريقة:** `POST`
* **الرابط:** `/api/user/requests/holiday`
* **Request Body:**
```json
{
  "date": "2026-10-28"
}
```
* **Response `(201 Created)`:**
```json
{
  "success": true,
  "data": {
    "message": "Holiday request submitted successfully"
  }
}
```

---

### 4.4 تقديم طلب عمل عن بعد — Submit Online Request
* **الطريقة:** `POST`
* **الرابط:** `/api/user/requests/online`
* **Request Body:**
```json
{
  "date": "2026-10-29"
}
```
* **Response `(201 Created)`:**
```json
{
  "success": true,
  "data": {
    "message": "Online request submitted successfully"
  }
}
```

---

### 4.5 تقديم طلب إذن انصراف/تأخير — Submit Permission Request
* **الطريقة:** `POST`
* **الرابط:** `/api/user/requests/permission`
* **Request Body:**
```json
{
  "date": "2026-10-26",
  "hours": 2,
  "reason": "Personal errand"
}
```
* **Response `(201 Created)`:**
```json
{
  "success": true,
  "data": {
    "message": "Permission request submitted successfully"
  }
}
```
