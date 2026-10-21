# 📘 دليل توثيق واجهات برمجة التطبيقات للمهندس (Engineer & Leader API Documentation)
### نظام Taskito لإدارة المشاريع والمهام (Taskito Enterprise System)

---

## 📑 جدول المحتويات (Table of Contents)
1. [المفاهيم الأساسية والأدوار السياقية (Contextual Roles Architecture)](#1-المفاهيم-الأساسية-والأدوار-السياقية-contextual-roles-architecture)
2. [المصادقة والترويسات المشتركة (Authentication & Common Headers)](#2-المصادقة-والترويسات-المشتركة-authentication--common-headers)
3. [واجهات المصادقة والحساب (Authentication APIs)](#3-واجهات-المصادقة-والحساب-authentication-apis)
4. [واجهات لوحة التحكم ومساحة العمل (Dashboard & Workspace APIs)](#4-واجهات-لوحة-التحكم-ومساحة-العمل-dashboard--workspace-apis)
5. [واجهات إدارة المشاريع (Projects APIs)](#5-واجهات-إدارة-المشاريع-projects-apis)
6. [واجهات مجموعات العمل (Project Groups APIs)](#6-واجهات-مجموعات-العمل-project-groups-apis)
7. [واجهات إدارة المهام (Tasks APIs)](#7-واجهات-إدارة-المهام-tasks-apis)
8. [واجهات الملاحظات الصوتية للمهام (Task Voice Notes APIs)](#8-واجهات-الملاحظات-الصوتية-للمهام-task-voice-notes-apis)
9. [لوحة ملاحظات المجموعات (Notes Board APIs)](#9-لوحة-ملاحظات-المجموعات-notes-board-apis)
10. [واجهات الحضور والانصراف والطلبات الذاتية (Attendance & Self-Service HRM)](#10-واجهات-الحضور-والانصراف-والطلبات-الذاتية-attendance--self-service-hrm)
11. [أكواد الاستجابة ومعالجة الأخطاء (HTTP Status Codes & Error Handling)](#11-أكواد-الاستجابة-ومعالجة-الأخطاء-http-status-codes--error-handling)

---

## 1. المفاهيم الأساسية والأدوار السياقية (Contextual Roles Architecture)

في نظام **Taskito**، لا يحتاج المهندس إلى تبديل حسابه أو توليد Token مختلف للتعامل مع المشاريع التي يقودها:
- **الدور العام للمستخدم (`User.role`)**: يكون `engineer` أو `leader_sales`.
- **الدور السياقي (`user_role`)**: يُحسب تلقائياً في الباك إند مع كل طلب ويعود داخل كائن المشروع أو المهمة:
  - `"leader"`: إذا كان المستخدم مسجلاً كقائد للمشروع (`projects.tester_id == user.id`).
  - `"engineer"`: إذا كان المستخدم عضواً مسنداً له مهام في المشروع أو المجموعة.
  - `"admin"`: إذا كان المستخدم مسؤول النظام (`admin` أو `super_admin`).

> **الصلاحيات حسب الدور السياقي**:
> - إذا كانت القيمة `user_role === 'leader'`: يتاح له إضافة وتعديل المجموعات، إضافة مهام وتعيين عدة مهندسين، تعديل حالات المراجعة والاعتماد (`edit` / `approve`)، وتعديل الملاحظات القيادية (`tester_note`).
> - إذا كانت القيمة `user_role === 'engineer'`: يتاح له عرض المشروع ومجموعاته، وتحديث حالة مهامه الشخصية (`pending` -> `inprogress` -> `done`) وإرسال واستقبال التسجيلات الصوتية.

---

## 2. المصادقة والترويسات المشتركة (Authentication & Common Headers)

### عنوان السيرفر الأساسي (Base URL):
```http
http://localhost:5000/api
```
*(أو النطاق المعتمد للإنتاج الخاص بك)*

### الترويسات المطلوبة (Required Headers):
| الترويسة (Header) | القيمة (Value) | الوصف |
|---|---|---|
| `Authorization` | `Bearer <JWT_TOKEN>` | توكن المصادقة الصادر عند تسجيل الدخول (إلزامي لجميع الطلبات المحمية) |
| `Content-Type` | `application/json` أو `multipart/form-data` | حسب نوع البيانات المرسلة (JSON أو ملفات) |
| `Accept` | `application/json` | استقبال الردود بصيغة JSON |

---

## 3. واجهات المصادقة والحساب (Authentication APIs)

### 3.1 تسجيل الدخول (Login)
* **المسار**: `POST /admin/auth/login`
* **الوصول**: عام (Public)
* **Headers**: `Content-Type: application/json`
* **Request Body**:
```json
{
  "email": "engineer@systego.com",
  "password": "Password123"
}
```
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "name": "Eng. Ahmed",
    "email": "engineer@systego.com",
    "role": "engineer",
    "phone": "01000000000",
    "image": "http://localhost:5000/uploads/users/avatar.jpg"
  }
}
```

---

### 3.2 تسجيل الخروج (Logout)
* **المسار**: `POST /admin/auth/logout`
* **الوصول**: محمي (`authenticated`)
* **Headers**: `Authorization: Bearer <TOKEN>`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 3.3 استرجاع المسميات المخصصة للأدوار (Custom Role Names)
* **المسار**: `GET /admin/dashboard/usersName`
* **الوصول**: محمي (`authenticated`)
* **الوصف**: يعيد المسميات الوظيفية المخصصة في إعدادات النظام (مثل: مهندس، قائد فريق، مدير).
* **Success Response (200 OK)**:
```json
{
  "user": "Engineer",
  "leader": "Team Leader",
  "admin": "Administrator"
}
```

---

## 4. واجهات لوحة التحكم ومساحة العمل (Dashboard & Workspace APIs)

### 4.1 إحصائيات مساحة العمل الخاصة بالمهندس (Engineer Workspace Overview)
* **المسار**: `GET /admin/dashboard`
* **الوصول**: محمي (`engineer`, `leader_sales`, `admin`)
* **الوصف**: يعيد ملخص المهام المكتملة، قيد التنفيذ، المتأخرة، المعلقة، ونقاط المهندس.
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "done_tasks_count": 24,
    "inprogress_tasks_count": 5,
    "pending_tasks_count": 3,
    "delayed_tasks_count": 1,
    "total_tasks_count": 33,
    "my_points": 450,
    "engineers_count": 12
  }
}
```

---

### 4.2 مخطط النقاط السنوي (Points Chart)
* **المسار**: `GET /admin/dashboard/points-chart`
* **Query Params**:
  * `year` *(optional, number)*: مثال: `2026`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    { "month": "Jan", "points": 45 },
    { "month": "Feb", "points": 80 },
    { "month": "Mar", "points": 120 }
  ]
}
```

---

### 4.3 لوحة المتصدرين (Leaderboard)
* **المسار**: `GET /admin/dashboard/leaderboard`
* **Query Params**:
  * `from` *(optional, string YYYY-MM-DD)*
  * `to` *(optional, string YYYY-MM-DD)*
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "leaderboard": [
    {
      "id": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Eng. Ahmed",
      "image": "http://localhost:5000/uploads/users/ahmed.jpg",
      "total_points": 580,
      "rank": 1
    }
  ]
}
```

---

## 5. واجهات إدارة المشاريع (Projects APIs)

### 5.1 استرجاع جميع المشاريع المصرح بها (Get Accessible Projects)
* **المسار**: `GET /admin/project`
* **الوصول**: محمي (يرى المهندس المشاريع التي يقودها أو المشترك فيها)
* **Query Params**:
  * `page` *(optional, default: 1)*
  * `limit` *(optional, default: 10)*
  * `search` *(optional, string)*: البحث باسم المشروع
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "Projects": [
      {
        "id": "e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b",
        "name": "E-Commerce Mobile App",
        "description": "Full mobile shopping application",
        "documentation": "http://localhost:5000/uploads/projects/doc.pdf",
        "logo": "http://localhost:5000/uploads/projects/logo.png",
        "tester_id": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "tester_name": "Eng. Ahmed",
        "progress": 75.5,
        "done_progress": 82.0,
        "user_role": "leader",
        "users": [
          {
            "id": "user-uuid-1",
            "name": "Eng. Mohamed",
            "image": null,
            "role": "engineer"
          }
        ]
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 5.2 استرجاع تفاصيل مشروع محدد (Get Project By ID)
* **المسار**: `GET /admin/project/:id`
* **URL Params**:
  * `id` *(UUID, required)*: معرف المشروع
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "Project": {
      "id": "e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b",
      "name": "E-Commerce Mobile App",
      "description": "Full mobile shopping application",
      "documentation": "http://localhost:5000/uploads/projects/doc.pdf",
      "logo": "http://localhost:5000/uploads/projects/logo.png",
      "tester_id": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "progress": 75.5,
      "done_progress": 82.0,
      "user_role": "leader",
      "users": [...]
    }
  }
}
```

---

### 5.3 تحديث بيانات المشروع (Update Project)
* **المسار**: `PUT /admin/project/:id`
* **الوصول**: متاح فقط للـ **Leader** للمشروع أو **Admin**.
* **Headers**: `Content-Type: multipart/form-data` أو `application/json`
* **URL Params**:
  * `id` *(UUID, required)*
* **Request Body**:
  * `name` *(optional, string)*
  * `description` *(optional, string)*
  * `logo` *(optional, file)*
  * `documentation` *(optional, file)*
  * `users_ids` *(optional, string[] أو JSON array)*
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Project updated successfully"
}
```

---

### 5.4 حذف ملف توثيق المشروع (Delete Project Documentation)
* **المسار**: `DELETE /admin/project/:id/documentation`
* **الوصول**: متاح للـ **Leader** للمشروع أو **Admin**.
* **URL Params**:
  * `id` *(UUID, required)*
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Project documentation deleted successfully"
}
```

---

## 6. واجهات مجموعات العمل (Project Groups APIs)

### 6.1 استرجاع مجموعات العمل (Get Project Groups)
* **المسار**: `GET /admin/projectGroup`
* **Query Params**:
  * `project_id` *(optional, UUID)*: فلترة بمشروع محدد
  * `page` *(optional, default: 1)*
  * `limit` *(optional, default: 10)*
  * `search` *(optional, string)*
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "projectGroups": [
      {
        "id": "group-uuid-123",
        "name": "Authentication & Security Module",
        "documentation": "http://localhost:5000/uploads/groups/doc.pdf",
        "project_id": "e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b",
        "project_name": "E-Commerce Mobile App",
        "progress": 60.0,
        "done_progress": 70.0,
        "user_role": "leader",
        "users": [...]
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
  }
}
```

---

### 6.2 إنشاء مجموعة عمل جديدة (Create Project Group)
* **المسار**: `POST /admin/projectGroup`
* **الوصول**: متاح لـ **Leader** المشروع أو **Admin**.
* **Headers**: `Content-Type: multipart/form-data`
* **Request Body**:
  * `name` *(required, string)*: اسم المجموعة
  * `project_id` *(required, UUID)*: معرف المشروع
  * `users_ids` *(required, Array of UUIDs)*: معرفات المهندسين المسندين للمجموعة
  * `documentation` *(optional, File)*: ملف التوثيق
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Group created successfully"
}
```

---

### 6.3 تعديل مجموعة عمل (Update Project Group)
* **المسار**: `PUT /admin/projectGroup/:id`
* **الوصول**: متاح لـ **Leader** المشروع أو **Admin**.
* **Request Body**:
  * `name` *(optional, string)*
  * `users_ids` *(optional, Array of UUIDs)*
  * `documentation` *(optional, File)*
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Group updated successfully"
}
```

---

## 7. واجهات إدارة المهام (Tasks APIs)

### 7.1 استرجاع قائمة المهام (Get All Tasks)
* **المسار**: `GET /admin/tasks`
* **الوصول**: محمي (المهندس يرى مهامه المسندة إليه أو كافة مهام المشاريع التي يقودها)
* **Query Params**:
  * `group_id` *(optional, UUID)*: فلترة بمجموعة عمل
  * `project_id` *(optional, UUID)*: فلترة بمشروع
  * `status` *(optional, enum: `pending`, `inprogress`, `done`, `edit`, `approve`)*
  * `importanc_status` *(optional, enum: `low`, `medium`, `high`, `urgent`)*
  * `search` *(optional, string)*
  * `page` *(optional, default: 1)*
  * `limit` *(optional, default: 50)*
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "task-uuid-001",
        "name": "Design Checkout Screen",
        "description": "Implement UI according to Figma prototypes",
        "documentation": "http://localhost:5000/uploads/tasks/figma-link.pdf",
        "status": "inprogress",
        "importanc_status": "high",
        "delivery_date": "2026-10-25",
        "tester_note": "Ensure card number validations are active",
        "user_name": "Eng. Ahmed",
        "user_id": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "project_name": "E-Commerce Mobile App",
        "project_id": "project-uuid-1",
        "project_group": "Checkout Flow",
        "user_role": "leader"
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 50, "totalPages": 1 }
  }
}
```

---

### 7.2 المهام المفلترة حسب الموعد والحالة
* `GET /admin/tasks/todayTasks` (مهام موعد تسليمها اليوم)
* `GET /admin/tasks/delayTasks` (مهام تجاوزت موعد التسليم)
* `GET /admin/tasks/pendingTasks` (مهام معلقة لم تبدأ بعد)
* **Query Params مشتركة**: `page`, `limit`, `search`
* **Success Response (200 OK)**:
  تعيد نفس بنية قائمة المهام الموضحة في 7.1 متضمنة الحقل `user_role`.

---

### 7.3 تفاصيل مهمة محددة (Get Task By ID)
* **المسار**: `GET /admin/tasks/:id`
* **URL Params**:
  * `id` *(UUID, required)*
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "task-uuid-001",
      "name": "Design Checkout Screen",
      "description": "Implement UI according to Figma prototypes",
      "status": "inprogress",
      "importanc_status": "high",
      "delivery_date": "2026-10-25",
      "tester_note": "Ensure card number validations are active",
      "project_name": "E-Commerce Mobile App",
      "project_id": "project-uuid-1",
      "group_name": "Checkout Flow",
      "group_id": "group-uuid-1",
      "user_id": "user-uuid-1",
      "user_name": "Eng. Ahmed",
      "documentation": "http://localhost:5000/uploads/tasks/doc.pdf",
      "user_role": "leader",
      "assigned_users": [
        {
          "id": "user-uuid-1",
          "name": "Eng. Ahmed",
          "image": null,
          "role": "engineer"
        }
      ],
      "voices": [
        {
          "id": "voice-uuid-1",
          "voice_url": "http://localhost:5000/uploads/voices/note1.webm",
          "duration": 15,
          "createdAt": "2026-10-21T10:00:00Z",
          "user_id": "user-uuid-1",
          "user_name": "Eng. Ahmed",
          "user_role": "tester"
        }
      ]
    }
  }
}
```

---

### 7.4 إنشاء مهمة جديدة (Create Task)
* **المسار**: `POST /admin/tasks`
* **Headers**: `Content-Type: multipart/form-data` أو `application/json`
* **Request Body**:
```json
{
  "name": "Implement Apple Pay Integration",
  "description": "Add direct Apple Pay button and handle tokens",
  "project_id": "e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b",
  "group_id": "group-uuid-123",
  "delivery_date": "2026-10-30",
  "status": "pending",
  "importanc_status": "urgent",
  "tester_note": "Test with Sandbox account first",
  "users_ids": ["b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"]
}
```
* **سلوك الصلاحيات الذكي**:
  * إذا كان المنشئ **Leader** أو **Admin**: يمكنه إرسال عدة معرفات في `users_ids` (يتم نسخ وتوزيع المهمة تلقائياً لكل مهندس)، وتعيين `tester_note`.
  * إذا كان المنشئ **Engineer**: يتم إسناد المهمة إليه تلقائياً وحجب تعيين مهندسين آخرين أو كتابة ملاحظة قائد.
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Task created successfully"
}
```

---

### 7.5 تحديث المهمة والحالة (Update Task)
* **المسار**: `PUT /admin/tasks/:id`
* **URL Params**:
  * `id` *(UUID, required)*
* **Request Body**:
```json
{
  "status": "done",
  "description": "Updated implementation details",
  "delivery_date": "2026-10-30",
  "tester_note": "Revision completed, please verify"
}
```
* **قواعد الصلاحيات المطبقة**:
  * مهندس عادي (`user_role === 'engineer'`): يمكنه تحويل الحالة بين (`pending` / `inprogress` / `done`).
  * قائد المشروع (`user_role === 'leader'`): يمكنه تحويل الحالة إلى `edit` (طلب تعديل) أو `approve` (اعتماد نهائي)، وتعديل حقل `tester_note`، وإعادة تعيين المهندسين (`users_ids`).
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Task updated successfully"
}
```

---

### 7.6 إعادة ترتيب المهام (Reorder Tasks)
* **المسار**: `PUT /admin/tasks/reorder`
* **Request Body**:
```json
{
  "tasks": [
    { "id": "task-uuid-1", "sort": 1 },
    { "id": "task-uuid-2", "sort": 2 }
  ]
}
```
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Tasks reordered successfully"
}
```

---

### 7.7 حذف ملف توثيق المهمة (Delete Task Documentation)
* **المسار**: `DELETE /admin/tasks/:id/documentation`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Task documentation deleted successfully"
}
```

---

## 8. واجهات الملاحظات الصوتية للمهام (Task Voice Notes APIs)

### 8.1 إضافة تسجيل صوتي إلى المهمة (Add Voice Note)
* **المسار**: `POST /admin/tasks/:id/voices`
* **الوصول**: متاح للـ **Leader** للمشروع، أو الـ **Admin**، أو **المهندس المسندة له المهمة**.
* **Headers**: `Content-Type: multipart/form-data`
* **Form-Data**:
  * `voice` *(required, File .webm/.mp3/.wav)*: ملف الصوت
  * `duration` *(optional, number)*: مدة التسجيل بالثواني
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Voice note added successfully",
  "voice": {
    "id": "voice-uuid-555",
    "voice_url": "http://localhost:5000/uploads/voices/voice-555.webm",
    "duration": 28,
    "createdAt": "2026-10-21T11:45:00Z",
    "user_id": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "user_name": "Eng. Ahmed",
    "user_image": null,
    "user_role": "tester"
  }
}
```

---

### 8.2 حذف تسجيل صوتي (Delete Voice Note)
* **المسار**: `DELETE /admin/tasks/:id/voices/:voiceId`
* **الوصول**: متاح لكاتب التسجيل نفسه، أو لقائد المشروع (Leader)، أو للمسؤول (Admin).
* **URL Params**:
  * `id` *(UUID, required)*: معرف المهمة
  * `voiceId` *(UUID, required)*: معرف التسجيل الصوتي
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Voice note deleted successfully"
}
```

---

## 9. لوحة ملاحظات المجموعات (Notes Board APIs)

### 9.1 استرجاع ملاحظات المجموعة (Get Group Notes)
* **المسار**: `GET /admin/notesBoard/group/:groupId` (أو `GET /user/notesBoard/group/:groupId`)
* **URL Params**:
  * `groupId` *(UUID, required)*
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "notes": [
    {
      "id": "note-uuid-1",
      "group_id": "group-uuid-123",
      "title": "API Authentication Strategy",
      "content": "Make sure all requests use Bearer Tokens with expiration check",
      "createdAt": "2026-10-20T12:00:00Z"
    }
  ]
}
```

---

### 9.2 إنشاء ملاحظة جديدة (Create Group Note)
* **المسار**: `POST /admin/notesBoard`
* **الوصول**: Leader أو Admin
* **Request Body**:
```json
{
  "title": "Database Indexing Notice",
  "content": "Index added on project_id and user_id for faster queries",
  "group_id": "group-uuid-123"
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Note created successfully"
}
```

---

## 10. واجهات الحضور والانصراف والطلبات الذاتية (Attendance & Self-Service HRM)

> هذه الواجهات خاصة بالخدمة الذاتية للمهندس لتسجيل الدخول والانصراف ومتابعة طلبات الإجازات والأذونات.

### 10.1 حالة الحضور اللحظية (Attendance Status)
* **المسار**: `GET /user/attendance/status`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "isCheckedIn": true,
    "record": {
      "id": "att-uuid-1",
      "from": "2026-10-21T09:00:00Z",
      "to": null
    },
    "settings": {
      "face_id": true,
      "router_ip_status": false
    }
  }
}
```

---

### 10.2 تسجيل الحضور (Check-In)
* **المسار**: `POST /user/attendance/check-in`
* **Request Body**:
```json
{
  "lat": 30.0444,
  "lng": 31.2357,
  "payload": {
    "descriptor": [0.123, -0.456, 0.789]
  }
}
```
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Check-in recorded successfully"
}
```

---

### 10.3 تسجيل الانصراف (Check-Out)
* **المسار**: `PUT /user/attendance/check-out`
* **Request Body**:
```json
{
  "lat": 30.0444,
  "lng": 31.2357
}
```
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Check-out recorded successfully"
}
```

---

### 10.4 تقرير ساعات الحضور والعمل (Attendance Report)
* **المسار**: `GET /user/attendance/report`
* **Query Params**:
  * `month` *(optional, 1-12)*
  * `year` *(optional, e.g. 2026)*
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "totalWorkingHours": 168.5,
    "daysPresent": 21,
    "daysAbsent": 1,
    "records": [...]
  }
}
```

---

### 10.5 تقديم طلب إجازة (Submit Holiday Request)
* **المسار**: `POST /user/requests/holiday`
* **Request Body**:
```json
{
  "date": "2026-11-01"
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Holiday request submitted successfully"
}
```

---

### 10.6 تقديم طلب عمل عن بُعد (Submit Online Request)
* **المسار**: `POST /user/requests/online`
* **Request Body**:
```json
{
  "date": "2026-10-25"
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Online request submitted successfully"
}
```

---

### 10.7 تقديم طلب إذن ساعات (Submit Permission Request)
* **المسار**: `POST /user/requests/permission`
* **Request Body**:
```json
{
  "date": "2026-10-22",
  "hours": 2,
  "reason": "Personal medical appointment"
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Permission request submitted successfully"
}
```

---

## 11. أكواد الاستجابة ومعالجة الأخطاء (HTTP Status Codes & Error Handling)

جميع الردود في حال وجود خطأ تتبع معيار موحد:

### نموذج الخطأ (Error Response Format):
```json
{
  "success": false,
  "message": "وصف الخطأ الدقيق",
  "errors": [
    {
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

### معاني أكواد الـ HTTP المعتمدة:
| الكود | الحالة (Status) | متى يحدث؟ |
|---|---|---|
| `200` | **OK** | نجاح الطلب واسترجاع البيانات المطلوبة بنجاح. |
| `201` | **Created** | إنشاء العنصر (مهمة، تسجيل صوتي، ملاحظة) بنجاح. |
| `400` | **Bad Request** | نقص في البيانات المدخلة، أو عدم تطابق Zod Validation. |
| `401` | **Unauthorized** | التوكن غير موجود، غير صالح، أو منتهي الصلاحية. |
| `403` | **Forbidden** | المستخدم لا يملك الصلاحية (مثلاً: مهندس يحاول اعتماد مهمة أو حذف مشروع ليس قائده). |
| `404` | **Not Found** | العنصر المطلوب غير موجود في قاعدة البيانات. |
| `500` | **Internal Server Error** | خطأ غير متوقع داخل السيرفر أثناء المعالجة. |

---
*تم إنشاء هذا التوثيق ليتطابق بالكامل مع النسخة المحدثة لنظام Taskito Enterprise.*
