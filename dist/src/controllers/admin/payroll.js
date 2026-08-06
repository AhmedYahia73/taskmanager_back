"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayroll = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const attendanceService_1 = require("../../services/attendanceService");
const getPayroll = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            res.status(400).json({ success: false, message: "Month and year are required" });
            return;
        }
        const targetMonth = parseInt(month, 10);
        const targetYear = parseInt(year, 10);
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
        const fromDateStr = fromDate.toISOString().split('T')[0];
        const toDateStr = toDate.toISOString().split('T')[0];
        // Fetch all active users
        const allUsers = await db_1.db.select({
            id: schema_1.users.id,
            name: schema_1.users.name,
            role: schema_1.users.role,
            status: schema_1.users.status
        }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.status, 'active'));
        // Fetch system settings for deduction multipliers
        const sysSettingsData = await db_1.db.select().from(schema_1.settings).limit(1);
        const sysSettings = sysSettingsData[0] || {};
        const payrollData = [];
        // Calculate payroll for each user
        // In a huge enterprise app, doing this in a loop could be slow, but for typical use cases here, 
        // it perfectly reuses complex business logic.
        for (const user of allUsers) {
            // Fetch user's salary
            const userSalaryRec = await db_1.db.select().from(schema_1.salaries).where((0, drizzle_orm_1.eq)(schema_1.salaries.user_id, user.id)).limit(1);
            const baseSalary = userSalaryRec.length > 0 ? userSalaryRec[0].salary : 0;
            const dailyRate = baseSalary / fullDaysInMonth;
            const reportData = await (0, attendanceService_1.calculateAttendanceReport)(user.id, fromDateStr, toDateStr, 1, 100);
            const summary = reportData.summary;
            // 1. Prorated Base Salary for days before joining & current month progress
            const daysBeforeJoining = summary.daysBeforeJoining || 0;
            let payableDays = isCurrentMonth ? now.getDate() : fullDaysInMonth;
            payableDays -= daysBeforeJoining;
            if (payableDays < 0)
                payableDays = 0;
            const proratedBaseSalary = payableDays * dailyRate;
            // 2. Calculate Deduction Days based on rules
            const onlineRejectedDays = (summary.onlineRejected || 0) * (sysSettings.rejected_online_deduction ?? 1);
            const onlineWithoutReqDays = (summary.onlineWithoutRequest || 0) * (sysSettings.online_without_permission_deduction ?? 1);
            const holidayRejectedDays = (summary.holidayRejected || 0) * (sysSettings.rejected_holiday_deduction ?? 1);
            const unexcusedAbsenceDays = (summary.unexcusedAbsence || 0) * (sysSettings.holiday_without_permission_deduction ?? 1);
            // 3. Delay Deductions (Delay per hour)
            const totalDelayHours = (summary.totalDelay || 0) / 60;
            const officialWorkingHoursInMonth = (summary.totalWorkingDaysInMonth || 22) * 8; // Working days * 8
            let delayDeductionDays = 0;
            if (officialWorkingHoursInMonth > 0) {
                delayDeductionDays = (totalDelayHours * (sysSettings.delay_per_hour_deduction ?? 0) / officialWorkingHoursInMonth) * fullDaysInMonth;
            }
            const totalDeductionDays = onlineRejectedDays + onlineWithoutReqDays + holidayRejectedDays + unexcusedAbsenceDays + delayDeductionDays;
            const absencePenalty = totalDeductionDays * dailyRate;
            let bonusAmount = 0;
            let deductionAmount = 0;
            if (reportData.financials) {
                reportData.financials.bonuses.forEach(b => {
                    if (b.type === 'amount') {
                        bonusAmount += Number(b.amount);
                    }
                    else if (b.type === 'days') {
                        bonusAmount += (Number(b.amount) * dailyRate);
                    }
                });
                reportData.financials.deductions.forEach(d => {
                    if (d.type === 'amount') {
                        deductionAmount += Number(d.amount);
                    }
                    else if (d.type === 'days') {
                        deductionAmount += (Number(d.amount) * dailyRate);
                    }
                });
            }
            const netSalary = proratedBaseSalary + bonusAmount - deductionAmount - absencePenalty;
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
    }
    catch (error) {
        console.error("Error fetching payroll:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.getPayroll = getPayroll;
