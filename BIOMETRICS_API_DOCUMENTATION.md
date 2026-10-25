# 📱 Taskito Biometrics & Attendance API Documentation

توثيق مباشر وموحد لواجهات البصمات (تسجيل، وتحقق موحد لبصمة الإصبع والوجه عبر مفتاح `key`، مع تسجيل الحضور والانصراف، وقيود الحضور المبكر والانصراف المتأخر).

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
* **شرح:** يحفظ بصمة الإصبع القادمة من مستشعر الهاتف للموظف (إذا لم تكن مسجلة مسبقاً).
* **Headers:**
  ```http
  Authorization: Bearer <TOKEN>
  Content-Type: application/json
  ```
* **Body:**
  ```json
  {
    "fingerprint": "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...biometric_hash_or_token",
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
* **شرح:** يحفظ مصفوفة إحداثيات بصمة الوجه (128 رقماً) للموظف (إذا لم تكن مسجلة مسبقاً).
* **Headers:**
  ```http
  Authorization: Bearer <TOKEN>
  Content-Type: application/json
  ```
* **Body:**
  ```json
  {
    "face_descriptor": [
      0.0451, -0.1284, 0.0892, 0.0123, -0.0543, 0.0765, 0.1102, -0.0321
      // ... إجمالي 128 رقماً
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
* **شرح:** واجهة موحدة واحدة تفحص بصمة الإصبع أو الوجه حسب حقل الـ `key` المرسل، وبمجرد تطابقها تسجل **حضور (checkin)** أو **انصراف (checkout)** وتطبق نفس لوجيك السيرفر (فحص نطاق اللوكيشن، أيام الأونلاين، الشفت، واحتساب دقائق التأخير، وقيود early_max و late_max).

* **Headers:**
  ```http
  Authorization: Bearer <TOKEN>
  Content-Type: application/json
  ```

### 📥 1. في حال التحقق ببصمة الإصبع (Fingerprint):
يرسل الموبايل `"key": "fingerprint"` مع حقل البصمة:
```json
{
  "key": "fingerprint",
  "fingerprint": "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...",
  "action": "checkin",
  "lat": 30.0444,
  "lng": 31.2357,
  "userId": "8129c638-591e-429f-8559-0f99bbafe84b"
}
```

### 📥 2. في حال التحقق ببصمة الوجه (Face ID):
يرسل الموبايل `"key": "face"` مع مصفوفة الوجه:
```json
{
  "key": "face",
  "face_descriptor": [0.0451, -0.1284, ...],
  "action": "checkin",
  "lat": 30.0444,
  "lng": 31.2357,
  "threshold": 0.6,
  "userId": "8129c638-591e-429f-8559-0f99bbafe84b"
}
```

| الحقل (Field) | النوع (Type) | إلزامي؟ | الوصف |
|---------------|--------------|---------|-------|
| `key` | `string` | **نعم** | نوع البصمة: `"fingerprint"` أو `"face"` |
| `fingerprint` | `string` | مطلوب لبصمة الإصبع | توكن / هاش بصمة الإصبع |
| `face_descriptor` | `Array<number>` | مطلوب لبصمة الوجه | مصفوفة الـ 128 رقماً للوجه |
| `action` | `string` | *اختياري* | `"checkin"` أو `"checkout"` (افتراضي: `"auto"` يحدد تلقائياً) |
| `lat` | `number` | *اختياري* | خط العرض الجغرافي للموظف |
| `lng` | `number` | *اختياري* | خط الطول الجغرافي للموظف |
| `userId` | `string (UUID)` | *اختياري* | مطلوب فقط إذا لم يُرسل Bearer Token |

---

### 📤 Responses

#### ✅ نجاح المطابقة وتسجيل الحضور `(201 Created)`:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "type": "fingerprint",
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

#### ✅ نجاح المطابقة وتسجيل الانصراف `(200 OK)`:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "type": "face",
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
  "type": "fingerprint",
  "message": "Fingerprint mismatch. Verification failed."
}
```

#### 🚫 محاولة حضور قبل `early_max` بدون إذن معتمد `(403 Forbidden)`:
```json
{
  "success": false,
  "valid": true,
  "type": "fingerprint",
  "action": "checkin",
  "message": "Cannot check in before 08:30:00 without an approved early attendance request."
}
```

#### 🚫 محاولة انصراف بعد `late_max` بدون إذن معتمد `(403 Forbidden)`:
```json
{
  "success": false,
  "valid": true,
  "type": "face",
  "action": "checkout",
  "message": "Cannot check out after 18:00:00 without an approved late leave request."
}
```

---

## 4️⃣ فحص حالة البصمات — Biometrics Status

* **API:** `GET /api/user/biometrics/status`
* **شرح:** فحص سريع لمعرفة هل الموظف مسجل بصمة إصبع أو وجه.
* **Headers:** `Authorization: Bearer <TOKEN>` (أو `?userId=UUID`)
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
* **شرح:** يقدم الموظف طلب حضور مبكر قبل `early_max` أو انصراف متأخر بعد `late_max`.
* **Headers:** `Authorization: Bearer <TOKEN>`
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
