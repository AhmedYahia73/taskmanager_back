# 📘 Taskito API Documentation — Admin Role (`role admin` / `super_admin`)

توثيق كامل وشامل لجميع واجهات برمجة التطبيقات (APIs) المتاحة لصلاحية **مدير النظام (Admin / Super Admin)** في نظام Taskito لإدارة المهام والمشاريع والموارد البشرية والمبيعات.

---

## 🌐 1. الإعدادات العامة وقواعد المصادقة (General Configuration)

* **Base URL:**
  * **الإنتاج (Production):** `https://taskitobcknd.wegostation.com`
  * **التطوير المحلي (Local Development):** `http://localhost:3001`
* **المصادقة (Authentication):**
  * يتم تمرير الـ JWT Token في الـ Headers لجميع الطلبات المحمية:
    ```http
    Authorization: Bearer <ADMIN_JWT_TOKEN>
    ```
* **صيغة البيانات (Content-Type):**
  * افتراضياً لجميع الطلبات العادية: `Content-Type: application/json`
  * للطلبات التي تحتوي على رفع ملفات أو صور (مثل صورة المستخدم، شعار الشركة، مستندات المشاريع والمهام):
    `Content-Type: multipart/form-data`
* **الهيدرز الإضافية الخاصة بموديول المبيعات (Sales Module Headers):**
  * عند استدعاء أي من واجهات موديول المبيعات تحت `/api/admin/sales`، يُرسل الهيدر التالي لتحديد مشروع المبيعات المستهدف:
    ```http
    x-sales-project-id: <SALES_PROJECT_UUID>
    ```
    *(أو كـ Query Parameter اختياري: `?sales_project_id=<UUID>`)*.

---

## 📑 فهرس أقسام الـ APIs

1. [المصادقة وإدارة الجلسات (Authentication & Session)](#1-المصادقة-وإدارة-الجلسات-authentication--session)
2. [الملف الشخصي للأدمن (Admin Profile)](#2-الملف-الشخصي-للأدمن-admin-profile)
3. [لوحة التحكم والإحصائيات العامة (Dashboard & Analytics)](#3-لوحة-التحكم-والإحصائيات-العامة-dashboard--analytics)
4. [إدارة المديرين (Admins Management)](#4-إدارة-المديرين-admins-management)
5. [إدارة الموظفين والمستخدمين (Users & Employees Management)](#5-إدارة-الموظفين-والمستخدمين-users--employees-management)
6. [إدارة أيام العمل أونلاين (User Online Days Management)](#6-إدارة-أيام-العمل-أونلاين-user-online-days-management)
7. [إدارة الأقسام (Departments Management)](#7-إدارة-الأقسام-departments-management)
8. [إعدادات النظام والشركة (Settings & Company)](#8-إعدادات-النظام-والشركة-settings--company)
9. [المناطق الجغرافية ومواقع الفروع (Geofence Zones & Cities)](#9-المناطق-الجغرافية-ومواقع-الفروع-geofence-zones--cities)
10. [إدارة الورديات ومواعيد العمل (Shifts Management)](#10-إدارة-الورديات-ومواعيد-العمل-shifts-management)
11. [الرواتب والمكافآت والخصومات ومسير الرواتب (Payroll & Salaries)](#11-الرواتب-والمكافآت-والخصومات-ومسير-الرواتب-payroll--salaries)
12. [إدارة المشاريع (Projects Management)](#12-إدارة-المشاريع-projects-management)
13. [مجموعات المشاريع (Project Groups)](#13-مجموعات-المشاريع-project-groups)
14. [لوحة الملاحظات (Notes Board)](#14-لوحة-الملاحظات-notes-board)
15. [إدارة المهام الشاملة (Tasks Management)](#15-إدارة-المهام-الشاملة-tasks-management)
16. [الموارد البشرية والحضور والطلبات (HRM, Attendance & Requests)](#16-الموارد-البشرية-والحضور-والطلبات-hrm-attendance--requests)
17. [التوظيف والوظائف والمتقدمين (Recruitment & Applications)](#17-التوظيف-والوظائف-والمتقدمين-recruitment--applications)
18. [إدارة مشاريع وفريق المبيعات (Sales System Management)](#18-إدارة-مشاريع-وفريق-المبيعات-sales-system-management)
19. [إدارة الإشعارات وتنبيهات FCM (Notifications & Push Alerts)](#19-إدارة-الإشعارات-وتنبيهات-fcm-notifications--push-alerts)
20. [البصمة الحيوية وتسجيل الوجه (Biometrics & Attendance Verification)](#20-البصمة-الحيوية-وتسجيل-الوجه-biometrics--attendance-verification)

---

## 1. المصادقة وإدارة الجلسات (Authentication & Session)

### 1.1 تسجيل دخول الأدمن — Admin Login
* **الوصف:** تسجيل الدخول للوحة الإدارة بواسطة البريد الإلكتروني وكلمة المرور. يتم التحقق من أن حالة الحساب نشطة (`active`)، ثم توليد رمز الـ JWT.
* **الطريقة:** `POST`
* **الرابط:** `/api/admin/auth/login`
* **Headers:**
  ```http
  Content-Type: application/json
  Accept: application/json
  ```
* **Request Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "secretPassword123"
  }
  ```
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "message": "Login successful",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "e96c9c61-0d2e-4b71-9c63-63167198bb60",
        "name": "Super Admin",
        "email": "admin@example.com",
        "phone": "01012345678",
        "role": "admin",
        "image": "https://taskitobcknd.wegostation.com/uploads/users/admin.png"
      }
    }
  }
  ```
* **Error Response `(401 Unauthorized)`:**
  ```json
  {
    "success": false,
    "message": "Invalid email or password"
  }
  ```

---

### 1.2 جلب مسميات الأدوار من الإعدادات — Settings Terminology Names
* **الوصف:** جلب الأسماء المخصصة للأدوار المحددة في النظام (User / Leader / Admin).
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/auth/settings/names`
* **Headers:** لا يتطلب مصادقة (Public).
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "user": "مهندس",
      "leader": "مدير مشروع",
      "admin": "المدير العام"
    }
  }
  ```

---

### 1.3 تسجيل الخروج — Logout
* **الوصف:** إبطال جلسة العمل الحالية وإضافة رمز الـ JWT إلى القائمة السوداء (Blacklist) لمنع إعادة استخدامه.
* **الطريقة:** `POST`
* **الرابط:** `/api/admin/auth/logout`
* **Headers:**
  ```http
  Authorization: Bearer <ADMIN_JWT_TOKEN>
  ```
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "message": "Logout successful"
    }
  }
  ```

---

### 1.4 توليد هاش لكلمة مرور — Hash Password (أداة مساعدة)
* **الوصف:** تشفير كلمة المرور عبر خوارزمية Bcrypt لاستخدامها عند توليد الحسابات يدوياً أو الصيانة.
* **الطريقة:** `POST`
* **الرابط:** `/api/admin/auth/hash_password`
* **Request Body:**
  ```json
  {
    "password": "mySecurePassword"
  }
  ```
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "password": "$2b$10$abcdefghijklmnopqrstuvwxyz123456"
    }
  }
  ```

---

## 2. الملف الشخصي للأدمن (Admin Profile)

### 2.1 جلب بيانات الملف الشخصي — Get Current Profile
* **الوصف:** جلب كافة بيانات حساب الأدمن المسجل حالياً، متضمنةً القسم، الوردية، الزون الجغرافي، والمسمى الوظيفي.
* **الطريقة:** `GET`
* **الرابط:** `/api/profile` (أو `/api/admin/profile`)
* **Headers:**
  ```http
  Authorization: Bearer <ADMIN_JWT_TOKEN>
  ```
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "profile": {
        "id": "e96c9c61-0d2e-4b71-9c63-63167198bb60",
        "name": "General Admin",
        "email": "admin@example.com",
        "phone": "01012345678",
        "whatsapp": "01012345678",
        "image": "https://taskitobcknd.wegostation.com/uploads/users/profile.jpg",
        "role": "admin",
        "status": "active",
        "points": 500,
        "yearly_holidays": 21,
        "zone_id": "8f8b3c95-3ab7-4a0b-93f5-7286d528b19a",
        "zone": {
          "id": "8f8b3c95-3ab7-4a0b-93f5-7286d528b19a",
          "name": "الفرع الرئيسي - المعادي"
        },
        "shift_id": "3bb622e1-4560-449e-8c34-780cda7b8f9a",
        "shift": {
          "id": "3bb622e1-4560-449e-8c34-780cda7b8f9a",
          "name": "الوردية الصباحية الرسمية"
        },
        "department_id": null,
        "department": null,
        "job_id": null,
        "job": null,
        "createdAt": "2026-01-01T08:00:00.000Z",
        "updatedAt": "2026-11-01T10:00:00.000Z"
      }
    }
  }
  ```

---

### 2.2 تحديث الملف الشخصي للأدمن — Update Current Profile
* **الوصف:** تعديل بيانات الحساب (الاسم، البريد، الهاتف، الواتساب، كلمة المرور الجديدة، الصورة الشخصية).
* **الطريقة:** `PUT` أو `PATCH`
* **الرابط:** `/api/profile`
* **Headers:**
  ```http
  Authorization: Bearer <ADMIN_JWT_TOKEN>
  Content-Type: multipart/form-data
  ```
* **Body Form-Data:**
  * `name` *(string, اختياري)*
  * `email` *(string, email, اختياري)*
  * `phone` *(string, اختياري)*
  * `whatsapp` *(string, اختياري)*
  * `password` *(string, min: 7 chars, اختياري)*
  * `image` *(File binary أو Base64, اختياري)*
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "message": "Profile updated successfully",
      "user": {
        "id": "e96c9c61-0d2e-4b71-9c63-63167198bb60",
        "name": "Updated Admin Name",
        "email": "newadmin@example.com",
        "phone": "01099998888",
        "whatsapp": "01099998888",
        "image": "https://taskitobcknd.wegostation.com/uploads/users/new-image.jpg"
      }
    }
  }
  ```

---

## 3. لوحة التحكم والإحصائيات العامة (Dashboard & Analytics)

### 3.1 إحصائيات النظام الشاملة — System Dashboard Overview
* **الوصف:** جلب الأرقام والإحصائيات العامة للنظام بالكامل (المهام المعلقة، المتأخرة، المنجزة، المعتمدة، ومهام اليوم، وعدد المشاريع، وعدد المهندسين).
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/dashboard`
* **Headers:**
  ```http
  Authorization: Bearer <ADMIN_JWT_TOKEN>
  ```
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "pending_tasks": 28,
      "all_projects": 12,
      "delay_tasks": 5,
      "engineers_count": 34,
      "done_tasks": 115,
      "approve_tasks": 420,
      "total_tasks": 568,
      "today_tasks": 14,
      "all_today_tasks": 22,
      "today_done_tasks": 8,
      "today_approve_tasks": 6
    }
  }
  ```

---

### 3.2 رسم بياني للنقاط السنوية — Points Chart
* **الوصف:** رسم بياني يوضح توزيع النقاط الشهرية المكتسبة على مدار عام كامل. للأدمن إمكانية تمرير `user_id` لأي موظف أو تركها فارغة لعرض نقاط حسابه.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/dashboard/points-chart`
* **Query Parameters:**
  * `year` *(number, اختياري - الافتراضي العام الحالي)*: مثال `2026`
  * `user_id` *(UUID, اختياري)*: معرف الموظف المراد استعراض منحنى نقاطه.
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "totalPointsAllTime": 1250,
      "selectedYearPoints": [
        { "month": 1, "total_points": 120 },
        { "month": 2, "total_points": 140 },
        { "month": 3, "total_points": 95 },
        { "month": 4, "total_points": 210 },
        { "month": 5, "total_points": 80 },
        { "month": 6, "total_points": 110 },
        { "month": 7, "total_points": 130 },
        { "month": 8, "total_points": 90 },
        { "month": 9, "total_points": 105 },
        { "month": 10, "total_points": 160 },
        { "month": 11, "total_points": 10 },
        { "month": 12, "total_points": 0 }
      ]
    }
  }
  ```

---

### 3.3 قائمة الشرف وتصنيف الموظفين — Leaderboard
* **الوصف:** جلب ترتيب أفضل الموظفين والمهندسين أداءً في النظام حسب إجمالي النقاط وسرعة تسليم المهام.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/dashboard/leaderboard`
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "d1e7c541-b844-42b7-a870-76c243cbf46e",
        "name": "Ahmed Hassan",
        "image": "https://taskitobcknd.wegostation.com/uploads/users/ahmed.jpg",
        "total_points": 480,
        "completed_tasks": 42
      },
      {
        "id": "e45f92c1-2290-4d89-9a21-817812903112",
        "name": "Sara Mahmoud",
        "image": "https://taskitobcknd.wegostation.com/uploads/users/sara.jpg",
        "total_points": 420,
        "completed_tasks": 38
      }
    ]
  }
  ```

---

### 3.4 مسميات الأدوار المعرفة بالسيستم — Users Terminology
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/dashboard/usersName`
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "user": "مهندس",
      "leader": "مدير مشروع",
      "admin": "المدير العام"
    }
  }
  ```

---

## 4. إدارة المديرين (Admins Management)

يتحكم الأدمن في حسابات الإدارة والمشرفين عبر مسار `/api/admin/admin`.

### 4.1 جلب قائمة المديرين — Get All Admins
* **الوصف:** استعراض قائمة المشرفين والمديرين مع إمكانية البحث والـ Pagination.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/admin`
* **Query Parameters:**
  * `page` *(number, default: 1)*
  * `limit` *(number, default: 10)*
  * `search` *(string, optional)*: بحث بالاسم، الهاتف، أو الإيميل.
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "Admins": [
        {
          "id": "e96c9c61-0d2e-4b71-9c63-63167198bb60",
          "name": "Main Admin",
          "email": "admin@example.com",
          "phone": "01012345678",
          "image": "https://taskitobcknd.wegostation.com/uploads/admin/avatar.png",
          "role": "admin",
          "status": "active",
          "createdAt": "2026-01-01T08:00:00.000Z"
        }
      ],
      "pagination": {
        "total": 3,
        "page": 1,
        "limit": 10,
        "totalPages": 1
      }
    }
  }
  ```

---

### 4.2 جلب بيانات مدير بالمعرف — Get Admin By ID
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/admin/:id`
* **URL Params:** `id` *(UUID, إجباري)*
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "Admin": {
        "id": "e96c9c61-0d2e-4b71-9c63-63167198bb60",
        "name": "Main Admin",
        "email": "admin@example.com",
        "phone": "01012345678",
        "image": "https://taskitobcknd.wegostation.com/uploads/admin/avatar.png",
        "role": "admin",
        "status": "active"
      }
    }
  }
  ```

---

### 4.3 إنشاء حساب مدير جديد — Create Admin
* **الوصف:** إضافة مستخدم جديد بصلاحية `admin` في النظام مع إمكانية رفع صورة.
* **الطريقة:** `POST`
* **الرابط:** `/api/admin/admin`
* **Headers:** `Content-Type: multipart/form-data`
* **Form-Data Fields:**
  * `name` *(string, إجباري)*: اسم المدير
  * `email` *(string, email, إجباري)*: البريد الإلكتروني (فريد)
  * `phone` *(string, إجباري)*: رقم الهاتف
  * `password` *(string, min: 6 chars, إجباري)*: كلمة المرور
  * `status` *(string, إجباري)*: `"active"` أو `"inactive"`
  * `image` *(File, اختياري)*: الصورة الشخصية
* **Response `(201 Created)`:**
  ```json
  {
    "success": true,
    "data": {
      "message": "Admin created successfully"
    }
  }
  ```

---

### 4.4 تعديل بيانات مدير — Update Admin
* **الطريقة:** `PUT`
* **الرابط:** `/api/admin/admin/:id`
* **URL Params:** `id` *(UUID, إجباري)*
* **Headers:** `Content-Type: multipart/form-data`
* **Form-Data Fields:** الحقول المراد تعديلها (`name`, `email`, `phone`, `password`, `status`, `image`).
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "message": "Admin updated successfully"
    }
  }
  ```

---

### 4.5 حذف مدير — Delete Admin
* **الوصف:** حذف حساب المدير من النظام وحذف صورته من السيرفر.
* **الطريقة:** `DELETE`
* **الرابط:** `/api/admin/admin/:id`
* **URL Params:** `id` *(UUID, إجباري)*
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "message": "Admin deleted successfully"
    }
  }
  ```

---

## 5. إدارة الموظفين والمستخدمين (Users & Employees Management)

### 5.1 استعراض كافة الموظفين — Get All Users
* **الوصف:** قائمة الموظفين (مهندسين، قادة، مناديب مبيعات) مع إحصائيات إنجاز المهام، أيام الإجازات المستهلكة والمتبقية، وحساب نسبة التقدم.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/user`
* **Query Parameters:**
  * `page` *(number, default: 1)*
  * `limit` *(number, default: 10)*
  * `search` *(string, optional)*: بحث بالاسم أو الهاتف أو الإيميل
  * `role` *(string, optional)*: فلترة بالدور (`"engineer"`, `"leader_sales"`, `"sales"`)
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "Users": [
        {
          "id": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
          "name": "Mohamed Ali",
          "email": "mohamed@example.com",
          "phone": "01000000001",
          "whatsapp": "01000000001",
          "image": "https://taskitobcknd.wegostation.com/uploads/users/mohamed.jpg",
          "role": "engineer",
          "status": "active",
          "yearly_holidays": 21,
          "zone_id": "8f8b3c95-3ab7-4a0b-93f5-7286d528b19a",
          "shift_id": "3bb622e1-4560-449e-8c34-780cda7b8f9a",
          "department_id": "11ab3c95-3ab7-4a0b-93f5-7286d528b111",
          "job_id": "99bb3c95-3ab7-4a0b-93f5-7286d528b999",
          "job": {
            "id": "99bb3c95-3ab7-4a0b-93f5-7286d528b999",
            "name": "Frontend Developer"
          },
          "delay_tasks": 2,
          "progress": 85.5,
          "done_progress": 10.0,
          "used_holidays": 3,
          "remaining_holidays": 18,
          "createdAt": "2026-02-15T09:00:00.000Z"
        }
      ],
      "pagination": {
        "total": 35,
        "page": 1,
        "limit": 10,
        "totalPages": 4
      }
    }
  }
  ```

---

### 5.2 لوحة المتابعة الحية للموظفين — Live Employees Attendance & Tasks
* **الوصف:** رصد حي وفوري لحالة كل موظف اليوم (هل هو حاضر Onsite، مسجل أونلاين، في إجازة، مستأذن، متأخر أو غائب)، بالإضافة إلى المهمة الجاري العمل عليها حالياً ونسبة إنجازه.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/user/employee-live`
* **Query Parameters:**
  * `page` *(number, default: 1)*
  * `limit` *(number, default: 10)*
  * `search` *(string, optional)*
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "employees": [
        {
          "id": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
          "name": "Mohamed Ali",
          "image": "https://taskitobcknd.wegostation.com/uploads/users/mohamed.jpg",
          "department": "تطوير البرمجيات",
          "attendance_status": "attended",
          "check_in_time": "09:05:00",
          "check_out_time": null,
          "total_hours": 4.5,
          "current_task": {
            "id": " task-uuid-1",
            "name": "Build Dashboard Widgets",
            "status": "inprogress"
          },
          "progress": 80.0
        }
      ],
      "pagination": {
        "total": 34,
        "page": 1,
        "limit": 10,
        "totalPages": 4
      }
    }
  }
  ```

---

### 5.3 جلب القوائم المنسدلة لإنشاء مستخدم — Dropdown Lists
* **الوصف:** جلب المناطق الجغرافية، الورديات، الأقسام، والمسميات الوظيفية النشطة لملء الـ Selects في شاشات الموظفين.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/user/lists`
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "zones_list": [
        { "id": "8f8b3c95-3ab7-4a0b-93f5-7286d528b19a", "name": "الفرع الرئيسي" }
      ],
      "shifts_list": [
        { "id": "3bb622e1-4560-449e-8c34-780cda7b8f9a", "name": "دوام صباحي", "zone_id": "8f8b3c95-3ab7-4a0b-93f5-7286d528b19a" }
      ],
      "departments_list": [
        { "id": "11ab3c95-3ab7-4a0b-93f5-7286d528b111", "name": "قسم الويب", "zone_id": "8f8b3c95-3ab7-4a0b-93f5-7286d528b19a" }
      ],
      "jobs_list": [
        { "id": "99bb3c95-3ab7-4a0b-93f5-7286d528b999", "name": "Full Stack Engineer" }
      ]
    }
  }
  ```

---

### 5.4 قائمة خفيفة لاختيار الموظفين — Users Selection List
* **الوصف:** استدعاء قائمة سريعة بأسماء ومعرفات الموظفين (مثلاً لإسناد الرواتب أو تعيين مهمة).
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/user/selection-list`
* **Query Parameters:**
  * `withoutSalary` *(boolean, optional - `true`)*: لجلب فقط الموظفين الذين ليس لديهم راتب مسجل بعد.
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "Users": [
        { "id": "c84138a0-2f34-4bc1-9c81-8071e62cf011", "name": "Mohamed Ali" },
        { "id": "a190df1a-5cb2-4a0f-bd99-f2a89320b561", "name": "Khaled Omar" }
      ]
    }
  }
  ```

---

### 5.5 جلب بيانات موظف محدد — Get User By ID
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/user/:id`
* **URL Params:** `id` *(UUID, إجباري)*
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "User": {
        "id": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
        "name": "Mohamed Ali",
        "email": "mohamed@example.com",
        "phone": "01000000001",
        "whatsapp": "01000000001",
        "image": "https://taskitobcknd.wegostation.com/uploads/users/mohamed.jpg",
        "role": "engineer",
        "status": "active",
        "yearly_holidays": 21,
        "zone_id": "8f8b3c95-3ab7-4a0b-93f5-7286d528b19a",
        "shift_id": "3bb622e1-4560-449e-8c34-780cda7b8f9a",
        "department_id": "11ab3c95-3ab7-4a0b-93f5-7286d528b111",
        "job_id": "99bb3c95-3ab7-4a0b-93f5-7286d528b999",
        "job": {
          "id": "99bb3c95-3ab7-4a0b-93f5-7286d528b999",
          "name": "Frontend Developer"
        },
        "used_holidays": 2,
        "remaining_holidays": 19
      }
    }
  }
  ```

---

### 5.6 تقرير حضور وانصراف تفصيلي للموظف — User Attendance Report
* **الوصف:** استخراج تقرير حضور الموظف لفترة زمنية محددة أو لشهر معين، يشمل حساب أيام الحضور، التأخير بالساعات، الإجازات، والغياب غير المبرر.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/user/:id/attendance-report`
* **URL Params:** `id` *(UUID, إجباري)*
* **Query Parameters:**
  * `month` *(number, 1-12, optional)*
  * `year` *(number, optional)*
  * `from` *(date string YYYY-MM-DD, optional)*
  * `to` *(date string YYYY-MM-DD, optional)*
  * `page` *(number, default: 1)*
  * `limit` *(number, default: 10)*
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "summary": {
        "totalDays": 30,
        "attendedDays": 22,
        "absentDays": 0,
        "unexcusedAbsence": 0,
        "holidayApproved": 2,
        "holidayRejected": 0,
        "onlineApproved": 4,
        "totalDelayHours": 1.25,
        "totalWorkingHours": 176.5
      },
      "records": [
        {
          "date": "2026-11-01",
          "check_in": "09:02:00",
          "check_out": "17:05:00",
          "hours": 8.05,
          "delay": "00:02:00",
          "status": "attended",
          "onsite": true
        }
      ],
      "pagination": {
        "total": 30,
        "page": 1,
        "limit": 10,
        "totalPages": 3
      }
    }
  }
  ```

---

### 5.7 إنشاء موظف جديد — Create User
* **الوصف:** تسجيل موظف جديد وتعيين الوردية والزون الجغرافي وبصمة الوجه الرقمية (Vector).
* **الطريقة:** `POST`
* **الرابط:** `/api/admin/user`
* **Headers:** `Content-Type: multipart/form-data`
* **Body Form-Data:**
  * `name` *(string, إجباري)*
  * `email` *(string, email, إجباري)*
  * `phone` *(string, إجباري)*
  * `whatsapp` *(string, اختياري)*
  * `password` *(string, min: 6 chars, إجباري)*
  * `status` *(string, `"active"` أو `"inactive"`, إجباري)*
  * `yearly_holidays` *(boolean, اختياري)*
  * `zone_id` *(UUID, اختياري)*
  * `shift_id` *(UUID, اختياري)*
  * `department_id` *(UUID, اختياري)*
  * `job_id` *(UUID, اختياري)*
  * `vector_image_array` *(JSON string / Array of numbers, اختياري - لبصمة الوجه)*
  * `image` *(File, اختياري)*
* **Response `(201 Created)`:**
  ```json
  {
    "success": true,
    "data": {
      "message": "User created successfully"
    }
  }
  ```

---

### 5.8 تعديل موظف — Update User
* **الطريقة:** `PUT`
* **الرابط:** `/api/admin/user/:id`
* **Headers:** `Content-Type: multipart/form-data`
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "message": "User updated successfully"
    }
  }
  ```

---

### 5.9 حذف موظف — Delete User
* **الوصف:** حذف الموظف مع تفريغ ارتباطاته بالمهام والمشاريع وتنظيف كافة السجلات التابعة له.
* **الطريقة:** `DELETE`
* **الرابط:** `/api/admin/user/:id`
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "message": "User deleted successfully"
    }
  }
  ```

---

## 6. إدارة أيام العمل أونلاين (User Online Days Management)

مسار خاص بالأدمن لتحديد الأيام المسموح للموظفين (Leader / Engineer / Leader Sales) بالعمل فيها عن بعد من المنزل.

### 6.1 استعراض أيام الأونلاين للموظفين — Get Users Online Days
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/user-online-days`
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "users": [
        {
          "id": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
          "name": "Mohamed Ali",
          "email": "mohamed@example.com",
          "phone": "01000000001",
          "role": "engineer",
          "online_days": ["sunday", "wednesday"]
        }
      ]
    }
  }
  ```

---

### 6.2 تحديث أيام الأونلاين لموظف أو أكثر — Update Users Online Days
* **الوصف:** تحديث الأيام المعتمدة وإرسال إشعار لحظي (Realtime Socket + Notification) للموظفين المحددين.
* **الطريقة:** `PUT`
* **الرابط:** `/api/admin/user-online-days`
* **Request Body:**
  ```json
  {
    "userIds": ["c84138a0-2f34-4bc1-9c81-8071e62cf011"],
    "days": ["sunday", "thursday"]
  }
  ```
  *(الأيام المقبولة: `sunday`, `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`)*
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "message": "Online days updated successfully for 1 user(s)"
    }
  }
  ```

---

## 7. إدارة الأقسام (Departments Management)

### 7.1 جلب الأقسام — Get All Departments
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/departments`
* **Query Parameters:** `page`, `limit`, `search`
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "departments": [
        {
          "id": "11ab3c95-3ab7-4a0b-93f5-7286d528b111",
          "name": "Web Development",
          "description": "Frontend and Backend teams",
          "status": true,
          "zone_id": "8f8b3c95-3ab7-4a0b-93f5-7286d528b19a",
          "zone_name": "المقر الرئيسي",
          "manager_id": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
          "manager_name": "Mohamed Ali",
          "createdAt": "2026-01-10T12:00:00.000Z"
        }
      ],
      "pagination": { "total": 5, "page": 1, "limit": 10, "totalPages": 1 }
    }
  }
  ```

---

### 7.2 متطلبات نموذج القسم — Department Dependencies
* **الوصف:** جلب الفروع والمديرين المتاحين لاختيار مدير للقسم.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/departments/dependencies`
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "zones": [{ "id": "8f8b3c95-3ab7-4a0b-93f5-7286d528b19a", "name": "المقر الرئيسي" }],
      "managers": [{ "id": "c84138a0-2f34-4bc1-9c81-8071e62cf011", "name": "Mohamed Ali" }]
    }
  }
  ```

---

### 7.3 إنشاء قسم جديد — Create Department
* **الطريقة:** `POST`
* **الرابط:** `/api/admin/departments`
* **Request Body:**
  ```json
  {
    "name": "Mobile Apps Department",
    "description": "Flutter and iOS/Android development",
    "zone_id": "8f8b3c95-3ab7-4a0b-93f5-7286d528b19a",
    "manager_id": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
    "status": true
  }
  ```
* **Response `(201 Created)`:**
  ```json
  {
    "success": true,
    "data": { "message": "Department created successfully" }
  }
  ```

---

### 7.4 تعديل وحذف قسم — Update & Delete Department
* **تعديل:** `PUT /api/admin/departments/:id` (إرسال الحقول المراد تعديلها)
* **حذف:** `DELETE /api/admin/departments/:id`
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": { "message": "Department deleted successfully" }
  }
  ```

---

## 8. إعدادات النظام والشركة (Settings & Company)

### 8.1 جلب إعدادات النظام وقواعد الخصومات — Get System Settings
* **الوصف:** جلب إعدادات احتساب النقاط، خصومات الغياب والأونلاين بدون إذن، والحد الأقصى للتبكير والتأخير.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/settings`
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "Names": {
        "id": "e7c10b41-3ab7-4a0b-93f5-7286d528b999",
        "user": "مهندس",
        "leader": "مدير مشروع",
        "admin": "المدير العام",
        "task_approve_points": 10,
        "task_edit_points": 5,
        "task_delay_points": -5,
        "online_days": ["sunday", "wednesday"],
        "delay_premission_minutes": 120,
        "yearly_holidays": 21,
        "allowed_unauthorized_holidays": 2,
        "rejected_online_deduction": 1.0,
        "rejected_holiday_deduction": 1.0,
        "online_without_permission_deduction": 1.0,
        "holiday_without_permission_deduction": 2.0,
        "delay_per_hour_deduction": 1.0,
        "early_max": "08:30:00",
        "late_max": "18:00:00"
      }
    }
  }
  ```

---

### 8.2 تحديث إعدادات النظام — Update System Settings
* **الطريقة:** `PUT`
* **الرابط:** `/api/admin/settings/:id`
* **Request Body:**
  ```json
  {
    "user": "مهندس",
    "leader": "قائد فريق",
    "admin": "إدارة",
    "task_approve_points": 15,
    "task_edit_points": 5,
    "task_delay_points": -10,
    "yearly_holidays": 21,
    "delay_per_hour_deduction": 1.5,
    "early_max": "08:30:00",
    "late_max": "18:30:00"
  }
  ```
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": { "message": "Settings updated successfully" }
  }
  ```

---

### 8.3 جلب وتحديث بيانات الشركة والشعار — Company Profile
* **جلب بيانات الشركة:** `GET /api/admin/company`
* **تحديث بيانات الشركة:** `PUT /api/admin/company` (`multipart/form-data`):
  * `name`, `owner_name`, `address`, `phone`, `whatts`, `facebook`, `instgram`, `email`, `logo` (File).
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "company-uuid",
      "name": "Systego Tech",
      "owner_name": "Eng. Khaled",
      "phone": "01012345678",
      "logo": "https://taskitobcknd.wegostation.com/uploads/companies/logo.png"
    }
  }
  ```

---

## 9. المناطق الجغرافية ومواقع الفروع (Geofence Zones & Cities)

### 9.1 جلب المناطق والفروع مع إحداثيات الجغرافية — Get All Zones
* **الوصف:** جلب كافة الفروع الجغرافية المسجلة للبصمة متضمنة إحداثيات الـ Polygon أو النطاق الدائري، ومطابقة عنوان الـ IP أو MAC Address لراوتر الفرع.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/zones`
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "Zones": [
        {
          "id": "8f8b3c95-3ab7-4a0b-93f5-7286d528b19a",
          "name": "المقر الرئيسي - المعادي",
          "locations": [
            { "lat": 29.9602, "lng": 31.2569 },
            { "lat": 29.9610, "lng": 31.2580 },
            { "lat": 29.9590, "lng": 31.2585 }
          ],
          "status": true,
          "router_ip_status": true,
          "router_ip": "156.210.12.89",
          "shifts": []
        }
      ]
    }
  }
  ```

---

### 9.2 إنشاء منطقة جغرافية للفرع — Create Zone
* **الطريقة:** `POST`
* **الرابط:** `/api/admin/zones`
* **Request Body:**
  ```json
  {
    "name": "فرع المهندسين",
    "locations": [
      { "lat": 30.0561, "lng": 31.2089 },
      { "lat": 30.0570, "lng": 31.2099 },
      { "lat": 30.0550, "lng": 31.2105 }
    ],
    "status": true,
    "router_ip_status": true,
    "router_ip": "197.34.120.15"
  }
  ```
* **Response `(201 Created)`:**
  ```json
  {
    "success": true,
    "data": { "message": "Zone created successfully" }
  }
  ```

---

### 9.3 تعديل وحذف منطقة — Update & Delete Zone
* **تعديل:** `PUT /api/admin/zones/:id`
* **حذف:** `DELETE /api/admin/zones/:id`
* **قائمة خفيفة للمناطق:** `GET /api/admin/zones/lists`

---

### 9.4 إدارة المدن للتوظيف — Cities CRUD
تُستخدم المدن في ربط وظائف وطلبات التوظيف:
* `GET /api/admin/cities` (دعم `page`, `limit`, `search`)
* `GET /api/admin/cities/:id`
* `POST /api/admin/cities` (`{"name": "القاهرة", "status": true}`)
* `PUT /api/admin/cities/:id`
* `DELETE /api/admin/cities/:id`

---

## 10. إدارة الورديات ومواعيد العمل (Shifts Management)

### 10.1 جلب كافة الورديات — Get All Shifts
* **الوصف:** جلب كافة الورديات ومواعيد بدايتها ونهايتها وساعات العمل المعتمدة لكل يوم من أيام الأسبوع.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/shifts`
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "Shifts": [
        {
          "id": "3bb622e1-4560-449e-8c34-780cda7b8f9a",
          "name": "دوام صباحي رسمي",
          "zone_id": "8f8b3c95-3ab7-4a0b-93f5-7286d528b19a",
          "zone_name": "المقر الرئيسي",
          "days": {
            "sunday": { "start": "09:00:00", "end": "17:00:00", "hours": 8, "is_off": false },
            "monday": { "start": "09:00:00", "end": "17:00:00", "hours": 8, "is_off": false },
            "tuesday": { "start": "09:00:00", "end": "17:00:00", "hours": 8, "is_off": false },
            "wednesday": { "start": "09:00:00", "end": "17:00:00", "hours": 8, "is_off": false },
            "thursday": { "start": "09:00:00", "end": "17:00:00", "hours": 8, "is_off": false },
            "friday": { "start": "", "end": "", "hours": 0, "is_off": true },
            "saturday": { "start": "", "end": "", "hours": 0, "is_off": true }
          }
        }
      ]
    }
  }
  ```

---

### 10.2 إنشاء وتعديل وحذف وردية — Shifts Operations
* **إنشاء وردية:** `POST /api/admin/shifts`
  ```json
  {
    "name": "دوام مسائي مرن",
    "zone_id": "8f8b3c95-3ab7-4a0b-93f5-7286d528b19a",
    "days": {
      "sunday": { "start": "13:00:00", "end": "21:00:00", "hours": 8, "is_off": false }
    }
  }
  ```
* **تعديل وردية:** `PUT /api/admin/shifts/:id`
* **حذف وردية:** `DELETE /api/admin/shifts/:id`

---

## 11. الرواتب والمكافآت والخصومات ومسير الرواتب (Payroll & Salaries)

### 11.1 إدارة الرواتب الأساسية — Employee Salaries
* **جلب رواتب الموظفين:** `GET /api/admin/salaries?page=1&limit=10`
* **جلب راتب موظف محدد:** `GET /api/admin/salaries/:id`
* **تحديد راتب لموظف:** `POST /api/admin/salaries`
  ```json
  {
    "user_id": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
    "salary": 18000
  }
  ```
* **تعديل راتب موظف:** `PUT /api/admin/salaries/:id` (`{"salary": 20000}`)
* **حذف سجل راتب:** `DELETE /api/admin/salaries/:id`

---

### 11.2 إدارة المكافآت — Bonuses Management
* **جلب المكافآت:** `GET /api/admin/bonuses?page=1&limit=10`
* **إضافة مكافأة لموظف:** `POST /api/admin/bonuses`
  ```json
  {
    "userId": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
    "type": "Performance Incentive",
    "amount": 1500,
    "month": 11,
    "year": 2026
  }
  ```
* **تعديل مكافأة:** `PUT /api/admin/bonuses/:id`
* **حذف مكافأة:** `DELETE /api/admin/bonuses/:id`

---

### 11.3 إدارة الخصومات الإدارية — Deductions Management
* **جلب الخصومات:** `GET /api/admin/deductions?page=1&limit=10`
* **إضافة خصم يدوي لموظف:** `POST /api/admin/deductions`
  ```json
  {
    "userId": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
    "type": "Admin Violation",
    "amount": 500,
    "month": 11,
    "year": 2026
  }
  ```
* **تعديل خصم:** `PUT /api/admin/deductions/:id`
* **حذف خصم:** `DELETE /api/admin/deductions/:id`

---

### 11.4 احتساب مسير الرواتب الشهري العام — Generate Monthly Payroll
* **الوصف:** حساب شامل للرواتب لكافة الموظفين للشهر المحدد. يطبق الخوارزمية الآلية:
  1. حساب الراتب الأساسي النسبي بحسب تاريخ التعيين وأيام الشهر.
  2. حساب استقطاعات الغياب والتأخيرات والعمل عن بعد غير المصرح به وفقاً لإعدادات النظام.
  3. إضافة المكافآت المعتمدة وخصم الاستقطاعات الإدارية.
  4. استخراج صافي الراتب النهائي لكل موظف مع الإجماليات الشاملة.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/payroll`
* **Query Parameters:**
  * `month` *(number, 1-12, إجباري)*
  * `year` *(number, e.g. 2026, إجباري)*
  * `page` *(number, default: 1)*
  * `limit` *(number, default: 10)*
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "payroll": [
        {
          "user": {
            "id": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
            "name": "Mohamed Ali",
            "role": "engineer"
          },
          "baseSalary": 18000,
          "dailyRate": 600,
          "proratedBaseSalary": 18000,
          "attendanceSummary": {
            "presentDays": 22,
            "absentDays": 0,
            "unexcusedAbsence": 0,
            "holidayApproved": 2,
            "onlineApproved": 4,
            "totalDelayHours": 0
          },
          "deductions": {
            "manualDeductions": 500,
            "absenceDeductions": 0,
            "delayDeductions": 0,
            "totalDeductions": 500
          },
          "bonuses": {
            "manualBonuses": 1500,
            "totalBonuses": 1500
          },
          "netSalary": 19000
        }
      ],
      "summary": {
        "totalSalaries": 240000,
        "totalDeductions": 8500,
        "totalBonuses": 15000,
        "netTotal": 246500
      },
      "pagination": {
        "total": 15,
        "page": 1,
        "limit": 10,
        "totalPages": 2
      }
    }
  }
  ```

---

## 12. إدارة المشاريع (Projects Management)

### 12.1 جلب المشاريع — Get All Projects
* **الوصف:** استعراض كافة المشاريع مع إجمالي المهام، وعدد المهندسين، والليدر/المختبر المسؤول.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/project`
* **Query Parameters:** `page`, `limit`, `search`
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "Projects": [
        {
          "id": "42f9b841-3ab7-4a0b-93f5-7286d528b123",
          "name": "E-Commerce App",
          "description": "Multi-vendor online store",
          "logo": "https://taskitobcknd.wegostation.com/uploads/projects/logo.png",
          "documentation": "https://taskitobcknd.wegostation.com/uploads/projects/doc.pdf",
          "tester_id": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
          "tester_name": "Mohamed Ali",
          "total_tasks": 35,
          "done_tasks": 20,
          "users_count": 6
        }
      ],
      "pagination": { "total": 8, "page": 1, "limit": 10, "totalPages": 1 }
    }
  }
  ```

---

### 12.2 جلب تفاصيل مشروع ومستخدميه — Project Details & Users
* **تفاصيل المشروع:** `GET /api/admin/project/:id`
* **مستخدمي المشروع:** `GET /api/admin/project/:id/users`
* **قوائم تعيين المشروع:** `GET /api/admin/project/lists` (قائمة المستخدمين المتاحين كمهندسين أو ليدرز).

---

### 12.3 إنشاء مشروع جديد — Create Project
* **الطريقة:** `POST`
* **الرابط:** `/api/admin/project`
* **Headers:** `Content-Type: multipart/form-data`
* **Form-Data Fields:**
  * `name` *(string, إجباري)*
  * `description` *(string, اختياري)*
  * `tester_id` *(UUID, اختياري - قائد المشروع/المختبر)*
  * `users_ids` *(Array of UUIDs, إجباري - مثل `["uuid1", "uuid2"]`)*
  * `logo` *(File, اختياري)*
  * `documentation` *(File, اختياري)*
* **Response `(201 Created)`:**
  ```json
  {
    "success": true,
    "data": { "message": "Project created successfully" }
  }
  ```

---

### 12.4 تعديل وحذف مشروع — Update & Delete Project
* **تعديل المشروع:** `PUT /api/admin/project/:id` (`multipart/form-data`)
* **حذف ملف التوثيق فقط:** `DELETE /api/admin/project/:id/documentation`
* **حذف المشروع بالكامل:** `DELETE /api/admin/project/:id`

---

## 13. مجموعات المشاريع (Project Groups)

تسمح بتنظيم مهام المشروع في مجموعات (مثل: Sprint 1, Backend, UI/UX).

### 13.1 جلب المجموعات — Get Project Groups
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/projectGroup`
* **Query Parameters:** `page`, `limit`, `project_id`, `search`
* **العمليات المتاحة:**
  * `GET /api/admin/projectGroup/lists`
  * `GET /api/admin/projectGroup/:id`
  * `GET /api/admin/projectGroup/:id/users`
  * `POST /api/admin/projectGroup` (Fields: `name`, `project_id`, `users_ids`, `documentation` File)
  * `PUT /api/admin/projectGroup/:id`
  * `DELETE /api/admin/projectGroup/:id/documentation`
  * `DELETE /api/admin/projectGroup/:id`

---

## 14. لوحة الملاحظات (Notes Board)

ملاحظات عامة لمجموعات العمل بين الأدمن والمطورين.

* **جلب ملاحظات مجموعة:** `GET /api/admin/notesBoard/group/:groupId?page=1&limit=20`
* **إنشاء ملاحظة:** `POST /api/admin/notesBoard`
  ```json
  {
    "group_id": "group-uuid",
    "notes": "يرجى الالتزام بمعايير الـ Code Review قبل إرسال المهام للاعتماد."
  }
  ```
* **تعديل ملاحظة:** `PUT /api/admin/notesBoard/:id`
* **حذف ملاحظة:** `DELETE /api/admin/notesBoard/:id`

---

## 15. إدارة المهام الشاملة (Tasks Management)

يمتلك الأدمن صلاحيات كاملة ومطلقة على كافة مهام النظام.

### 15.1 جلب كافة المهام مع الفلترة المتقدمة — Get All Tasks
* **الوصف:** جلب المهام مع إمكانية الفلترة بحسب الحالة، المشروع، المجموعة، المهندس المسؤول، وتاريخ التسليم.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/tasks`
* **Query Parameters:**
  * `page`, `limit`, `search`
  * `status`: `"pending"`, `"inprogress"`, `"done"`, `"edit"`, `"approve"`
  * `project_id`: فلترة بمشروع
  * `group_id`: فلترة بمجموعة عمل
  * `user_id`: فلترة بمهندس محدد
* **فلاتر سريعة جاهزة (Quick Views):**
  * مهام اليوم: `GET /api/admin/tasks/todayTasks`
  * المهام المعلقة: `GET /api/admin/tasks/pendingTasks`
  * المهام المتأخرة: `GET /api/admin/tasks/delayTasks`
  * المهام المنجزة: `GET /api/admin/tasks/doneTasks`
  * إحصائيات حالات المهام: `GET /api/admin/tasks/status-counts`
  * القوائم المنسدلة لإنشاء مهمة: `GET /api/admin/tasks/lists`

---

### 15.2 إنشاء مهمة جديدة — Create Task
* **الطريقة:** `POST`
* **الرابط:** `/api/admin/tasks`
* **Headers:** `Content-Type: multipart/form-data`
* **Form-Data Fields:**
  * `name` *(string, إجباري)*: عنوان المهمة
  * `description` *(string, اختياري)*: الشرح والوصف
  * `project_id` *(UUID, إجباري)*
  * `group_id` *(UUID, إجباري)*
  * `delivery_date` *(Date string YYYY-MM-DD, إجباري)*: موعد التسليم
  * `date_urgent` *(Date string YYYY-MM-DD, اختياري)*
  * `importanc_status` *(string)*: `"low"`, `"medium"`, `"high"`, `"urgent"`
  * `status` *(string)*: `"pending"`, `"inprogress"`, `"done"`, `"edit"`, `"approve"`
  * `user_id` *(UUID, اختياري)*: المهندس الأساسي للمهمة
  * `users_ids` *(Array of UUIDs, إجباري)*: فريق المهندسين
  * `documentation` *(File, اختياري)*: مرفق المهمة
* **Response `(201 Created)`:**
  ```json
  {
    "success": true,
    "data": { "message": "Task created successfully" }
  }
  ```

---

### 15.3 إنشاء دفعة مهام مجمعة — Batch Create Tasks (حصري للأدمن)
* **الوصف:** إضافة عدة مهام دفعة واحدة في طلب واحد (Bulk Insert) ومتاحة فقط لدور الأدمن.
* **الطريقة:** `POST`
* **الرابط:** `/api/admin/tasks/batch`
* **Request Body:**
  ```json
  {
    "tasks": [
      {
        "name": "Design Login Screen",
        "project_id": "42f9b841-3ab7-4a0b-93f5-7286d528b123",
        "group_id": "b1e9c541-3ab7-4a0b-93f5-7286d528b456",
        "delivery_date": "2026-11-10",
        "date_urgent": "2026-11-12",
        "description": "Figma clean UI",
        "importanc_status": "high",
        "status": "pending",
        "users_ids": ["c84138a0-2f34-4bc1-9c81-8071e62cf011"]
      },
      {
        "name": "Implement JWT Auth API",
        "project_id": "42f9b841-3ab7-4a0b-93f5-7286d528b123",
        "group_id": "b1e9c541-3ab7-4a0b-93f5-7286d528b456",
        "delivery_date": "2026-11-11",
        "date_urgent": "2026-11-13",
        "description": "Bcrypt and JWT tokens",
        "importanc_status": "medium",
        "status": "pending",
        "users_ids": ["c84138a0-2f34-4bc1-9c81-8071e62cf011"]
      }
    ]
  }
  ```
* **Response `(201 Created)`:**
  ```json
  {
    "success": true,
    "data": { "message": "2 tasks created successfully" }
  }
  ```

---

### 15.4 تغيير حالة مهام مجمعة — Bulk Update Task Status
* **الوصف:** تحديث حالة مجموعة مهام بضغطة زر واحدة.
* **الطريقة:** `PUT`
* **الرابط:** `/api/admin/tasks/bulk-status`
* **Request Body:**
  ```json
  {
    "taskIds": ["task-uuid-1", "task-uuid-2"],
    "status": "approve"
  }
  ```
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": { "message": "Status updated successfully" }
  }
  ```

---

### 15.5 إعادة ترتيب المهام — Reorder Tasks
* **الوصف:** تعديل ترتيب المهام بالسحب والإفلات (Drag & Drop).
* **الطريقة:** `PUT`
* **الرابط:** `/api/admin/tasks/reorder`
* **Request Body:**
  ```json
  {
    "tasks": [
      { "id": "task-uuid-1", "sort": 1 },
      { "id": "task-uuid-2", "sort": 2 }
    ]
  }
  ```

---

### 15.6 الملاحظات الصوتية للمهمة — Task Voice Notes
* **استماع للملاحظات الصوتية للمهمة:** `GET /api/admin/tasks/:id/voices`
* **تسجيل ورفع ملاحظة صوتية:** `POST /api/admin/tasks/:id/voices` (`multipart/form-data`, file key: `voice`)
* **حذف ملاحظة صوتية:** `DELETE /api/admin/tasks/:id/voices/:voiceId`

---

## 16. الموارد البشرية والحضور والطلبات (HRM, Attendance & Requests)

### 16.1 طلبات الإجازات (Holiday Requests)
* **جلب طلبات الإجازات:**
  * `GET /api/admin/hrm/holiday-requests?status=pending&page=1&limit=10` (الطلبات المعلقة)
  * `GET /api/admin/hrm/holiday-requests?status=history&page=1&limit=10` (سجل الطلبات السابقة)
* **الموافقة أو الرفض على إجازة:** `PUT /api/admin/hrm/holiday-requests/:id/status`
  ```json
  {
    "status": "approve" // أو "reject" أو "pending"
  }
  ```
* **إضافة إجازة لموظف يدويًا:** `POST /api/admin/hrm/holiday-requests`
  ```json
  {
    "userId": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
    "date": "2026-11-20"
  }
  ```
* **تعديل إجازة:** `PUT /api/admin/hrm/holiday-requests/:id`
* **حذف إجازة:** `DELETE /api/admin/hrm/holiday-requests/:id`

---

### 16.2 طلبات العمل عن بعد (Online Requests)
* **جلب طلبات الأونلاين:** `GET /api/admin/hrm/online-requests?status=pending`
* **تحديث حالة طلب أونلاين:** `PUT /api/admin/hrm/online-requests/:id/status` (`{"status": "approve"}`)
* **إضافة / تعديل / حذف:**
  * `POST /api/admin/hrm/online-requests` (`{"userId": "UUID", "date": "2026-11-22"}`)
  * `PUT /api/admin/hrm/online-requests/:id`
  * `DELETE /api/admin/hrm/online-requests/:id`

---

### 16.3 أذونات التأخير والمغادرة (Permissions)
* **جلب الأذونات:** `GET /api/admin/hrm/permissions?status=pending`
* **الموافقة أو الرفض:** `PUT /api/admin/hrm/permissions/:id/status` (`{"status": "approve"}`)
* **إضافة إذن لموظف:** `POST /api/admin/hrm/permissions`
  ```json
  {
    "userId": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
    "date": "2026-11-15",
    "hours": 2,
    "reason": "زيارة طبية"
  }
  ```
* **تعديل إذن:** `PUT /api/admin/hrm/permissions/:id`
* **حذف إذن:** `DELETE /api/admin/hrm/permissions/:id`

---

### 16.4 طلبات الوقت الإضافي (Extra Time Requests)
* **جلب طلبات الوقت الإضافي:** `GET /api/admin/hrm/extra-time-requests?status=pending`
* **الموافقة أو الرفض:** `PUT /api/admin/hrm/extra-time-requests/:id/status` (`{"status": "approve"}`)
* **إضافة طلب وقت إضافي:** `POST /api/admin/hrm/extra-time-requests`
  ```json
  {
    "userId": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
    "date": "2026-11-10",
    "early_attend": true,
    "late_leave": false
  }
  ```
* **حذف طلب:** `DELETE /api/admin/hrm/extra-time-requests/:id`

---

### 16.5 سجلات الحضور والانصراف (Attendance Management)
* **استعراض سجلات الحضور:**
  `GET /api/admin/hrm/attendance?from=2026-11-01&to=2026-11-30&userId=UUID&page=1&limit=20`
* **فحص الحالة الحالية للموظف:** `GET /api/admin/hrm/attendance/status/:userId`
* **تسجيل حضور / انصراف يدوي لموظف (Check-in / Check-out):**
  `POST /api/admin/hrm/attendance`
  ```json
  {
    "userId": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
    "from": "2026-11-03T09:00:00.000Z",
    "to": "2026-11-03T17:00:00.000Z",
    "onsite": true,
    "isRequestOnline": false
  }
  ```
* **تعديل سجل حضور:** `PUT /api/admin/hrm/attendance/:id`
* **حذف سجل حضور:** `DELETE /api/admin/hrm/attendance/:id`

---

### 16.6 نظام الإجازات الأسبوعية الرسمية (Holidays System)
* **جلب إعدادات الإجازات الأسبوعية:** `GET /api/admin/hrm/holidays-system`
* **تحديث نظام الإجازات:** `PUT /api/admin/hrm/holidays-system`
  ```json
  {
    "type": "fixed", // أو "number"
    "days": ["friday", "saturday"]
  }
  ```

---

## 17. التوظيف والوظائف والمتقدمين (Recruitment & Applications)

### 17.1 إدارة الوظائف الشاغرة (Jobs)
* `GET /api/admin/jobs?page=1&limit=10&search=Developer`
* `GET /api/admin/jobs/:id`
* `POST /api/admin/jobs` (`{"name": "Backend Node.js Developer", "status": true}`)
* `PUT /api/admin/jobs/:id`
* `DELETE /api/admin/jobs/:id`

---

### 17.2 إدارة المؤهلات والاشتراطات (Qualifications)
* `GET /api/admin/qualifications`
* `GET /api/admin/qualifications/:id`
* `POST /api/admin/qualifications` (`{"name": "بكالوريوس هندسة حاسبات", "status": true}`)
* `PUT /api/admin/qualifications/:id`
* `DELETE /api/admin/qualifications/:id`

---

### 17.3 إدارة طلبات المتقدمين للوظائف (Job Applications)
* **جلب قائمة المتقدمين:**
  `GET /api/admin/applications?favourite=true&search=Ahmed&page=1&limit=10`
* **جلب تفاصيل متقدم وسيرته الذاتية:** `GET /api/admin/applications/:id`
* **تمييز متقدم كمفضل (Favorite Toggle):** `PATCH /api/admin/applications/:id/favourite`
  ```json
  {
    "favourite": true
  }
  ```
* **حذف طلب التوظيف:** `DELETE /api/admin/applications/:id`

---

## 18. إدارة مشاريع وفريق المبيعات (Sales System Management)

### 18.1 إدارة مشاريع المبيعات (Sales Projects)
* **المسار:** `/api/admin/sales-projects`
* **المستخدمين المتاحين للتعيين:** `GET /api/admin/sales-projects/available-users`
* **جلب كافة مشاريع المبيعات:** `GET /api/admin/sales-projects?page=1&limit=12`
* **جلب تفاصيل مشروع مبيعات:** `GET /api/admin/sales-projects/:id`
* **توليد رمز الدخول لمشروع مبيعات:** `GET /api/admin/sales-projects/:id/access-token`
* **إنشاء مشروع مبيعات:** `POST /api/admin/sales-projects` (`multipart/form-data`)
  * `name`, `design` (`"design 1"` أو `"design 2"`), `user_ids` (JSON Array), `logo` (File).
* **تعديل مشروع مبيعات:** `PUT /api/admin/sales-projects/:id`
* **حذف مشروع مبيعات:** `DELETE /api/admin/sales-projects/:id`

---

### 18.2 إدارة فرق المبيعات (Sales Admins, Leaders, Reps)
يمتلك الأدمن مسارات CRUD كاملة لجميع رتب فريق المبيعات:
* **مديرو مبيعات (Sales Admins):** `/api/admin/sales/admin`
  * `GET /`, `GET /lists`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`
* **قادة فرق المبيعات (Sales Leaders):** `/api/admin/sales/leader`
  * `GET /`, `GET /lists`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`
* **مناديب المبيعات (Sales Reps):** `/api/admin/sales/sales`
  * `GET /`, `GET /lists`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`

---

### 18.3 عمليات وموديلات المبيعات (Sales Workspace Operations)
عند استدعاء أي من هذه المسارات، يمرر الهيدر: `x-sales-project-id: <PROJECT_UUID>`:
* **لوحة تحكم المبيعات:** `GET /api/admin/sales/dashboard`
* **الزيارات (Visits):**
  * قائمة الزيارات: `GET /api/admin/sales/visits`
  * إحصائيات الزيارات: `GET /api/admin/sales/visits/counts`
  * إنشاء زيارة: `POST /api/admin/sales/visits`
  * تعديل زيارة: `PUT /api/admin/sales/visits/:id`
  * حذف زيارة: `DELETE /api/admin/sales/visits/:id`
* **العملاء المحتملون (Leads):**
  * `GET /api/admin/sales/leads`
  * `POST /api/admin/sales/leads`
  * تحويل ليد لزيارة: `POST /api/admin/sales/leads/:id/convert`
  * `PUT /api/admin/sales/leads/:id`
  * `DELETE /api/admin/sales/leads/:id`
* **المنتجات (Products):**
  * `GET /api/admin/sales/products`
  * `POST /api/admin/sales/products`
  * `PUT /api/admin/sales/products/:id`
  * `DELETE /api/admin/sales/products/:id`
* **التارجت والمستهدفات (Targets):**
  * `GET /api/admin/sales/target`
  * `POST /api/admin/sales/target`
  * `PUT /api/admin/sales/target/:id`
  * `DELETE /api/admin/sales/target/:id`
* **حالات الزيارات والطلبات (Visit Statuses & Status Requests):**
  * الحالات: `GET /api/admin/sales/visit_status`
  * طلبات تغيير الحالات المعلقة: `GET /api/admin/sales/status_requests/pending`
  * الموافقة على تغيير حالة: `PUT /api/admin/sales/status_requests/status/:id`
* **قائمة الرغبات (Wish List):**
  * `GET /api/admin/sales/wish_list`
  * `POST /api/admin/sales/wish_list`
  * تحويل إلى زيارة: `POST /api/admin/sales/wish_list/:id/convert`

---

## 19. إدارة الإشعارات وتنبيهات FCM (Notifications & Push Alerts)

### 19.1 جلب الإشعارات — Get Notifications
* **الوصف:** جلب كافة التنبيهات الموجهة لحساب الأدمن مع عدد التنبيهات غير المقروءة.
* **الطريقة:** `GET`
* **الرابط:** `/api/admin/notifications?page=1&limit=15`
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "notifications": [
        {
          "id": "notif-uuid-1",
          "title": "طلب إجازة جديد",
          "description": "قام المهندس Mohamed Ali بتقديم طلب إجازة لتاريخ 2026-11-20",
          "is_read": false,
          "link": "/admin/holiday-requests",
          "createdAt": "2026-11-03T11:30:00.000Z"
        }
      ],
      "unreadCount": 1,
      "pagination": { "total": 1, "page": 1, "limit": 15, "totalPages": 1, "hasMore": false }
    }
  }
  ```

---

### 19.2 تحديث حالة القراءة وحذف الإشعارات
* **تحديد إشعار واحد كمقروء:** `PUT /api/admin/notifications/:id/read`
* **تحديد جميع الإشعارات كمقروءة:** `PUT /api/admin/notifications/read-all`
* **حذف إشعار:** `DELETE /api/admin/notifications/:id`
* **تسجيل توكن FCM للإشعارات اللحظية بالموبايل:** `POST /api/admin/notifications/fcm-token`
  ```json
  {
    "token": "fcm_device_token_string..."
  }
  ```
* **اختبار إرسال إشعار فحص:** `POST /api/admin/notifications/test-fcm`

---

## 20. البصمة الحيوية وتسجيل الوجه (Biometrics & Attendance Verification)

المسار الموحد لتسجيل وفحص وتأكيد بصمات الموظفين: `/api/user/biometrics`

### 20.1 تسجيل بصمة الإصبع والوجه
* **تسجيل بصمة الإصبع للموظف:** `POST /api/user/biometrics/fingerprint/register`
  ```json
  {
    "userId": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
    "fingerprintData": "base64_or_template_string"
  }
  ```
* **تسجيل بصمة الوجه (Vector Array):** `POST /api/user/biometrics/face/register`
  ```json
  {
    "userId": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
    "faceVector": [0.0123, -0.456, 0.789, 0.112, ...]
  }
  ```

---

### 20.2 التحقق من البصمة وتسجيل الحضور آلياً — Unified Verify
* **الوصف:** فحص البصمة (وجه أو إصبع)، والتحقق من النطاق الجغرافي للفرع أو الآي بي للشبكة، وتسجيل الحضور والانصراف تلقائياً في قاعدة البيانات.
* **الطريقة:** `POST`
* **الرابط:** `/api/user/biometrics/verify`
* **Request Body:**
  ```json
  {
    "userId": "c84138a0-2f34-4bc1-9c81-8071e62cf011",
    "type": "face", // أو "fingerprint"
    "data": [0.0123, -0.456, 0.789, ...],
    "lat": 29.9605,
    "lng": 31.2570
  }
  ```
* **Response `(200 OK)`:**
  ```json
  {
    "success": true,
    "data": {
      "verified": true,
      "message": "تم تسجيل الحضور بنجاح عبر بصمة الوجه",
      "attendance_id": "attendance-uuid"
    }
  }
  ```

---

### 20.3 فحص حالة بصمات الموظف و الـ IP الحالي
* **فحص البصمات المسجلة:** `GET /api/user/biometrics/status?userId=UUID`
  ```json
  {
    "success": true,
    "data": {
      "has_face": true,
      "has_fingerprint": false
    }
  }
  ```
* **معرفة الـ Public IP الحالي للشبكة:** `GET /api/user/biometrics/ip`
  ```json
  {
    "success": true,
    "data": {
      "clientIp": "156.210.12.89"
    }
  }
  ```

---

## 🎯 ملخص رموز الاستجابة (HTTP Status Codes)

| الكود | الحالة | المعنى والتطبيق |
|---|---|---|
| `200` | **OK** | نجاح العملية وجلب أو تعديل البيانات بنجاح |
| `201` | **Created** | تم إنشاء السجل بنجاح (مهمة، موظف، مشروع، فرع، إجازة) |
| `400` | **Bad Request** | نقص في الحقول الإجبارية أو خطأ في صيغة البيانات (Validation Error) |
| `401` | **Unauthorized** | التوكن غير موجود، منتهي الصلاحية، أو تم تسجيل الخروج |
| `403` | **Forbidden** | لا تملك الصلاحية الكافية (يجب تسجيل الدخول كـ Admin) |
| `404` | **Not Found** | العنصر المطلوب غير موجود في قاعدة البيانات |
| `500` | **Internal Server Error** | خطأ غير متوقع في خادم النظام |
