# KerjaHarian — Consent UX & Transaction Approval Specification

**Version:** 1.0-draft
**Date:** 11 September 2026

## A. Registration

### Common
Checkbox wajib:
- Saya telah membaca dan menyetujui Syarat & Ketentuan KerjaHarian.
- Saya telah membaca Kebijakan Privasi KerjaHarian.

Links must open the exact version displayed to the user.

### Worker role notice
Text:
> KerjaHarian adalah platform yang mempertemukan Anda dengan pihak yang membutuhkan pekerjaan harian. Anda bebas melihat, menerima, atau menolak pekerjaan yang tersedia. KerjaHarian bukan atasan Anda dan tidak menjamin jumlah pekerjaan atau pendapatan.

Checkbox:
- Saya memahami bahwa saya bebas memilih, menerima, atau menolak pekerjaan.

### Employer role notice
Text:
> KerjaHarian menyediakan platform untuk menemukan Pekerja. Anda bertanggung jawab memberikan informasi pekerjaan, lokasi, ruang lingkup, dan kondisi keselamatan yang benar serta memberikan instruksi pekerjaan yang sesuai dengan Order.

Checkbox:
- Saya memahami tanggung jawab saya sebagai Employer dalam transaksi pekerjaan.

## B. Create Order — Employer
Before publish:
- Detail pekerjaan reviewed.
- Location reviewed.
- Duration reviewed.
- Price reviewed.
- Safety/prohibited-job notice shown when applicable.

Required checkbox:
- Saya telah memeriksa detail pekerjaan, lokasi, durasi, dan harga.

Consent event:
`job_create`

## C. Accept Job — Worker
Worker must see:
- job type/title
- location/distance
- expected duration
- worker payment amount
- important safety/scope information

Required checkbox:
- Saya telah membaca detail pekerjaan dan bersedia menerima pekerjaan ini.

Buttons:
- `TERIMA PEKERJAAN`
- `TOLAK`

No forced acceptance.

Consent event:
`job_accept`

## D. Payment confirmation — Employer
Before payment:
- total transaction
- platform fee
- any applicable protection/tax/other charge
- payment method
- cancellation rule

Required checkbox:
- Saya telah memeriksa total pembayaran dan memahami ketentuan transaksi ini.

Consent event:
`payment_confirmation`

## E. Job start
Both parties should see a concise confirmation:
> Pekerjaan telah dikonfirmasi. Pastikan pekerjaan sesuai dengan detail Order. Perubahan ruang lingkup atau lembur memerlukan persetujuan yang sesuai.

Consent/event:
`job_start`

## F. Overtime
Current product already has a worker consent state for overtime. Keep it explicit and bilateral. The worker must never be treated as consenting merely because the timer continued.

Required worker decision:
- Lanjutkan lembur
- Tidak menyetujui lembur

Consent event:
`overtime`

## G. Completion
Employer and Worker confirm completion according to the transaction state machine.

Consent/event:
`job_completion`

## H. Consent evidence
Every material consent stores:
- authenticated user_id
- role
- consent_type
- document_key
- document_version
- order_id when applicable
- job_id when applicable
- metadata
- accepted_at

Records are append-only. There is no normal user UPDATE/DELETE path.

## I. Versioning
Recommended keys:
- `platform_terms` version `1.0`
- `privacy_policy` version `1.0`
- `worker_role_notice` version `1.0`
- `employer_role_notice` version `1.0`

If a material document changes, increment the version and require new consent where appropriate.

## J. Copy rules
Avoid:
- employee/karyawan for the Worker role unless legally required in a specific context
- salary/payroll for marketplace worker payments
- boss/supervisor language for KerjaHarian
- mandatory order quotas
- "KerjaHarian assigns you"

Prefer:
- Pekerja
- Employer
- pekerjaan/Order
- pembayaran pekerjaan
- Platform Fee
- menerima/menolak pekerjaan
- KerjaHarian mempertemukan/memfasilitasi

## K. Legal/UX safety rule
A checkbox must not be used to force a user to waive mandatory statutory rights. Consent is evidence of agreement to the displayed terms/notice; it is not a substitute for compliance with mandatory Indonesian law.
