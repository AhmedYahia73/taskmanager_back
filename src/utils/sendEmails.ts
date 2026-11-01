import nodemailer from "nodemailer";

// Transporter configuration
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE !== "false",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendEmail = async (to: string, subject: string, text: string) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[Email Service] EMAIL_USER or EMAIL_PASS not configured. Skipping email.");
    return null;
  }

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"Taskito" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      text: text,
      html: `<div style="font-family: Arial; direction: rtl; padding: 20px;">
        <h2>كود التحقق</h2>
        <p style="font-size: 24px; font-weight: bold;">${text}</p>
      </div>`,
    });
    return info;
  } catch (err: any) {
    console.error("Error sending email:", err.message);
    throw err;
  }
};

export interface TaskEmailPayload {
  toEmail: string;
  userName: string;
  taskName: string;
  taskDescription?: string | null;
  projectName?: string | null;
  groupName?: string | null;
  deliveryDate?: string | Date | null;
  importance?: string | null;
  status?: string | null;
  assignedByName?: string | null;
  taskUrl?: string | null;
}

const getImportanceBadge = (importance?: string | null) => {
  const imp = (importance || "medium").toLowerCase();
  switch (imp) {
    case "urgent":
      return { label: "عاجل | Urgent", bg: "#fef2f2", text: "#dc2626", border: "#fecaca", accent: "#ef4444" };
    case "high":
      return { label: "مرتفع | High", bg: "#fff7ed", text: "#ea580c", border: "#fed7aa", accent: "#f97316" };
    case "low":
      return { label: "منخفض | Low", bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0", accent: "#10b981" };
    case "medium":
    default:
      return { label: "متوسط | Medium", bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe", accent: "#3b82f6" };
  }
};

const formatDate = (dateVal?: string | Date | null) => {
  if (!dateVal) return "غير محدد | Not specified";
  if (typeof dateVal === "string") {
    const match = dateVal.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toISOString().split("T")[0];
};

/**
 * 📧 Send a high-design task notification email to the assigned user
 */
export const sendTaskAssignmentEmail = async (payload: TaskEmailPayload) => {
  const {
    toEmail,
    userName,
    taskName,
    taskDescription,
    projectName,
    groupName,
    deliveryDate,
    importance,
    status,
    assignedByName = "Admin",
    taskUrl,
  } = payload;

  if (!toEmail) return;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`[Email Service] Cannot send task email to ${toEmail}: EMAIL_USER or EMAIL_PASS not set.`);
    return;
  }

  const importanceBadge = getImportanceBadge(importance);
  const formattedDeliveryDate = formatDate(deliveryDate);
  const statusLabel = status ? status.toUpperCase() : "PENDING";

  const descriptionBlock = taskDescription?.trim()
    ? `
      <div style="margin-top: 24px; padding: 18px 20px; background-color: #f8fafc; border-radius: 10px; border: 1px dashed #cbd5e1; direction: rtl; text-align: right;">
        <div style="font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 8px;">
          📝 تفاصيل وملاحظات المهمة:
        </div>
        <div style="font-size: 14px; color: #334155; line-height: 1.7; white-space: pre-wrap;">${taskDescription.trim()}</div>
      </div>
    `
    : "";

  const ctaButton = taskUrl
    ? `
      <div style="margin-top: 32px; text-align: center;">
        <a href="${taskUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 34px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); letter-spacing: 0.2px;">
          الانتقال لتفاصيل المهمة • View Task
        </a>
      </div>
    `
    : "";

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>مهمة جديدة: ${taskName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 35px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0;">
          
          <!-- Top Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 36px 30px; text-align: center;">
              <div style="display: inline-block; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 14px; padding: 12px 14px; margin-bottom: 14px;">
                <span style="font-size: 28px; line-height: 1;">📋</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.3px;">تم إسناد مهمة جديدة إليك</h1>
              <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; font-weight: 500;">New Task Assignment • Taskito Portal</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 34px 30px; direction: rtl; text-align: right;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 12px 0; font-size: 16px; color: #1e293b; line-height: 1.6;">
                مرحباً <strong>${userName}</strong> 👋،
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                تم تكليفك بمهمة عمل جديدة في النظام بواسطة <strong style="color: #0f172a;">${assignedByName}</strong>. إليك تفاصيل المهمة:
              </p>

              <!-- Main Task Highlight Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-right: 5px solid ${importanceBadge.accent}; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <div style="margin-bottom: 10px;">
                      <span style="display: inline-block; background-color: ${importanceBadge.bg}; color: ${importanceBadge.text}; border: 1px solid ${importanceBadge.border}; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-left: 6px;">
                        ${importanceBadge.label}
                      </span>
                      <span style="display: inline-block; background-color: #e2e8f0; color: #475569; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">
                        ${statusLabel}
                      </span>
                    </div>
                    <h2 style="margin: 0; font-size: 18px; color: #0f172a; font-weight: 800; line-height: 1.4;">
                      ${taskName}
                    </h2>
                  </td>
                </tr>
              </table>

              <!-- Details Info Grid -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
                ${projectName ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 16px; background-color: #f8fafc; width: 35%; font-size: 13px; font-weight: 700; color: #475569;">
                    📁 المشروع | Project
                  </td>
                  <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #0f172a;">
                    ${projectName}
                  </td>
                </tr>
                ` : ""}
                ${groupName ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 16px; background-color: #f8fafc; width: 35%; font-size: 13px; font-weight: 700; color: #475569;">
                    🗂️ المجموعة | Group
                  </td>
                  <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #0f172a;">
                    ${groupName}
                  </td>
                </tr>
                ` : ""}
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 16px; background-color: #f8fafc; width: 35%; font-size: 13px; font-weight: 700; color: #475569;">
                    📅 موعد التسليم | Due Date
                  </td>
                  <td style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #dc2626;">
                    ${formattedDeliveryDate}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; background-color: #f8fafc; width: 35%; font-size: 13px; font-weight: 700; color: #475569;">
                    👤 المسؤول عن التكليف
                  </td>
                  <td style="padding: 12px 16px; font-size: 14px; color: #334155;">
                    ${assignedByName}
                  </td>
                </tr>
              </table>

              <!-- Description -->
              ${descriptionBlock}

              <!-- Button CTA -->
              ${ctaButton}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 30px; text-align: center; direction: rtl;">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;">
                تم إرسال هذا الإشعار تلقائياً من نظام إدارة المهام <strong>Taskito</strong>.
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} Taskito System. جميع الحقوق محفوظة.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Taskito" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `📋 مهمة جديدة: ${taskName} | Taskito`,
      text: `مرحباً ${userName}، تم إسناد مهمة جديدة لك: "${taskName}"${projectName ? ` في مشروع "${projectName}"` : ""}. موعد التسليم: ${formattedDeliveryDate}. الرابط: ${taskUrl || ""}`,
      html,
    });
    console.log(`[Email Service] Task assignment email sent successfully to ${toEmail}`);
  } catch (err: any) {
    console.error(`[Email Service] Error sending task email to ${toEmail}:`, err?.message || err);
  }
};

