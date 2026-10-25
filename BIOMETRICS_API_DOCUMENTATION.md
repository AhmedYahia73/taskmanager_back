# 📱 Taskito Biometrics & Attendance API Documentation

توثيق دقيق ومحدد لواجهات البصمات (تسجيل، وتحقق موحد لبصمة الإصبع والوجه عبر مفتاح `key`، مع تسجيل الحضور والانصراف، وقيود الحضور المبكر والانصراف المتأخر).

---

## 🌐 معلومات عامة

* **Base URL:** `https://taskitobcknd.wegostation.com`
* **Content-Type:** `application/json`
* **المصادقة (Authentication):**
  * إما عبر الهيدر: `Authorization: Bearer <TOKEN>`
  * أو تمرير `userId` في الـ Body (إذا لم يكن هناك توكن بعد).

---

## 📑 جدول الواجهات

| # | Method | Endpoint | الوظيفة |
|---|--------|----------|---------|
| 1 | `POST` | `/api/user/biometrics/fingerprint/register` | تسجيل بصمة الإصبع للموظف لأول مرة |
| 2 | `POST` | `/api/user/biometrics/face/register` | تسجيل بصمة الوجه للموظف لأول مرة |
| 3 | `POST` | `/api/user/biometrics/verify` | **API موحد للتحقق:** يحدد نوع البصمة عبر `key` ويسجل حضور أو انصراف |
| 4 | `GET`  | `/api/user/biometrics/status` | فحص هل الموظف مسجل بصمة إصبع أو وجه |
| 5 | `POST` | `/api/user/requests/extra-time` | تقديم طلب وقت إضافي (حضور مبكر أو انصراف متأخر) |

---

## ⏰ قيود الحضور المبكر والانصراف المتأخر (settings.early_max & settings.late_max)

1. **الحضور المبكر (`settings.early_max`):**
   * إذا حاول الموظف تسجيل الحضور **قبل** الوقت المحدد في `early_max` (مثلاً قبل 08:30):
   * يرفض السيرفر تسجيل الحضور بـ `403 Forbidden` إلا إذا كان لدى الموظف طلب وقت إضافي **معتمد** لنفس اليوم بحقل `early_attend = true`.
2. **الانصراف المتأخر (`settings.late_max`):**
   * إذا حاول الموظف تسجيل الانصراف **بعد** الوقت المحدد في `late_max` (مثلاً بعد 18:00):
   * يرفض السيرفر تسجيل الانصراف بـ `403 Forbidden` إلا إذا كان لدى الموظف طلب وقت إضافي **معتمد** لنفس اليوم بحقل `late_leave = true`.

---

## 1️⃣ تسجيل بصمة الإصبع — Register Fingerprint

* **API:** `POST /api/user/biometrics/fingerprint/register`
* **Headers:** `Authorization: Bearer <TOKEN>`
* **Body:**
  ```json
  {
    "fingerprint": "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...token",
    "userId": "8129c638-591e-429f-8559-0f99bbafe84b"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Fingerprint registered successfully",
      "registered": true
    }
  }
  ```

---

## 2️⃣ تسجيل بصمة الوجه — Register Face ID

* **API:** `POST /api/user/biometrics/face/register`
* **Headers:** `Authorization: Bearer <TOKEN>`
* **Body:**
  ```json
  {
    "payload": [
      0.0451, -0.1284, 0.0892, 0.0123, -0.0543, 0.0765, 0.1102, -0.0321
      // ... 128 رقماً
    ],
    "userId": "8129c638-591e-429f-8559-0f99bbafe84b"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Face ID registered successfully",
      "registered": true
    }
  }
  ```

---

## 3️⃣ الـ API الموحد للمطابقة وتسجيل الحضور/الانصراف — Unified Verify & Attendance

* **API:** `POST /api/user/biometrics/verify`
* **شرح:** واجهة موحدة واحدة تفحص بصمة الإصبع أو الوجه حسب حقل `key`، وبمجرد تطابقها تسجل **حضور (checkin)** أو **انصراف (checkout)**.

* **Headers:**
  ```http
  Authorization: Bearer <TOKEN>
  Content-Type: application/json
  ```

### 📥 1. في حال التحقق ببصمة الإصبع:
يرسل الموبايل `"key": "fingerprint"` مع الـ `payload`:
```json
{
  "key": "fingerprint",
  "payload": "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...",
  "action": "checkin",
  "lat": 30.0444,
  "lng": 31.2357,
  "userId": "8129c638-591e-429f-8559-0f99bbafe84b"
}
```

### 📥 2. في حال التحقق ببصمة الوجه:
يرسل الموبايل `"key": "face"` مع الـ `payload`:
```json
{
  "key": "face",
  "payload": [0.0451, -0.1284, 0.0892, 0.0123, -0.0543, ...],
  "action": "checkin",
  "lat": 30.0444,
  "lng": 31.2357,
  "threshold": 0.6,
  "userId": "8129c638-591e-429f-8559-0f99bbafe84b"
}
```

### 📋 حقول الـ Body الثابتة:
| الحقل (Field) | النوع (Type) | إلزامي؟ | الوصف |
|---------------|--------------|---------|-------|
| `key` | `string` | **نعم** | نوع البصمة حصراً: `"fingerprint"` أو `"face"` |
| `payload` | `string` أو `Array<number>` | **نعم** | نص البصمة إذا كان `key = "fingerprint"`، أو مصفوفة الـ 128 رقماً إذا كان `key = "face"` |
| `action` | `string` | *اختياري* | `"checkin"` لتسجيل حضور، أو `"checkout"` لتسجيل انصراف (افتراضي: `"auto"`) |
| `lat` | `number` | *اختياري* | خط العرض الجغرافي لفحص موقع العمل |
| `lng` | `number` | *اختياري* | خط الطول الجغرافي لفحص موقع العمل |
| `userId` | `string (UUID)` | *اختياري* | مطلوب فقط في حال عدم تمرير Bearer Token في الهيدر |

---

### 📤 Responses

#### ✅ نجاح تسجيل الحضور `(201 Created)`:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "key": "fingerprint",
    "action": "checkin",
    "message": "Fingerprint verified & checked in successfully",
    "onsite": true,
    "isRequestOnline": false,
    "user": {
      "id": "8129c638-591e-429f-8559-0f99bbafe84b",
      "name": "Ahmed Mahmoud"
    }
  }
}
```

#### ✅ نجاح تسجيل الانصراف `(200 OK)`:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "key": "face",
    "action": "checkout",
    "message": "Face ID verified & checked out successfully",
    "distance": 0.3842,
    "score": 0.6158,
    "hours": 8.25,
    "delay": 0,
    "departureOnsite": true,
    "user": {
      "id": "8129c638-591e-429f-8559-0f99bbafe84b",
      "name": "Ahmed Mahmoud"
    }
  }
}
```

#### ❌ البصمة غير متطابقة `(400 Bad Request)`:
```json
{
  "success": false,
  "valid": false,
  "key": "fingerprint",
  "message": "Fingerprint mismatch. Verification failed."
}
```

#### 🚫 محاولة حضور قبل `early_max` بدون إذن معتمد `(403 Forbidden)`:
```json
{
  "success": false,
  "valid": true,
  "key": "fingerprint",
  "action": "checkin",
  "message": "Cannot check in before 08:30:00 without an approved early attendance request."
}
```

#### 🚫 محاولة انصراف بعد `late_max` بدون إذن معتمد `(403 Forbidden)`:
```json
{
  "success": false,
  "valid": true,
  "key": "face",
  "action": "checkout",
  "message": "Cannot check out after 18:00:00 without an approved late leave request."
}
```

---

## 4️⃣ فحص حالة البصمات — Biometrics Status

* **API:** `GET /api/user/biometrics/status`
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "has_fingerprint": true,
      "has_face_id": false
    }
  }
  ```

---

## 5️⃣ تقديم طلب وقت إضافي — Submit Extra Time Request

* **API:** `POST /api/user/requests/extra-time`
* **Body:**
  ```json
  {
    "date": "2026-10-26",
    "early_attend": true,
    "late_leave": false
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Extra time request submitted successfully"
    }
  }
  ```
