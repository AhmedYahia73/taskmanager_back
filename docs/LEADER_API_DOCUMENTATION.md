# 📘 Taskito API Documentation — Leader Role (`auth leader`)

توثيق كامل وشامل لجميع واجهات برمجة التطبيقات (APIs) الخاصة بصلاحية **قائد الفريق / قائد المشروع (Leader / Tester)** في نظام Taskito.

---

## 🌐 الإعدادات العامة (General Config)

* **Base URL:** `https://taskitobcknd.wegostation.com`
* **المصادقة (Authentication):** يتم إرسال رمز الـ JWT في الـ Headers لجميع الطلبات:
  ```http
  Authorization: Bearer <LEADER_JWT_TOKEN>
  ```
* **صيغة البيانات (Content-Type):**
  * افتراضياً: `Content-Type: application/json`
  * للعمليات التي تتضمن رفع ملفات/مستندات: `Content-Type: multipart/form-data`

---

## 📑 فهرس الـ APIs
1. [لوحة التحكم والتقارير (Dashboard & Points)](#1-لوحة-التحكم-والتقارير-dashboard--points)
2. [إدارة المشاريع (Projects Management)](#2-إدارة-المشاريع-projects-management)
3. [مجموعات المشاريع (Project Groups)](#3-مجموعات-المشاريع-project-groups)
4. [لوحة الملاحظات (Notes Board)](#4-لوحة-الملاحظات-notes-board)
5. [إدارة المهام (Tasks Management)](#5-إدارة-المهام-tasks-management)
6. [الحضور والانصراف والطلبات (Attendance & Requests)](#6-الحضور-والانصراف-والطلبات-attendance--requests)

---

## 1. لوحة التحكم والتقارير (Dashboard & Points)

### 1.1 إحصائيات لوحة التحكم — Get Dashboard Stats
* **الوصف:** جلب إحصائيات شاملة للمشاريع والمهام التابعة للـ Leader (المهام المعلقة، المتأخرة، المنجزة، المعتمدة، ومهام اليوم، وعدد المهندسين).
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
    "pending_tasks": 14,
    "all_projects": 4,
    "delay_tasks": 2,
    "engineers_count": 8,
    "done_tasks": 18,
    "approve_tasks": 52,
    "total_tasks": 86,
    "today_tasks": 6,
    "all_today_tasks": 9,
    "today_done_tasks": 3,
    "today_approve_tasks": 2
  }
}
```

---

### 1.2 نقاط الإنجاز السنوية — Points Chart
* **الوصف:** رسم بياني يوضح النقاط الشهرية المكتسبة للعام المحدد. يمكن للـ Leader جلب نقاطه الخاصة أو تمرير `user_id` لأي مهندس بفريقه لمتابعة أدائه.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/dashboard/points-chart`
* **Query Parameters:**
  * `year` *(number, اختياري - الافتراضي العام الحالي)*: مثال `2026`
  * `user_id` *(UUID, اختياري)*: معرف المهندس لعرض نقاطه.
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "totalPointsAllTime": 350,
    "selectedYearPoints": [
      { "month": 1, "total_points": 45 },
      { "month": 2, "total_points": 60 },
      { "month": 3, "total_points": 35 },
      { "month": 4, "total_points": 70 },
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

### 1.3 مسميات الأدوار بالسيستم — Get Users Terminology
* **الوصف:** جلب التسميات المخصصة للنظام المحفوظة بالإعدادات.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/dashboard/usersName`
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "user": "مهندس",
    "leader": "ليدر",
    "admin": "أدمن"
  }
}
```

---

### 1.4 أسماء الأدوار الديناميكية — Dynamic Role Names
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/auth/settings/names`
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "user": "Employee",
    "leader": "Leader"
  }
}
```

---

### 1.5 بيانات الشركة — Get Company Profile
* **الوصف:** جلب الملف التعريفي للشركة والشعار ووسائل الاتصال.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/company`
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "id": "c1f74805-4f40-410c-96b6-a21237a3c301",
    "name": "Wego Station",
    "owner_name": "Systego Tech",
    "address": "Cairo, Egypt",
    "phone": "+201000000000",
    "whatts": "+201000000000",
    "facebook": "https://facebook.com/wegostation",
    "instgram": "https://instagram.com/wegostation",
    "email": "info@wegostation.com",
    "logo": "https://taskitobcknd.wegostation.com/uploads/companies/logo.png"
  }
}
```

---

## 2. إدارة المشاريع (Projects Management)

### 2.1 قائمة المشاريع — Get All Projects
* **الوصف:** استعراض المشاريع التابعة للـ Leader مع نسبة الإنجاز والـ Pagination والبحث.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/project`
* **Query Parameters:**
  * `page` *(number, اختياري - افتراضي 1)*
  * `limit` *(number, اختياري - افتراضي 9)*
  * `search` *(string, اختياري)*: بحث بالاسم
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
        "progress": 68.5,
        "done_progress": 82.0
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

### 2.2 إنشاء مشروع جديد — Create Project
* **الوصف:** إنشاء مشروع جديد وإسناد المهندسين والليدر إليه.
* **الصلاحية:** `Leader / Tester` أو `Admin`.
* **الطريقة:** `POST`
* **الرابط:** `/api/admin/project`
* **Content-Type:** `multipart/form-data` أو `application/json`
* **Request Body:**
```json
{
  "name": "E-Commerce Mobile App",
  "description": "Cross platform Flutter application",
  "tester_id": "99b05bb5-d4f0-4264-94fa-5195b8e2c111",
  "users_ids": [
    "3c748055-4f40-410c-96b6-a21237a3c301",
    "8b248055-1f20-410c-96b6-b51237a3c302"
  ]
}
```
*(حقول ملفات اختيارية في الـ form-data: `logo`, `documentation`)*.
* **Response `(201 Created)`:**
```json
{
  "success": true,
  "data": {
    "message": "Project created successfully",
    "id": "77e05bb5-d4f0-4264-94fa-5195b8e2c566"
  }
}
```

---

### 2.3 تعديل مشروع — Update Project
* **الوصف:** تعديل بيانات المشروع وتحديث المهندسين المسندين إليه.
* **الصلاحية:** `Leader / Tester` أو `Admin`.
* **الطريقة:** `PUT`
* **الرابط:** `/api/admin/project/:id`
* **Path Parameters:**
  * `id` *(UUID, إجباري)*: معرف المشروع.
* **Request Body:**
```json
{
  "name": "Taskito Management Platform V2",
  "description": "Updated sprint specifications",
  "tester_id": "99b05bb5-d4f0-4264-94fa-5195b8e2c111",
  "users_ids": [
    "3c748055-4f40-410c-96b6-a21237a3c301"
  ]
}
```
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "message": "Project updated successfully"
  }
}
```

---

### 2.4 تفاصيل مشروع — Get Project By ID
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/project/:id`
* **Path Parameters:**
  * `id` *(UUID, إجباري)*: معرف المشروع.
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "id": "77e05bb5-d4f0-4264-94fa-5195b8e2c566",
    "name": "Taskito Management System",
    "description": "Internal enterprise task tracking tool",
    "documentation": "https://taskitobcknd.wegostation.com/uploads/projects/doc.pdf",
    "logo": "https://taskitobcknd.wegostation.com/uploads/projects/logo.png",
    "tester_id": "99b05bb5-d4f0-4264-94fa-5195b8e2c111",
    "createdAt": "2026-01-10T12:00:00.000Z",
    "users_ids": [
      "3c748055-4f40-410c-96b6-a21237a3c301"
    ]
  }
}
```

---

### 2.5 مستخدمو المشروع — Get Project Users
* **الوصف:** جلب جميع المهندسين والمستخدمين المعينين في هذا المشروع.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/project/:id/users`
* **Path Parameters:**
  * `id` *(UUID, إجباري)*: معرف المشروع.
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "3c748055-4f40-410c-96b6-a21237a3c301",
        "name": "Mohamed Ali",
        "email": "mohamed@wegostation.com",
        "phone": "+201011111111",
        "role": "engineer",
        "image": "https://taskitobcknd.wegostation.com/uploads/users/mohamed.jpg"
      }
    ]
  }
}
```

---

## 3. مجموعات المشاريع (Project Groups)

### 3.1 إنشاء مجموعة مشروع — Create Project Group
* **الوصف:** إنشاء مجموعة داخل المشروع لتقسيم المهام (مثل Sprints أو Modules).
* **الصلاحية:** `Leader / Tester` أو `Admin`.
* **الطريقة:** `POST`
* **الرابط:** `/api/admin/projectGroup`
* **Request Body:**
```json
{
  "name": "Sprint 1 - Authentication & Core API",
  "description": "Tasks covering auth, JWT, and security.",
  "project_id": "77e05bb5-d4f0-4264-94fa-5195b8e2c566",
  "users_ids": [
    "3c748055-4f40-410c-96b6-a21237a3c301"
  ]
}
```
* **Response `(201 Created)`:**
```json
{
  "success": true,
  "data": {
    "message": "Project group created successfully",
    "id": "6e117485-9bdd-445e-aacc-5c4703b433db"
  }
}
```

---

### 3.2 تعديل مجموعة مشروع — Update Project Group
* **الصلاحية:** `Leader / Tester` أو `Admin`.
* **الطريقة:** `PUT`
* **الرابط:** `/api/admin/projectGroup/:id`
* **Path Parameters:**
  * `id` *(UUID, إجباري)*: معرف المجموعة.
* **Request Body:**
```json
{
  "name": "Sprint 1 - Authentication (Updated)",
  "description": "Updated sprint description",
  "users_ids": [
    "3c748055-4f40-410c-96b6-a21237a3c301"
  ]
}
```
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "message": "Project group updated successfully"
  }
}
```

---

### 3.3 مستخدمو مجموعة المشروع — Get Group Users
* **الوصف:** استرجاع قائمة المستخدمين المعينين في المجموعة المحددة.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/projectGroup/:id/users`
* **Path Parameters:**
  * `id` *(UUID, إجباري)*: معرف المجموعة.
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "3c748055-4f40-410c-96b6-a21237a3c301",
        "name": "Mohamed Ali",
        "email": "mohamed@wegostation.com",
        "phone": "+201011111111",
        "role": "engineer",
        "image": "https://taskitobcknd.wegostation.com/uploads/users/mohamed.jpg"
      }
    ]
  }
}
```

---

## 4. لوحة الملاحظات (Notes Board)

### 4.1 جلب ملاحظات المجموعة — Get Group Notes
* **الوصف:** استعراض الملاحظات التوجيهية للـ Leader على مستوى المجموعة.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/notesBoard/group/:groupId`
* **Path Parameters:**
  * `groupId` *(UUID, إجباري)*: معرف المجموعة.
* **Query Parameters:**
  * `page` *(number, افتراضي 1)*
  * `limit` *(number, افتراضي 20)*
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "notes": [
      {
        "id": "79dfb9dd-34f7-47c9-be79-70c4ca24a31f",
        "notes": "Please verify tokens on each secured route.",
        "user_id": "99b05bb5-d4f0-4264-94fa-5195b8e2c111",
        "group_id": "6e117485-9bdd-445e-aacc-5c4703b433db",
        "author_name": "Eng. Ahmed Leader",
        "author_role": "tester",
        "createdAt": "2026-10-15T10:00:00.000Z",
        "updatedAt": "2026-10-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

---

### 4.2 إضافة ملاحظة جديدة — Create Note
* **الوصف:** نشر ملاحظة أو تعليمات جديدة لفريق العمل.
* **الصلاحية:** `Leader / Tester` أو `Admin`.
* **الطريقة:** `POST`
* **الرابط:** `/api/admin/notesBoard`
* **Request Body:**
```json
{
  "group_id": "6e117485-9bdd-445e-aacc-5c4703b433db",
  "notes": "Ensure that unit tests pass before moving task to Done."
}
```
* **Response `(201 Created)`:**
```json
{
  "success": true,
  "data": {
    "message": "Note created successfully",
    "id": "79dfb9dd-34f7-47c9-be79-70c4ca24a31f"
  }
}
```

---

### 4.3 تعديل ملاحظة — Update Note
* **الوصف:** تعديل نص الملاحظة (مسموح لصاحب الملاحظة Leader أو الأدمن).
* **الصلاحية:** `Author Leader` أو `Admin`.
* **الطريقة:** `PUT`
* **الرابط:** `/api/admin/notesBoard/:id`
* **Path Parameters:**
  * `id` *(UUID, إجباري)*: معرف الملاحظة.
* **Request Body:**
```json
{
  "notes": "Updated: Ensure all integration and unit tests pass before marking tasks as Done."
}
```
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "message": "Note updated successfully"
  }
}
```

---

### 4.4 حذف ملاحظة — Delete Note
* **الوصف:** حذف الملاحظة.
* **الصلاحية:** `Author Leader` أو `Admin`.
* **الطريقة:** `DELETE`
* **الرابط:** `/api/admin/notesBoard/:id`
* **Path Parameters:**
  * `id` *(UUID, إجباري)*: معرف الملاحظة.
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "message": "Note deleted successfully"
  }
}
```

---

## 5. إدارة المهام (Tasks Management)

### 5.1 القوائم المساعدة لشاشات المهام — Tasks Dropdown Lists
* **الوصف:** جلب قوائم المشاريع، المجموعات، وقائمة المهندسين لاختيارهم عند إضافة مهمة أو تصفيتها.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/tasks/lists`
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "projects_list": [
      { "id": "77e05bb5-d4f0-4264-94fa-5195b8e2c566", "name": "Taskito Management System" }
    ],
    "groups_list": [
      { "id": "6e117485-9bdd-445e-aacc-5c4703b433db", "name": "Sprint 1 - Core" }
    ],
    "users_list": [
      { "id": "3c748055-4f40-410c-96b6-a21237a3c301", "name": "Mohamed Ali" }
    ]
  }
}
```

---

### 5.2 قائمة المهام الشاملة — Get All Tasks
* **الوصف:** جلب جميع مهام المشاريع التي يقودها الـ Leader مع إمكانية التصفية المتقدمة.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/tasks`
* **Query Parameters:**
  * `group_id` *(UUID, اختياري)*
  * `project_id` *(UUID, اختياري)*
  * `user_id` *(UUID, اختياري)*
  * `status` *(string, اختياري)*: `pending` | `inprogress` | `done` | `edit` | `approve`
  * `page` *(number, افتراضي 1)*
  * `limit` *(number, افتراضي 50)*
  * `search` *(string, اختياري)*
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "86c4f096-90d2-449c-9add-6d96050e5f08",
        "name": "Design Database Schema for HRM",
        "description": "Create Drizzle models for shifts, attendance, and leaves.",
        "documentation": "https://taskitobcknd.wegostation.com/uploads/projects/schema.png",
        "status": "inprogress",
        "importanc_status": "high",
        "delivery_date": "2026-10-25",
        "tester_note": "Please adhere to naming conventions.",
        "sort": 1,
        "createdAt": "2026-10-20T08:00:00.000Z",
        "user_id": "3c748055-4f40-410c-96b6-a21237a3c301",
        "user_name": "Mohamed Ali",
        "user_phone": "+201011111111",
        "user_image": "https://taskitobcknd.wegostation.com/uploads/users/mohamed.jpg",
        "project_group": "Sprint 1 - Core",
        "project_name": "Taskito Management System"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 50,
      "totalPages": 1
    }
  }
}
```

---

### 5.3 المهام المعلقة — Pending Tasks
* **الوصف:** جلب المهام غير المعتمدة (`status != 'approve'`).
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/tasks/pendingTasks`
* **Query Parameters:** `page`, `limit`, `search`, `project_id`, `user_id`, `status`
* **Response `(200 OK)`:** قائمة المهام مع الـ Pagination.

---

### 5.4 المهام المتأخرة — Delay Tasks
* **الوصف:** جلب المهام التي تجاوزت تاريخ التسليم (`delivery_date < CURRENT_DATE()`).
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/tasks/delayTasks`
* **Query Parameters:** `page`, `limit`, `search`, `project_id`, `user_id`, `status`
* **Response `(200 OK)`:** قائمة المهام المتأخرة.

---

### 5.5 مهام اليوم — Today Tasks
* **الوصف:** جلب المهام المجدولة للتسليم اليوم (`delivery_date = CURRENT_DATE()`).
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/tasks/todayTasks`
* **Query Parameters:** `page`, `limit`, `search`, `project_id`, `user_id`, `status`
* **Response `(200 OK)`:** مهام اليوم.

---

### 5.6 إنشاء وتكليف مهمة — Create Task
* **الوصف:** إنشاء مهمة وتكليف مهندس أو عدة مهندسين بها (تُنشأ نسخة لكل مهندس تلقائياً).
* **الصلاحية:** `Leader / Tester` أو `Admin`.
* **الطريقة:** `POST`
* **الرابط:** `/api/admin/tasks`
* **Content-Type:** `multipart/form-data` أو `application/json`
* **Request Body:**
```json
{
  "name": "Implement Role Based Authentication",
  "description": "Protect routes using JWT middleware and checkPermission.",
  "project_id": "77e05bb5-d4f0-4264-94fa-5195b8e2c566",
  "group_id": "6e117485-9bdd-445e-aacc-5c4703b433db",
  "delivery_date": "2026-10-25",
  "status": "pending",
  "importanc_status": "urgent",
  "tester_note": "Ensure forbidden roles return 403.",
  "sort": 1,
  "users_ids": [
    "3c748055-4f40-410c-96b6-a21237a3c301"
  ]
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

### 5.7 تفاصيل مهمة — Get Task By ID
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
      "status": "done",
      "importanc_status": "urgent",
      "delivery_date": "2026-10-25",
      "tester_note": "Approved with commendation.",
      "documentation": "https://taskitobcknd.wegostation.com/uploads/projects/pr_link.png",
      "project_name": "Taskito Management System",
      "project_id": "77e05bb5-d4f0-4264-94fa-5195b8e2c566",
      "group_name": "Sprint 1 - Core",
      "group_id": "6e117485-9bdd-445e-aacc-5c4703b433db",
      "user_name": "Mohamed Ali",
      "user_id": "3c748055-4f40-410c-96b6-a21237a3c301",
      "sort": 1,
      "createdAt": "2026-10-20T08:00:00.000Z",
      "users_ids": ["3c748055-4f40-410c-96b6-a21237a3c301"],
      "sibling_task_ids": ["86c4f096-90d2-449c-9add-6d96050e5f08"]
    }
  }
}
```

---

### 5.8 مراجعة واعتماد / طلب تعديل المهمة — Update Task (Leader Full Control)
* **الوصف:** يمتلك الـ Leader الصلاحية الكاملة لتعديل المهمة:
  * **اعتماد المهمة (`status = "approve"`):** يضيف نقاط الإنجاز للمهندس تلقائياً ويثبت تاريخ التسليم.
  * **طلب تعديل (`status = "edit"`):** يعيد المهمة للمهندس مع كتابة ملاحظات `tester_note`.
* **الطريقة:** `PUT`
* **الرابط:** `/api/admin/tasks/:id`
* **Path Parameters:**
  * `id` *(UUID, إجباري)*: معرف المهمة.
* **Request Body (مثال لاعتماد المهمة Approve):**
```json
{
  "status": "approve",
  "tester_note": "Great work! Code is reviewed and merged to main."
}
```
* **Request Body (مثال لطلب تعديل من المهندس Edit):**
```json
{
  "status": "edit",
  "tester_note": "Unit tests failed on corner case; please fix before approval."
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

---

### 5.9 حذف مهمة — Delete Task
* **الوصف:** حذف المهمة ومرفقاتها من السيرفر.
* **الطريقة:** `DELETE`
* **الرابط:** `/api/admin/tasks/:id`
* **Path Parameters:**
  * `id` *(UUID, إجباري)*: معرف المهمة.
* **Response `(200 OK)`:**
```json
{
  "success": true,
  "data": {
    "message": "Task deleted successfully"
  }
}
```

---

## 6. الحضور والانصراف والطلبات (Attendance & Requests)

### 6.1 حالة الحضور الحالية — Attendance Status
* **الوصف:** التحقق مما إذا كان الـ Leader قد سجل حضور اليوم وإعدادات البصمة.
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
      "userId": "99b05bb5-d4f0-4264-94fa-5195b8e2c111",
      "from": "2026-10-21T09:02:15.000Z",
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

### 6.2 تقرير الحضور الذاتي — Attendance Report
* **الوصف:** تقرير تفصيلي لساعات العمل والتأخير والخصومات والبدلات.
* **الطريقة:** `GET`
* **الرابط:** `/api/user/attendance/report`
* **Query Parameters:**
  * `from` *(YYYY-MM-DD)*: مثال `2026-09-30`
  * `to` *(YYYY-MM-DD)*: مثال `2026-10-30`
  * `page` *(number, افتراضي 1)*
  * `limit` *(number, افتراضي 15)*
* **Response `(200 OK)`:** تقرير الحضور مع تفاصيل الـ Overtime والـ Pagination.

---

### 6.3 تقديم طلب إجازة — Submit Holiday Request
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

### 6.4 تقديم طلب عمل عن بعد — Submit Online Request
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

### 6.5 تقديم طلب إذن ساعات — Submit Permission Request
* **الطريقة:** `POST`
* **الرابط:** `/api/user/requests/permission`
* **Request Body:**
```json
{
  "date": "2026-10-26",
  "hours": 2,
  "reason": "Family emergency"
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
