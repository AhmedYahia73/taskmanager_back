import { Request, Response } from "express";
import { db } from "../../models/db";
import { users, salaries } from "../../models/schema";
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
    // Month is 1-indexed in query, but 0-indexed in Date constructor
    const fromDate = new Date(targetYear, targetMonth - 1, 1);
    const toDate = new Date(targetYear, targetMonth, 0); // 0th day of next month is the last day of this month
    const daysInMonth = toDate.getDate();

    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = toDate.toISOString().split('T')[0];

    // Fetch all active users
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      role: users.role,
      status: users.status
    }).from(users).where(eq(users.status, 'active'));

    const payrollData = [];

    // Calculate payroll for each user
    // In a huge enterprise app, doing this in a loop could be slow, but for typical use cases here, 
    // it perfectly reuses complex business logic.
    for (const user of allUsers) {
      // Fetch user's salary
      const userSalaryRec = await db.select().from(salaries).where(eq(salaries.user_id, user.id)).limit(1);
      const baseSalary = userSalaryRec.length > 0 ? userSalaryRec[0].salary : 0;
      
      const dailyRate = baseSalary / daysInMonth;

      // Get full attendance report to compute absences, bonuses, and deductions
      // We pass limit=100 just to be safe, though we only care about the summary and financials
      const reportData = await calculateAttendanceReport(user.id, fromDateStr, toDateStr, 1, 100);

      const unexcusedAbsence = reportData.summary.unexcusedAbsence || 0;
      const absencePenalty = unexcusedAbsence * dailyRate;

      let bonusAmount = 0;
      let deductionAmount = 0;

      if (reportData.financials) {
        // Calculate Bonuses
        reportData.financials.bonuses.forEach(b => {
          if (b.type === 'amount') {
            bonusAmount += Number(b.amount);
          } else if (b.type === 'days') {
            bonusAmount += (Number(b.amount) * dailyRate);
          }
        });

        // Calculate Deductions
        reportData.financials.deductions.forEach(d => {
          if (d.type === 'amount') {
            deductionAmount += Number(d.amount);
          } else if (d.type === 'days') {
            deductionAmount += (Number(d.amount) * dailyRate);
          }
        });
      }

      const netSalary = baseSalary + bonusAmount - deductionAmount - absencePenalty;

      payrollData.push({
        user: {
          id: user.id,
          name: user.name,
          role: user.role
        },
        baseSalary,
        dailyRate,
        daysInMonth,
        absences: unexcusedAbsence,
        absencePenalty,
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
