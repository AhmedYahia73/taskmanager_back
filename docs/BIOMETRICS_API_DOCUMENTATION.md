# 📱 Taskito Biometrics API Documentation — توثيق واجهات البصمات والحضور

توثيق مباشر ومحدد لـ 4 واجهات فقط: تسجيل البصمة (إصبع / وجه)، والتحقق مع تسجيل (حضور / انصراف)، بالإضافة لواجهة فحص الحالة.

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
| 3 | `POST` | `/api/user/biometrics/fingerprint/verify` | مطابقة بصمة الإصبع وتسجيل (حضور أو انصراف) |
| 4 | `POST` | `/api/user/biometrics/face/verify` | مطابقة بصمة الوجه وتسجيل (حضور أو انصراف) |
| 5 | `GET` | `/api/user/biometrics/status` | فحص هل الموظف مسجل بصمة إصبع أو وجه |

---

## 1️⃣ تسجيل بصمة الإصبع — Register Fingerprint

* **API:** `POST /api/user/biometrics/fingerprint/register`
* **شرح:** يحفظ بصمة الإصبع القادمة من مستشعر الهاتف للموظف. إذا كانت مسجلة مسبقاً يرفض تكرارها منعاً للتلاعب.
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
  * `fingerprint` (string - إلزامي): نص أو توكن البصمة القادم من مستشعر الهاتف.
  * `userId` (string - اختياري): UUID الموظف (مطلوب فقط إذا لم يُرسل Bearer Token).

* **Response:**
  * ✅ **نجاح التسجيل (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "message": "Fingerprint registered successfully",
        "registered": true
      }
    }
    ```
  * ⚠️ **البصمة مسجلة مسبقاً (400 Bad Request):**
    ```json
    {
      "success": false,
      "message": "Fingerprint is already registered for this user"
    }
    ```

---

## 2️⃣ تسجيل بصمة الوجه — Register Face ID

* **API:** `POST /api/user/biometrics/face/register`
* **شرح:** يحفظ مصفوفة إحداثيات بصمة الوجه للموظف. يرفض إعادة التسجيل إذا كانت موجودة مسبقاً.
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
      // ... مصفوفة الـ 128 رقماً
    ],
    "userId": "8129c638-591e-429f-8559-0f99bbafe84b"
  }
  ```
  * `face_descriptor` (Array of numbers - إلزامي): مصفوفة الـ 128 رقم المستخرجة من كاميرا الموبايل.
  * `userId` (string - اختياري): UUID الموظف (إذا لم يُرسل التوكن).

* **Response:**
  * ✅ **نجاح التسجيل (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "message": "Face ID registered successfully",
        "registered": true
      }
    }
    ```
  * ⚠️ **مسجلة مسبقاً (400 Bad Request):**
    ```json
    {
      "success": false,
      "message": "Face ID is already registered for this user"
    }
    ```

---

## 3️⃣ التحقق من بصمة الإصبع وتسجيل الحضور/الانصراف — Verify Fingerprint

* **API:** `POST /api/user/biometrics/fingerprint/verify`
* **شرح:** يتحقق من تطابق بصمة الإصبع مع المحفوظة للموظف، وبمجرد تطابقها يسجل **حضور (checkin)** أو **انصراف (checkout)** ويطبق نفس لوجيك السيرفر (نطاق اللوكيشن للزون، أيام الأونلاين، الشفتات، الأذونات وتأخير الدخول أو الخروج المبكر).
* **Headers:**
  ```http
  Authorization: Bearer <TOKEN>
  Content-Type: application/json
  ```
* **Body:**
  ```json
  {
    "fingerprint": "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...",
    "action": "checkin",
    "lat": 30.0444,
    "lng": 31.2357,
    "userId": "8129c638-591e-429f-8559-0f99bbafe84b"
  }
  ```
  * `fingerprint` (string - إلزامي): نص البصمة اللحظية لمطابقتها.
  * `action` (string - إلزامي أو اختياري): `"checkin"` لتسجيل حضور، أو `"checkout"` لتسجيل انصراف (إذا لم يُرسل، يحدد السيرفر تلقائياً: إذا لم يكن هناك حضور مفتوح يسجل حضور، وإذا كان هناك حضور مفتوح يسجل انصراف).
  * `lat` (number - اختياري): خط العرض لفحص وجود الموظف داخل موقع العمل (الزون).
  * `lng` (number - اختياري): خط الطول لفحص وجود الموظف داخل موقع العمل (الزون).
  * `userId` (string - اختياري): معرف الموظف إذا لم يُرسل التوكن.

* **Response:**
  * ✅ **نجاح تسجيل الحضور (201 Created):**
    ```json
    {
      "success": true,
      "data": {
        "valid": true,
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
  * ✅ **نجاح تسجيل الانصراف (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "valid": true,
        "action": "checkout",
        "message": "Fingerprint verified & checked out successfully",
        "hours": 8.5,
        "delay": 0,
        "departureOnsite": true,
        "user": {
          "id": "8129c638-591e-429f-8559-0f99bbafe84b",
          "name": "Ahmed Mahmoud"
        }
      }
    }
    ```
  * ❌ **البصمة غير متطابقة (400 Bad Request):**
    ```json
    {
      "success": false,
      "valid": false,
      "message": "Fingerprint mismatch. Verification failed."
    }
    ```
  * ⚠️ **طلب انصراف ولا يوجد حضور مفتوح (400 Bad Request):**
    ```json
    {
      "success": false,
      "valid": true,
      "action": "checkout",
      "message": "No active check-in found."
    }
    ```

---

## 4️⃣ التحقق من بصمة الوجه وتسجيل الحضور/الانصراف — Verify Face ID

* **API:** `POST /api/user/biometrics/face/verify`
* **شرح:** يقارن بصمة الوجه اللحظية مع المحفوظة للموظف (مسافة إقليدية $\le 0.6$). عند النجاح يسجل **حضور (checkin)** أو **انصراف (checkout)** مع نفس لوجيك اللوكيشن والشفتات والأذونات.
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
      // ... 128 رقماً
    ],
    "action": "checkin",
    "lat": 30.0444,
    "lng": 31.2357,
    "userId": "8129c638-591e-429f-8559-0f99bbafe84b"
  }
  ```
  * `face_descriptor` (Array of numbers - إلزامي): مصفوفة أرقام الوجه الملتقط بالكاميرا.
  * `action` (string - اختياري): `"checkin"` أو `"checkout"` (افتراضياً: يحدد السيرفر تلقائياً).
  * `lat` و `lng` (numbers - اختياري): إحداثيات موقع الموظف.
  * `userId` (string - اختياري): معرف الموظف إذا لم يُرسل التوكن.

* **Response:**
  * ✅ **نجاح مطابقة الوجه وتسجيل الحضور (201 Created):**
    ```json
    {
      "success": true,
      "data": {
        "valid": true,
        "action": "checkin",
        "distance": 0.3842,
        "score": 0.6158,
        "threshold": 0.6,
        "message": "Face ID verified & checked in successfully",
        "onsite": true,
        "isRequestOnline": false,
        "user": {
          "id": "8129c638-591e-429f-8559-0f99bbafe84b",
          "name": "Ahmed Mahmoud"
        }
      }
    }
    ```
  * ✅ **نجاح مطابقة الوجه وتسجيل الانصراف (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "valid": true,
        "action": "checkout",
        "distance": 0.3842,
        "score": 0.6158,
        "threshold": 0.6,
        "message": "Face ID verified & checked out successfully",
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
  * ❌ **الوجه غير متطابق (400 Bad Request):**
    ```json
    {
      "success": false,
      "valid": false,
      "distance": 0.7419,
      "threshold": 0.6,
      "message": "Face ID mismatch. Verification failed."
    }
    ```

---

## 5️⃣ فحص حالة البصمات — Biometrics Status

* **API:** `GET /api/user/biometrics/status`
* **شرح:** فحص سريع لمعرفة هل الموظف مسجل بصمة إصبع أو وجه.
* **Headers:** `Authorization: Bearer <TOKEN>` (أو `?userId=UUID` كـ Query Param)
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
