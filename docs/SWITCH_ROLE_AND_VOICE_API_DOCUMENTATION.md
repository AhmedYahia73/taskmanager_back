# 🎙️ Taskito API Documentation — Role Switch & Task Voice Notes

توثيق شامل ومفصل للـ APIs الخاصة بـ:
1. **تبديل مساحة العمل / الدور (`/api/admin/auth/switch-role`)** بين مساحة المهندس ومساحة الليدر.
2. **الملاحظات الصوتية للمهام (Voice Notes APIs)** المستخدمة في شاشة تفاصيل المهمة:
   `https://taskito.wegostation.com/admin/projects/:projectId/groups/:groupId/tasks/:taskId`

---

## 🌐 الإعدادات العامة (General Config)

* **Base URL:** `https://taskitobcknd.wegostation.com`
* **المصادقة (Authentication):**
  ```http
  Authorization: Bearer <JWT_TOKEN>
  ```

---

## 📑 فهرس الـ APIs
1. [تبديل الدور ومساحة العمل (Switch Role)](#1-تبديل-الدور-ومساحة-العمل-switch-role)
2. [استرجاع الملاحظات الصوتية للمهمة (Get Task Voices)](#2-استرجاع-الملاحظات-الصوتية-للمهمة-get-task-voices)
3. [إضافة / تسجيل ملاحظة صوتية للمهمة (Add Voice Note)](#3-إضافة--تسجيل-ملاحظة-صوتية-للمهمة-add-voice-note)
4. [حذف ملاحظة صوتية (Delete Voice Note)](#4-حذف-ملاحظة-صوتية-delete-voice-note)
5. [آلية تعديل الملاحظة الصوتية (Edit Voice Note Workflow)](#5-آلية-تعديل-الملاحظة-الصوتية-edit-voice-note-workflow)

---

## 1. تبديل الدور ومساحة العمل (Switch Role)

### 📌 الوصف:
يُستخدم هذا الـ API في الشريط العلوي (`RoleSwitcherTabs`) لتمكين المستخدم المؤهل من التبديل الفوري بين:
* مساحة عمل **الموظف / المهندس (`engineer`)**.
* مساحة عمل **قائد الفريق / الليدر (`tester`)**.

يقوم السيرفر بإنشاء JWT Token جديد تماماً يحمل الصلاحية المطلوبة (`role`) لنفس المستخدم مع الحفاظ على كافة بياناته، وتحديث الـ Token في المتصفح دون الحاجة لتسجيل الخروج وإعادة كتابة كلمة المرور.

* **الرابط الكامل:** `https://taskitobcknd.wegostation.com/api/admin/auth/switch-role`
* **الطريقة (Method):** `POST`
* **الـ Headers:**
  ```http
  Authorization: Bearer <CURRENT_JWT_TOKEN>
  Content-Type: application/json
  Accept: application/json
  ```

### 📥 Request Body:
| الحقل (Field) | النوع (Type) | الإلزامية (Required) | القيم المقبولة (Accepted Values) | الوصف |
| :--- | :--- | :---: | :--- | :--- |
| `role` | `string` | **نعم** | `"tester"` أو `"engineer"` | الدور المطلوب الانتقال إليه (`tester` = Leader, `engineer` = Employee) |

#### مثال على Request Body (التحويل إلى ليدر):
```json
{
  "role": "tester"
}
```

#### مثال على Request Body (التحويل إلى مهندس):
```json
{
  "role": "engineer"
}
```

### 📤 Response:

#### حالة النجاح `(200 OK)`:
```json
{
  "success": true,
  "data": {
    "message": "Role switched successfully",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjNjNzQ4MDU1LTRmNDAtNDEwYy05NmI2LWEyMTIzN2EzYzMwMSIsInJvbGUiOiJ0ZXN0ZXIiLCJlbWFpbCI6ImVuZy5haG1lZEB3ZWdvc3RhdGlvbi5jb20iLCJuYW1lIjoiQWhtZWQgTGVhZGVyIiwiaWF0IjoxNzI5NTEwMDAwfQ.signature",
    "user": {
      "id": "3c748055-4f40-410c-96b6-a21237a3c301",
      "name": "Ahmed Leader",
      "email": "eng.ahmed@wegostation.com",
      "phone": "+201011111111",
      "role": "tester"
    }
  }
}
```

#### حالة عدم إرسال التوكن `(401 Unauthorized)`:
```json
{
  "success": false,
  "message": "Authentication required"
}
```

---

## 2. استرجاع الملاحظات الصوتية للمهمة (Get Task Voices)

### 📌 الوصف:
جلب كافة التسجيلات والملاحظات الصوتية المسجلة للمهمة المحددة (ولأي مهام شقيقة مشتركة بنفس الاسم والمجموعة)، ليتمكن كل من المهندس والليدر من الاستماع إلى التعليمات الصوتية داخل كارد المهمة.

* **الرابط الكامل:** `https://taskitobcknd.wegostation.com/api/admin/tasks/:id/voices`
* **الطريقة (Method):** `GET`
* **الصلاحية (Role):** متاح لكل من `Admin` و `Leader (tester)` و `Engineer`.
* **Path Parameters:**
  * `id` *(UUID, إجباري)*: معرف المهمة (مثل `8ed64761-5cb0-4b0a-8240-01eb36c895fd`).

* **الـ Headers:**
  ```http
  Authorization: Bearer <JWT_TOKEN>
  Accept: application/json
  ```

### 📤 Response:

#### حالة النجاح `(200 OK)`:
```json
{
  "success": true,
  "data": {
    "voices": [
      {
        "id": "c71a3964-b251-4043-85b8-53cfb57f0931",
        "voice_url": "https://taskitobcknd.wegostation.com/uploads/voices/voice_note_1729510000.webm",
        "duration": 42,
        "createdAt": "2026-10-21T09:15:30.000Z",
        "user_id": "99b05bb5-d4f0-4264-94fa-5195b8e2c111",
        "user_name": "Eng. Ahmed Leader",
        "user_image": "https://taskitobcknd.wegostation.com/uploads/users/ahmed.jpg",
        "user_role": "tester"
      }
    ]
  }
}
```

---

## 3. إضافة / تسجيل ملاحظة صوتية للمهمة (Add Voice Note)

### 📌 الوصف:
رفع تسجيل صوتي أو تسجيل حي مباشر من المتصفح (WebRTC Audio Recording) وإرفاقه بالمهمة لتوجيه المهندس صوتياً.
يتم تخزين الملف تلقائياً في السيرفر داخل مجلد `uploads/voices/`، وربطه برقم المهمة والليدر الذي قام بالتسجيل.

* **الرابط الكامل:** `https://taskitobcknd.wegostation.com/api/admin/tasks/:id/voices`
* **الطريقة (Method):** `POST`
* **الصلاحية (Permissions):** محصورة لـ **قائد الفريق (`tester`)** أو **الأدمن (`admin` / `super_admin`)**.
* **Path Parameters:**
  * `id` *(UUID, إجباري)*: معرف المهمة (مثال: `8ed64761-5cb0-4b0a-8240-01eb36c895fd`).
* **Content-Type:** `multipart/form-data`

### 📥 Request Body (Form-Data):
| الحقل (Key) | النوع (Type) | الإلزامية | الصيغ المدعومة / الوصف |
| :--- | :--- | :---: | :--- |
| `voice` | `File` (Binary) | **نعم** | ملف الصوت المسجل (`.webm`, `.mp3`, `.wav`, `.m4a`, `.ogg`) بحجم أقصى 50MB. كما يقبل السيرفر صيغة `base64` تبدأ بـ `data:audio/...`. |
| `duration` | `number` / `text` | اختياري | مدة التسجيل بالثواني (مثال: `45` أو `"45"`). |

#### مثال على إرسال الطلب بواسطة JavaScript / Axios:
```javascript
const formData = new FormData();
formData.append('voice', audioBlob, `voice_note_${Date.now()}.webm`);
formData.append('duration', Math.round(durationInSeconds));

const response = await axios.post(
  'https://taskitobcknd.wegostation.com/api/admin/tasks/8ed64761-5cb0-4b0a-8240-01eb36c895fd/voices',
  formData,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  }
);
```

### 📤 Response:

#### حالة النجاح `(201 Created)`:
```json
{
  "success": true,
  "data": {
    "message": "Voice note added successfully",
    "voice": {
      "id": "c71a3964-b251-4043-85b8-53cfb57f0931",
      "voice_url": "https://taskitobcknd.wegostation.com/uploads/voices/voice_note_1729510000.webm",
      "duration": 45,
      "createdAt": "2026-10-21T09:30:00.000Z",
      "user_id": "99b05bb5-d4f0-4264-94fa-5195b8e2c111",
      "user_name": "Eng. Ahmed Leader",
      "user_image": "https://taskitobcknd.wegostation.com/uploads/users/ahmed.jpg",
      "user_role": "tester"
    }
  }
}
```

#### حالة منع غير المصرح لهم كـ Engineer مثلاً `(403 Forbidden)`:
```json
{
  "success": false,
  "message": "Only Admin or Team Leader can add voice notes"
}
```

#### حالة عدم إرفاق ملف صوتي `(400 Bad Request)`:
```json
{
  "success": false,
  "message": "Voice audio file or data is required"
}
```

---

## 4. حذف ملاحظة صوتية (Delete Voice Note)

### 📌 الوصف:
حذف تسجيل صوتي محدد من المهمة.
عند استدعاء هذا الـ API يقوم السيرفر بـ:
1. التحقق من صلاحية الحذف (الأدمن، أو نفس الليدر الذي سجل الملاحظة الصوتية).
2. حذف الملف الفعلي من قرص السيرفر (`uploads/voices/`).
3. مسح السجل من قاعدة البيانات بشكل نهائي.

* **الرابط الكامل:** `https://taskitobcknd.wegostation.com/api/admin/tasks/:id/voices/:voiceId`
* **الطريقة (Method):** `DELETE`
* **الصلاحية (Permissions):**
  * `Admin` أو `Super Admin`.
  * صاحب التسجيل نفسه: `tester` بشرط أن يكون `voice.user_id === req.user.id`.
* **Path Parameters:**
  * `id` *(UUID, إجباري)*: معرف المهمة.
  * `voiceId` *(UUID, إجباري)*: معرف التسجيل الصوتي المراد حذفه.

* **الـ Headers:**
  ```http
  Authorization: Bearer <JWT_TOKEN>
  Accept: application/json
  ```

### 📤 Response:

#### حالة النجاح `(200 OK)`:
```json
{
  "success": true,
  "data": {
    "message": "Voice note deleted successfully"
  }
}
```

#### حالة محاولة حذف تسجيل شخص آخر `(403 Forbidden)`:
```json
{
  "success": false,
  "message": "You don't have permission to delete this voice note"
}
```

#### حالة عدم العثور على التسجيل `(404 Not Found)`:
```json
{
  "success": false,
  "message": "Voice note not found"
}
```

---

## 5. آلية تعديل الملاحظة الصوتية (Edit Voice Note Workflow)

> [!NOTE]
> **لماذا لا يوجد `PUT /:id/voices/:voiceId`؟**
> الملاحظات الصوتية (Voice Notes) عبارة عن ملفات صوتية ثنائية (Binary Audio Streams). برمجياً وفي معايير الـ RESTful API، لا يتم تعديل الصوت بايت ببايت، بل تتم دورة التعديل أو استبدال التوجيه الصوتي على خطوتين كما هو مطبق بالفرونت إند:
> 1. حذف التسجيل الصوتي القديم عبر:
>    `DELETE /api/admin/tasks/:id/voices/:voiceId`
> 2. تسجيل ورفع الملاحظة الصوتية المعدلة الجديدة عبر:
>    `POST /api/admin/tasks/:id/voices`
