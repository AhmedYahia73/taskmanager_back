# 🔔 Taskito Notifications API Documentation

توثيق شامل ومفصل لجميع واجهات برمجة التطبيقات (APIs) الخاصة بنظام الإشعارات (**Notifications**) في مشروع Taskito، متضمناً دعم الترقيم والـ Infinite Scroll والتكامل اللحظي عبر WebSocket.

---

## 🌐 معلومات عامة

* **Base URL:** `https://taskitobcknd.wegostation.com`
* **Content-Type:** `application/json`
* **المصادقة (Authentication):**
  * يجب إرسال توكن تسجيل الدخول في الهيدر:
  ```http
  Authorization: Bearer <TOKEN>
  ```

---

## 📑 جدول الواجهات (Endpoints Overview)

| # | Method | Endpoint | الوظيفة |
|---|--------|----------|---------|
| 1 | `GET` | `/api/admin/notifications` | جلب قائمة الإشعارات مع دعم الترقيم والـ Infinite Scroll وعدد غير المقروء |
| 2 | `PUT` | `/api/admin/notifications/:id/read` | تعليم إشعار محدد كمقروء (`is_read = true`) |
| 3 | `PUT` | `/api/admin/notifications/read-all` | تعليم جميع إشعارات المستخدم كمقروءة دفعة واحدة |
| 4 | `DELETE` | `/api/admin/notifications/:id` | حذف إشعار محدد نهائياً من القائمة |
| 5 | `POST` | `/api/admin/notifications/fcm-token` | تسجيل جهاز المستخدم في Firebase واشتراكه في الـ Topics |

---

## 1️⃣ جلب قائمة الإشعارات (مع الترقيم) — Get Notifications

* **API:** `GET /api/admin/notifications`
* **الشرح:**
  جلب قائمة الإشعارات الخاصة بالمستخدم المسجل حالياً، مرتبة تنازلياً من الأحدث إلى الأقدم، مع دعم الـ Pagination (صفحة بصفحة) لدعم الـ Scroll في أيقونة الجرس، وتقديم إحصائية للإشعارات غير المقروءة (`unreadCount`).
* **Headers:**
  ```http
  Authorization: Bearer <TOKEN>
  Accept: application/json
  ```
* **Query Params:**
  | البراميتر | النوع | افتراضي | إجباري؟ | الوصف |
  |-----------|-------|---------|---------|-------|
  | `page` | `number` | `1` | اختياري | رقم الصفحة المطلوب جلبها (يبدأ من 1). |
  | `limit` | `number` | `15` | اختياري | عدد الإشعارات في الصفحة الواحدة (الحد الأقصى 100). |

* **Body:**
  * لا يوجد Body (طلب `GET`).

* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "notifications": [
        {
          "id": "e4f8d557-0744-4848-b4b7-8ce69b0fa8f2",
          "user_id": "8129c638-591e-429f-8559-0f99bbafe84b",
          "target": "user",
          "type": "task_status",
          "description": "Engineer Ahmed submitted task for approval",
          "link": "/admin/tasks/approve",
          "is_read": false,
          "createdAt": "2026-10-25T10:30:00.000Z",
          "updatedAt": "2026-10-25T10:30:00.000Z"
        },
        {
          "id": "812fa4e2-6321-4211-9a74-d4b97ce8a911",
          "user_id": "8129c638-591e-429f-8559-0f99bbafe84b",
          "target": "admin",
          "type": "extra_time_request",
          "description": "New early attendance request submitted by Mohamed",
          "link": "/admin/attendance/extra-time-requests",
          "is_read": true,
          "createdAt": "2026-10-25T08:15:00.000Z",
          "updatedAt": "2026-10-25T08:20:00.000Z"
        }
      ],
      "unreadCount": 5,
      "pagination": {
        "total": 42,
        "page": 1,
        "limit": 15,
        "totalPages": 3,
        "hasMore": true
      }
    }
  }
  ```

---

## 2️⃣ تعليم إشعار محدد كمقروء — Mark Notification as Read

* **API:** `PUT /api/admin/notifications/:id/read`
* **الشرح:**
  تحديث حالة إشعار معين للمستخدم الحالي ليصبح مقروءاً (`is_read = true`).
* **Headers:**
  ```http
  Authorization: Bearer <TOKEN>
  ```
* **URL Params:**
  | البراميتر | النوع | إجباري؟ | الوصف |
  |-----------|-------|---------|-------|
  | `id` | `string (UUID)` | **نعم** | معرّف الإشعار المراد تعليمه كمقروء. |
* **Body:**
  * لا يوجد Body.
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Notification marked as read"
    }
  }
  ```

---

## 3️⃣ تعليم كافة الإشعارات كمقروءة — Mark All Notifications as Read

* **API:** `PUT /api/admin/notifications/read-all`
* **الشرح:**
  تعليم جميع إشعارات المستخدم الحالي غير المقروءة لتصبح مقروءة دفعة واحدة وتصفير عداد `unreadCount`.
* **Headers:**
  ```http
  Authorization: Bearer <TOKEN>
  ```
* **URL / Query Params:**
  * لا يوجد.
* **Body:**
  * لا يوجد Body.
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "All notifications marked as read"
    }
  }
  ```

---

## 4️⃣ حذف إشعار — Delete Notification

* **API:** `DELETE /api/admin/notifications/:id`
* **الشرح:**
  حذف الإشعار نهائياً من قاعدة البيانات الخاص بالمستخدم الحالي.
* **Headers:**
  ```http
  Authorization: Bearer <TOKEN>
  ```
* **URL Params:**
  | البراميتر | النوع | إجباري؟ | الوصف |
  |-----------|-------|---------|-------|
  | `id` | `string (UUID)` | **نعم** | معرّف الإشعار المراد حذفه. |
* **Body:**
  * لا يوجد Body.
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Notification deleted successfully"
    }
  }
  ```

---

## 5️⃣ تسجيل جهاز المستخدم في Firebase — Register FCM Device Token

* **API:** `POST /api/admin/notifications/fcm-token`
* **الشرح:**
  يُرسل التطبيق (الموبايل أو الويب) رمز الـ FCM Device Token الخاص بالجهاز عند تسجيل الدخول أو عند تجديد التوكن. يقوم السيرفر بتسجيل التوكن وربطه بالمستخدم واشتراكه تلقائياً في قنوات Firebase Topics:
  * القناة الشخصية: `user_{userId}`
  * قناة المديرين: `admins` (إذا كان دور المستخدم Admin أو Super Admin)
  * قناة الدور: e.g. `engineer` أو `sales`
* **Headers:**
  ```http
  Authorization: Bearer <TOKEN>
  Content-Type: application/json
  ```
* **Body:**
  ```json
  {
    "token": "dKjsdf834j_fkmLskdjf9384729384729384729384..."
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "FCM token registered and subscribed to topics successfully",
      "userId": "8129c638-591e-429f-8559-0f99bbafe84b",
      "token": "dKjsdf834j_fkmLskdjf9384729384729384729384...",
      "subscribedTopics": [
        "user_8129c638-591e-429f-8559-0f99bbafe84b",
        "admins"
      ]
    }
  }
  ```

---

## 🔥 إشعارات Firebase Cloud Messaging (FCM Push Notifications)

يقوم الباك إند تلقائياً ببث الإشعارات عبر Firebase إلى أجهزة المستخدمين عند حدوث أي حدث:

### 1. المتغيرات في ملف `.env`:
يتم قراءة بيانات الـ Service Account تلقائياً من `.env`:
```env
project_id="taskito-50aee"
client_email="firebase-adminsdk-fbsvc@taskito-50aee.iam.gserviceaccount.com"
private_key="-----BEGIN PRIVATE KEY-----\nMIIE...=\n-----END PRIVATE KEY-----\n"
```
*(يدعم السيرفر أيضاً التنسيقين: بالأحرف الصغيرة `project_id` أو الكبيرة `FIREBASE_PROJECT_ID`، مع معالجة الفواصل والاقتباسات تلقائياً).*

### 2. آلية الإرسال التلقائي:
* **عند إشعار المديرين (`notifyAdmins`):**
  * يُرسل إشعار Push Notification إلى القناة: `topic: "admins"`.
  * يُرسل أيضاً إلى كافة الرموز (Tokens) المسجلة لأجهزة المديرين.
* **عند إشعار موظف محدد (`notifyUser`):**
  * يُرسل إشعار Push Notification إلى القناة الشخصية: `topic: "user_" + userId`.
  * يُرسل أيضاً مباشرة إلى أجهزة المستخدم المسجلة.
* **محتوى الإشعار:**
  * **العنوان (Title):** يتم تعيينه حسب نوع الإشعار (مهمة، طلب حضور مبكر، إجازة، أيام أونلاين...).
  * **المحتوى (Body):** نص الإشعار بالتفصيل.
  * **البيانات الإضافية (Data payload):** تحتوي على `link`, `type`, `id` لفتح الشاشة المحددة في التطبيق مباشرة.

---

## 📡 البث اللحظي عبر Socket.IO (Real-Time WebSocket)

يعمل نظام الإشعارات بالتزامن مع **Socket.IO** لإرسال التنبيه فور حدوثه:

1. **انضمام العميل لغرفته الخاصة (Join Room):**
   * عند فتح التطبيق، يرسل العميل حدث `join`:
   ```javascript
   socket.emit("join", {
     userId: "8129c638-591e-429f-8559-0f99bbafe84b",
     role: "admin" // أو engineer أو leader...
   });
   ```

2. **استقبال الإشعار اللحظي (Receive Notification):**
   * يستمع العميل للحدث `new_notification`:
   ```javascript
   socket.on("new_notification", (data) => {
     console.log("New notification received:", data);
   });
   ```
   * **شكل الـ Payload المستقبل:**
   ```json
   {
     "id": "e4f8d557-0744-4848-b4b7-8ce69b0fa8f2",
     "user_id": "8129c638-591e-429f-8559-0f99bbafe84b",
     "target": "user",
     "type": "task_status",
     "description": "Engineer Ahmed submitted task for approval",
     "link": "/admin/tasks/approve",
     "created_at": "2026-10-25T10:30:00.000Z"
   }
   ```
