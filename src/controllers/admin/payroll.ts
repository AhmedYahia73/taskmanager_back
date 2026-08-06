import { Request, Response } from "express";
import { db } from "../../models/db";
import { users, salaries, settings } from "../../models/schema";
import { eq } from "drizzle-orm";
import { calculateAttendanceReport } from "../../services/attendanceService";

export const getPayroll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      res.status(400).json({ success: false, message: "Month and year are required" });
      return;
    }

    const targetMonth = parseInt(month as string, 10);
    const targetYear = parseInt(year as string, 10);

    // Get the first and last day of the month
    let fromDate = new Date(targetYear, targetMonth - 1, 1);
    let toDate = new Date(targetYear, targetMonth, 0); 
    
    const now = new Date();
    const isCurrentMonth = (now.getMonth() + 1) === targetMonth && now.getFullYear() === targetYear;
    if (isCurrentMonth) {
        toDate = new Date(); // If current month, calculate until today
    }
    
    // Always use the full days in month to calculate daily rate
    const fullDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    const pad = (num: number) => num.toString().padStart(2, '0');
    const fromDateStr = `${fromDate.getFullYear()}-${pad(fromDate.getMonth() + 1)}-${pad(fromDate.getDate())}`;
    const toDateStr = `${toDate.getFullYear()}-${pad(toDate.getMonth() + 1)}-${pad(toDate.getDate())}`;

    // Fetch all active users
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      role: users.role,
      status: users.status
    }).from(users).where(eq(users.status, 'active'));
    
    // Fetch system settings for deduction multipliers
    const sysSettingsData = await db.select().from(settings).limit(1);
    const sysSettings = sysSettingsData[0] || {} as any;

    const payrollData = [];

    // Calculate payroll for each user
    // In a huge enterprise app, doing this in a loop could be slow, but for typical use cases here, 
    // it perfectly reuses complex business logic.
    for (const user of allUsers) {
      // Fetch user's salary
      const userSalaryRec = await db.select().from(salaries).where(eq(salaries.user_id, user.id)).limit(1);
      const baseSalary = userSalaryRec.length > 0 ? userSalaryRec[0].salary : 0;
      
      const dailyRate = baseSalary / fullDaysInMonth;

      const reportData = await calculateAttendanceReport(user.id, fromDateStr, toDateStr, 1, 100);
      const summary = reportData.summary;

      // 1. Prorated Base Salary for days before joining & current month progress
      const daysBeforeJoining = summary.daysBeforeJoining || 0;
      let payableDays = isCurrentMonth ? now.getDate() : fullDaysInMonth;
      payableDays -= daysBeforeJoining;
      if (payableDays < 0) payableDays = 0;
      
      const proratedBaseSalary = payableDays * dailyRate;

      // 2. Calculate Deduction Days based on rules
      const onlineRejectedDays = (summary.onlineRejected || 0) * (sysSettings.rejected_online_deduction ?? 1);
      const onlineWithoutReqDays = (summary.onlineWithoutRequest || 0) * (sysSettings.online_without_permission_deduction ?? 1);
      const holidayRejectedDays = (summary.holidayRejected || 0) * (sysSettings.rejected_holiday_deduction ?? 1);
      const unexcusedAbsenceDays = (summary.unexcusedAbsence || 0) * (sysSettings.holiday_without_permission_deduction ?? 1);
      
      // 3. Delay Deductions (Delay per hour)
      const totalDelayHours = summary.totalDelay || 0; // Delay is stored in hours in DB
      const officialWorkingHoursInMonth = summary.totalOfficialWorkingHours || ((summary.totalWorkingDaysInMonth || 22) * 8); 
      let delayDeductionDays = 0;
      if (officialWorkingHoursInMonth > 0) {
        delayDeductionDays = (totalDelayHours * (sysSettings.delay_per_hour_deduction ?? 0) / officialWorkingHoursInMonth) * fullDaysInMonth;
      }

      const totalDeductionDays = onlineRejectedDays + onlineWithoutReqDays + holidayRejectedDays + unexcusedAbsenceDays;
      const absencePenalty = totalDeductionDays * dailyRate;
      const delayPenalty = delayDeductionDays * dailyRate;

      let bonusAmount = 0;
      let deductionAmount = 0;

      if (reportData.financials) {
        reportData.financials.bonuses.forEach(b => {
          if (b.type === 'amount') {
            bonusAmount += Number(b.amount);
          } else if (b.type === 'days') {
            bonusAmount += (Number(b.amount) * dailyRate);
          }
        });

        reportData.financials.deductions.forEach(d => {
          if (d.type === 'amount') {
            deductionAmount += Number(d.amount);
          } else if (d.type === 'days') {
            deductionAmount += (Number(d.amount) * dailyRate);
          }
        });
      }

      const netSalary = proratedBaseSalary + bonusAmount - deductionAmount - absencePenalty - delayPenalty;

      payrollData.push({
        user: {
          id: user.id,
          name: user.name,
          role: user.role
        },
        baseSalary,
        proratedBaseSalary,
        dailyRate,
        daysInMonth: fullDaysInMonth,
        absences: summary.unexcusedAbsence || 0,
        totalDeductionDays,
        absencePenalty,
        delayDeductionDays,
        delayPenalty,
        bonuses: bonusAmount,
        deductions: deductionAmount,
        netSalary
      });
    }

    res.status(200).json({
      success: true,
      month: targetMonth,
      year: targetYear,
      payroll: payrollData
    });
  } catch (error) {
    console.error("Error fetching payroll:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
