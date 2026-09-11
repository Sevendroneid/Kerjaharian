import { ArrowLeft, ChevronDown, MessageCircle, ShieldCheck } from 'lucide-react';
import type { View } from '@/lib/types';

interface Props { view: 'privacy' | 'terms' | 'help'; onNavigate: (view: View) => void; lang?: 'id' | 'en'; }

export default function PublicInfoPage({ view, onNavigate, lang }: Props) {
  const currentLang = lang ?? ((typeof window !== 'undefined' && localStorage.getItem('kerjaharian_lang') === 'en') ? 'en' : 'id');
  const id = currentLang === 'id';
  const content = id ? {
    titles: { privacy: 'Kebijakan Privasi', terms: 'Syarat & Ketentuan', help: 'Pusat Bantuan' },
    back: 'Kembali ke Beranda', official: 'KerjaHarian • informasi resmi layanan', chat: 'Chat WhatsApp CS',
    faqs: [
      ['Apakah pekerja harus punya CV?', 'Tidak. Kamu daftar menggunakan nomor WhatsApp dan melengkapi data yang diperlukan.'],
      ['Apakah harga pekerjaan bisa dinegosiasikan?', 'Tidak. KerjaHarian menggunakan harga yang ditentukan untuk jenis pekerjaan yang tersedia sehingga harga dapat diketahui sebelum order.'],
      ['Bagaimana pekerja mendapatkan order?', 'Pekerja menerima informasi pekerjaan sesuai ketersediaan dan area layanan, lalu dapat menerima atau menolaknya sesuai ketentuan order.'],
      ['Apakah employer perlu verifikasi identitas?', 'Ya. Verifikasi identitas merupakan bagian dari upaya menjaga keamanan dan kepercayaan di platform.'],
      ['Bagaimana kalau terjadi masalah dengan pekerjaan?', 'Hubungi CS KerjaHarian dan siapkan ID order serta bukti pembayaran agar tim dapat memeriksa kasusnya.'],
    ],
    privacy: [
      ['Data yang kami kumpulkan', 'KerjaHarian dapat memproses nomor WhatsApp, data profil, data identitas untuk verifikasi, informasi pekerjaan, lokasi yang diperlukan untuk layanan, serta informasi transaksi dan pembayaran.'],
      ['Penggunaan data', 'Data digunakan untuk akun, keamanan, order, verifikasi, pencocokan pekerjaan, pencegahan penyalahgunaan, pembayaran, dan bantuan pengguna.'],
      ['Data KTP', 'Data identitas digunakan untuk proses verifikasi sesuai kebutuhan layanan. Akses dibatasi sesuai fungsi dan kebutuhan keamanan. Jangan kirim KTP melalui chat publik.'],
      ['Keamanan dan hak pengguna', 'Kami menerapkan pengamanan teknis dan organisasi yang wajar. Untuk pertanyaan atau permintaan terkait data pribadi, hubungi CS melalui kanal resmi KerjaHarian.'],
      ['Perubahan kebijakan', 'Kebijakan dapat diperbarui ketika layanan atau ketentuan hukum berubah. Versi terbaru dipublikasikan di halaman ini.'],
    ],
    terms: [
      ['Penggunaan layanan', 'Pengguna wajib memberikan informasi yang benar, menjaga akses akun, dan menggunakan KerjaHarian hanya untuk kebutuhan kerja yang sah.'],
      ['Harga dan pembayaran', 'Harga ditampilkan berdasarkan jenis pekerjaan dan ketentuan yang berlaku saat order. Pembayaran dilakukan melalui metode yang disediakan KerjaHarian.'],
      ['Order dan pembatalan', 'Status order mengikuti proses di platform. Pembatalan, pengembalian dana, atau perubahan order mengikuti ketentuan pada transaksi terkait.'],
      ['Kewajiban', 'Pekerja wajib menjalankan pekerjaan sesuai detail order. Employer wajib memberikan informasi pekerjaan yang benar, lokasi yang aman, dan kondisi kerja sesuai detail order.'],
      ['Larangan', 'Dilarang melakukan penipuan, penyalahgunaan identitas, pelecehan, transaksi yang melanggar ketentuan platform, atau aktivitas melanggar hukum. KerjaHarian dapat membatasi atau menonaktifkan akun sesuai hasil pemeriksaan.'],
      ['Bantuan dan sengketa', 'Untuk masalah transaksi, segera hubungi CS dengan ID order dan bukti terkait. KerjaHarian akan memeriksa berdasarkan data yang tersedia.'],
    ]
  } : {
    titles: { privacy: 'Privacy Policy', terms: 'Terms & Conditions', help: 'Help Center' },
    back: 'Back to Home', official: 'KerjaHarian • official service information', chat: 'Chat with WhatsApp Support',
    faqs: [
      ['Do workers need a CV?', 'No. Workers can register using a WhatsApp number and provide the information required for the service.'],
      ['Can job prices be negotiated?', 'No. KerjaHarian uses defined prices for available job types so the price is known before an order is placed.'],
      ['How do workers receive jobs?', 'Workers receive job information based on availability and service area, then may accept or decline according to the order terms.'],
      ['Do employers need identity verification?', 'Yes. Identity verification is part of the platform safety and trust measures.'],
      ['What if there is a problem with a job?', 'Contact KerjaHarian Support and prepare the order ID and relevant payment evidence so the team can review the case.'],
    ],
    privacy: [
      ['Data We Collect', 'KerjaHarian may process WhatsApp numbers, profile data, identity data for verification, job information, location required for the service, and transaction and payment information.'],
      ['How We Use Data', 'Data is used for accounts, security, orders, verification, job matching, abuse prevention, payments, and user support.'],
      ['Identity Data', 'Identity data is used for verification when required by the service. Access is limited according to role and security needs. Do not send identity documents through public chat.'],
      ['Security and User Rights', 'We apply reasonable technical and organizational safeguards. For questions or requests concerning personal data, contact KerjaHarian through an official support channel.'],
      ['Policy Changes', 'This policy may be updated when the service or applicable legal requirements change. The latest version is published on this page.'],
    ],
    terms: [
      ['Use of the Service', 'Users must provide accurate information, protect account access, and use KerjaHarian only for lawful work-related purposes.'],
      ['Pricing and Payment', 'Prices are displayed according to the job type and terms applicable when an order is placed. Payment is made through methods provided by KerjaHarian.'],
      ['Orders and Cancellation', 'Order status follows the platform workflow. Cancellation, refunds, or order changes are governed by the terms applicable to the transaction.'],
      ['Responsibilities', 'Workers must perform the job according to the order details. Employers must provide accurate job information, a safe location, and working conditions consistent with the order details.'],
      ['Prohibited Conduct', 'Fraud, identity misuse, harassment, transactions that violate platform rules, and unlawful activity are prohibited. KerjaHarian may restrict or disable an account based on its review.'],
      ['Support and Disputes', 'For transaction problems, contact Support promptly with the order ID and relevant evidence. KerjaHarian will review the case using available data.'],
    ]
  };
  const title = content.titles[view];
  return <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
    <button onClick={() => onNavigate('landing')} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> {content.back}</button>
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
      <div className="flex items-start gap-4"><div className="rounded-2xl bg-primary-50 p-3 text-primary-700"><ShieldCheck className="h-6 w-6" /></div><div><h1 className="text-2xl font-extrabold text-slate-950">{title}</h1><p className="mt-1 text-sm text-slate-500">{content.official}</p></div></div>
      {view === 'help' && <div className="mt-8 space-y-3">{content.faqs.map(([q,a]) => <details key={q} className="rounded-2xl border border-slate-200 p-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900"><span>{q}</span><ChevronDown className="h-4 w-4" /></summary><p className="mt-3 text-sm leading-6 text-slate-600">{a}</p></details>)}<a href="https://wa.me/6288289767019" target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700"><MessageCircle className="h-4 w-4" /> {content.chat}</a></div>}
      {view === 'privacy' && <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">{content.privacy.map(([heading, body], i) => <div key={heading}><h2 className="font-extrabold text-slate-900">{i + 1}. {heading}</h2><p>{body}</p></div>)}</div>}
      {view === 'terms' && <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">{content.terms.map(([heading, body], i) => <div key={heading}><h2 className="font-extrabold text-slate-900">{i + 1}. {heading}</h2><p>{body}</p></div>)}</div>}
    </div>
  </section>;
}
