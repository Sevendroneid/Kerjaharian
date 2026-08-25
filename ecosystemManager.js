// ============================================================================
// KERJAHARIAN: MASTER ECOSYSTEM & PROTECTION MODULE (ecosystemManager.js)
// Target Peluncuran: 1 September 2026
// ============================================================================

// 1. MODUL: SISTEM PATUNGAN TENAGA KERJA (GROUP JOBS)
const GroupJobManager = {
    createGroupTask(taskId, title, requiredSlots, totalBudget) {
        return {
            taskId,
            title,
            requiredSlots,
            currentSlotsFilled: 0,
            workersJoined: [],
            totalBudget,
            status: "OPEN_FOR_GROUP"
        };
    },
    joinGroupTask(groupTask, workerId) {
        if (groupTask.workersJoined.length < groupTask.requiredSlots) {
            groupTask.workersJoined.push(workerId);
            groupTask.currentSlotsFilled++;
            if (groupTask.currentSlotsFilled === groupTask.requiredSlots) {
                groupTask.status = "GROUP_LOCKED_AND_READY";
            }
            return { success: true, message: "Berhasil bergabung ke tugas kelompok." };
        }
        return { success: false, message: "Slot kelompok sudah penuh." };
    },
    distributeGroupWages(groupTask) {
        const individualShare = groupTask.totalBudget / groupTask.requiredSlots;
        return groupTask.workersJoined.map(workerId => ({
            workerId,
            payout: individualShare
        }));
    }
};

// 2. MODUL: DASHBOARD MANAJEMEN MITRA (WORKER HUB & TRANSPARENCY)
function getWorkerDashboardData(workerId, completedTasksLog) {
    const totalEarnings = completedTasksLog.reduce((acc, task) => acc + task.netPayout, 0);
    return {
        workerId,
        totalTasksCompleted: completedTasksLog.length,
        netEarnings: totalEarnings,
        hiddenFeesDeduction: 0, // Transparansi penuh: 0 potongan tersembunyi
        payoutStatus: "READY_FOR_WITHDRAWAL",
        history: completedTasksLog
    };
}

// 3. MODUL: OTOMASI ATURAN KEAMANAN & SANKSI EKOSISTEM
const EcosystemSecurity = {
    handleEmployerCancellation(isWorkerOnSite) {
        if (isWorkerOnSite) {
            const compensationFee = 35000; // Biaya kompensasi minimum kehadiran
            return {
                penaltyApplied: true,
                message: `Pemberi kerja membatalkan sepihak setelah mitra di lokasi. Denda kompensasi Rp ${compensationFee} ditransfer ke mitra.`
            };
        }
        return { penaltyApplied: false, message: "Pembatalan bebas penalti sebelum mitra berangkat." };
    },
    handleWorkerNoShow(workerId) {
        return {
            workerId,
            suspended: true,
            suspensionDurationDays: 3,
            message: "Mitra mangkir (no-show). Akun ditangguhkan sementara selama 3 hari."
        };
    }
};

// 4. MODUL: PELACAKAN METRIK TRAKSI (INVESTOR & PERFORMANCE METRICS)
const TractionMetricsCollector = {
    calculateKPIs(totalOrdersAttempted, totalOrdersCompleted, totalResponseTimeMinutes, totalRatings) {
        const completionRate = (totalOrdersCompleted / (totalOrdersAttempted || 1)) * 100;
        const avgResponseTime = totalResponseTimeMinutes / (totalOrdersAttempted || 1);
        const satisfactionScore = totalRatings.reduce((a, b) => a + b, 0) / (totalRatings.length || 1);

        return {
            orderCompletionRate: `${completionRate.toFixed(1)}%`,
            averageWorkerResponseTimeMinutes: avgResponseTime.toFixed(1),
            customerSatisfactionScore: satisfactionScore.toFixed(2),
            systemStatus: "OPTIMIZED_FOR_INVESTOR_REVIEW"
        };
    }
};
