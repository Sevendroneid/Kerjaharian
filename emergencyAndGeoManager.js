// ============================================================================
// KERJAHARIAN: EMERGENCY, GEO-FENCING & TWO-WAY MODULE (emergencyAndGeoManager.js)
// Target Peluncuran: 1 September 2026
// ============================================================================

// 1. MODUL: GEO-FENCING & INSTANT MATCHING RADIUS
const GeoFencingMatcher = {
    calculateDistance(lat1, lon1, lat2, lon2) {
        // Simulasi perhitungan jarak sederhana dalam kilometer
        const p = 0.017453292519943295;
        const c = Math.cos;
        const a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
        return 12742 * Math.asin(Math.sqrt(a)); 
    },
    findNearbyWorkers(jobLocation, workerList, maxRadiusKm = 5) {
        return workerList.filter(worker => {
            const distance = this.calculateDistance(jobLocation.lat, jobLocation.lon, worker.lat, worker.lon);
            return distance <= maxRadiusKm;
        });
    }
};

// 2. MODUL: TOMBOL DARURAT SOS UNTUK MITRA
const WorkerSOSModule = {
    triggerSOS(workerId, currentCoordinates) {
        return {
            alertId: "SOS-" + Math.floor(Math.random() * 100000),
            workerId,
            location: currentCoordinates,
            timestamp: new Date(),
            status: "EMERGENCY_DISPATCHED",
            message: "Sinyal SOS darurat diaktifkan! Lokasi real-time dikirim ke tim keamanan KerjaHarian."
        };
    }
};

// 3. MODUL: PENILAIAN DUA ARAH (TWO-WAY RATING)
const TwoWayRatingSystem = {
    submitRating(targetId, targetRole, score, comment) {
        return {
            targetId,
            targetRole, // "WORKER" atau "EMPLOYER"
            score, // Skala 1 - 5
            comment,
            recordedAt: new Date(),
            message: `Ulasan untuk ${targetRole} berhasil disimpan untuk menjaga reputasi ekosistem.`
        };
    }
};

// 4. MODUL: OTOMASI WHATSAPP GATEWAY
const WhatsAppNotificationGateway = {
    sendNotification(phoneNumber, messageType, details) {
        let messageText = "";
        if (messageType === "ORDER_CONFIRMED") {
            messageText = `Halo, tugas baru #${details.taskId} telah dikonfirmasi. Silakan bersiap menuju lokasi.`;
        } else if (messageType === "ESCROW_PAID") {
            messageText = `Dana sebesar Rp ${details.amount} telah diamankan di sistem Escrow KerjaHarian.`;
        }
        
        return {
            destination: phoneNumber,
            gatewayStatus: "SENT_VIA_WHATSAPP_API",
            content: messageText,
            timestamp: new Date()
        };
    }
};
                   
