// ==========================================
// 1. KONFIGURASI PAKET SHIFT BAKU & TARIF
// ==========================================
const SHIFT_PACKAGES = {
    short: { name: "Shift Pendek (3-4 Jam)", defaultHours: 4, basePrice: 75000 },
    standard: { name: "Shift Standar (6-8 Jam)", defaultHours: 8, basePrice: 120000 },
    long: { name: "Shift Panjang (9-10 Jam)", defaultHours: 10, basePrice: 160000 }
};

// ==========================================
// 2. FUNGSI UTAMA: CHECK-IN & INISIASI TIMER
// ==========================================
function startJobSession(packageType, agreedPrice) {
    const selectedPkg = SHIFT_PACKAGES[packageType];
    
    const sessionData = {
        taskId: "TASK-" + Math.floor(Math.random() * 100000),
        totalHours: selectedPkg.defaultHours,
        totalPrice: agreedPrice || selectedPkg.basePrice,
        startTime: new Date(),
        warningGiven: false,
        status: "RUNNING"
    };

    // Simpan sesi aktif ke penyimpanan lokal / database sementara
    localStorage.setItem("activeJobSession", JSON.stringify(sessionData));
    console.log("Check-in Berhasil. Sesi Kerja Dimulai:", sessionData);
    
    // Jalankan pemantau waktu real-time setiap 1 menit
    setInterval(() => monitorActiveJob(), 60000);
}

// ==========================================
// 3. FUNGSI PEMANTAU WAKTU & AUTO-ALERT
// ==========================================
function monitorActiveJob() {
    const session = JSON.parse(localStorage.getItem("activeJobSession"));
    if (!session || session.status !== "RUNNING") return;

    const now = new Date();
    const elapsedMinutes = (now - new Date(session.startTime)) / (1000 * 60);
    const totalDurationMinutes = session.totalHours * 60;
    const remainingMinutes = totalDurationMinutes - elapsedMinutes;

    // Alert Peringatan 30 Menit Menjelang Selesai
    if (remainingMinutes <= 30 && remainingMinutes > 0 && !session.warningGiven) {
        session.warningGiven = true;
        localStorage.setItem("activeJobSession", JSON.stringify(sessionession));
        
        triggerUIModal({
            type: "WARNING",
            title: "Peringatan Waktu Kerja",
            message: `Waktu shift Anda tinggal ${Math.ceil(remainingMinutes)} menit lagi. Bersiaplah untuk menyelesaikan tugas.`
        });
    }

    // Ketika Waktu Shift Habis (Tepat / Lewat)
    if (elapsedMinutes >= totalDurationMinutes) {
        session.status = "COMPLETED_TIME";
        localStorage.setItem("activeJobSession", JSON.stringify(session));
        
        triggerUIModal({
            type: "COMPLETION",
            title: "Shift Selesai",
            message: "Durasi kerja telah tercapai. Silakan lakukan Check-Out dan pilih opsi penyelesaian transaksi."
        });
        
        // Buka opsi perpanjangan lembur atau tutup transaksi
        showCheckoutOptions(session);
    }
}

// ==========================================
// 4. FUNGSI PENGHENTIAN LEBIH CEPAT (EARLY TERMINATION)
// ==========================================
function earlyTerminationHandler(reasonCode) {
    const session = JSON.parse(localStorage.getItem("activeJobSession"));
    if (!session) return;

    const now = new Date();
    const elapsedHours = (now - new Date(session.startTime)) / (1000 * 60 * 60);

    let finalBillAmount = session.totalPrice;

    if (reasonCode === "COMPLETED_EARLY") {
        // Skenario A: Tugas selesai lebih cepat tapi 100% tuntas -> Bayar Full
        finalBillAmount = session.totalPrice;
        alert(`Tugas selesai lebih cepat. Sesuai kebijakan jaminan, total pembayaran tetap penuh: Rp ${finalBillAmount}`);
    
    } else if (reasonCode === "MISMATCH_EARLY_STOP") {
        // Skenario B: Dihentikan di tengah jalan karena tidak cocok
        // Aturan Minimum Protection: Minimal bayar 2 jam pertama atau 50%
        const hourlyRate = session.totalPrice / session.totalHours;
        const minimumProtectionPay = Math.max(hourlyRate * 2, session.totalPrice * 0.5);
        
        if (elapsedHours * hourlyRate < minimumProtectionPay) {
            finalBillAmount = minimumProtectionPay;
        } else {
            finalBillAmount = elapsedHours * hourlyRate;
        }
        
        alert(`Tugas dihentikan lebih awal. Berdasarkan proteksi minimum kehadiran, total tagihan disesuaikan menjadi: Rp ${Math.round(finalBillAmount)}`);
    }

    session.status = "TERMINATED";
    localStorage.setItem("activeJobSession", JSON.stringify(session));
    
    // Lanjut ke gerbang pembayaran Midtrans dengan nilai finalBillAmount
    processFinalCheckout(finalBillAmount);
}

// Fungsi Bantu UI (Simulasi Tampilan Pop-up)
function triggerUIModal(alertData) {
    console.log(`[${alertData.type}] ${alertData.title}: ${alertData.message}`);
}

function showCheckoutOptions(session) {
    console.log("Menampilkan opsi: [Selesaikan & Bayar] atau [Tambah Lembur].");
}

function processFinalCheckout(amount) {
    console.log(`Memproses pembayaran akhir sebesar Rp ${amount} via Midtrans Snap.`);
}
  
