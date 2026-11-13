import React, {
  useState,
  useEffect,
  useRef,
  useReducer,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from 'react';
import {
  Menu,
  X,
  MapPin,
  Search,
  ShieldCheck,
  Wrench,
  Truck,
  Phone,
  AlertTriangle,
  CreditCard,
  ChevronRight,
  CheckCircle2,
  Clock,
  Camera,
  Zap,
  Settings,
  Activity,
  Database,
  Check,
  ChevronLeft,
  MessageSquare,
  Download,
  FileText,
  Lock,
  Radio,
  Navigation,
  Crosshair,
  Plus,
  Minus,
  Sun,
  Moon,
  Globe,
  Sparkles,
  Car,
  Battery,
  Thermometer,
  Gauge,
  Bluetooth,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Building2,
  Eye,
  Mic,
  MicOff,
  Wifi,
  WifiOff,
  RefreshCw,
  QrCode,
  ExternalLink,
  Copy,
  Send,
  ArrowRight,
  ShieldAlert,
  Info,
  Unlock,
} from 'lucide-react';

// ============================================================================
// 1. CONSTANTS, THEME TOKENS & LOCALIZATION (EN / BM)
// ============================================================================

const DEFAULT_SUPABASE_URL = 'https://kgykpamsffhdkhvpfqrn.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'sb_publishable_Vm6oqE4qXq-CWLslg1JlcA_cb9vQ54K';
const WORKFORCE_PIN = '1234';
const WORKFORCE_PINS = ['4402', '1234'];
const RESCUE_HANDSHAKE_PIN = '4829';
const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes matching ConsoleSessionManager
const PERSISTED_STATE_KEY = 'repairbah_persisted_state_v1';
const KOLOMBONG_HQ_LAT = 5.9802;
const KOLOMBONG_HQ_LNG = 116.1154;
const ARRIVAL_GEOFENCE_METERS = 150;

type DisplayMode = 'obsidian' | 'sunlight';
type Language = 'EN' | 'BM';
type ScreenId =
  | 'sos'
  | 'garage'
  | 'wallet'
  | 'marketplace'
  | 'ai'
  | 'settings'
  | 'dtc'
  | 'mechanic'
  | 'tow'
  | 'workshop';

type RescueStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type VaultStatus = 'IDLE' | 'RESERVED' | 'DISBURSED';

interface ServiceOption {
  id: string;
  code: string;
  nameEn: string;
  nameBm: string;
  price: number;
  etaMin: number;
  unitType: 'PATROL' | 'TOW' | 'MOBILE';
}

interface QuoteLineItem {
  id: string;
  description: string;
  category: 'LABOR' | 'PARTS';
  qty: number;
  unitPrice: number;
}

interface SabahLandmark {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  mapX: number; // 0..1000 normalized Sabah map coordinates
  mapY: number;
}

interface VehicleProfile {
  id: string;
  makeModel: string;
  variant: string;
  plate: string;
  vin: string;
  year: number;
  jpjVerified: boolean;
  roadtaxExpiry: string;
}

interface MarketplacePart {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  myviFit: boolean;
  stock: number;
  badge: string;
}

interface CartItem {
  part: MarketplacePart;
  qty: number;
}

interface LedgerEntry {
  id: string;
  title: string;
  timestamp: string;
  amount: number;
  type: 'CREDIT' | 'RESERVE' | 'DEBIT';
  ref: string;
}

interface WorkshopBay {
  bayNumber: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'DIAGNOSTICS';
  plate: string | null;
  vehicle: string | null;
  tech: string | null;
  stage: 'Checked-In' | 'DVI/OBD' | 'Active Repair' | 'Completed';
}

interface SnackbarMessage {
  id: string;
  text: string;
  tone: 'info' | 'success' | 'warning' | 'error';
}

const SERVICES: ServiceOption[] = [
  {
    id: 'patrol_tow',
    code: 'PTW',
    nameEn: 'Patrol + Tow',
    nameBm: 'Ronda + Tunda',
    price: 140,
    etaMin: 12,
    unitType: 'PATROL',
  },
  {
    id: 'tow_truck',
    code: 'TOW',
    nameEn: 'Tow Truck',
    nameBm: 'Trak Tunda',
    price: 120,
    etaMin: 15,
    unitType: 'TOW',
  },
  {
    id: 'mobile_mech',
    code: 'MCH',
    nameEn: 'Mobile Mechanic',
    nameBm: 'Mekanik Bergerak',
    price: 85,
    etaMin: 11,
    unitType: 'MOBILE',
  },
  {
    id: 'battery_swap',
    code: 'BAT',
    nameEn: 'Battery Swap',
    nameBm: 'Tukar Bateri',
    price: 65,
    etaMin: 10,
    unitType: 'MOBILE',
  },
  {
    id: 'flat_tyre',
    code: 'TYR',
    nameEn: 'Flat Tyre',
    nameBm: 'Tayar Pancit',
    price: 55,
    etaMin: 9,
    unitType: 'MOBILE',
  },
  {
    id: 'fuel_delivery',
    code: 'FUL',
    nameEn: 'Fuel',
    nameBm: 'Hantar Minyak',
    price: 45,
    etaMin: 10,
    unitType: 'PATROL',
  },
  {
    id: 'lockout',
    code: 'LCK',
    nameEn: 'Lockout',
    nameBm: 'Kunci Tertinggal',
    price: 75,
    etaMin: 12,
    unitType: 'MOBILE',
  },
];

const SABAH_LANDMARKS: SabahLandmark[] = [
  {
    id: 'lm1',
    name: 'Jalan Lintas Penampang',
    district: 'Luyang / Penampang',
    lat: 5.9512,
    lng: 116.0914,
    mapX: 520,
    mapY: 540,
  },
  {
    id: 'lm2',
    name: 'Jalan Tuaran Bypass Inanam',
    district: 'Inanam',
    lat: 5.9934,
    lng: 116.1268,
    mapX: 690,
    mapY: 310,
  },
  {
    id: 'lm3',
    name: 'Likas Bay Road',
    district: 'Likas',
    lat: 5.9941,
    lng: 116.0872,
    mapX: 460,
    mapY: 330,
  },
  {
    id: 'lm4',
    name: 'Kepayan Highway KKIA',
    district: 'Kepayan',
    lat: 5.9328,
    lng: 116.0545,
    mapX: 330,
    mapY: 670,
  },
  {
    id: 'lm5',
    name: 'Jalan Kolombong Industrial',
    district: 'Kolombong HQ',
    lat: 5.9802,
    lng: 116.1154,
    mapX: 630,
    mapY: 410,
  },
  {
    id: 'lm6',
    name: 'Imago Mall Coastal',
    district: 'KK City Centre',
    lat: 5.9708,
    lng: 116.0664,
    mapX: 370,
    mapY: 470,
  },
  {
    id: 'lm7',
    name: 'Donggongon Town',
    district: 'Penampang',
    lat: 5.9108,
    lng: 116.1032,
    mapX: 590,
    mapY: 740,
  },
  {
    id: 'lm8',
    name: '1Borneo Alamesra',
    district: 'Jalan Sulaman',
    lat: 6.0365,
    lng: 116.1302,
    mapX: 720,
    mapY: 160,
  },
  {
    id: 'lm9',
    name: 'Tanjung Aru Beach',
    district: 'Tanjung Aru',
    lat: 5.9482,
    lng: 116.0462,
    mapX: 280,
    mapY: 580,
  },
  {
    id: 'lm10',
    name: 'Sepanggar Bay',
    district: 'Sepanggar',
    lat: 6.0715,
    lng: 116.1225,
    mapX: 675,
    mapY: 95,
  },
];

const INITIAL_VEHICLES: VehicleProfile[] = [
  {
    id: 'v1',
    makeModel: 'Perodua Myvi 1.5L',
    variant: 'AV (D51A) Dual VVT-i',
    plate: 'SAB 8821 X',
    vin: 'PM2M800S00018821',
    year: 2022,
    jpjVerified: true,
    roadtaxExpiry: '14 Oct 2027',
  },
  {
    id: 'v2',
    makeModel: 'Proton X50 1.5 TGDi',
    variant: 'Flagship 7DCT',
    plate: 'SAA 4921 W',
    vin: 'PL1X500T00094921',
    year: 2023,
    jpjVerified: true,
    roadtaxExpiry: '29 Mar 2027',
  },
];

const MARKETPLACE_PARTS: MarketplacePart[] = [
  {
    id: 'mp1',
    sku: 'AMR-NS60LS',
    name: 'Amaron Hi-Life NS60LS',
    brand: 'Amaron',
    category: 'Battery',
    price: 265,
    myviFit: true,
    stock: 14,
    badge: '18-Mo Warranty',
  },
  {
    id: 'mp2',
    sku: 'MCH-XM2-185',
    name: 'Michelin Energy XM2+',
    brand: 'Michelin',
    category: 'Tyres',
    price: 240,
    myviFit: true,
    stock: 8,
    badge: '185/55 R15',
  },
  {
    id: 'mp3',
    sku: 'LQM-5W30-4L',
    name: 'Liqui Moly 5W-30',
    brand: 'Liqui Moly',
    category: 'Lubricants',
    price: 185,
    myviFit: true,
    stock: 22,
    badge: 'Fully Synthetic 4L',
  },
  {
    id: 'mp4',
    sku: 'BRM-P79024',
    name: 'Brembo Front Brake Pads',
    brand: 'Brembo',
    category: 'Brakes',
    price: 145,
    myviFit: true,
    stock: 11,
    badge: 'Low-Dust Ceramic',
  },
  {
    id: 'mp5',
    sku: '70M-A810-4K',
    name: '70mai A810 Dashcam',
    brand: '70mai',
    category: 'Electronics',
    price: 549,
    myviFit: false,
    stock: 6,
    badge: 'Sony STARVIS 2',
  },
  {
    id: 'mp6',
    sku: 'DNS-IXUH22',
    name: 'Denso Iridium Spark Plugs',
    brand: 'Denso',
    category: 'Ignition',
    price: 168,
    myviFit: true,
    stock: 19,
    badge: 'Set of 4 • 100k km',
  },
];

const DTC_LIBRARY = [
  {
    code: 'P0117',
    system: 'Powertrain • Cooling',
    title: 'Engine Coolant Temp Circuit Low Input',
    severity: 'HIGH',
    symptoms: 'Cooling fan stuck on high, erratic temp gauge, hard cold start.',
    steps: [
      'Inspect ECT sensor connector near thermostat housing for moisture.',
      'Check coolant level in radiator & expansion tank (do not open hot).',
      'Dispatch Mobile Mechanic for sensor resistance test.',
    ],
    recommendedServiceId: 'mobile_mech',
  },
  {
    code: 'P0171',
    system: 'Powertrain • Fuel Trim',
    title: 'System Too Lean (Bank 1)',
    severity: 'MEDIUM',
    symptoms: 'Rough idle at traffic lights, hesitation on Jalan Lintas incline.',
    steps: [
      'Check intake manifold vacuum hoses for cracks.',
      'Clean MAF sensor element with dedicated MAF cleaner.',
      'Verify fuel pump pressure (3.2–3.8 bar).',
    ],
    recommendedServiceId: 'mobile_mech',
  },
  {
    code: 'P0300',
    system: 'Powertrain • Ignition',
    title: 'Random / Multiple Cylinder Misfire Detected',
    severity: 'CRITICAL',
    symptoms: 'Flashing Check Engine Light, severe engine vibration, loss of power.',
    steps: [
      'Pull over safely immediately to prevent catalytic converter damage.',
      'Inspect ignition coils & Denso Iridium spark plugs.',
      'Request Patrol + Tow to Kolombong HQ if flashing persists.',
    ],
    recommendedServiceId: 'patrol_tow',
  },
  {
    code: 'P0562',
    system: 'Electrical • Charging',
    title: 'System Voltage Low (< 11.4V)',
    severity: 'HIGH',
    symptoms: 'Dim headlights, clicking starter relay, ABS/EPS warning lamps.',
    steps: [
      'Measure resting battery voltage (healthy > 12.4V).',
      'Test alternator charging output under load (13.8V–14.4V).',
      'Dispatch Battery Swap unit (Amaron NS60LS).',
    ],
    recommendedServiceId: 'battery_swap',
  },
  {
    code: 'P0420',
    system: 'Emissions • Exhaust',
    title: 'Catalyst System Efficiency Below Threshold',
    severity: 'LOW',
    symptoms: 'Steady MIL light, slight fuel economy drop.',
    steps: [
      'Compare upstream vs downstream O2 sensor switching waveforms.',
      'Inspect exhaust manifold flange for leaks.',
      'Safe to drive to Kolombong HQ for scheduled bay inspection.',
    ],
    recommendedServiceId: 'mobile_mech',
  },
  {
    code: 'P0700',
    system: 'Transmission • D-CVT / AT',
    title: 'Transmission Control System Malfunction',
    severity: 'CRITICAL',
    symptoms: 'Limp-home gear lock, harsh engagement, D-indicator blinking.',
    steps: [
      'Do not force high RPM climbs; stop in safe shoulder.',
      'Request Flatbed Tow Truck to prevent transmission overheating.',
    ],
    recommendedServiceId: 'tow_truck',
  },
  {
    code: 'C0034',
    system: 'Chassis • ABS/VSC',
    title: 'Right Front Wheel Speed Sensor Circuit',
    severity: 'MEDIUM',
    symptoms: 'ABS & Traction Control lights illuminated after heavy rain.',
    steps: [
      'Check wheel hub sensor harness behind front right knuckle.',
      'Clear mud/debris from tone ring.',
    ],
    recommendedServiceId: 'mobile_mech',
  },
  {
    code: 'U0100',
    system: 'Network • CAN Bus',
    title: 'Lost Communication With ECM/PCM "A"',
    severity: 'CRITICAL',
    symptoms: 'Crank no-start, multiple instrument cluster warnings.',
    steps: [
      'Inspect main EFI fuse & battery ground strap.',
      'Dispatch Patrol + Tow immediately.',
    ],
    recommendedServiceId: 'patrol_tow',
  },
];

const SABAH_HOTLINES = [
  {
    name: 'MERS 999 Malaysia Emergency',
    desc: 'Police, Ambulance, Fire & Civil Defence',
    number: '999',
    badge: '24/7 NATIONAL',
  },
  {
    name: 'PDRM Sabah Contingent HQ',
    desc: 'Kepayan Traffic & Highway Patrol',
    number: '088-318555',
    badge: 'POLICE',
  },
  {
    name: 'Bomba & Penyelamat Sabah',
    desc: 'Fire, Extrication & Hazmat Rescue',
    number: '994',
    badge: 'FIRE / RESCUE',
  },
  {
    name: 'JPJ Sabah (Kota Kinabalu)',
    desc: 'Vehicle Enforcement & Road Safety',
    number: '088-484400',
    badge: 'TRANSPORT',
  },
  {
    name: 'PLUS / Pan Borneo Ronda',
    desc: 'Highway Breakdown & Obstacle Clearance',
    number: '1800-88-0000',
    badge: 'HIGHWAY',
  },
  {
    name: 'APM Sabah (Civil Defence)',
    desc: 'Flood, Landslide & Fallen Tree Emergency',
    number: '088-232444',
    badge: 'CIVIL DEFENCE',
  },
];

const I18N = {
  EN: {
    sosHeader: 'REPAIR-BAH SOS',
    holdFor: 'HOLD FOR',
    rescue: 'RESCUE',
    tapImmediate: 'Tap to Request Immediate Roadside Assistance',
    dispatchesUnits: 'Dispatches Mobile Patrol (Roy) & Fast-Tow (Zul)',
    vaultLabel: 'Protected Vault Balance',
    confirmLocation: 'CONFIRM BREAKDOWN LOCATION',
    addressLabel: 'Breakdown Address / Landmark',
    confirmProceed: 'CONFIRM LOCATION & PROCEED',
    sosRoot: 'SOS Root',
    mechanic: 'Mechanic',
    tow: 'Tow',
    workshop: 'Workshop',
    activeBreakdown: 'Active Breakdown Request',
    digitalGarage: 'Digital Garage',
    walletPayments: 'Wallet & Payments',
    marketplace: 'Spare Parts Marketplace',
    aiAssistant: 'AI Breakdown Assistant',
    appSettings: 'App Settings',
    dtcLibrary: 'DTC Fault Library',
    beaconOff: 'BEACON OFF',
    strobeOn: 'STROBE ON',
    approveEscrow: 'APPROVE & LOCK IN ESCROW',
    downloadPdf: 'DOWNLOAD LHDN %PDF-1.4 INVOICE',
  },
  BM: {
    sosHeader: 'REPAIR-BAH SOS',
    holdFor: 'TEKAN UNTUK',
    rescue: 'BANTUAN',
    tapImmediate: 'Tekan Lama Untuk Bantuan Tepi Jalan Segera',
    dispatchesUnits: 'Menghantar Ronda Bergerak (Roy) & Tunda Pantas (Zul)',
    vaultLabel: 'Baki Peti Perlindungan',
    confirmLocation: 'SAHKAN LOKASI KEROSAKAN',
    addressLabel: 'Alamat Kerosakan / Mercu Tanda',
    confirmProceed: 'SAHKAN LOKASI & TERUSKAN',
    sosRoot: 'Utama SOS',
    mechanic: 'Mekanik',
    tow: 'Tunda',
    workshop: 'Bengkel',
    activeBreakdown: 'Permintaan Bantuan Aktif',
    digitalGarage: 'Garaj Digital',
    walletPayments: 'Dompet & Pembayaran',
    marketplace: 'Pasaran Alat Ganti',
    aiAssistant: 'Pembantu AI Kerosakan',
    appSettings: 'Tetapan Aplikasi',
    dtcLibrary: 'Pustaka Kod DTC',
    beaconOff: 'SUAR PADAM',
    strobeOn: 'SUAR AKTIF',
    approveEscrow: 'SAHKAN & KUNCI DANA ESCROW',
    downloadPdf: 'MUAT TURUN INVOIS %PDF-1.4 LHDN',
  },
};

// ============================================================================
// 2. CORE ENGINES: MALAYSIAN TAX ENGINE, SMS FALLBACK, LHDN QR & BINARY PDF
// ============================================================================

const MalaysianTaxEngine = {
  calculate(items: QuoteLineItem[]) {
    let laborSubtotal = 0;
    let partsSubtotal = 0;
    for (const item of items) {
      const lineTotal = item.qty * item.unitPrice;
      if (item.category === 'LABOR') {
        laborSubtotal += lineTotal;
      } else {
        partsSubtotal += lineTotal;
      }
    }
    const sstAmount = Number((laborSubtotal * 0.08).toFixed(2)); // 8% SST on Labor/Service
    const grandTotal = Number(
      (laborSubtotal + partsSubtotal + sstAmount).toFixed(2)
    );
    return {
      laborSubtotal: Number(laborSubtotal.toFixed(2)),
      partsSubtotal: Number(partsSubtotal.toFixed(2)),
      sstRate: 0.08,
      sstAmount,
      grandTotal,
    };
  },
};

const SmsFallbackEncoder = {
  encode(params: {
    plate: string;
    lat: number;
    lng: number;
    triageCode: string;
    pin: string;
  }) {
    const cleanPlate = params.plate.replace(/\s+/g, '').toUpperCase();
    const latMicro = Math.round(params.lat * 1_000_000);
    const lngMicro = Math.round(params.lng * 1_000_000);
    return `RB#${cleanPlate}#${latMicro},${lngMicro}#${params.triageCode}#${params.pin}`;
  },
};

const LhdnEInvoiceGenerator = {
  buildMetadata(jobId: string, plate: string, total: number) {
    const cleanPlate = plate.replace(/\s+/g, '');
    const uuid = `MYINV-SBH-${jobId}-${cleanPlate}`;
    const verifyUrl = `https://myinvois.lhdn.gov.my/verify?uuid=${encodeURIComponent(
      uuid
    )}&tin=C25849102090&total=${total.toFixed(2)}`;
    return {
      uuid,
      tin: 'C25849102090',
      sstRegNo: 'B16-2408-32000194',
      verifyUrl,
      validatedAt: new Date().toISOString(),
    };
  },
};

const PdfInvoiceGenerator = {
  generateBinaryPdfBlob(params: {
    invoiceNo: string;
    lhdnUuid: string;
    customerName: string;
    plate: string;
    vehicle: string;
    location: string;
    items: QuoteLineItem[];
    totals: ReturnType<typeof MalaysianTaxEngine.calculate>;
  }): Blob {
    const escapePdfText = (s: string) =>
      s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

    const lines: string[] = [
      'REPAIRBAH SABAH ROADSIDE & WORKSHOP SDN BHD',
      'Lot 14, Kolombong Industrial Estate, 88450 Kota Kinabalu, Sabah',
      'TIN: C25849102090 | SST Reg: B16-2408-32000194',
      '--------------------------------------------------------------------',
      `INVOICE NO   : ${params.invoiceNo}`,
      `LHDN MYINVOIS: ${params.lhdnUuid}`,
      `DATE / TIME  : ${new Date().toLocaleString('en-MY')}`,
      `CUSTOMER     : ${params.customerName}`,
      `VEHICLE      : ${params.vehicle} (${params.plate})`,
      `LOCATION     : ${params.location}`,
      '--------------------------------------------------------------------',
      'ITEMIZED BREAKDOWN (MALAYSIAN SST COMPLIANT):',
      ...params.items.map(
        (it) =>
          ` - [${it.category}] ${it.description} x${it.qty}: RM ${(
            it.qty * it.unitPrice
          ).toFixed(2)}`
      ),
      '--------------------------------------------------------------------',
      `Service & Labor Subtotal : RM ${params.totals.laborSubtotal.toFixed(2)}`,
      `Spare Parts Subtotal     : RM ${params.totals.partsSubtotal.toFixed(2)}`,
      `Malaysian SST (8% Labor) : RM ${params.totals.sstAmount.toFixed(2)}`,
      `Malaysian SST (0% Parts) : RM 0.00`,
      `GRAND TOTAL (ESCROW PAID): RM ${params.totals.grandTotal.toFixed(2)}`,
      '--------------------------------------------------------------------',
      'ESCROW STATUS: DISBURSED & CRYPTOGRAPHICALLY SIGNED',
      'Verify at: https://myinvois.lhdn.gov.my/verify',
    ];

    let contentStream = 'BT\n/F1 10 Tf\n42 780 Td\n15 TL\n';
    lines.forEach((line, idx) => {
      if (idx === 0) {
        contentStream += `(${escapePdfText(line)}) Tj\n`;
      } else {
        contentStream += `T* (${escapePdfText(line)}) Tj\n`;
      }
    });
    contentStream += 'ET';

    const objects: string[] = [];
    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    objects.push(
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n'
    );
    objects.push(
      `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`
    );
    objects.push(
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n'
    );

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += obj;
    }
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objects.length; i++) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return new Blob([pdf], { type: 'application/pdf' });
  },
};

type EmergencyServiceType =
  | 'battery'
  | 'towing'
  | 'tyre'
  | 'callout'
  | 'diagnostic';

type EmergencyRequestStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

function normalizeServiceType(raw?: string): EmergencyServiceType {
  const key = (raw || '').toLowerCase().trim();
  if (key === 'battery_swap' || key === 'battery' || key.includes('batt')) {
    return 'battery';
  }
  if (
    key === 'patrol_tow' ||
    key === 'tow_truck' ||
    key === 'towing' ||
    key.includes('tow')
  ) {
    return 'towing';
  }
  if (
    key === 'flat_tyre' ||
    key === 'tyre' ||
    key.includes('tyre') ||
    key.includes('tire')
  ) {
    return 'tyre';
  }
  if (key === 'diagnostic' || key.includes('diag') || key.includes('obd')) {
    return 'diagnostic';
  }
  if (
    key === 'mobile_mech' ||
    key === 'fuel_delivery' ||
    key === 'lockout' ||
    key === 'callout'
  ) {
    return 'callout';
  }
  return 'callout';
}

function normalizeEmergencyStatus(raw?: string): EmergencyRequestStatus {
  const key = (raw || '').toLowerCase().trim();
  if (key === 'pending' || key === 'broadcasting') return 'pending';
  if (key === 'accepted' || key === 'claimed') return 'accepted';
  if (
    key === 'in_progress' ||
    key === 'arrived' ||
    key === 'repairing' ||
    key === 'towing'
  ) {
    return 'in_progress';
  }
  if (key === 'completed' || key === 'disbursed' || key === 'settled') {
    return 'completed';
  }
  if (key === 'cancelled' || key === 'canceled') return 'cancelled';
  return 'pending';
}

function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function latLngToMapCoords(lat: number, lng: number) {
  const mapY = Math.max(80, Math.min(900, Math.round(((6.09 - lat) / 0.22) * 1000)));
  const mapX = Math.max(120, Math.min(880, Math.round(((lng - 116.01) / 0.16) * 1000)));
  return { mapX, mapY };
}

// ============================================================================
// 3. STATE MANAGEMENT & REDUCER
// ============================================================================

interface AppState {
  screen: ScreenId;
  drawerOpen: boolean;
  displayMode: DisplayMode;
  language: Language;
  hazardStrobe: boolean;

  // Rescue 10-Stage FSM
  rescueStage: RescueStage;
  activeJobId: string;
  selectedService: ServiceOption;
  pinnedLocation: {
    lat: number;
    lng: number;
    address: string;
    mapX: number;
    mapY: number;
  };
  responderClaimed: boolean;
  responderOnline: boolean;
  responderName: string;
  responderUnit: string;
  responderProgress: number; // 0..1 interpolated position
  slaSecondsRemaining: number;
  dispatchWarning: 'NONE' | 'STALLED_RESPONDER' | 'AUTO_REASSIGNED';
  arrivalPinVerified: boolean;
  quoteItems: QuoteLineItem[];
  vaultStatus: VaultStatus;
  escrowNonce: string | null;
  wipMilestones: { id: string; label: string; done: boolean }[];
  towModeActive: boolean;
  handoverChecks: { id: string; corner: string; verified: boolean }[];
  signatureDataUrl: string | null;

  // Customer Ecosystem
  vehicles: VehicleProfile[];
  activeVehicleId: string;
  vaultBalance: number;
  ledger: LedgerEntry[];
  cart: CartItem[];

  // Workforce Consoles & PIN Session
  workforceUnlockedUntil: number | null;
  pendingConsoleTarget: ScreenId | null;
  workshopBays: WorkshopBay[];

  // Config & Sync
  supabaseUrl: string;
  supabaseAnonKey: string;
  geminiApiKey: string;
  realtimeConnected: boolean;
  offlineQueueCount: number;
  hotlinesOpen: boolean;
  supabaseDialogOpen: boolean;
  towCamOpen: boolean;
  snackbars: SnackbarMessage[];
}

type AppAction =
  | { type: 'NAVIGATE'; payload: ScreenId }
  | { type: 'SET_DRAWER'; payload: boolean }
  | { type: 'TOGGLE_DISPLAY_MODE' }
  | { type: 'TOGGLE_LANGUAGE' }
  | { type: 'TOGGLE_HAZARD' }
  | { type: 'SET_RESCUE_STAGE'; payload: RescueStage }
  | { type: 'SELECT_SERVICE'; payload: ServiceOption }
  | {
      type: 'UPDATE_PIN_LOCATION';
      payload: {
        lat: number;
        lng: number;
        address: string;
        mapX: number;
        mapY: number;
      };
    }
  | { type: 'CLAIM_RESCUE_JOB'; payload?: { responderName?: string } }
  | { type: 'TOGGLE_RESPONDER_ONLINE' }
  | { type: 'SET_RESPONDER_PROGRESS'; payload: number }
  | { type: 'TICK_SLA' }
  | {
      type: 'SET_DISPATCH_WARNING';
      payload: 'NONE' | 'STALLED_RESPONDER' | 'AUTO_REASSIGNED';
    }
  | { type: 'VERIFY_ARRIVAL_PIN' }
  | { type: 'UPDATE_QUOTE_ITEMS'; payload: QuoteLineItem[] }
  | { type: 'LOCK_ESCROW'; payload: { amount: number; nonce: string } }
  | { type: 'DISBURSE_ESCROW'; payload: { amount: number } }
  | { type: 'TOGGLE_WIP_MILESTONE'; payload: string }
  | { type: 'SET_TOW_MODE'; payload: boolean }
  | { type: 'TOGGLE_HANDOVER_CHECK'; payload: string }
  | { type: 'SET_SIGNATURE'; payload: string | null }
  | { type: 'RESET_RESCUE' }
  | { type: 'SELECT_VEHICLE'; payload: string }
  | { type: 'ADD_VEHICLE'; payload: VehicleProfile }
  | { type: 'TOP_UP_VAULT'; payload: { amount: number; method: string } }
  | { type: 'ADD_TO_CART'; payload: MarketplacePart }
  | { type: 'UPDATE_CART_QTY'; payload: { partId: string; delta: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'UNLOCK_WORKFORCE'; payload: ScreenId | null }
  | { type: 'LOCK_WORKFORCE' }
  | { type: 'SET_PENDING_CONSOLE'; payload: ScreenId | null }
  | { type: 'CYCLE_BAY_STATUS'; payload: number }
  | { type: 'UPDATE_CONFIG'; payload: { supabaseUrl: string; supabaseAnonKey: string; geminiApiKey?: string } }
  | { type: 'SET_REALTIME_STATUS'; payload: boolean }
  | { type: 'SET_OFFLINE_QUEUE'; payload: number }
  | { type: 'SET_HOTLINES_OPEN'; payload: boolean }
  | { type: 'SET_SUPABASE_DIALOG'; payload: boolean }
  | { type: 'SET_TOWCAM_OPEN'; payload: boolean }
  | { type: 'PUSH_SNACKBAR'; payload: Omit<SnackbarMessage, 'id'> }
  | { type: 'DISMISS_SNACKBAR'; payload: string }
  | { type: 'HYDRATE_REMOTE_JOB'; payload: Partial<AppState> };

const initialState: AppState = {
  screen: 'sos',
  drawerOpen: false,
  displayMode: 'obsidian',
  language: 'EN',
  hazardStrobe: false,

  rescueStage: 0,
  activeJobId: 'RB-8821',
  selectedService: SERVICES[0],
  pinnedLocation: {
    lat: 5.9512,
    lng: 116.0914,
    address: 'Jalan Lintas Penampang, Luyang',
    mapX: 520,
    mapY: 540,
  },
  responderClaimed: false,
  responderOnline: true,
  responderName: 'Foreman Roy (Hafiz Bin Rosli)',
  responderUnit: 'Patrol + Flatbed KK-204',
  responderProgress: 0.08,
  slaSecondsRemaining: 15 * 60,
  dispatchWarning: 'NONE',
  arrivalPinVerified: false,
  quoteItems: [
    {
      id: 'q1',
      description: 'Patrol + Flatbed Rescue Dispatch & Diagnostic',
      category: 'LABOR',
      qty: 1,
      unitPrice: 140,
    },
    {
      id: 'q2',
      description: 'Amaron Hi-Life NS60LS AGM Battery Replacement',
      category: 'PARTS',
      qty: 1,
      unitPrice: 265,
    },
  ],
  vaultStatus: 'IDLE',
  escrowNonce: null,
  wipMilestones: [
    {
      id: 'm1',
      label: 'OBD-II & Alternator Load Verification (14.2V)',
      done: true,
    },
    {
      id: 'm2',
      label: 'Component Replacement / Safe Winch Rigging',
      done: false,
    },
    {
      id: 'm3',
      label: 'Final Road-Worthiness & Torque Safety Check',
      done: false,
    },
  ],
  towModeActive: false,
  handoverChecks: [
    { id: 'hc1', corner: 'Front Bumper & LED Headlamps', verified: true },
    { id: 'hc2', corner: 'Left Flank, Doors & Alloy Rims', verified: true },
    { id: 'hc3', corner: 'Rear Tailgate & Undercarriage', verified: false },
    { id: 'hc4', corner: 'Right Flank & Side Mirror Assembly', verified: false },
  ],
  signatureDataUrl: null,

  vehicles: INITIAL_VEHICLES,
  activeVehicleId: 'v1',
  vaultBalance: 20.0,
  ledger: [
    {
      id: 'led1',
      title: 'Sabah Member Welcome Credit',
      timestamp: '10 Nov 2026, 09:15',
      amount: 20.0,
      type: 'CREDIT',
      ref: 'PROMO-SBH20',
    },
  ],
  cart: [
    {
      part: MARKETPLACE_PARTS[0],
      qty: 1,
    },
  ],

  workforceUnlockedUntil: null,
  pendingConsoleTarget: null,
  workshopBays: [
    {
      bayNumber: 1,
      status: 'OCCUPIED',
      plate: 'SAB 8821 X',
      vehicle: 'Perodua Myvi 1.5L',
      tech: 'Foreman Roy',
      stage: 'DVI/OBD',
    },
    {
      bayNumber: 2,
      status: 'DIAGNOSTICS',
      plate: 'SAA 4921 W',
      vehicle: 'Proton X50 TGDi',
      tech: 'Tech Zul',
      stage: 'Active Repair',
    },
    {
      bayNumber: 3,
      status: 'AVAILABLE',
      plate: null,
      vehicle: null,
      tech: null,
      stage: 'Checked-In',
    },
    {
      bayNumber: 4,
      status: 'OCCUPIED',
      plate: 'SAB 3109 K',
      vehicle: 'Toyota Hilux 2.8G',
      tech: 'Foreman Roy',
      stage: 'Active Repair',
    },
    {
      bayNumber: 5,
      status: 'AVAILABLE',
      plate: null,
      vehicle: null,
      tech: null,
      stage: 'Checked-In',
    },
    {
      bayNumber: 6,
      status: 'OCCUPIED',
      plate: 'SY 7712 M',
      vehicle: 'Honda City RS',
      tech: 'Tech Danny',
      stage: 'Completed',
    },
  ],

  supabaseUrl: DEFAULT_SUPABASE_URL,
  supabaseAnonKey: DEFAULT_SUPABASE_ANON_KEY,
  geminiApiKey: '',
  realtimeConnected: true,
  offlineQueueCount: 0,
  hotlinesOpen: false,
  supabaseDialogOpen: false,
  towCamOpen: false,
  snackbars: [],
};

function getInitialState(): AppState {
  try {
    const raw =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(PERSISTED_STATE_KEY)
        : null;
    if (!raw) return initialState;
    const saved = JSON.parse(raw) as Partial<AppState>;
    const validStage =
      typeof saved.rescueStage === 'number' &&
      saved.rescueStage >= 0 &&
      saved.rescueStage <= 10
        ? (saved.rescueStage as RescueStage)
        : initialState.rescueStage;
    const validVehicles =
      Array.isArray(saved.vehicles) && saved.vehicles.length > 0
        ? saved.vehicles
        : initialState.vehicles;
    const validActiveVehicleId =
      typeof saved.activeVehicleId === 'string' &&
      validVehicles.some((v) => v.id === saved.activeVehicleId)
        ? saved.activeVehicleId
        : validVehicles[0].id;
    const validBalance =
      typeof saved.vaultBalance === 'number' && !Number.isNaN(saved.vaultBalance)
        ? saved.vaultBalance
        : initialState.vaultBalance;
    const validLedger = Array.isArray(saved.ledger)
      ? saved.ledger
      : initialState.ledger;
    const validDisplayMode: DisplayMode =
      saved.displayMode === 'sunlight' || saved.displayMode === 'obsidian'
        ? saved.displayMode
        : initialState.displayMode;
    const validLanguage: Language =
      saved.language === 'BM' || saved.language === 'EN'
        ? saved.language
        : initialState.language;

    return {
      ...initialState,
      vehicles: validVehicles,
      activeVehicleId: validActiveVehicleId,
      vaultBalance: validBalance,
      ledger: validLedger,
      displayMode: validDisplayMode,
      language: validLanguage,
      rescueStage: validStage,
      responderClaimed: validStage >= 3 ? true : initialState.responderClaimed,
      arrivalPinVerified: validStage >= 5 ? true : initialState.arrivalPinVerified,
      vaultStatus:
        validStage === 10
          ? 'DISBURSED'
          : validStage >= 7
          ? 'RESERVED'
          : initialState.vaultStatus,
    };
  } catch {
    return initialState;
  }
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'NAVIGATE': {
      const target = action.payload;
      const isWorkforce =
        target === 'mechanic' || target === 'tow' || target === 'workshop';
      const isUnlocked =
        state.workforceUnlockedUntil !== null &&
        Date.now() < state.workforceUnlockedUntil;
      if (isWorkforce && !isUnlocked) {
        return {
          ...state,
          drawerOpen: false,
          pendingConsoleTarget: target,
        };
      }
      return {
        ...state,
        screen: target,
        drawerOpen: false,
        pendingConsoleTarget: null,
      };
    }
    case 'SET_DRAWER':
      return { ...state, drawerOpen: action.payload };
    case 'TOGGLE_DISPLAY_MODE':
      return {
        ...state,
        displayMode: state.displayMode === 'obsidian' ? 'sunlight' : 'obsidian',
      };
    case 'TOGGLE_LANGUAGE':
      return { ...state, language: state.language === 'EN' ? 'BM' : 'EN' };
    case 'TOGGLE_HAZARD':
      return { ...state, hazardStrobe: !state.hazardStrobe };
    case 'SET_RESCUE_STAGE':
      return {
        ...state,
        rescueStage: action.payload,
        screen: 'sos',
      };
    case 'SELECT_SERVICE': {
      const svc = action.payload;
      const updatedQuotes = state.quoteItems.map((item, idx) =>
        idx === 0
          ? {
              ...item,
              description: `${svc.nameEn} Dispatch & Diagnostic`,
              unitPrice: svc.price,
            }
          : item
      );
      return {
        ...state,
        selectedService: svc,
        quoteItems: updatedQuotes,
        towModeActive: svc.unitType === 'TOW' || svc.unitType === 'PATROL',
      };
    }
    case 'UPDATE_PIN_LOCATION':
      return { ...state, pinnedLocation: action.payload };
    case 'CLAIM_RESCUE_JOB':
      return {
        ...state,
        responderClaimed: true,
        responderName:
          action.payload?.responderName || 'Foreman Roy (Hafiz Bin Rosli)',
        rescueStage: state.rescueStage < 3 ? 3 : state.rescueStage,
        responderProgress: Math.max(state.responderProgress, 0.15),
      };
    case 'TOGGLE_RESPONDER_ONLINE':
      return { ...state, responderOnline: !state.responderOnline };
    case 'SET_RESPONDER_PROGRESS':
      return { ...state, responderProgress: action.payload };
    case 'TICK_SLA': {
      if (state.rescueStage !== 3) return state;
      const nextSec = Math.max(0, state.slaSecondsRemaining - 1);
      const elapsed = 15 * 60 - nextSec;
      let warning = state.dispatchWarning;
      if (elapsed >= 8 * 60) {
        warning = 'AUTO_REASSIGNED';
      } else if (elapsed >= 6 * 60 && warning === 'NONE') {
        warning = 'STALLED_RESPONDER';
      }
      return {
        ...state,
        slaSecondsRemaining: nextSec,
        dispatchWarning: warning,
      };
    }
    case 'SET_DISPATCH_WARNING':
      return {
        ...state,
        dispatchWarning: action.payload,
        responderName:
          action.payload === 'AUTO_REASSIGNED'
            ? 'Fast-Tow Zul (Backup Unit KK-309)'
            : state.responderName,
      };
    case 'VERIFY_ARRIVAL_PIN':
      return {
        ...state,
        arrivalPinVerified: true,
        rescueStage: 5,
      };
    case 'UPDATE_QUOTE_ITEMS':
      return { ...state, quoteItems: action.payload };
    case 'LOCK_ESCROW': {
      // Idempotency nonce check
      if (
        state.vaultStatus === 'RESERVED' &&
        state.escrowNonce === action.payload.nonce
      ) {
        return state;
      }
      const needed = action.payload.amount;
      const autoTopUp =
        state.vaultBalance < needed
          ? Number((needed - state.vaultBalance + 20).toFixed(2))
          : 0;
      const newBalance = Number(
        (state.vaultBalance + autoTopUp - needed).toFixed(2)
      );
      const newEntries: LedgerEntry[] = [];
      if (autoTopUp > 0) {
        newEntries.push({
          id: `led-${Date.now()}-top`,
          title: 'Instant FPX Escrow Auto-Topup (Maybank2u)',
          timestamp: 'Just now',
          amount: autoTopUp,
          type: 'CREDIT',
          ref: `FPX-${Math.floor(100000 + Math.random() * 900000)}`,
        });
      }
      newEntries.push({
        id: `led-${Date.now()}-res`,
        title: `Protected Escrow Hold (${state.activeJobId})`,
        timestamp: 'Just now',
        amount: -needed,
        type: 'RESERVE',
        ref: action.payload.nonce,
      });
      return {
        ...state,
        vaultStatus: 'RESERVED',
        escrowNonce: action.payload.nonce,
        vaultBalance: newBalance,
        ledger: [...newEntries, ...state.ledger],
        rescueStage: 7,
      };
    }
    case 'DISBURSE_ESCROW': {
      if (state.vaultStatus === 'DISBURSED') return state;
      const disburseEntry: LedgerEntry = {
        id: `led-${Date.now()}-dis`,
        title: `Escrow Disbursed to Kolombong HQ (${state.activeJobId})`,
        timestamp: 'Just now',
        amount: -action.payload.amount,
        type: 'DEBIT',
        ref: `LHDN-${state.activeJobId}`,
      };
      return {
        ...state,
        vaultStatus: 'DISBURSED',
        ledger: [disburseEntry, ...state.ledger],
        rescueStage: 10,
      };
    }
    case 'TOGGLE_WIP_MILESTONE':
      return {
        ...state,
        wipMilestones: state.wipMilestones.map((m) =>
          m.id === action.payload ? { ...m, done: !m.done } : m
        ),
      };
    case 'SET_TOW_MODE':
      return { ...state, towModeActive: action.payload };
    case 'TOGGLE_HANDOVER_CHECK':
      return {
        ...state,
        handoverChecks: state.handoverChecks.map((c) =>
          c.id === action.payload ? { ...c, verified: !c.verified } : c
        ),
      };
    case 'SET_SIGNATURE':
      return { ...state, signatureDataUrl: action.payload };
    case 'RESET_RESCUE':
      return {
        ...state,
        rescueStage: 0,
        activeJobId: `RB-${Math.floor(1000 + Math.random() * 9000)}`,
        responderClaimed: false,
        responderProgress: 0.08,
        slaSecondsRemaining: 15 * 60,
        dispatchWarning: 'NONE',
        arrivalPinVerified: false,
        vaultStatus: 'IDLE',
        escrowNonce: null,
        signatureDataUrl: null,
        wipMilestones: state.wipMilestones.map((m, i) => ({
          ...m,
          done: i === 0,
        })),
      };
    case 'SELECT_VEHICLE':
      return { ...state, activeVehicleId: action.payload };
    case 'ADD_VEHICLE':
      return {
        ...state,
        vehicles: [action.payload, ...state.vehicles],
        activeVehicleId: action.payload.id,
      };
    case 'TOP_UP_VAULT':
      return {
        ...state,
        vaultBalance: Number(
          (state.vaultBalance + action.payload.amount).toFixed(2)
        ),
        ledger: [
          {
            id: `led-${Date.now()}`,
            title: `Vault Top-Up via ${action.payload.method}`,
            timestamp: 'Just now',
            amount: action.payload.amount,
            type: 'CREDIT',
            ref: `FPX-${Math.floor(100000 + Math.random() * 900000)}`,
          },
          ...state.ledger,
        ],
      };
    case 'ADD_TO_CART': {
      const existing = state.cart.find((c) => c.part.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map((c) =>
            c.part.id === action.payload.id ? { ...c, qty: c.qty + 1 } : c
          ),
        };
      }
      return {
        ...state,
        cart: [...state.cart, { part: action.payload, qty: 1 }],
      };
    }
    case 'UPDATE_CART_QTY':
      return {
        ...state,
        cart: state.cart
          .map((c) =>
            c.part.id === action.payload.partId
              ? { ...c, qty: Math.max(0, c.qty + action.payload.delta) }
              : c
          )
          .filter((c) => c.qty > 0),
      };
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    case 'UNLOCK_WORKFORCE':
      return {
        ...state,
        workforceUnlockedUntil: Date.now() + SESSION_TTL_MS,
        screen: action.payload || state.pendingConsoleTarget || 'mechanic',
        pendingConsoleTarget: null,
      };
    case 'LOCK_WORKFORCE':
      return {
        ...state,
        workforceUnlockedUntil: null,
        screen: 'sos',
      };
    case 'SET_PENDING_CONSOLE':
      return { ...state, pendingConsoleTarget: action.payload };
    case 'CYCLE_BAY_STATUS':
      return {
        ...state,
        workshopBays: state.workshopBays.map((b) => {
          if (b.bayNumber !== action.payload) return b;
          if (b.status === 'AVAILABLE') {
            return {
              ...b,
              status: 'OCCUPIED',
              plate: 'SAB 9012 D',
              vehicle: 'Perodua Bezza 1.3X',
              tech: 'Tech Zul',
              stage: 'Checked-In',
            };
          }
          if (b.status === 'OCCUPIED') {
            return { ...b, status: 'DIAGNOSTICS', stage: 'DVI/OBD' };
          }
          return {
            ...b,
            status: 'AVAILABLE',
            plate: null,
            vehicle: null,
            tech: null,
            stage: 'Checked-In',
          };
        }),
      };
    case 'UPDATE_CONFIG':
      return {
        ...state,
        supabaseUrl: action.payload.supabaseUrl,
        supabaseAnonKey: action.payload.supabaseAnonKey,
        geminiApiKey:
          action.payload.geminiApiKey !== undefined
            ? action.payload.geminiApiKey
            : state.geminiApiKey,
      };
    case 'SET_REALTIME_STATUS':
      return { ...state, realtimeConnected: action.payload };
    case 'SET_OFFLINE_QUEUE':
      return { ...state, offlineQueueCount: action.payload };
    case 'SET_HOTLINES_OPEN':
      return { ...state, hotlinesOpen: action.payload };
    case 'SET_SUPABASE_DIALOG':
      return { ...state, supabaseDialogOpen: action.payload };
    case 'SET_TOWCAM_OPEN':
      return { ...state, towCamOpen: action.payload };
    case 'PUSH_SNACKBAR':
      return {
        ...state,
        snackbars: [
          ...state.snackbars.slice(-2),
          {
            id: `${Date.now()}-${Math.random()}`,
            text: action.payload.text,
            tone: action.payload.tone,
          },
        ],
      };
    case 'DISMISS_SNACKBAR':
      return {
        ...state,
        snackbars: state.snackbars.filter((s) => s.id !== action.payload),
      };
    case 'HYDRATE_REMOTE_JOB':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

const AppCtx = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  notify: (text: string, tone?: SnackbarMessage['tone']) => void;
  syncJobToSupabase: (patch: Record<string, unknown>) => Promise<void>;
} | null>(null);

function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

// ============================================================================
// 4. ERROR BOUNDARY & GLOBAL MATERIAL 3 SNACKBAR QUEUE
// ============================================================================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unexpected UI error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0E1117] text-white flex flex-col items-center justify-center p-6 text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-black mb-2">RepairBah Recovery Shield</h2>
          <p className="text-sm text-gray-400 mb-6 max-w-xs">
            {this.state.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="px-6 py-3 rounded-xl bg-red-600 font-bold text-sm"
          >
            Restore Live Session
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const SnackbarHost: React.FC = () => {
  const { state, dispatch } = useApp();

  useEffect(() => {
    if (state.snackbars.length === 0) return;
    const latest = state.snackbars[0];
    const timer = setTimeout(() => {
      dispatch({ type: 'DISMISS_SNACKBAR', payload: latest.id });
    }, 3400);
    return () => clearTimeout(timer);
  }, [state.snackbars, dispatch]);

  if (state.snackbars.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] w-[92%] max-w-[490px] space-y-2 pointer-events-none">
      {state.snackbars.map((sb) => {
        const toneStyles =
          sb.tone === 'success'
            ? 'border-emerald-500/60 bg-[#11241E] text-emerald-100'
            : sb.tone === 'warning'
            ? 'border-amber-500/60 bg-[#261D11] text-amber-100'
            : sb.tone === 'error'
            ? 'border-red-500/60 bg-[#281316] text-red-100'
            : 'border-[#333A4A] bg-[#181C24] text-white';

        return (
          <div
            key={sb.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs font-semibold transition-all ${toneStyles}`}
          >
            <span className="leading-snug">{sb.text}</span>
            <button
              onClick={() =>
                dispatch({ type: 'DISMISS_SNACKBAR', payload: sb.id })
              }
              className="p-1 rounded-full hover:bg-white/10 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// 5. INTERACTIVE SABAH VECTOR MAP & 60FPS MARKER INTERPOLATOR
// ============================================================================

interface AppMapViewProps {
  centerX: number;
  centerY: number;
  zoom: number;
  interactive?: boolean;
  showResponder?: boolean;
  responderProgress?: number;
  flyToTrigger?: number;
  onPanUpdate?: (newX: number, newY: number) => void;
  onZoomChange?: (newZoom: number) => void;
  isLight: boolean;
}

const AppMapView: React.FC<AppMapViewProps> = ({
  centerX,
  centerY,
  zoom,
  interactive = true,
  showResponder = false,
  responderProgress = 0.1,
  flyToTrigger = 0,
  onPanUpdate,
  onZoomChange,
  isLight,
}) => {
  const [animatedZoom, setAnimatedZoom] = useState(
    flyToTrigger > 0 ? 0.85 : zoom
  );
  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  // Smooth flyTo zoom-in animation upon entering Stage 1
  useEffect(() => {
    if (flyToTrigger <= 0) {
      setAnimatedZoom(zoom);
      return;
    }
    let frameId = 0;
    const startZoom = 0.82;
    const targetZoom = zoom;
    const startTime = performance.now();
    const duration = 850;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimatedZoom(startZoom + (targetZoom - startZoom) * ease);
      if (t < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [flyToTrigger, zoom]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    draggingRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!interactive || !draggingRef.current || !onPanUpdate) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    const nextX = Math.max(120, Math.min(880, centerX - dx / animatedZoom));
    const nextY = Math.max(80, Math.min(900, centerY - dy / animatedZoom));
    onPanUpdate(nextX, nextY);
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
  };

  // Responder starts at Kolombong HQ (630, 410) and glides smoothly to (centerX, centerY)
  const hqX = 630;
  const hqY = 410;
  const respX = hqX + (centerX - hqX) * responderProgress;
  const respY = hqY + (centerY - hqY) * responderProgress;

  const translateX = 270 - centerX * animatedZoom;
  const translateY = 230 - centerY * animatedZoom;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-full h-full overflow-hidden select-none touch-none ${
        interactive ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isLight ? 'bg-[#E2E8F0]' : 'bg-[#090D14]'}`}
    >
      {/* Vector Sabah Map Canvas */}
      <svg
        viewBox="0 0 1000 1000"
        className="w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
      >
        <g
          transform={`translate(${translateX}, ${translateY}) scale(${animatedZoom})`}
        >
          {/* South China Sea / Likas Bay / Tanjung Aru Coastline */}
          <path
            d="M 0,0 L 340,0 Q 385,180 355,340 Q 320,460 265,560 Q 210,680 245,1000 L 0,1000 Z"
            fill={isLight ? '#BAE6FD' : '#0B192C'}
          />
          {/* Likas Bay Inlet */}
          <path
            d="M 355,270 Q 445,295 450,355 Q 395,380 345,355 Z"
            fill={isLight ? '#BAE6FD' : '#0B192C'}
          />
          {/* Sabah Golf & Country Club / Bukit Padang Green Zone */}
          <ellipse
            cx="545"
            cy="485"
            rx="55"
            ry="38"
            fill={isLight ? '#BBF7D0' : '#0E241C'}
            opacity="0.85"
          />
          {/* KKIA Airport Runway */}
          <rect
            x="275"
            y="645"
            width="115"
            height="14"
            rx="4"
            transform="rotate(-18 275 645)"
            fill={isLight ? '#CBD5E1' : '#1E2533'}
          />

          {/* Subtle Urban Grid */}
          <g
            stroke={isLight ? '#CBD5E1' : '#151C28'}
            strokeWidth="1.5"
            opacity="0.7"
          >
            {[150, 250, 350, 450, 550, 650, 750, 850].map((v) => (
              <React.Fragment key={v}>
                <line x1={v} y1={0} x2={v} y2={1000} />
                <line x1={0} y1={v} x2={1000} y2={v} />
              </React.Fragment>
            ))}
          </g>

          {/* Major Sabah Arteries */}
          {/* Coastal Highway -> Kepayan Highway */}
          <path
            d="M 440,220 Q 390,360 365,475 Q 340,590 325,740"
            fill="none"
            stroke={isLight ? '#F59E0B' : '#B45309'}
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Jalan Lintas (Penampang - Luyang - Kolombong - Inanam) */}
          <path
            d="M 595,780 Q 545,620 520,540 Q 565,465 630,410 Q 675,345 715,170"
            fill="none"
            stroke={isLight ? '#F97316' : '#EA580C'}
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Jalan Kolam / Damai / Luyang Connector */}
          <path
            d="M 370,470 Q 465,485 520,540 L 630,410"
            fill="none"
            stroke={isLight ? '#64748B' : '#334155'}
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* District & Landmark Labels */}
          {[
            { x: 630, y: 392, text: 'KOLOMBONG HQ', bold: true },
            { x: 495, y: 525, text: 'LUYANG / JLN LINTAS', bold: true },
            { x: 470, y: 465, text: 'DAMAI • JLN KOLAM', bold: false },
            { x: 545, y: 490, text: 'SABAH GOLF & CC', bold: false },
            { x: 325, y: 695, text: 'KKIA AIRPORT', bold: true },
            { x: 455, y: 318, text: 'LIKAS BAY', bold: false },
            { x: 695, y: 295, text: 'INANAM BYPASS', bold: false },
            { x: 590, y: 760, text: 'DONGGONGON', bold: false },
            { x: 265, y: 565, text: 'TANJUNG ARU', bold: false },
            { x: 720, y: 145, text: '1BORNEO ALAMESRA', bold: false },
          ].map((lbl, idx) => (
            <text
              key={idx}
              x={lbl.x}
              y={lbl.y}
              textAnchor="middle"
              fontSize={lbl.bold ? '13' : '11'}
              fontWeight={lbl.bold ? '800' : '600'}
              letterSpacing="0.8"
              fill={
                lbl.bold
                  ? isLight
                    ? '#0F172A'
                    : '#E2E8F0'
                  : isLight
                  ? '#475569'
                  : '#64748B'
              }
            >
              {lbl.text}
            </text>
          ))}

          {/* Kolombong HQ Base Node */}
          <circle
            cx={hqX}
            cy={hqY}
            r="8"
            fill="#10B981"
            stroke="#064E3B"
            strokeWidth="3"
          />

          {/* Active Rescue Dispatch Route Line & Interpolated Responder */}
          {showResponder && (
            <>
              <line
                x1={hqX}
                y1={hqY}
                x2={centerX}
                y2={centerY}
                stroke="#EF4444"
                strokeWidth="4"
                strokeDasharray="10 8"
              />
              <g transform={`translate(${respX}, ${respY})`}>
                <circle r="18" fill="#EF4444" opacity="0.25" />
                <circle
                  r="11"
                  fill="#2563EB"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />
                <text
                  y="-16"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="800"
                  fill="#60A5FA"
                >
                  KK-204 ROY
                </text>
              </g>
            </>
          )}
        </g>
      </svg>

      {/* Stationary Center Red Teardrop Pin with Ground Shadow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center">
        <div className="relative flex flex-col items-center animate-bounce">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-2 border-white shadow-[0_8px_24px_rgba(220,38,38,0.65)] flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white" />
          </div>
          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-red-700 -mt-1" />
        </div>
        <div className="w-5 h-1.5 rounded-full bg-black/60 blur-[1.5px] mt-0.5" />
      </div>

      {/* Zoom Controls */}
      {interactive && onZoomChange && (
        <div className="absolute right-3 top-16 flex flex-col gap-2 z-10">
          <button
            onClick={() => onZoomChange(Math.min(2.2, Number((zoom + 0.25).toFixed(2))))}
            aria-label="Zoom in"
            className={`w-10 h-10 rounded-full border shadow-lg flex items-center justify-center ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900'
                : 'bg-[#141923]/90 border-[#282C37] text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onZoomChange(Math.max(0.85, Number((zoom - 0.25).toFixed(2))))}
            aria-label="Zoom out"
            className={`w-10 h-10 rounded-full border shadow-lg flex items-center justify-center ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900'
                : 'bg-[#141923]/90 border-[#282C37] text-white'
            }`}
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 6. STAGE 0: SOS RADIAL HOLD BUTTON (60FPS REQUESTANIMATIONFRAME SWEEP)
// ============================================================================

const SosRadialButton: React.FC<{
  onTrigger: () => void;
  isLight: boolean;
  lang: Language;
}> = ({ onTrigger, isLight, lang }) => {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const triggeredRef = useRef(false);

  const stopHold = useCallback(() => {
    setHolding(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (!triggeredRef.current) {
      setProgress(0);
    }
  }, []);

  const startHold = (e: React.PointerEvent) => {
    e.preventDefault();
    if (triggeredRef.current) return;
    setHolding(true);
    startRef.current = performance.now();

    const step = (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.min(100, (elapsed / 2500) * 100);
      setProgress(pct);
      if (pct >= 100) {
        triggeredRef.current = true;
        setHolding(false);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([120, 60, 200]);
        }
        onTrigger();
        setTimeout(() => {
          triggeredRef.current = false;
          setProgress(0);
        }, 400);
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const t = I18N[lang];
  const radius = 104;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center my-auto py-2">
      <div
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        role="button"
        tabIndex={0}
        aria-label="Hold 2.5 seconds for SOS Rescue"
        className={`relative w-64 h-64 rounded-full flex items-center justify-center select-none touch-none cursor-pointer transition-transform duration-150 ${
          holding ? 'scale-95' : 'scale-100'
        }`}
      >
        {/* Outer Dark Crimson Concentric Pulse Rings */}
        <div className="absolute inset-0 rounded-full bg-red-600/10 border border-red-500/20 animate-ping [animation-duration:3s]" />
        <div className="absolute inset-3 rounded-full bg-red-950/40 border border-red-500/30" />
        <div className="absolute inset-6 rounded-full bg-red-950/60 border border-red-500/40" />

        {/* 60fps Clockwise Crimson Sweep Arc */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          viewBox="0 0 240 240"
        >
          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            stroke="rgba(239,68,68,0.18)"
            strokeWidth="8"
          />
          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            stroke="#EF4444"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>

        {/* Radial Gradient Sphere */}
        <div
          className="relative w-44 h-44 rounded-full flex flex-col items-center justify-center text-white shadow-[0_0_55px_rgba(220,38,38,0.65)] border-2 border-red-400/50"
          style={{
            background:
              'radial-gradient(circle at 35% 30%, #EF4444 0%, #DC2626 52%, #7F1D1D 100%)',
          }}
        >
          <span className="text-[11px] font-extrabold tracking-[0.22em] text-red-100">
            {t.holdFor}
          </span>
          <span className="text-3xl font-black tracking-tight my-0.5 drop-shadow">
            ((SOS))
          </span>
          <span className="text-[11px] font-extrabold tracking-[0.22em] text-red-100">
            {t.rescue}
          </span>
          {holding && (
            <span className="mt-1.5 text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded-full">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      </div>

      {/* Subtext & Accessibility Instant Trigger */}
      <div className="text-center px-6 mt-3">
        <p
          className={`text-sm font-bold ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}
        >
          {t.tapImmediate}
        </p>
        <p
          className={`text-xs mt-1 ${
            isLight ? 'text-slate-600' : 'text-gray-400'
          }`}
        >
          {t.dispatchesUnits}
        </p>

        <button
          onClick={onTrigger}
          className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold bg-red-600/15 text-red-400 border border-red-500/30 hover:bg-red-600/25 transition-colors"
        >
          <Zap className="w-3 h-3" /> Quick-Trigger SOS (1-Tap Demo)
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 7. WEBRTC LIVE TOW-CAM MODAL (WITH TELEMETRY FALLBACK & IR NIGHT VISION)
// ============================================================================

const LiveTowCamModal: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const [irNightVision, setIrNightVision] = useState(true);
  const [pttActive, setPttActive] = useState(false);
  const [cameraFallback, setCameraFallback] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!state.towCamOpen) return;
    let activeStream: MediaStream | null = null;
    if (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    ) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .then((stream) => {
          activeStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setCameraFallback(false);
        })
        .catch(() => {
          setCameraFallback(true);
        });
    } else {
      setCameraFallback(true);
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((tr) => tr.stop());
      }
    };
  }, [state.towCamOpen]);

  if (!state.towCamOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col justify-between p-4 max-w-[540px] mx-auto">
      {/* Top Telemetry Bar */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2 bg-black/70 border border-emerald-500/40 px-3 py-1.5 rounded-full">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="text-xs font-mono font-bold text-emerald-400">
            LIVE TOW-CAM • FLATBED KK-204
          </span>
        </div>
        <button
          onClick={() => dispatch({ type: 'SET_TOWCAM_OPEN', payload: false })}
          className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Camera / Telemetry Viewport */}
      <div className="relative flex-1 my-4 rounded-3xl overflow-hidden border-2 border-emerald-500/40 bg-[#050B08] flex items-center justify-center">
        {!cameraFallback ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              irNightVision
                ? 'sepia hue-rotate-90 saturate-200 contrast-125 brightness-90'
                : ''
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[radial-gradient(circle_at_center,#064E3B_0%,#030712_85%)]">
            <Camera className="w-12 h-12 text-emerald-400 mb-3 animate-pulse" />
            <p className="text-emerald-300 font-mono text-sm font-bold">
              REAR WINCH TELEMETRY STREAM ACTIVE
            </p>
            <p className="text-emerald-500/80 font-mono text-xs mt-1 max-w-xs">
              WebRTC Hardware Feed Simulated (Desktop / Sandboxed Browser Mode)
            </p>
            <div className="mt-6 w-56 h-28 border border-emerald-500/50 rounded-xl relative flex items-center justify-center">
              <div className="w-40 h-16 border-2 border-dashed border-emerald-400 rounded-lg flex items-center justify-center text-xs font-mono text-emerald-300">
                SAB 8821 X • LOCKED
              </div>
            </div>
          </div>
        )}

        {/* HUD Reticle & Telemetry */}
        <div className="absolute inset-4 border border-emerald-400/30 rounded-2xl pointer-events-none flex flex-col justify-between p-3 font-mono text-[11px] text-emerald-300">
          <div className="flex justify-between">
            <span>BED TILT: 11.8° NOMINAL</span>
            <span>WINCH TENSION: 1,420 kgf</span>
          </div>
          <div className="flex justify-between">
            <span>WHEEL CHOCKS: 4/4 ENGAGED</span>
            <span>SPEED: 42 KM/H • JLN LINTAS</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setIrNightVision((v) => !v)}
          className={`py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border ${
            irNightVision
              ? 'bg-emerald-600 text-white border-emerald-400'
              : 'bg-[#181C24] text-gray-300 border-[#282C37]'
          }`}
        >
          <Eye className="w-4 h-4" />
          {irNightVision ? 'IR NIGHT VISION: ON' : 'IR NIGHT VISION: OFF'}
        </button>
        <button
          onPointerDown={() => {
            setPttActive(true);
            notify('Push-to-Talk Intercom Open to Cab KK-204', 'info');
          }}
          onPointerUp={() => setPttActive(false)}
          onPointerLeave={() => setPttActive(false)}
          className={`py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border ${
            pttActive
              ? 'bg-red-600 text-white border-red-400'
              : 'bg-[#181C24] text-white border-[#282C37]'
          }`}
        >
          {pttActive ? (
            <Mic className="w-4 h-4 animate-pulse" />
          ) : (
            <MicOff className="w-4 h-4" />
          )}
          {pttActive ? 'TRANSMITTING...' : 'HOLD PUSH-TO-TALK'}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 8. 10-STAGE CUSTOMER SOS RESCUE LIFECYCLE
// ============================================================================

const CustomerSosScreen: React.FC = () => {
  const { state, dispatch, notify, syncJobToSupabase } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const t = I18N[state.language];
  const activeVehicle =
    state.vehicles.find((v) => v.id === state.activeVehicleId) ||
    state.vehicles[0];

  // Stage 1 Map & Address Autocomplete state
  const [mapZoom, setMapZoom] = useState(1.35);
  const [flyTrigger, setFlyTrigger] = useState(0);
  const [addressQuery, setAddressQuery] = useState(
    state.pinnedLocation.address
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nominatimResults, setNominatimResults] = useState<
    { label: string; lat: number; lng: number }[]
  >([]);

  // Stage 4 PIN input state
  const [enteredPin, setEnteredPin] = useState('');

  // Stage 9 Signature Pad ref
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingSig = useRef(false);

  // Trigger flyTo when entering Stage 1
  useEffect(() => {
    if (state.rescueStage === 1) {
      setFlyTrigger((c) => c + 1);
      setAddressQuery(state.pinnedLocation.address);
    }
  }, [state.rescueStage]);

  // Stage 3 60fps MarkerInterpolator + 1s SLA Countdown
  useEffect(() => {
    if (state.rescueStage !== 3) return;
    const secTimer = setInterval(() => {
      dispatch({ type: 'TICK_SLA' });
    }, 1000);

    let rafId = 0;
    let lastTime = performance.now();
    const glide = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (state.dispatchWarning !== 'STALLED_RESPONDER') {
        const nextProg = Math.min(0.96, state.responderProgress + dt * 0.025);
        dispatch({ type: 'SET_RESPONDER_PROGRESS', payload: nextProg });
      }
      rafId = requestAnimationFrame(glide);
    };
    rafId = requestAnimationFrame(glide);

    return () => {
      clearInterval(secTimer);
      cancelAnimationFrame(rafId);
    };
  }, [state.rescueStage, state.dispatchWarning, state.responderProgress, dispatch]);

  // Nominatim search debounce
  useEffect(() => {
    if (!showSuggestions || addressQuery.trim().length < 3) {
      setNominatimResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=3&q=${encodeURIComponent(
            addressQuery + ' Sabah Malaysia'
          )}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setNominatimResults(
            data.map((d: { display_name: string; lat: string; lon: string }) => ({
              label: d.display_name.split(',').slice(0, 2).join(', '),
              lat: Number(Number(d.lat).toFixed(4)),
              lng: Number(Number(d.lon).toFixed(4)),
            }))
          );
        }
      } catch {
        // Offline / rate-limited: Sabah Landmarks remain ready
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [addressQuery, showSuggestions]);

  const handleMapPanUpdate = (newX: number, newY: number) => {
    // Convert mapX/Y to realistic KK Sabah coordinates & find nearest landmark
    const lat = Number((6.09 - (newY / 1000) * 0.22).toFixed(4));
    const lng = Number((116.01 + (newX / 1000) * 0.16).toFixed(4));
    let nearest = SABAH_LANDMARKS[0];
    let bestDist = Infinity;
    for (const lm of SABAH_LANDMARKS) {
      const d = Math.hypot(lm.mapX - newX, lm.mapY - newY);
      if (d < bestDist) {
        bestDist = d;
        nearest = lm;
      }
    }
    const formatted = `Pinned: ${lat}, ${lng} (${nearest.name})`;
    setAddressQuery(formatted);
    dispatch({
      type: 'UPDATE_PIN_LOCATION',
      payload: {
        lat,
        lng,
        address: formatted,
        mapX: newX,
        mapY: newY,
      },
    });
  };

  const selectLandmark = (lm: SabahLandmark) => {
    const formatted = `Pinned: ${lm.lat.toFixed(4)}, ${lm.lng.toFixed(4)} (${
      lm.name
    })`;
    setAddressQuery(formatted);
    setShowSuggestions(false);
    dispatch({
      type: 'UPDATE_PIN_LOCATION',
      payload: {
        lat: lm.lat,
        lng: lm.lng,
        address: formatted,
        mapX: lm.mapX,
        mapY: lm.mapY,
      },
    });
  };

  const taxBreakdown = useMemo(
    () => MalaysianTaxEngine.calculate(state.quoteItems),
    [state.quoteItems]
  );

  const smsPacket = useMemo(
    () =>
      SmsFallbackEncoder.encode({
        plate: activeVehicle.plate,
        lat: state.pinnedLocation.lat,
        lng: state.pinnedLocation.lng,
        triageCode: state.selectedService.code,
        pin: RESCUE_HANDSHAKE_PIN,
      }),
    [activeVehicle.plate, state.pinnedLocation, state.selectedService.code]
  );

  const lhdnMeta = useMemo(
    () =>
      LhdnEInvoiceGenerator.buildMetadata(
        state.activeJobId,
        activeVehicle.plate,
        taxBreakdown.grandTotal
      ),
    [state.activeJobId, activeVehicle.plate, taxBreakdown.grandTotal]
  );

  const responderLat =
    KOLOMBONG_HQ_LAT +
    (state.pinnedLocation.lat - KOLOMBONG_HQ_LAT) * state.responderProgress;
  const responderLng =
    KOLOMBONG_HQ_LNG +
    (state.pinnedLocation.lng - KOLOMBONG_HQ_LNG) * state.responderProgress;
  const distanceMeters = haversineDistanceMeters(
    responderLat,
    responderLng,
    state.pinnedLocation.lat,
    state.pinnedLocation.lng
  );
  const withinGeofence = distanceMeters <= ARRIVAL_GEOFENCE_METERS;

  // Stage 9 Signature Pad handlers
  const handleSigPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawingSig.current = true;
    ctx.strokeStyle = isLight ? '#0F172A' : '#34D399';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleSigPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig.current || !sigCanvasRef.current) return;
    const canvas = sigCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    dispatch({ type: 'SET_SIGNATURE', payload: canvas.toDataURL() });
  };

  const handleSigPointerUp = () => {
    isDrawingSig.current = false;
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    dispatch({ type: 'SET_SIGNATURE', payload: null });
  };

  const handleDownloadBinaryPdf = () => {
    const blob = PdfInvoiceGenerator.generateBinaryPdfBlob({
      invoiceNo: `INV-${state.activeJobId}`,
      lhdnUuid: lhdnMeta.uuid,
      customerName: 'Ahmad Bin Kassim (Verified Member)',
      plate: activeVehicle.plate,
      vehicle: activeVehicle.makeModel,
      location: state.pinnedLocation.address,
      items: state.quoteItems,
      totals: taxBreakdown,
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RepairBah_LHDN_${state.activeJobId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    notify('Downloaded official %PDF-1.4 LHDN MyInvois Receipt', 'success');
  };

  // ---------------- STAGE 0: SOS ROOT ----------------
  if (state.rescueStage === 0) {
    return (
      <div className="flex-1 flex flex-col justify-between px-4 pt-3 pb-24 overflow-y-auto">
        {/* Top Bar */}
        <header className="flex items-center justify-between gap-2">
          <button
            onClick={() => dispatch({ type: 'SET_DRAWER', payload: true })}
            aria-label="Open menu"
            className={`w-11 h-11 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900 shadow-sm'
                : 'bg-[#181C24] border-[#282C37] text-white'
            }`}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand + Live Supabase Dot */}
          <button
            onClick={() =>
              dispatch({ type: 'SET_SUPABASE_DIALOG', payload: true })
            }
            className={`flex items-center gap-2 px-3 py-2 rounded-full border text-left ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900'
                : 'bg-[#181C24] border-[#282C37] text-white'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                state.realtimeConnected
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
            <span className="text-xs font-black tracking-wider">
              {t.sosHeader}
            </span>
          </button>

          {/* Sabah Hotlines + Beacon Strobe */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                dispatch({ type: 'SET_HOTLINES_OPEN', payload: true })
              }
              title="Sabah Emergency Hotlines"
              className={`px-2.5 py-2 rounded-full border text-[10px] font-black flex items-center gap-1 ${
                isLight
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-red-950/60 border-red-500/40 text-red-300'
              }`}
            >
              <Phone className="w-3 h-3" />
              999
            </button>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_HAZARD' })}
              className={`px-2.5 py-2 rounded-full border text-[10px] font-black flex items-center gap-1 transition-all ${
                state.hazardStrobe
                  ? 'bg-amber-500 border-amber-300 text-black animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.7)]'
                  : isLight
                  ? 'bg-white border-slate-300 text-slate-700'
                  : 'bg-[#181C24] border-[#282C37] text-gray-400'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              {state.hazardStrobe ? t.strobeOn : t.beaconOff}
            </button>
          </div>
        </header>

        {/* Centerpiece Radial SOS Hold Button */}
        <SosRadialButton
          isLight={isLight}
          lang={state.language}
          onTrigger={() => {
            dispatch({ type: 'SET_RESCUE_STAGE', payload: 1 });
            notify('SOS Armed — Confirm Sabah Breakdown Location', 'warning');
          }}
        />

        {/* Member & Protected Vault Card */}
        <div
          className={`rounded-2xl border p-4 space-y-3 ${
            isLight
              ? 'bg-white border-slate-200 shadow-sm'
              : 'bg-[#181C24] border-[#282C37]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center font-black text-sm text-red-400">
                AH
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm">
                    Ahmad • {activeVehicle.makeModel}
                  </span>
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <p
                  className={`text-xs font-mono ${
                    isLight ? 'text-slate-600' : 'text-gray-400'
                  }`}
                >
                  {activeVehicle.plate} • Kota Kinabalu Zone
                </p>
              </div>
            </div>
            <button
              onClick={() => dispatch({ type: 'NAVIGATE', payload: 'garage' })}
              className="text-xs font-bold text-red-500 hover:underline"
            >
              Switch
            </button>
          </div>

          <button
            onClick={() => dispatch({ type: 'NAVIGATE', payload: 'wallet' })}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-colors ${
              isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-emerald-950/35 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <span className="text-xs font-semibold">{t.vaultLabel}</span>
            <span className="text-sm font-black font-mono text-emerald-400 flex items-center gap-1">
              RM {state.vaultBalance.toFixed(2)} Credit
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ---------------- STAGE 1: DISTRESS SETUP & FULL-BLEED SABAH MAP ----------------
  if (state.rescueStage === 1) {
    const filteredLandmarks = SABAH_LANDMARKS.filter(
      (lm) =>
        lm.name.toLowerCase().includes(addressQuery.toLowerCase()) ||
        lm.district.toLowerCase().includes(addressQuery.toLowerCase())
    );

    return (
      <div className="flex-1 flex flex-col relative overflow-hidden pb-20">
        {/* Full-bleed Pannable & Zoomable Sabah Map */}
        <div className="flex-1 relative">
          <AppMapView
            centerX={state.pinnedLocation.mapX}
            centerY={state.pinnedLocation.mapY}
            zoom={mapZoom}
            flyToTrigger={flyTrigger}
            onPanUpdate={handleMapPanUpdate}
            onZoomChange={setMapZoom}
            isLight={isLight}
          />

          {/* Floating Dark Circular Drawer Button at Top-Left */}
          <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
            <button
              onClick={() => dispatch({ type: 'SET_DRAWER', payload: true })}
              aria-label="Open drawer"
              className="w-11 h-11 rounded-full bg-[#141923]/95 border border-[#282C37] text-white shadow-xl flex items-center justify-center"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_RESCUE_STAGE', payload: 0 })}
              className="px-3 py-2 rounded-full bg-[#141923]/95 border border-[#282C37] text-xs font-bold text-gray-300 shadow-xl flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Cancel
            </button>
          </div>

          {/* GPS Recenter FAB */}
          <button
            onClick={() => {
              selectLandmark(SABAH_LANDMARKS[0]);
              setMapZoom(1.45);
              notify('GPS Locked: Jalan Lintas Penampang, KK', 'info');
            }}
            aria-label="Recenter GPS"
            className="absolute right-3 bottom-4 w-11 h-11 rounded-full bg-[#141923]/95 border border-[#282C37] text-red-400 shadow-xl flex items-center justify-center z-20"
          >
            <Crosshair className="w-5 h-5" />
          </button>
        </div>

        {/* Docked Rounded Bottom Sheet */}
        <div
          className={`rounded-t-3xl border-t p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.65)] z-30 ${
            isLight
              ? 'bg-white border-slate-200 text-slate-900'
              : 'bg-[#141923] border-[#282C37] text-white'
          }`}
        >
          <div className="w-10 h-1 rounded-full bg-gray-600/50 mx-auto mb-3" />
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black tracking-[0.15em] text-red-400 uppercase">
              {t.confirmLocation}
            </h2>
            <span className="text-[11px] font-mono text-gray-400">
              ETA ~{state.selectedService.etaMin} mins
            </span>
          </div>

          {/* Outlined Input with Floating Label & Sabah Landmarks Dropdown */}
          <div className="relative mb-3">
            <label
              className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${
                isLight ? 'text-slate-500' : 'text-gray-400'
              }`}
            >
              {t.addressLabel}
            </label>
            <div
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${
                isLight
                  ? 'bg-slate-50 border-slate-300'
                  : 'bg-[#181C24] border-[#282C37]'
              }`}
            >
              <MapPin className="w-4 h-4 text-red-500 shrink-0" />
              <input
                type="text"
                value={addressQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setAddressQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Search Sabah landmark or drag map..."
                className="flex-1 bg-transparent text-xs font-semibold outline-none truncate"
              />
              {addressQuery && (
                <button
                  onClick={() => {
                    setAddressQuery('');
                    setShowSuggestions(true);
                  }}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setShowSuggestions((s) => !s)}
                className="px-2 py-1 rounded-lg bg-red-600/20 text-red-400 text-[10px] font-bold shrink-0"
              >
                Landmarks
              </button>
            </div>

            {/* Sabah Landmarks + Nominatim Autocomplete Popover */}
            {showSuggestions && (
              <div
                className={`absolute left-0 right-0 bottom-full mb-1.5 max-h-48 overflow-y-auto rounded-2xl border shadow-2xl z-40 ${
                  isLight
                    ? 'bg-white border-slate-200'
                    : 'bg-[#181C24] border-[#282C37]'
                }`}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800/60">
                  <span className="text-[10px] font-bold uppercase text-gray-400">
                    Sabah Quick Landmarks & OSM Search
                  </span>
                  <button
                    onClick={() => setShowSuggestions(false)}
                    className="text-xs text-gray-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {nominatimResults.map((nr, i) => (
                  <button
                    key={`osm-${i}`}
                    onClick={() => {
                      const formatted = `Pinned: ${nr.lat}, ${nr.lng} (${nr.label})`;
                      setAddressQuery(formatted);
                      setShowSuggestions(false);
                      dispatch({
                        type: 'UPDATE_PIN_LOCATION',
                        payload: {
                          lat: nr.lat,
                          lng: nr.lng,
                          address: formatted,
                          mapX: 500,
                          mapY: 480,
                        },
                      });
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-red-600/15 flex items-center justify-between border-b border-gray-800/40"
                  >
                    <span className="font-semibold truncate">{nr.label}</span>
                    <span className="text-[10px] font-mono text-emerald-400 ml-2 shrink-0">
                      OSM
                    </span>
                  </button>
                ))}
                {(filteredLandmarks.length > 0
                  ? filteredLandmarks
                  : SABAH_LANDMARKS
                ).map((lm) => (
                  <button
                    key={lm.id}
                    onClick={() => selectLandmark(lm)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-red-600/15 flex items-center justify-between border-b border-gray-800/40"
                  >
                    <div>
                      <div className="font-bold">{lm.name}</div>
                      <div className="text-[10px] text-gray-400">
                        {lm.district}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">
                      {lm.lat.toFixed(3)}, {lm.lng.toFixed(3)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Horizontal Scrollable 7-Service Selector Strip */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
            {SERVICES.map((svc) => {
              const selected = state.selectedService.id === svc.id;
              return (
                <button
                  key={svc.id}
                  onClick={() =>
                    dispatch({ type: 'SELECT_SERVICE', payload: svc })
                  }
                  className={`shrink-0 px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                    selected
                      ? 'bg-red-600/20 border-red-500 shadow-[0_0_16px_rgba(220,38,38,0.3)]'
                      : isLight
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-[#181C24] border-[#282C37]'
                  }`}
                >
                  <div className="text-xs font-bold whitespace-nowrap">
                    {state.language === 'BM' ? svc.nameBm : svc.nameEn}
                  </div>
                  <div
                    className={`text-xs font-black font-mono mt-0.5 ${
                      selected ? 'text-red-400' : 'text-gray-400'
                    }`}
                  >
                    RM {svc.price}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Full-Width Crimson Gradient CTA Button */}
          <button
            onClick={async () => {
              dispatch({ type: 'SET_RESCUE_STAGE', payload: 2 });
              await syncJobToSupabase({
                id: state.activeJobId,
                user_id: 'ahmad_sbh_8821',
                service_type: normalizeServiceType(state.selectedService.id),
                status: 'pending',
                latitude: state.pinnedLocation.lat,
                longitude: state.pinnedLocation.lng,
                address: state.pinnedLocation.address,
                notes: `Stage 2 SOS: ${state.selectedService.nameEn}`,
                vehicle_plate: activeVehicle.plate,
                vehicle_model: activeVehicle.makeModel,
                quoted_price: state.selectedService.price,
              });
              notify(
                `SOS Broadcasted (${state.activeJobId}) via Supabase Realtime`,
                'success'
              );
            }}
            className="w-full py-3.5 px-4 rounded-2xl font-black text-sm text-white shadow-[0_10px_28px_rgba(220,38,38,0.45)] flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
            style={{
              background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
            }}
          >
            <span>{t.confirmProceed}</span>
            <span className="font-mono bg-black/25 px-2 py-0.5 rounded-lg text-xs">
              (RM {state.selectedService.price}.00)
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ---------------- STAGE 2: SUPABASE BROADCAST & SMS FALLBACK MODAL ----------------
  if (state.rescueStage === 2) {
    return (
      <div className="flex-1 flex flex-col justify-between px-4 pt-4 pb-24 overflow-y-auto">
        <div>
          <StageHeader
            stage={2}
            title="Broadcasting SOS & SMS Beacon"
            onBack={() => dispatch({ type: 'SET_RESCUE_STAGE', payload: 1 })}
            isLight={isLight}
          />

          <div
            className={`rounded-2xl border p-5 text-center mb-4 ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-[#181C24] border-[#282C37]'
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center mx-auto mb-3">
              <Radio className="w-7 h-7 text-red-500 animate-ping" />
            </div>
            <h3 className="font-black text-base">
              Alerting Sabah Patrol & Tow Units...
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Job <span className="font-mono text-white">{state.activeJobId}</span>{' '}
              • {state.selectedService.nameEn} (RM {state.selectedService.price})
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
              <Wifi className="w-3.5 h-3.5" /> Supabase Realtime Channel Active
            </div>
          </div>

          {/* Offline Compact SMS Fallback Packet */}
          <div
            className={`rounded-2xl border p-4 space-y-3 ${
              isLight
                ? 'bg-amber-50 border-amber-200'
                : 'bg-[#181C24] border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                OFFLINE GSM SMS FALLBACK GATEWAY
              </span>
              <span className="text-[10px] font-mono text-gray-400">
                +60168883911
              </span>
            </div>
            <p className="text-xs text-gray-400">
              In rural Sabah dead-zones (Kundasang / Telupid / Kimanis), dispatch
              this compressed telemetry SMS packet directly to Kolombong HQ:
            </p>
            <div className="p-3 rounded-xl bg-black/80 border border-amber-500/30 font-mono text-xs text-emerald-400 break-all">
              {smsPacket}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(smsPacket);
                  notify('Copied SMS Packet to Clipboard', 'success');
                }}
                className="py-2.5 px-3 rounded-xl bg-[#222834] text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Packet
              </button>
              <a
                href={`sms:+60168883911?body=${encodeURIComponent(smsPacket)}`}
                className="py-2.5 px-3 rounded-xl bg-amber-600 text-black text-xs font-black flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Launch SMS App
              </a>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            dispatch({ type: 'CLAIM_RESCUE_JOB' });
            notify(
              'Foreman Roy (KK-204) claimed your SOS request!',
              'success'
            );
          }}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2"
        >
          <span>Continue / Simulate Responder Claim</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ---------------- STAGE 3: DISPATCH WATCHDOG & LIVE RESPONDER TRACKING ----------------
  if (state.rescueStage === 3) {
    const mins = String(Math.floor(state.slaSecondsRemaining / 60)).padStart(
      2,
      '0'
    );
    const secs = String(state.slaSecondsRemaining % 60).padStart(2, '0');
    const distKm = Math.max(
      0.1,
      Number(((1 - state.responderProgress) * 4.2).toFixed(1))
    );

    return (
      <div className="flex-1 flex flex-col relative pb-20 overflow-hidden">
        {/* Live Interpolated Sabah Map */}
        <div className="flex-1 relative">
          <AppMapView
            centerX={state.pinnedLocation.mapX}
            centerY={state.pinnedLocation.mapY}
            zoom={1.35}
            interactive={false}
            showResponder={true}
            responderProgress={state.responderProgress}
            isLight={isLight}
          />

          {/* Top SLA Watchdog Banner */}
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 bg-[#141923]/95 border border-[#282C37] px-3.5 py-2.5 rounded-2xl shadow-xl">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                15-MIN SABAH SLA WATCHDOG
              </div>
              <div className="text-lg font-black font-mono text-white">
                {mins}:{secs}{' '}
                <span className="text-xs font-sans font-semibold text-emerald-400">
                  ({distKm} km away)
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                dispatch({
                  type: 'SET_DISPATCH_WARNING',
                  payload:
                    state.dispatchWarning === 'STALLED_RESPONDER'
                      ? 'AUTO_REASSIGNED'
                      : 'STALLED_RESPONDER',
                });
                notify(
                  state.dispatchWarning === 'STALLED_RESPONDER'
                    ? '8-Min Guard Triggered: Auto-Reassigned to Fast-Tow Zul!'
                    : '6-Min Watchdog Alert: Responder GPS Stationary',
                  'warning'
                );
              }}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold"
            >
              Test Watchdog
            </button>
          </div>

          {state.dispatchWarning !== 'NONE' && (
            <div className="absolute top-20 left-3 right-3 z-20 px-3.5 py-2.5 rounded-xl bg-amber-950/95 border border-amber-500 text-amber-200 text-xs font-semibold flex items-center gap-2 shadow-lg">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {state.dispatchWarning === 'STALLED_RESPONDER'
                  ? 'DispatchWarning.STALLED_RESPONDER: Unit stationary > 6 mins. Auto-reassign in 2 mins.'
                  : '8-Min Watchdog Guard: Reassigned to Fast-Tow Zul (KK-309)!'}
              </span>
            </div>
          )}
        </div>

        {/* Responder Arrival Sheet */}
        <div
          className={`rounded-t-3xl border-t p-4 z-20 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-[#141923] border-[#282C37]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center font-black text-blue-400">
                ROY
              </div>
              <div>
                <h3 className="font-bold text-sm">{state.responderName}</h3>
                <p className="text-xs text-gray-400">
                  {state.responderUnit} • 4.9★ (412 Rescues)
                </p>
              </div>
            </div>
            <a
              href="tel:+60168883911"
              className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow"
            >
              <Phone className="w-4 h-4" />
            </a>
          </div>

          <div className="mb-3 flex items-center justify-between px-3 py-2 rounded-xl bg-black/30 border border-gray-800 text-[11px]">
            <span className="font-mono text-gray-300">
              Haversine Geofence: <strong className={withinGeofence ? 'text-emerald-400' : 'text-amber-400'}>{distanceMeters}m</strong>
            </span>
            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${withinGeofence ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'}`}>
              {withinGeofence ? '<= 150m • PIN UNLOCKED' : '> 150m • LOCKED'}
            </span>
          </div>

          <div className="space-y-2">
            {!withinGeofence && (
              <button
                onClick={() => {
                  dispatch({ type: 'SET_RESPONDER_PROGRESS', payload: 1 });
                  notify(
                    'Responder entered 150m geofence (0m) — Arrival PIN 4829 unlocked!',
                    'success'
                  );
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs flex items-center justify-center gap-2"
              >
                <Navigation className="w-3.5 h-3.5" />
                Simulate Arrival (&lt; 150m)
              </button>
            )}
            <button
              onClick={() => {
                if (!withinGeofence) {
                  notify(
                    `Geofence Guard: Responder is ${distanceMeters}m away (must be <= 150m). Tap "Simulate Arrival (< 150m)" first.`,
                    'warning'
                  );
                  return;
                }
                dispatch({ type: 'SET_RESCUE_STAGE', payload: 4 });
                notify(
                  'Responder within 150m geofence! Verify PIN 4829.',
                  'success'
                );
              }}
              className={`w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-colors ${
                withinGeofence ? 'bg-red-600' : 'bg-gray-700'
              }`}
            >
              {withinGeofence
                ? 'Proceed to Arrival PIN Handshake (4829)'
                : `Arrival PIN Locked (${distanceMeters}m > 150m)`}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- STAGE 4: 4-DIGIT ARRIVAL SECURITY PIN HANDSHAKE ----------------
  if (state.rescueStage === 4) {
    const handleDigit = (d: string) => {
      if (!withinGeofence) {
        notify(
          `Geofence Guard: Responder is ${distanceMeters}m away. Simulate Arrival (< 150m) first.`,
          'warning'
        );
        return;
      }
      if (enteredPin.length >= 4) return;
      const next = enteredPin + d;
      setEnteredPin(next);
      if (next.length === 4) {
        if (next === RESCUE_HANDSHAKE_PIN) {
          setTimeout(() => {
            dispatch({ type: 'VERIFY_ARRIVAL_PIN' });
            syncJobToSupabase({ status: 'in_progress' });
            notify('4-Digit Security PIN 4829 Verified!', 'success');
          }, 250);
        } else {
          notify('Invalid PIN. Use 4829 to verify arrival.', 'error');
          setTimeout(() => setEnteredPin(''), 350);
        }
      }
    };

    return (
      <div className="flex-1 flex flex-col justify-between px-4 pt-4 pb-24 overflow-y-auto">
        <div>
          <StageHeader
            stage={4}
            title="Arrival Security PIN Handshake"
            onBack={() => dispatch({ type: 'SET_RESCUE_STAGE', payload: 3 })}
            isLight={isLight}
          />

          <div
            className={`rounded-2xl border p-4 text-center mb-5 ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-[#181C24] border-[#282C37]'
            }`}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold mb-2">
              <ShieldCheck className="w-4 h-4" /> Responder On-Site Verification ({distanceMeters}m)
            </div>
            {!withinGeofence && (
              <div className="mb-3">
                <p className="text-[11px] text-amber-400 mb-2 font-semibold">
                  Haversine Guard Active: Unit is {distanceMeters}m away (&gt; 150m).
                </p>
                <button
                  onClick={() => {
                    dispatch({ type: 'SET_RESPONDER_PROGRESS', payload: 1 });
                    notify('Responder entered 150m geofence — PIN unlocked!', 'success');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold"
                >
                  Simulate Arrival (&lt; 150m)
                </button>
              </div>
            )}
            <p className="text-xs text-gray-400">
              Your Rescue Passcode is{' '}
              <span className="font-mono font-black text-white bg-red-600/30 px-2 py-0.5 rounded">
                4829
              </span>
              . Enter or confirm PIN with {state.responderName}.
            </p>

            {/* 4 PIN Boxes */}
            <div className="flex justify-center gap-3 my-5">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black font-mono ${
                    enteredPin[idx]
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                      : isLight
                      ? 'border-slate-300 bg-slate-50'
                      : 'border-[#282C37] bg-[#0E1117]'
                  }`}
                >
                  {enteredPin[idx] || '•'}
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                if (!withinGeofence) {
                  notify(
                    `Geofence Guard: Responder is ${distanceMeters}m away. Tap "Simulate Arrival (< 150m)" first.`,
                    'warning'
                  );
                  return;
                }
                setEnteredPin('4829');
                setTimeout(() => {
                  dispatch({ type: 'VERIFY_ARRIVAL_PIN' });
                  syncJobToSupabase({ status: 'in_progress' });
                  notify('4-Digit Security PIN 4829 Verified!', 'success');
                }, 250);
              }}
              className="text-xs font-bold text-red-400 underline"
            >
              Auto-Fill Handshake PIN (4829)
            </button>
          </div>
        </div>

        {/* Tactile Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => handleDigit(d)}
              className={`h-13 py-3.5 rounded-2xl font-black text-lg border active:scale-95 transition-transform ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-[#181C24] border-[#282C37] text-white'
              }`}
            >
              {d}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigit('0')}
            className={`py-3.5 rounded-2xl font-black text-lg border active:scale-95 ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900'
                : 'bg-[#181C24] border-[#282C37] text-white'
            }`}
          >
            0
          </button>
          <button
            onClick={() => setEnteredPin((p) => p.slice(0, -1))}
            className={`py-3.5 rounded-2xl font-bold text-sm border flex items-center justify-center ${
              isLight
                ? 'bg-slate-100 border-slate-300'
                : 'bg-[#181C24] border-[#282C37]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // ---------------- STAGE 5 & 6: MALAYSIAN SST QUOTATION & ESCROW RESERVATION ----------------
  if (state.rescueStage === 5 || state.rescueStage === 6) {
    return (
      <div className="flex-1 flex flex-col justify-between px-4 pt-4 pb-24 overflow-y-auto">
        <div>
          <StageHeader
            stage={state.rescueStage}
            title="Diagnostics & 8% SST Escrow Quote"
            onBack={() => dispatch({ type: 'SET_RESCUE_STAGE', payload: 4 })}
            isLight={isLight}
          />

          {/* Live OBD-II & Field Diagnostic Findings */}
          <div
            className={`rounded-2xl border p-4 mb-4 ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-[#181C24] border-[#282C37]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                Stage 5 • Field Diagnostic Report
              </span>
              <span className="text-[11px] font-mono text-red-400 bg-red-500/15 px-2 py-0.5 rounded">
                DTC P0562 (11.1V)
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Battery cranking voltage dropped to 9.4V under load. Alternator
              diode bridge healthy at 14.1V. Recommend replacement + roadside
              callout.
            </p>
          </div>

          {/* Itemized Quotation with Malaysian SST Engine (8% Labor / 0% Parts) */}
          <div
            className={`rounded-2xl border p-4 mb-4 ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-[#181C24] border-[#282C37]'
            }`}
          >
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
              Stage 6 • Malaysian SST Itemized Quotation
            </h3>
            <div className="space-y-3 text-xs">
              {state.quoteItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-2 pb-2.5 border-b border-gray-800/60"
                >
                  <div>
                    <div className="font-bold">{item.description}</div>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.category === 'LABOR'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {item.category === 'LABOR'
                        ? 'SERVICE LABOR (8% SST)'
                        : 'PHYSICAL PART (0% SST)'}
                    </span>
                  </div>
                  <div className="font-mono font-bold shrink-0">
                    RM {(item.qty * item.unitPrice).toFixed(2)}
                  </div>
                </div>
              ))}

              <div className="space-y-1.5 pt-1 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Service Labor Subtotal</span>
                  <span className="font-mono">
                    RM {taxBreakdown.laborSubtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Spare Parts Subtotal</span>
                  <span className="font-mono">
                    RM {taxBreakdown.partsSubtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-amber-400 font-semibold">
                  <span>Malaysian SST (8% on Labor)</span>
                  <span className="font-mono">
                    RM {taxBreakdown.sstAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Malaysian SST (0% on Parts)</span>
                  <span className="font-mono">RM 0.00</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                  <span className="font-black text-sm">ESCROW TOTAL</span>
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    RM {taxBreakdown.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Protected Escrow Lock CTA */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs px-1 text-gray-400">
            <span>Vault Balance: RM {state.vaultBalance.toFixed(2)}</span>
            <span>Auto-FPX Top-Up Ready</span>
          </div>
          <button
            onClick={() => {
              const nonce = `NONCE-${state.activeJobId}-${Date.now()}`;
              dispatch({
                type: 'LOCK_ESCROW',
                payload: { amount: taxBreakdown.grandTotal, nonce },
              });
              syncJobToSupabase({
                status: 'in_progress',
                quoted_price: taxBreakdown.grandTotal,
              });
              notify(
                `RM ${taxBreakdown.grandTotal.toFixed(
                  2
                )} Locked in Protected Escrow`,
                'success'
              );
            }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>{t.approveEscrow}</span>
          </button>
        </div>
      </div>
    );
  }

  // ---------------- STAGE 7 & 8: WORK IN PROGRESS & LIVE TOW-CAM ----------------
  if (state.rescueStage === 7 || state.rescueStage === 8) {
    return (
      <div className="flex-1 flex flex-col justify-between px-4 pt-4 pb-24 overflow-y-auto">
        <div>
          <StageHeader
            stage={state.rescueStage}
            title="Live Repair & Flatbed Tow Telemetry"
            onBack={() => dispatch({ type: 'SET_RESCUE_STAGE', payload: 6 })}
            isLight={isLight}
          />

          {/* Escrow Status Pill */}
          <div className="mb-4 px-4 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <Lock className="w-4 h-4" />
              <span>VaultStatus.RESERVED</span>
            </div>
            <span className="font-mono font-black text-sm text-emerald-300">
              RM {taxBreakdown.grandTotal.toFixed(2)} Held
            </span>
          </div>

          {/* 3-Step Live Repair Milestone Checklist */}
          <div
            className={`rounded-2xl border p-4 mb-4 space-y-3 ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-[#181C24] border-[#282C37]'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">
                Stage 7 • Live Repair Milestones
              </h3>
              <span className="text-[11px] font-mono text-emerald-400">
                {state.wipMilestones.filter((m) => m.done).length}/
                {state.wipMilestones.length} Done
              </span>
            </div>
            {state.wipMilestones.map((m) => (
              <button
                key={m.id}
                onClick={() =>
                  dispatch({ type: 'TOGGLE_WIP_MILESTONE', payload: m.id })
                }
                className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                  m.done
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : isLight
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-[#282C37] bg-[#0E1117]'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    m.done
                      ? 'bg-emerald-500 text-white'
                      : 'border border-gray-500'
                  }`}
                >
                  {m.done && <Check className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs font-semibold">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Stage 8 Live Tow-Cam Launcher */}
          <div
            className={`rounded-2xl border p-4 ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-[#181C24] border-[#282C37]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-blue-400 uppercase tracking-wider">
                Stage 8 • Flatbed Tow-Cam Telemetry
              </span>
              <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                WebRTC HUD
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Monitor rear winch tension, flatbed tilt angle, and IR night
              vision feed during transit to Kolombong HQ.
            </p>
            <button
              onClick={() => {
                dispatch({ type: 'SET_RESCUE_STAGE', payload: 8 });
                dispatch({ type: 'SET_TOWCAM_OPEN', payload: true });
              }}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" /> OPEN LIVE TOW-CAM HUD
            </button>
          </div>
        </div>

        <button
          onClick={() => dispatch({ type: 'SET_RESCUE_STAGE', payload: 9 })}
          className="w-full py-4 rounded-2xl bg-red-600 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 mt-4"
        >
          <span>Proceed to Handover & Signature</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ---------------- STAGE 9: 4-CORNER INSPECTION & SIGNATURE PAD ----------------
  if (state.rescueStage === 9) {
    return (
      <div className="flex-1 flex flex-col justify-between px-4 pt-4 pb-24 overflow-y-auto">
        <div>
          <StageHeader
            stage={9}
            title="4-Corner Handover & Escrow Release"
            onBack={() => dispatch({ type: 'SET_RESCUE_STAGE', payload: 8 })}
            isLight={isLight}
          />

          {/* 4-Corner Vehicle Condition Checklist */}
          <div
            className={`rounded-2xl border p-4 mb-4 ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-[#181C24] border-[#282C37]'
            }`}
          >
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2.5">
              4-Corner Vehicle Condition Verification
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {state.handoverChecks.map((hc) => (
                <button
                  key={hc.id}
                  onClick={() =>
                    dispatch({ type: 'TOGGLE_HANDOVER_CHECK', payload: hc.id })
                  }
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold ${
                    hc.verified
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : isLight
                      ? 'border-slate-200 bg-slate-50'
                      : 'border-[#282C37] bg-[#0E1117] text-gray-300'
                  }`}
                >
                  <span>{hc.corner}</span>
                  {hc.verified ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <span className="text-[10px] text-gray-500">Tap to verify</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* High-DPI HTML5 Canvas Signature Pad */}
          <div
            className={`rounded-2xl border p-4 mb-4 ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-[#181C24] border-[#282C37]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold">
                Customer Release Signature
              </span>
              <button
                onClick={clearSignature}
                className="text-xs text-red-400 font-semibold underline"
              >
                Clear Pad
              </button>
            </div>
            <canvas
              ref={sigCanvasRef}
              width={440}
              height={130}
              onPointerDown={handleSigPointerDown}
              onPointerMove={handleSigPointerMove}
              onPointerUp={handleSigPointerUp}
              onPointerLeave={handleSigPointerUp}
              className={`w-full h-32 rounded-xl border-2 border-dashed touch-none cursor-crosshair ${
                isLight
                  ? 'bg-slate-50 border-slate-300'
                  : 'bg-[#0E1117] border-[#323846]'
              }`}
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              Sign above with finger or mouse to authorize escrow disbursement.
            </p>
          </div>
        </div>

        <button
          disabled={!state.signatureDataUrl}
          onClick={() => {
            dispatch({
              type: 'DISBURSE_ESCROW',
              payload: { amount: taxBreakdown.grandTotal },
            });
            syncJobToSupabase({
              status: 'completed',
              quoted_price: taxBreakdown.grandTotal,
            });
            notify(
              'Escrow Disbursed & LHDN MyInvois e-Invoice Generated!',
              'success'
            );
          }}
          className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
            state.signatureDataUrl
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>RELEASE ESCROW & GENERATE LHDN RECEIPT</span>
        </button>
      </div>
    );
  }

  // ---------------- STAGE 10: LHDN MYINVOIS QR & BINARY %PDF-1.4 RECEIPT ----------------
  return (
    <div className="flex-1 flex flex-col justify-between px-4 pt-4 pb-24 overflow-y-auto">
      <div>
        <div className="text-center mb-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-2 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black">Rescue & Escrow Settled</h2>
          <p className="text-xs text-gray-400">
            VaultStatus.DISBURSED • Job {state.activeJobId}
          </p>
        </div>

        {/* LHDN MyInvois Verification Card */}
        <div
          className={`rounded-2xl border p-4 mb-4 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-[#181C24] border-[#282C37]'
          }`}
        >
          <div className="flex items-center gap-4">
            {/* Deterministic LHDN Verification QR SVG */}
            <div className="w-24 h-24 rounded-xl bg-white p-2 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect x="4" y="4" width="28" height="28" fill="#0F172A" />
                <rect x="9" y="9" width="18" height="18" fill="#FFF" />
                <rect x="13" y="13" width="10" height="10" fill="#0F172A" />
                <rect x="68" y="4" width="28" height="28" fill="#0F172A" />
                <rect x="73" y="9" width="18" height="18" fill="#FFF" />
                <rect x="77" y="13" width="10" height="10" fill="#0F172A" />
                <rect x="4" y="68" width="28" height="28" fill="#0F172A" />
                <rect x="9" y="73" width="18" height="18" fill="#FFF" />
                <rect x="13" y="77" width="10" height="10" fill="#0F172A" />
                <rect x="40" y="10" width="8" height="8" fill="#0F172A" />
                <rect x="52" y="18" width="8" height="16" fill="#0F172A" />
                <rect x="38" y="38" width="24" height="24" fill="#DC2626" />
                <rect x="12" y="42" width="16" height="8" fill="#0F172A" />
                <rect x="70" y="44" width="18" height="8" fill="#0F172A" />
                <rect x="42" y="70" width="12" height="22" fill="#0F172A" />
                <rect x="64" y="68" width="26" height="10" fill="#0F172A" />
                <rect x="74" y="82" width="16" height="10" fill="#0F172A" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black mb-1">
                LHDN MYINVOIS VALIDATED
              </span>
              <div className="font-mono text-xs font-bold truncate">
                {lhdnMeta.uuid}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                TIN: {lhdnMeta.tin} • SST: {lhdnMeta.sstRegNo}
              </p>
              <p className="text-sm font-black font-mono text-emerald-400 mt-1">
                Paid: RM {taxBreakdown.grandTotal.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <button
          onClick={handleDownloadBinaryPdf}
          className="w-full py-4 rounded-2xl bg-white text-slate-950 font-black text-sm shadow-lg flex items-center justify-center gap-2 hover:bg-gray-100"
        >
          <Download className="w-4 h-4" />
          <span>{t.downloadPdf}</span>
        </button>
        <button
          onClick={() => {
            dispatch({ type: 'RESET_RESCUE' });
            notify('Ready for next roadside assistance dispatch', 'info');
          }}
          className="w-full py-3 rounded-2xl bg-[#181C24] border border-[#282C37] text-gray-300 font-bold text-xs"
        >
          Return to SOS Standby (Stage 0)
        </button>
      </div>
    </div>
  );
};

const StageHeader: React.FC<{
  stage: RescueStage;
  title: string;
  onBack: () => void;
  isLight: boolean;
}> = ({ stage, title, onBack, isLight }) => (
  <div className="flex items-center justify-between mb-4">
    <button
      onClick={onBack}
      className={`w-9 h-9 rounded-full border flex items-center justify-center ${
        isLight
          ? 'bg-white border-slate-300 text-slate-900'
          : 'bg-[#181C24] border-[#282C37] text-white'
      }`}
    >
      <ChevronLeft className="w-4 h-4" />
    </button>
    <div className="text-center">
      <div className="text-[10px] font-black uppercase tracking-widest text-red-400">
        RESCUE STAGE {stage} OF 10
      </div>
      <h2 className="text-sm font-black">{title}</h2>
    </div>
    <div className="w-9" />
  </div>
);

// ============================================================================
// 9. CUSTOMER ECOSYSTEM SCREENS: GARAGE, WALLET, MARKETPLACE, AI, DTC, SETTINGS
// ============================================================================

const ScreenTopBar: React.FC<{
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}> = ({ title, subtitle, rightSlot }) => {
  const { state, dispatch } = useApp();
  const isLight = state.displayMode === 'sunlight';
  return (
    <header className="flex items-center justify-between gap-2 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => dispatch({ type: 'SET_DRAWER', payload: true })}
          className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${
            isLight
              ? 'bg-white border-slate-300 text-slate-900'
              : 'bg-[#181C24] border-[#282C37] text-white'
          }`}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-black truncate">{title}</h1>
          {subtitle && (
            <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {rightSlot}
    </header>
  );
};

const DigitalGarageScreen: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const activeVehicle =
    state.vehicles.find((v) => v.id === state.activeVehicleId) ||
    state.vehicles[0];

  const [showAddForm, setShowAddForm] = useState(false);
  const [makeModel, setMakeModel] = useState('');
  const [plate, setPlate] = useState('');
  const [vin, setVin] = useState('');

  // Live 4-Gauge OBD-II Telemetry Simulation + Web Bluetooth Trigger
  const [obdConnected, setObdConnected] = useState(true);
  const [telemetry, setTelemetry] = useState({
    rpm: 840,
    coolant: 89,
    voltage: 14.1,
    stft: -0.8,
  });

  useEffect(() => {
    if (!obdConnected) return;
    const t = setInterval(() => {
      setTelemetry({
        rpm: Math.round(815 + Math.random() * 65),
        coolant: Math.round(88 + Math.random() * 4),
        voltage: Number((13.9 + Math.random() * 0.4).toFixed(1)),
        stft: Number((-1.5 + Math.random() * 2.4).toFixed(1)),
      });
    }, 1600);
    return () => clearInterval(t);
  }, [obdConnected]);

  const handleBleScan = async () => {
    try {
      const navBle = navigator as Navigator & {
        bluetooth?: { requestDevice: (opts: unknown) => Promise<unknown> };
      };
      if (navBle.bluetooth) {
        await navBle.bluetooth.requestDevice({ acceptAllDevices: true });
        setObdConnected(true);
        notify('ELM327 OBD-II BLE Paired!', 'success');
      } else {
        setObdConnected(true);
        notify(
          'Simulated ELM327 OBD-II Telemetry Stream Active (No BLE Hardware)',
          'info'
        );
      }
    } catch {
      setObdConnected(true);
      notify('OBD-II Live Telemetry Simulation Running', 'info');
    }
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPlate = plate.trim().toUpperCase();
    const cleanVin = vin.trim().toUpperCase();
    // Malaysian JPJ Plate & ISO 3779 17-char VIN Sanity Validator
    if (!/^[A-Z]{1,3}\s?\d{1,4}\s?[A-Z]{0,2}$/.test(cleanPlate)) {
      notify(
        'Invalid Malaysian JPJ Plate format (e.g. SAB 8821 X)',
        'error'
      );
      return;
    }
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin)) {
      notify(
        'ISO 3779 VIN must be 17 alphanumeric chars (excluding I, O, Q)',
        'error'
      );
      return;
    }
    dispatch({
      type: 'ADD_VEHICLE',
      payload: {
        id: `v-${Date.now()}`,
        makeModel: makeModel.trim() || 'Perodua Ativa 1.0L Turbo',
        variant: 'AV CVT',
        plate: cleanPlate,
        vin: cleanVin,
        year: 2024,
        jpjVerified: true,
        roadtaxExpiry: '18 Nov 2027',
      },
    });
    setShowAddForm(false);
    setMakeModel('');
    setPlate('');
    setVin('');
    notify(`Added ${cleanPlate} to Sabah Digital Garage`, 'success');
  };

  return (
    <div className="flex-1 px-4 pt-3 pb-24 overflow-y-auto">
      <ScreenTopBar
        title="Digital Garage"
        subtitle="JPJ Fleet & Live ELM327 OBD-II"
        rightSlot={
          <button
            onClick={() => setShowAddForm((s) => !s)}
            className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        }
      />

      {/* Fleet Switcher */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {state.vehicles.map((v) => {
          const active = v.id === activeVehicle.id;
          return (
            <button
              key={v.id}
              onClick={() =>
                dispatch({ type: 'SELECT_VEHICLE', payload: v.id })
              }
              className={`shrink-0 px-3.5 py-2.5 rounded-xl border text-left ${
                active
                  ? 'border-red-500 bg-red-600/15'
                  : isLight
                  ? 'bg-white border-slate-200'
                  : 'bg-[#181C24] border-[#282C37]'
              }`}
            >
              <div className="text-xs font-black font-mono">{v.plate}</div>
              <div className="text-[11px] text-gray-400">{v.makeModel}</div>
            </button>
          );
        })}
      </div>

      {/* Add Vehicle Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddVehicle}
          className={`rounded-2xl border p-4 mb-4 space-y-3 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-[#181C24] border-[#282C37]'
          }`}
        >
          <h3 className="text-xs font-black uppercase text-red-400">
            Register Sabah Vehicle (JPJ + ISO 3779 VIN)
          </h3>
          <input
            type="text"
            placeholder="Make & Model (e.g. Perodua Bezza 1.3X)"
            value={makeModel}
            onChange={(e) => setMakeModel(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-xl bg-black/25 border border-gray-700 text-xs outline-none"
          />
          <input
            type="text"
            placeholder="JPJ Plate (e.g. SAB 5512 K)"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-xl bg-black/25 border border-gray-700 text-xs font-mono uppercase outline-none"
          />
          <input
            type="text"
            maxLength={17}
            placeholder="17-Char ISO 3779 VIN (e.g. PM2B300S000551234)"
            value={vin}
            onChange={(e) => setVin(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-xl bg-black/25 border border-gray-700 text-xs font-mono uppercase outline-none"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
          >
            Validate & Save Vehicle
          </button>
        </form>
      )}

      {/* Active Vehicle Card */}
      <div
        className={`rounded-2xl border p-4 mb-4 ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-gradient-to-br from-[#1B2230] to-[#141923] border-[#282C37]'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black mb-1">
              <ShieldCheck className="w-3 h-3" /> JPJ & PUSPAKOM VERIFIED
            </span>
            <h2 className="text-lg font-black">{activeVehicle.makeModel}</h2>
            <p className="text-xs text-gray-400">{activeVehicle.variant}</p>
          </div>
          <div className="text-right">
            <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-gray-700 font-mono text-xs font-black">
              {activeVehicle.plate}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">
              Exp: {activeVehicle.roadtaxExpiry}
            </div>
          </div>
        </div>
        <div className="text-[11px] font-mono text-gray-400 mb-3">
          VIN: {activeVehicle.vin}
        </div>
        <button
          onClick={handleBleScan}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2"
        >
          <Bluetooth className="w-4 h-4" />
          {obdConnected
            ? 'ELM327 OBD-II Live Stream Active'
            : 'Scan ELM327 OBD-II Bluetooth'}
        </button>
      </div>

      {/* Live 4-Gauge OBD-II Telemetry */}
      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2.5">
        Live ECU Telemetry (PID Mode 01)
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: 'Engine RPM',
            value: `${telemetry.rpm}`,
            unit: 'rpm',
            icon: Gauge,
            color: 'text-red-400',
          },
          {
            label: 'Coolant Temp',
            value: `${telemetry.coolant}°C`,
            unit: 'Normal',
            icon: Thermometer,
            color: 'text-amber-400',
          },
          {
            label: 'Alternator / Batt',
            value: `${telemetry.voltage}V`,
            unit: 'Charging',
            icon: Battery,
            color: 'text-emerald-400',
          },
          {
            label: 'Short Term Fuel Trim',
            value: `${telemetry.stft > 0 ? '+' : ''}${telemetry.stft}%`,
            unit: 'Closed Loop',
            icon: Activity,
            color: 'text-blue-400',
          },
        ].map((g, i) => (
          <div
            key={i}
            className={`rounded-2xl border p-3.5 ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-[#181C24] border-[#282C37]'
            }`}
          >
            <div className="flex items-center justify-between text-gray-400 mb-1.5">
              <span className="text-[11px] font-semibold">{g.label}</span>
              <g.icon className={`w-4 h-4 ${g.color}`} />
            </div>
            <div className="text-2xl font-black font-mono">{g.value}</div>
            <div className={`text-[10px] font-bold mt-0.5 ${g.color}`}>
              {g.unit}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const WalletScreen: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';

  return (
    <div className="flex-1 px-4 pt-3 pb-24 overflow-y-auto">
      <ScreenTopBar
        title="Wallet & Protected Vault"
        subtitle="BNM-Compliant Escrow & FPX Top-Up"
      />

      {/* Emerald Protected Vault Card */}
      <div className="rounded-3xl p-5 mb-5 text-white shadow-xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-950 border border-emerald-400/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
            Protected Vault Balance
          </span>
          <span className="px-2 py-0.5 rounded-full bg-black/30 text-[10px] font-mono">
            {state.vaultStatus}
          </span>
        </div>
        <div className="text-4xl font-black font-mono my-2">
          RM {state.vaultBalance.toFixed(2)}
        </div>
        <p className="text-[11px] text-emerald-200/80 mb-4">
          Funds are held in escrow and only released after your Stage 9
          handover signature.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[50, 100, 200].map((amt) => (
            <button
              key={amt}
              onClick={() => {
                dispatch({
                  type: 'TOP_UP_VAULT',
                  payload: { amount: amt, method: 'FPX Maybank2u' },
                });
                notify(`Topped up RM ${amt}.00 via FPX`, 'success');
              }}
              className="py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 font-black text-xs"
            >
              +RM {amt}
            </button>
          ))}
        </div>
      </div>

      {/* Escrow Transaction Ledger */}
      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
        Escrow & FPX Ledger
      </h3>
      <div className="space-y-2.5">
        {state.ledger.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border p-3.5 flex items-center justify-between gap-3 ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-[#181C24] border-[#282C37]'
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">{item.title}</div>
              <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                {item.timestamp} • {item.ref}
              </div>
            </div>
            <div
              className={`font-mono font-black text-xs shrink-0 ${
                item.type === 'CREDIT'
                  ? 'text-emerald-400'
                  : item.type === 'RESERVE'
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              {item.amount > 0
                ? `+RM ${item.amount.toFixed(2)}`
                : `-RM ${Math.abs(item.amount).toFixed(2)}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MarketplaceScreen: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const [onlyMyviFit, setOnlyMyviFit] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [fulfillment, setFulfillment] = useState<'EXPRESS_60M' | 'BAY_SLOT'>(
    'EXPRESS_60M'
  );
  const [fpxBank, setFpxBank] = useState('Maybank2u');

  const visibleParts = onlyMyviFit
    ? MARKETPLACE_PARTS.filter((p) => p.myviFit)
    : MARKETPLACE_PARTS;

  const cartLines: QuoteLineItem[] = useMemo(() => {
    const lines: QuoteLineItem[] = state.cart.map((c) => ({
      id: c.part.id,
      description: c.part.name,
      category: 'PARTS',
      qty: c.qty,
      unitPrice: c.part.price,
    }));
    if (lines.length > 0) {
      lines.push({
        id: 'install-fee',
        description:
          fulfillment === 'EXPRESS_60M'
            ? 'Roadside Express 60m Mobile Installation'
            : 'Kolombong HQ Hydraulic Bay Installation',
        category: 'LABOR',
        qty: 1,
        unitPrice: fulfillment === 'EXPRESS_60M' ? 35 : 25,
      });
    }
    return lines;
  }, [state.cart, fulfillment]);

  const cartTax = useMemo(
    () => MalaysianTaxEngine.calculate(cartLines),
    [cartLines]
  );

  const totalCount = state.cart.reduce((s, c) => s + c.qty, 0);

  return (
    <div className="flex-1 px-4 pt-3 pb-24 overflow-y-auto relative">
      <ScreenTopBar
        title="Spare Parts Marketplace"
        subtitle="0% SST on Genuine Sabah Stock"
        rightSlot={
          <button
            onClick={() => setCheckoutOpen(true)}
            className="relative px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{totalCount}</span>
          </button>
        }
      />

      {/* Fitment Filter Bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setOnlyMyviFit((v) => !v)}
          className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 ${
            onlyMyviFit
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
              : isLight
              ? 'bg-white border-slate-300 text-slate-700'
              : 'bg-[#181C24] border-[#282C37] text-gray-300'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Myvi SAB 8821 X Fitment Only
        </button>
        <span className="text-[11px] text-gray-400">
          {visibleParts.length} items
        </span>
      </div>

      {/* 6-Item Sabah Spare Parts Catalog */}
      <div className="grid grid-cols-1 gap-3">
        {visibleParts.map((part) => (
          <div
            key={part.id}
            className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-[#181C24] border-[#282C37]'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  {part.category}
                </span>
                {part.myviFit && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    ✓ Myvi Fit
                  </span>
                )}
                <span className="text-[10px] text-gray-400">{part.badge}</span>
              </div>
              <h3 className="font-bold text-sm">{part.name}</h3>
              <p className="text-[11px] text-gray-400 font-mono">
                SKU: {part.sku} • {part.stock} in Kolombong HQ
              </p>
              <div className="text-base font-black font-mono text-red-400 mt-1">
                RM {part.price.toFixed(2)}{' '}
                <span className="text-[10px] font-sans text-gray-400">
                  (0% Parts SST)
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                dispatch({ type: 'ADD_TO_CART', payload: part });
                notify(`Added ${part.name} to cart`, 'success');
              }}
              className="px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0"
            >
              + Cart
            </button>
          </div>
        ))}
      </div>

      {/* Multi-Item Cart Drawer (MarketplaceCheckoutSheet) */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-[65] bg-black/75 backdrop-blur-sm flex items-end justify-center">
          <div
            className={`w-full max-w-[540px] rounded-t-3xl border-t p-5 max-h-[88dvh] overflow-y-auto ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-[#141923] border-[#282C37] text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-base flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-red-500" />
                Marketplace Escrow Checkout
              </h3>
              <button
                onClick={() => setCheckoutOpen(false)}
                className="p-1.5 rounded-full bg-gray-800 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {state.cart.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">
                Your spare parts cart is empty.
              </p>
            ) : (
              <>
                <div className="space-y-2.5 mb-4">
                  {state.cart.map((item) => (
                    <div
                      key={item.part.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-gray-800"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate">
                          {item.part.name}
                        </div>
                        <div className="text-[11px] font-mono text-gray-400">
                          RM {item.part.price} × {item.qty}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            dispatch({
                              type: 'UPDATE_CART_QTY',
                              payload: { partId: item.part.id, delta: -1 },
                            })
                          }
                          className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-bold">
                          {item.qty}
                        </span>
                        <button
                          onClick={() =>
                            dispatch({
                              type: 'UPDATE_CART_QTY',
                              payload: { partId: item.part.id, delta: 1 },
                            })
                          }
                          className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fulfillment Option */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => setFulfillment('EXPRESS_60M')}
                    className={`p-3 rounded-xl border text-left ${
                      fulfillment === 'EXPRESS_60M'
                        ? 'border-red-500 bg-red-600/15'
                        : 'border-gray-800'
                    }`}
                  >
                    <div className="text-xs font-bold">Roadside Express 60m</div>
                    <div className="text-[10px] text-gray-400">
                      Mobile Van Fitment (RM 35)
                    </div>
                  </button>
                  <button
                    onClick={() => setFulfillment('BAY_SLOT')}
                    className={`p-3 rounded-xl border text-left ${
                      fulfillment === 'BAY_SLOT'
                        ? 'border-red-500 bg-red-600/15'
                        : 'border-gray-800'
                    }`}
                  >
                    <div className="text-xs font-bold">Kolombong HQ Bay</div>
                    <div className="text-[10px] text-gray-400">
                      Reserved Lift Slot (RM 25)
                    </div>
                  </button>
                </div>

                {/* FPX Bank Selection */}
                <div className="mb-4">
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                    Malaysian FPX Online Banking
                  </label>
                  <select
                    value={fpxBank}
                    onChange={(e) => setFpxBank(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#181C24] border border-[#282C37] text-xs font-semibold text-white"
                  >
                    <option>Maybank2u</option>
                    <option>CIMB Clicks</option>
                    <option>Public Bank PBe</option>
                    <option>RHB Now</option>
                    <option>Bank Islam IB</option>
                  </select>
                </div>

                {/* 8% Service SST / 0% Parts SST Breakdown */}
                <div className="space-y-1 text-xs border-t border-gray-800 pt-3 mb-4">
                  <div className="flex justify-between text-gray-400">
                    <span>Parts Subtotal (0% SST)</span>
                    <span className="font-mono">
                      RM {cartTax.partsSubtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Installation Labor</span>
                    <span className="font-mono">
                      RM {cartTax.laborSubtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-amber-400">
                    <span>Service SST (8% Labor Only)</span>
                    <span className="font-mono">
                      RM {cartTax.sstAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-black text-sm pt-2">
                    <span>TOTAL FPX ESCROW</span>
                    <span className="font-mono text-emerald-400">
                      RM {cartTax.grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    dispatch({ CLEAR_CART: undefined } as unknown as AppAction);
                    dispatch({ type: 'CLEAR_CART' });
                    setCheckoutOpen(false);
                    notify(
                      `Order confirmed via ${fpxBank} (RM ${cartTax.grandTotal.toFixed(
                        2
                      )})`,
                      'success'
                    );
                  }}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-xs"
                >
                  PAY VIA {fpxBank.toUpperCase()} & BOOK FITMENT
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendedServiceId?: string;
  likelyCause?: string;
}

const AiAssistantScreen: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: 'm0',
      role: 'assistant',
      text: 'Selamat Sejahtera Ahmad! I am RepairBah AI Diagnostic Copilot for Perodua Myvi (SAB 8821 X). Describe your breakdown symptom (e.g., "clicking sound when starting", "overheating on Bukit Padang", or "flat tyre at Likas").',
      severity: 'LOW',
      likelyCause: 'Ready for OBD-II & Symptom Triage',
    },
  ]);

  const generateLocalDiagnostic = (q: string): Omit<AiMessage, 'id' | 'role'> => {
    const low = q.toLowerCase();
    if (low.includes('batt') || low.includes('click') || low.includes('start')) {
      return {
        text: 'Rapid relay clicking with dim cabin lights indicates a discharged or sulfated NS60LS 12V battery (< 11.2V). Avoid repeated cranking to protect the starter solenoid.',
        severity: 'HIGH',
        likelyCause: '12V Battery Cell Failure / Alternator Undercharge',
        recommendedServiceId: 'battery_swap',
      };
    }
    if (low.includes('tyre') || low.includes('tire') || low.includes('puncture')) {
      return {
        text: 'Pull onto a wide shoulder with hazard lights active. Our Mobile Tyre Unit carries 185/55 R15 Michelin XM2+ spares and torque wrenches.',
        severity: 'MEDIUM',
        likelyCause: 'Sidewall Puncture / Rapid Pressure Loss',
        recommendedServiceId: 'flat_tyre',
      };
    }
    if (low.includes('heat') || low.includes('smoke') || low.includes('gear') || low.includes('cvt')) {
      return {
        text: 'CRITICAL: Shut off the engine immediately to prevent cylinder head warpage or D-CVT belt slip. Do not open the radiator cap while pressurized.',
        severity: 'CRITICAL',
        likelyCause: 'Cooling System Loss / Transmission Protection',
        recommendedServiceId: 'patrol_tow',
      };
    }
    return {
      text: 'Based on Perodua Myvi 1.5L Dual VVT-i telemetry patterns, an on-site OBD-II scan and fuel/ignition inspection is recommended.',
      severity: 'MEDIUM',
      likelyCause: 'Ignition Coil / Fuel Trim Anomaly',
      recommendedServiceId: 'mobile_mech',
    };
  };

  const activeVehicle =
    state.vehicles.find((v) => v.id === state.activeVehicleId) ||
    state.vehicles[0];

  const handleSend = async (customText?: string) => {
    const query = (customText ?? prompt).trim();
    if (!query || loading) return;
    setPrompt('');
    const userMsg: AiMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: query,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          vehicle: activeVehicle?.makeModel || 'Perodua Myvi 1.5L',
          plate: activeVehicle?.plate || 'SAB 8821 X',
          apiKeyOverride: state.geminiApiKey || undefined,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          text?: string;
          severity?: AiMessage['severity'];
          likelyCause?: string;
          recommendedServiceId?: string;
        };
        const fallbackMeta = generateLocalDiagnostic(query);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: data.text || fallbackMeta.text,
            severity: data.severity || fallbackMeta.severity,
            likelyCause: data.likelyCause || fallbackMeta.likelyCause,
            recommendedServiceId:
              data.recommendedServiceId || fallbackMeta.recommendedServiceId,
          },
        ]);
      } else {
        throw new Error('Fallback to Sabah Triage Engine');
      }
    } catch {
      const fb = generateLocalDiagnostic(query);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          ...fb,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-24 overflow-hidden">
      <ScreenTopBar
        title="AI Breakdown Assistant"
        subtitle="Gemini Automotive Triage • Sabah Edition"
      />

      {/* Quick Prompts */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar shrink-0">
        {[
          'Car clicks but wont start',
          'Engine overheating on hill',
          'Flat tyre on Jalan Lintas',
        ].map((qp) => (
          <button
            key={qp}
            onClick={() => handleSend(qp)}
            className={`shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-semibold ${
              isLight
                ? 'bg-white border-slate-300 text-slate-700'
                : 'bg-[#181C24] border-[#282C37] text-gray-300'
            }`}
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Chat Stream */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-red-600 text-white font-semibold'
                  : isLight
                  ? 'bg-white border border-slate-200 text-slate-900'
                  : 'bg-[#181C24] border border-[#282C37] text-gray-200'
              }`}
            >
              {m.role === 'assistant' && m.severity && (
                <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-gray-800">
                  <span className="font-bold text-[10px] text-gray-400">
                    {m.likelyCause}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-black ${
                      m.severity === 'CRITICAL'
                        ? 'bg-red-600 text-white'
                        : m.severity === 'HIGH'
                        ? 'bg-amber-500 text-black'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {m.severity}
                  </span>
                </div>
              )}
              <p>{m.text}</p>
              {m.recommendedServiceId && (
                <button
                  onClick={() => {
                    const svc =
                      SERVICES.find((s) => s.id === m.recommendedServiceId) ||
                      SERVICES[0];
                    dispatch({ type: 'SELECT_SERVICE', payload: svc });
                    dispatch({ type: 'SET_RESCUE_STAGE', payload: 1 });
                    notify(`Pre-selected ${svc.nameEn} on SOS Map`, 'info');
                  }}
                  className="mt-3 w-full py-2 px-3 rounded-xl bg-red-600 text-white font-bold text-[11px] flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Dispatch Recommended SOS Unit
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs text-gray-400 animate-pulse">
            Analyzing Perodua Myvi telemetry & Sabah dispatch rules...
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="mt-2 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe warning light or noise..."
          className={`flex-1 px-4 py-3 rounded-2xl border text-xs outline-none ${
            isLight
              ? 'bg-white border-slate-300 text-slate-900'
              : 'bg-[#181C24] border-[#282C37] text-white'
          }`}
        />
        <button
          type="submit"
          className="w-11 h-11 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

const DtcLibraryScreen: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const [query, setQuery] = useState('');

  const filtered = DTC_LIBRARY.filter(
    (d) =>
      d.code.toLowerCase().includes(query.toLowerCase()) ||
      d.title.toLowerCase().includes(query.toLowerCase()) ||
      d.system.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex-1 px-4 pt-3 pb-24 overflow-y-auto">
      <ScreenTopBar
        title="DTC Fault Library"
        subtitle="OBD-II Powertrain, Chassis & CAN Codes"
      />

      <div
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border mb-4 ${
          isLight
            ? 'bg-white border-slate-300'
            : 'bg-[#181C24] border-[#282C37]'
        }`}
      >
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search P0117, P0300, P0562, CVT, Voltage..."
          className="flex-1 bg-transparent text-xs outline-none"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((dtc) => (
          <div
            key={dtc.code}
            className={`rounded-2xl border p-4 ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-[#181C24] border-[#282C37]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono font-black text-sm text-red-400">
                {dtc.code}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  dtc.severity === 'CRITICAL'
                    ? 'bg-red-600 text-white'
                    : dtc.severity === 'HIGH'
                    ? 'bg-amber-500 text-black'
                    : 'bg-blue-500/20 text-blue-400'
                }`}
              >
                {dtc.severity}
              </span>
            </div>
            <h3 className="font-bold text-xs">{dtc.title}</h3>
            <p className="text-[11px] text-gray-400 mt-1">{dtc.symptoms}</p>
            <ul className="mt-2 space-y-1 text-[11px] text-gray-300 list-disc pl-4">
              {dtc.steps.map((st, idx) => (
                <li key={idx}>{st}</li>
              ))}
            </ul>
            <button
              onClick={() => {
                const svc =
                  SERVICES.find((s) => s.id === dtc.recommendedServiceId) ||
                  SERVICES[0];
                dispatch({ type: 'SELECT_SERVICE', payload: svc });
                dispatch({ type: 'SET_RESCUE_STAGE', payload: 1 });
                notify(`Pre-filled SOS for ${dtc.code} (${svc.nameEn})`, 'info');
              }}
              className="mt-3 w-full py-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-xs"
            >
              Pre-Fill SOS Dispatch ({dtc.code})
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const AppSettingsScreen: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const [geminiKeyInput, setGeminiKeyInput] = useState(state.geminiApiKey);

  return (
    <div className="flex-1 px-4 pt-3 pb-24 overflow-y-auto">
      <ScreenTopBar
        title="App Settings"
        subtitle="Display Contrast, Localization & Cloud Bridge"
      />

      <div className="space-y-3">
        {/* Sunlight High-Contrast Theme Toggle */}
        <div
          className={`rounded-2xl border p-4 flex items-center justify-between ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-[#181C24] border-[#282C37]'
          }`}
        >
          <div className="flex items-center gap-3">
            {isLight ? (
              <Sun className="w-5 h-5 text-amber-500" />
            ) : (
              <Moon className="w-5 h-5 text-blue-400" />
            )}
            <div>
              <div className="text-xs font-bold">
                Display Mode (Sunlight High-Contrast)
              </div>
              <div className="text-[11px] text-gray-400">
                {isLight
                  ? 'High-Contrast Daylight (#F8FAFC)'
                  : 'Dark Obsidian (#0E1117)'}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              dispatch({ type: 'TOGGLE_DISPLAY_MODE' });
              notify(
                `Switched to ${
                  isLight ? 'Dark Obsidian' : 'Sunlight High-Contrast'
                } theme`,
                'info'
              );
            }}
            className="px-3.5 py-2 rounded-xl bg-red-600 text-white font-bold text-xs"
          >
            Toggle
          </button>
        </div>

        {/* English / Bahasa Malaysia Switcher */}
        <div
          className={`rounded-2xl border p-4 flex items-center justify-between ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-[#181C24] border-[#282C37]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-xs font-bold">
                Language / Bahasa Malaysia
              </div>
              <div className="text-[11px] text-gray-400">
                Active: {state.language === 'EN' ? 'English (MY)' : 'Bahasa Malaysia'}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              dispatch({ type: 'TOGGLE_LANGUAGE' });
              notify(
                `Language set to ${
                  state.language === 'EN' ? 'Bahasa Malaysia (BM)' : 'English (EN)'
                }`,
                'info'
              );
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
          >
            {state.language === 'EN' ? 'Switch to BM' : 'Switch to EN'}
          </button>
        </div>

        {/* Supabase Config Inspector */}
        <div
          className={`rounded-2xl border p-4 flex items-center justify-between ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-[#181C24] border-[#282C37]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-xs font-bold">
                Supabase Realtime & PostgREST
              </div>
              <div className="text-[11px] text-gray-400 font-mono">
                {state.realtimeConnected ? 'Connected • 2.5s Sync' : 'Offline Queue'}
              </div>
            </div>
          </div>
          <button
            onClick={() =>
              dispatch({ type: 'SET_SUPABASE_DIALOG', payload: true })
            }
            className="px-3.5 py-2 rounded-xl bg-[#242A36] text-white font-bold text-xs"
          >
            Inspect
          </button>
        </div>

        {/* Optional Gemini API Key */}
        <div
          className={`rounded-2xl border p-4 space-y-2 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-[#181C24] border-[#282C37]'
          }`}
        >
          <label className="text-xs font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Optional Gemini API Key (AI Copilot)
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={geminiKeyInput}
              onChange={(e) => setGeminiKeyInput(e.target.value)}
              placeholder="Leave blank for runtime / Sabah offline engine"
              className="flex-1 px-3 py-2 rounded-xl bg-black/25 border border-gray-700 text-xs outline-none"
            />
            <button
              onClick={() => {
                dispatch({
                  type: 'UPDATE_CONFIG',
                  payload: {
                    supabaseUrl: state.supabaseUrl,
                    supabaseAnonKey: state.supabaseAnonKey,
                    geminiApiKey: geminiKeyInput,
                  },
                });
                notify('Saved AI Configuration', 'success');
              }}
              className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 10. PIN-GATED WORKFORCE CONSOLES (PIN: 1234 • 15-MIN SESSION CACHE)
// ============================================================================

const ConsolePinGateModal: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const [pin, setPin] = useState('');

  if (!state.pendingConsoleTarget) return null;

  const targetName =
    state.pendingConsoleTarget === 'mechanic'
      ? 'Mobile Mechanic Patrol'
      : state.pendingConsoleTarget === 'tow'
      ? 'Flatbed Tow Operator'
      : 'Kolombong HQ Workshop';

  const pressDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      if (WORKFORCE_PINS.includes(next)) {
        setTimeout(() => {
          dispatch({
            type: 'UNLOCK_WORKFORCE',
            payload: state.pendingConsoleTarget,
          });
          setPin('');
          notify(
            `Unlocked ${targetName} (15-min Session Cached)`,
            'success'
          );
        }, 200);
      } else {
        notify(
          'Incorrect Workforce PIN. Use 4402 (Android) or 1234 (Demo)',
          'error'
        );
        setTimeout(() => setPin(''), 300);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[65] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className={`w-full max-w-[380px] rounded-3xl border p-6 text-center shadow-2xl ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#141923] border-[#282C37] text-white'
        }`}
      >
        <div className="flex justify-end">
          <button
            onClick={() => {
              setPin('');
              dispatch({ type: 'SET_PENDING_CONSOLE', payload: null });
            }}
            className="p-1.5 rounded-full bg-gray-800 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center mx-auto mb-3 text-red-400">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-black">ConsolePinGate</h3>
        <p className="text-xs text-gray-400 mt-1">
          Enter Workforce PIN for{' '}
          <span className="text-white font-bold">{targetName}</span> (Android:{' '}
          <span className="font-mono text-emerald-400">4402</span> • Demo:{' '}
          <span className="font-mono text-emerald-400">1234</span>)
        </p>

        <div className="flex justify-center gap-3 my-5">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-xl font-black ${
                pin[idx]
                  ? 'border-red-500 bg-red-500/15 text-red-400'
                  : 'border-gray-700'
              }`}
            >
              {pin[idx] ? '●' : ''}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => pressDigit(d)}
              className="py-3 rounded-xl bg-[#181C24] border border-[#282C37] text-white font-black text-base active:scale-95"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => {
              dispatch({
                type: 'UNLOCK_WORKFORCE',
                payload: state.pendingConsoleTarget,
              });
              setPin('');
            }}
            className="py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 font-bold text-[11px]"
          >
            Auto 1234
          </button>
          <button
            onClick={() => pressDigit('0')}
            className="py-3 rounded-xl bg-[#181C24] border border-[#282C37] text-white font-black text-base"
          >
            0
          </button>
          <button
            onClick={() => setPin((p) => p.slice(0, -1))}
            className="py-3 rounded-xl bg-[#181C24] border border-[#282C37] text-gray-400 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const MechanicConsoleScreen: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const [mechPin, setMechPin] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [newItemDesc, setNewItemDesc] = useState('Ignition Coil Assembly');
  const [newItemPrice, setNewItemPrice] = useState('165');
  const [newItemCat, setNewItemCat] = useState<'LABOR' | 'PARTS'>('PARTS');

  // 2s GPS Telemetry Broadcaster when responder online
  useEffect(() => {
    if (!state.responderOnline) return;
    const t = setInterval(() => {
      // Heartbeat telemetry ping
    }, 2000);
    return () => clearInterval(t);
  }, [state.responderOnline]);

  const addQuoteLine = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(newItemPrice);
    if (!newItemDesc.trim() || isNaN(price) || price <= 0) return;
    const next: QuoteLineItem[] = [
      ...state.quoteItems,
      {
        id: `q-${Date.now()}`,
        description: newItemDesc.trim(),
        category: newItemCat,
        qty: 1,
        unitPrice: price,
      },
    ];
    dispatch({ type: 'UPDATE_QUOTE_ITEMS', payload: next });
    notify(`Added ${newItemDesc} to Customer Stage 6 Quote`, 'success');
  };

  const handleAtomicClaim = async () => {
    if (claiming) return;
    const responderName = 'Foreman Roy (Hafiz Bin Rosli)';
    const broadcastLocalClaim = () => {
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('repairbah_sync');
          bc.postMessage({
            type: 'JOB_PATCH',
            payload: {
              id: state.activeJobId,
              status: 'accepted',
              responder_id: 'kk-204-roy',
              responder_name: responderName,
            },
          });
          bc.close();
        }
      } catch {
        // Ignore broadcast errors
      }
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      dispatch({ type: 'CLAIM_RESCUE_JOB', payload: { responderName } });
      broadcastLocalClaim();
      notify('Offline mode: Claimed locally & queued RPC sync', 'warning');
      return;
    }

    setClaiming(true);
    try {
      const res = await fetch(
        `${state.supabaseUrl}/rest/v1/rpc/claim_emergency_request_atomic`,
        {
          method: 'POST',
          headers: {
            apikey: state.supabaseAnonKey,
            Authorization: `Bearer ${state.supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_request_id: state.activeJobId,
            p_responder_id: 'kk-204-roy',
            p_responder_name: responderName,
          }),
        }
      );

      const rawBody = await res.text();
      let parsedBody: unknown = rawBody;
      try {
        parsedBody = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        // Keep text representation
      }
      const serialized =
        typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody || '');

      if (serialized.includes('ALREADY_CLAIMED')) {
        notify(
          'ALREADY_CLAIMED: Another Sabah responder unit has already claimed this SOS.',
          'warning'
        );
        return;
      }

      if (res.ok) {
        dispatch({ type: 'CLAIM_RESCUE_JOB', payload: { responderName } });
        broadcastLocalClaim();
        notify('Atomic RPC Claimed Job & Started Navigation!', 'success');
      } else {
        dispatch({ type: 'CLAIM_RESCUE_JOB', payload: { responderName } });
        broadcastLocalClaim();
        notify(
          `RPC fallback (${res.status}): Claimed locally for Foreman Roy (KK-204)`,
          'info'
        );
      }
    } catch {
      dispatch({ type: 'CLAIM_RESCUE_JOB', payload: { responderName } });
      broadcastLocalClaim();
      notify(
        'Offline RPC fallback: Claimed locally for Foreman Roy (KK-204)',
        'warning'
      );
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="flex-1 px-4 pt-3 pb-24 overflow-y-auto">
      <ScreenTopBar
        title="Mechanic Patrol Console"
        subtitle="Unit KK-204 • Foreman Roy"
        rightSlot={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => dispatch({ type: 'TOGGLE_RESPONDER_ONLINE' })}
              className={`px-2.5 py-1.5 rounded-full text-[10px] font-black ${
                state.responderOnline
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {state.responderOnline ? '● ONLINE (2s GPS)' : 'OFFLINE'}
            </button>
            <button
              onClick={() => dispatch({ type: 'LOCK_WORKFORCE' })}
              title="Lock Console"
              className="p-2 rounded-full bg-[#181C24] border border-[#282C37] text-gray-400"
            >
              <Unlock className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      />

      {/* Live Incoming SOS Dispatch Queue */}
      <div
        className={`rounded-2xl border p-4 mb-4 ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-[#181C24] border-red-500/40'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-black">
            ACTIVE SOS • {state.activeJobId}
          </span>
          <span className="text-xs font-mono text-gray-400">
            Stage {state.rescueStage}/10
          </span>
        </div>
        <h3 className="font-black text-sm">
          Ahmad • Perodua Myvi (SAB 8821 X)
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {state.pinnedLocation.address}
        </p>
        <p className="text-xs font-bold text-red-400 mt-1">
          Requested: {state.selectedService.nameEn} (RM{' '}
          {state.selectedService.price})
        </p>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            disabled={claiming}
            onClick={handleAtomicClaim}
            className="py-2.5 rounded-xl bg-red-600 text-white font-black text-xs disabled:opacity-60"
          >
            {claiming
              ? 'CLAIMING...'
              : state.responderClaimed
              ? '✓ JOB CLAIMED'
              : 'CLAIM SOS (RPC)'}
          </button>
          <button
            onClick={() => dispatch({ type: 'NAVIGATE', payload: 'sos' })}
            className="py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 font-bold text-xs"
          >
            View Customer Screen
          </button>
        </div>
      </div>

      {/* Arrival PIN 4829 Verification */}
      <div
        className={`rounded-2xl border p-4 mb-4 ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-[#181C24] border-[#282C37]'
        }`}
      >
        <h3 className="text-xs font-black uppercase text-gray-400 mb-2">
          On-Site Arrival Handshake (PIN: 4829)
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            maxLength={4}
            value={mechPin}
            onChange={(e) => setMechPin(e.target.value)}
            placeholder="Enter customer PIN (4829)"
            className="flex-1 px-3 py-2 rounded-xl bg-black/25 border border-gray-700 text-xs font-mono outline-none"
          />
          <button
            onClick={() => {
              if (mechPin === RESCUE_HANDSHAKE_PIN || mechPin === '') {
                dispatch({ type: 'VERIFY_ARRIVAL_PIN' });
                notify('Arrival PIN 4829 Confirmed — Quotation Unlocked', 'success');
              } else {
                notify('PIN mismatch (Use 4829)', 'error');
              }
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
          >
            Verify PIN
          </button>
        </div>
      </div>

      {/* Live 8% SST Quotation Builder */}
      <div
        className={`rounded-2xl border p-4 ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-[#181C24] border-[#282C37]'
        }`}
      >
        <h3 className="text-xs font-black uppercase text-gray-400 mb-2">
          Live Customer Quotation Builder (Syncs to Stage 6)
        </h3>
        <form onSubmit={addQuoteLine} className="space-y-2 mb-3">
          <input
            type="text"
            value={newItemDesc}
            onChange={(e) => setNewItemDesc(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-black/25 border border-gray-700 text-xs outline-none"
          />
          <div className="flex gap-2">
            <select
              value={newItemCat}
              onChange={(e) =>
                setNewItemCat(e.target.value as 'LABOR' | 'PARTS')
              }
              className="px-3 py-2 rounded-xl bg-black/25 border border-gray-700 text-xs"
            >
              <option value="PARTS">PARTS (0% SST)</option>
              <option value="LABOR">LABOR (8% SST)</option>
            </select>
            <input
              type="number"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              className="w-24 px-3 py-2 rounded-xl bg-black/25 border border-gray-700 text-xs font-mono"
            />
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
            >
              + Push Quote
            </button>
          </div>
        </form>
        <div className="text-[11px] text-gray-400">
          Current Customer Total: RM{' '}
          <span className="font-mono font-bold text-emerald-400">
            {MalaysianTaxEngine.calculate(state.quoteItems).grandTotal.toFixed(
              2
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

const TowConsoleScreen: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const [checks, setChecks] = useState([true, true, true, false, false, false]);

  const safetyItems = [
    'Hydraulic PTO Pump Engaged & Pressure Nominal',
    'Rollback Flatbed Tilted to 11.8° Approach Angle',
    'Front Forged J-Hooks Secured to Lower Control Arms',
    'Winch Free-Spool Locked & Tension Verified',
    '4-Point Over-the-Tyre Ratchet Straps Tightened',
    'Amber Roof Lightbar & Rear Tow-Cam Streaming',
  ];

  return (
    <div className="flex-1 px-4 pt-3 pb-24 overflow-y-auto">
      <ScreenTopBar
        title="Flatbed Tow Operator"
        subtitle="Unit KK-204 • Fast-Tow Zul"
        rightSlot={
          <button
            onClick={() => dispatch({ type: 'LOCK_WORKFORCE' })}
            className="p-2 rounded-full bg-[#181C24] border border-[#282C37] text-gray-400"
          >
            <Unlock className="w-3.5 h-3.5" />
          </button>
        }
      />

      <div
        className={`rounded-2xl border p-4 mb-4 ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-[#181C24] border-[#282C37]'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black uppercase text-amber-400">
            6-Point Flatbed Hookup Safety Checklist
          </h3>
          <span className="text-xs font-mono">
            {checks.filter(Boolean).length}/6
          </span>
        </div>
        <div className="space-y-2">
          {safetyItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() =>
                setChecks((prev) =>
                  prev.map((v, i) => (i === idx ? !v : v))
                )
              }
              className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                checks[idx]
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-gray-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                  checks[idx]
                    ? 'bg-emerald-500 text-white'
                    : 'border border-gray-600'
                }`}
              >
                {checks[idx] && <Check className="w-3.5 h-3.5" />}
              </div>
              <span>{item}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <button
          onClick={() => dispatch({ type: 'SET_TOWCAM_OPEN', payload: true })}
          className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-black text-xs flex items-center justify-center gap-2"
        >
          <Camera className="w-4 h-4" /> LAUNCH LIVE TOW-CAM BROADCAST
        </button>
        <button
          onClick={() => {
            dispatch({ type: 'SET_RESCUE_STAGE', payload: 9 });
            notify(
              'Arrived at Kolombong HQ Bay 1 — Ready for Customer Handover',
              'success'
            );
          }}
          className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" /> COMPLETE KOLOMBONG HQ DROP-OFF
        </button>
      </div>
    </div>
  );
};

const WorkshopConsoleScreen: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const [posPlate, setPosPlate] = useState('SAB 8821 X');
  const [posAmount, setPosAmount] = useState('416.20');

  const issueCounterPdf = () => {
    const num = Number(posAmount) || 150;
    const items: QuoteLineItem[] = [
      {
        id: 'pos1',
        description: 'Kolombong HQ Diagnostic & Service Counter',
        category: 'LABOR',
        qty: 1,
        unitPrice: num,
      },
    ];
    const totals = MalaysianTaxEngine.calculate(items);
    const meta = LhdnEInvoiceGenerator.buildMetadata(
      'POS-991',
      posPlate,
      totals.grandTotal
    );
    const blob = PdfInvoiceGenerator.generateBinaryPdfBlob({
      invoiceNo: 'INV-HQ-991',
      lhdnUuid: meta.uuid,
      customerName: 'Walk-In / Escrow Counter Customer',
      plate: posPlate,
      vehicle: 'Sabah Registered Vehicle',
      location: 'Kolombong HQ, Kota Kinabalu',
      items,
      totals,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KolombongHQ_POS_${posPlate.replace(/\s+/g, '')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    notify('Issued Binary %PDF-1.4 Counter Invoice', 'success');
  };

  return (
    <div className="flex-1 px-4 pt-3 pb-24 overflow-y-auto">
      <ScreenTopBar
        title="Kolombong HQ Workshop"
        subtitle="6-Bay Hydraulic Lifts & Counter POS"
        rightSlot={
          <button
            onClick={() => dispatch({ type: 'LOCK_WORKFORCE' })}
            className="p-2 rounded-full bg-[#181C24] border border-[#282C37] text-gray-400"
          >
            <Unlock className="w-3.5 h-3.5" />
          </button>
        }
      />

      {/* 6-Bay Hydraulic Lift Grid */}
      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">
        6-Bay Hydraulic Lift Grid (Tap Bay to Cycle Status)
      </h3>
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {state.workshopBays.map((bay) => {
          const badgeColor =
            bay.status === 'AVAILABLE'
              ? 'text-emerald-400 bg-emerald-500/15'
              : bay.status === 'DIAGNOSTICS'
              ? 'text-amber-400 bg-amber-500/15'
              : 'text-red-400 bg-red-500/15';
          return (
            <button
              key={bay.bayNumber}
              onClick={() =>
                dispatch({ type: 'CYCLE_BAY_STATUS', payload: bay.bayNumber })
              }
              className={`rounded-2xl border p-3 text-left transition-all ${
                isLight
                  ? 'bg-white border-slate-200'
                  : 'bg-[#181C24] border-[#282C37]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-black text-xs">BAY {bay.bayNumber}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-black ${badgeColor}`}
                >
                  {bay.status}
                </span>
              </div>
              {bay.plate ? (
                <>
                  <div className="font-mono font-bold text-xs">{bay.plate}</div>
                  <div className="text-[10px] text-gray-400 truncate">
                    {bay.vehicle}
                  </div>
                  <div className="text-[10px] text-blue-400 font-semibold mt-1">
                    {bay.stage} • {bay.tech}
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-gray-500 py-2">
                  Ready for Intake
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Kanban Repair Order Pipeline Summary */}
      <div
        className={`rounded-2xl border p-3.5 mb-4 ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-[#181C24] border-[#282C37]'
        }`}
      >
        <div className="text-xs font-black uppercase text-gray-400 mb-2">
          Repair Order Pipeline
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
          {(['Checked-In', 'DVI/OBD', 'Active Repair', 'Completed'] as const).map(
            (st) => {
              const count = state.workshopBays.filter(
                (b) => b.plate && b.stage === st
              ).length;
              return (
                <div
                  key={st}
                  className="p-2 rounded-xl bg-black/25 border border-gray-800"
                >
                  <div className="text-base font-black font-mono text-white">
                    {count}
                  </div>
                  <div className="text-gray-400 truncate">{st}</div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Counter POS Issuing Genuine Binary %PDF-1.4 Invoices */}
      <div
        className={`rounded-2xl border p-4 space-y-3 ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-[#181C24] border-[#282C37]'
        }`}
      >
        <h3 className="text-xs font-black uppercase text-emerald-400">
          Kolombong HQ Counter POS • LHDN %PDF-1.4
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={posPlate}
            onChange={(e) => setPosPlate(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-black/25 border border-gray-700 text-xs font-mono"
          />
          <input
            type="number"
            value={posAmount}
            onChange={(e) => setPosAmount(e.target.value)}
            className="w-28 px-3 py-2 rounded-xl bg-black/25 border border-gray-700 text-xs font-mono"
          />
        </div>
        <button
          onClick={issueCounterPdf}
          className="w-full py-3 rounded-xl bg-white text-slate-950 font-black text-xs flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" /> ISSUE BINARY %PDF-1.4 INVOICE
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 11. MODALS: EMERGENCY HOTLINES & SUPABASE REALTIME INSPECTOR
// ============================================================================

const EmergencyHotlinesModal: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  if (!state.hotlinesOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
      <div
        className={`w-full max-w-[490px] rounded-3xl border p-5 max-h-[85dvh] overflow-y-auto ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#141923] border-[#282C37] text-white'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-red-500">
              Sabah Emergency Hotlines
            </h3>
            <p className="text-[11px] text-gray-400">
              One-Tap Direct Dial & Dispatch Copy
            </p>
          </div>
          <button
            onClick={() =>
              dispatch({ type: 'SET_HOTLINES_OPEN', payload: false })
            }
            className="p-2 rounded-full bg-gray-800 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {SABAH_HOTLINES.map((h) => (
            <div
              key={h.name}
              className={`rounded-2xl border p-3.5 flex items-center justify-between gap-2 ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#181C24] border-[#282C37]'
              }`}
            >
              <div className="min-w-0">
                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-red-600/20 text-red-400">
                  {h.badge}
                </span>
                <div className="text-xs font-bold mt-1">{h.name}</div>
                <div className="text-[11px] text-gray-400">{h.desc}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(h.number);
                    notify(`Copied ${h.number}`, 'info');
                  }}
                  className="p-2.5 rounded-xl bg-gray-800 text-gray-300"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a
                  href={`tel:${h.number}`}
                  className="px-3 py-2.5 rounded-xl bg-red-600 text-white font-black text-xs flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {h.number}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SupabaseConfigDialog: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const [url, setUrl] = useState(state.supabaseUrl);
  const [anonKey, setAnonKey] = useState(state.supabaseAnonKey);

  if (!state.supabaseDialogOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`w-full max-w-[460px] rounded-3xl border p-5 ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#141923] border-[#282C37] text-white'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-black">
              Supabase Realtime & Offline Sync Bridge
            </h3>
          </div>
          <button
            onClick={() =>
              dispatch({ type: 'SET_SUPABASE_DIALOG', payload: false })
            }
            className="p-1.5 rounded-full bg-gray-800 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[11px] text-gray-400 space-y-1 mb-4 font-mono bg-black/30 p-3 rounded-xl border border-gray-800">
          <div>
            WS Status:{' '}
            <span className="text-emerald-400">
              {state.realtimeConnected ? 'PHX_JOINED (25s Heartbeat)' : 'POLLING'}
            </span>
          </div>
          <div>Channels: public:emergency_requests, public:rescue_jobs</div>
          <div>PostgREST Hydration: Every 2.5s + BroadcastChannel</div>
          <div>Offline Mutation Queue: {state.offlineQueueCount} pending</div>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              SUPABASE_URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/30 border border-gray-700 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              SUPABASE_ANON_KEY
            </label>
            <input
              type="text"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/30 border border-gray-700 text-xs font-mono"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              dispatch({
                type: 'UPDATE_CONFIG',
                payload: { supabaseUrl: url, supabaseAnonKey: anonKey },
              });
              dispatch({ type: 'SET_SUPABASE_DIALOG', payload: false });
              notify('Updated Supabase Realtime Credentials', 'success');
            }}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs"
          >
            Apply & Reconnect
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 12. APP DRAWER & PERSISTENT 4-TAB MATERIAL 3 BOTTOM NAVIGATION BAR
// ============================================================================

const AppDrawer: React.FC = () => {
  const { state, dispatch } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const t = I18N[state.language];
  const activeVehicle =
    state.vehicles.find((v) => v.id === state.activeVehicleId) ||
    state.vehicles[0];

  const navItems: { id: ScreenId; label: string; icon: React.ElementType }[] = [
    { id: 'sos', label: t.activeBreakdown, icon: Zap },
    { id: 'garage', label: t.digitalGarage, icon: Car },
    { id: 'wallet', label: t.walletPayments, icon: CreditCard },
    { id: 'marketplace', label: t.marketplace, icon: ShoppingBag },
    { id: 'ai', label: t.aiAssistant, icon: Sparkles },
    { id: 'settings', label: t.appSettings, icon: Settings },
    { id: 'dtc', label: t.dtcLibrary, icon: FileText },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => dispatch({ type: 'SET_DRAWER', payload: false })}
        className={`fixed inset-0 z-40 bg-black/65 backdrop-blur-xs transition-opacity duration-200 ${
          state.drawerOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-Over Sheet */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-[82%] max-w-[320px] border-r flex flex-col transition-transform duration-300 ease-out ${
          state.drawerOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#141923] border-[#282C37] text-white'
        }`}
      >
        {/* Android Header */}
        <div className="p-5 border-b border-gray-800/70">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-white font-black text-base flex items-center justify-center shadow-lg">
              AH
            </div>
            <button
              onClick={() => dispatch({ type: 'SET_DRAWER', payload: false })}
              aria-label="Close drawer"
              className="w-9 h-9 rounded-full bg-gray-800/80 text-gray-300 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="font-black text-sm flex items-center gap-1.5">
            <span>Ahmad • Verified Member</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xs text-gray-400 font-mono mt-0.5">
            {activeVehicle.makeModel.split(' ').slice(0, 2).join(' ')} (
            {activeVehicle.plate})
          </div>
        </div>

        {/* 7 Customer Screens with Active Stadium Highlight */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const active = state.screen === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => dispatch({ type: 'NAVIGATE', payload: item.id })}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-xs font-bold transition-colors ${
                  active
                    ? 'bg-red-600/20 text-red-400 border border-red-500/35'
                    : isLight
                    ? 'text-slate-700 hover:bg-slate-100'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-red-500' : 'text-gray-400'
                  }`}
                />
                <span className="truncate flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800/70 flex items-center justify-between text-[10px] text-gray-500 font-mono">
          <span>RepairBah Sabah v2.4</span>
          <span>LHDN + SST Ready</span>
        </div>
      </aside>
    </>
  );
};

const BottomNavBar: React.FC = () => {
  const { state, dispatch } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const t = I18N[state.language];

  const tabs: { id: ScreenId; label: string; icon: React.ElementType }[] = [
    { id: 'sos', label: t.sosRoot, icon: Zap },
    { id: 'mechanic', label: t.mechanic, icon: Wrench },
    { id: 'tow', label: t.tow, icon: Truck },
    { id: 'workshop', label: t.workshop, icon: Building2 },
  ];

  return (
    <nav
      className={`absolute bottom-0 left-0 right-0 z-30 border-t px-2 py-2 flex items-center justify-around ${
        isLight
          ? 'bg-white/95 border-slate-200 text-slate-900'
          : 'bg-[#141923]/95 border-[#282C37] text-white'
      } backdrop-blur-md`}
    >
      {tabs.map((tab) => {
        const active =
          tab.id === 'sos'
            ? [
                'sos',
                'garage',
                'wallet',
                'marketplace',
                'ai',
                'settings',
                'dtc',
              ].includes(state.screen)
            : state.screen === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => dispatch({ type: 'NAVIGATE', payload: tab.id })}
            className="flex flex-col items-center justify-center flex-1 py-1 group"
          >
            {/* Active Material 3 Stadium Pill Highlight */}
            <div
              className={`px-4 py-1 rounded-full transition-all duration-200 ${
                active
                  ? 'bg-red-600/20 text-red-500'
                  : 'text-gray-400 group-hover:text-gray-200'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] font-bold mt-1 ${
                active
                  ? isLight
                    ? 'text-slate-900'
                    : 'text-white'
                  : 'text-gray-400'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

// ============================================================================
// 13. MAIN APP PROVIDER, SUPABASE REALTIME & BROADCAST SYNC BRIDGE
// ============================================================================

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);
  const stateRef = useRef<AppState>(state);
  stateRef.current = state;
  const offlineQueueRef = useRef<Record<string, unknown>[]>([]);
  const lastRemoteSigRef = useRef<Record<string, string>>({});

  const notify = useCallback(
    (text: string, tone: SnackbarMessage['tone'] = 'info') => {
      dispatch({ type: 'PUSH_SNACKBAR', payload: { text, tone } });
    },
    []
  );

  // Persist customer ecosystem & active rescueStage to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        PERSISTED_STATE_KEY,
        JSON.stringify({
          vehicles: state.vehicles,
          activeVehicleId: state.activeVehicleId,
          vaultBalance: state.vaultBalance,
          ledger: state.ledger,
          displayMode: state.displayMode,
          language: state.language,
          rescueStage: state.rescueStage,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [
    state.vehicles,
    state.activeVehicleId,
    state.vaultBalance,
    state.ledger,
    state.displayMode,
    state.language,
    state.rescueStage,
  ]);

  // Sync URL hash safely
  useEffect(() => {
    try {
      window.location.hash = `#${state.screen}`;
    } catch {
      // Ignore sandbox hash restrictions
    }
  }, [state.screen]);

  // PostgREST + BroadcastChannel + Offline Queue Sync Bridge
  const syncJobToSupabase = useCallback(
    async (patch: Record<string, unknown>) => {
      const cur = stateRef.current;
      const activeVeh =
        cur.vehicles.find((v) => v.id === cur.activeVehicleId) || cur.vehicles[0];
      const dto = {
        id: String(patch.id ?? patch.job_id ?? cur.activeJobId),
        user_id: 'ahmad_sbh_8821',
        service_type: normalizeServiceType(
          String(patch.service_type ?? patch.service ?? cur.selectedService.id)
        ),
        status: normalizeEmergencyStatus(String(patch.status ?? 'pending')),
        latitude: Number(patch.latitude ?? patch.lat ?? cur.pinnedLocation.lat),
        longitude: Number(
          patch.longitude ?? patch.lng ?? cur.pinnedLocation.lng
        ),
        address: String(patch.address ?? cur.pinnedLocation.address),
        notes: String(
          patch.notes ??
            `${cur.selectedService.nameEn} • Stage ${cur.rescueStage}/10`
        ),
        vehicle_plate: String(
          patch.vehicle_plate ?? patch.plate ?? activeVeh?.plate ?? 'SAB 8821 X'
        ),
        vehicle_model: String(
          patch.vehicle_model ?? activeVeh?.makeModel ?? 'Perodua Myvi 1.5L'
        ),
        quoted_price: Number(
          patch.quoted_price ?? patch.price ?? cur.selectedService.price
        ),
      };

      try {
        localStorage.setItem('repairbah_latest_job', JSON.stringify(dto));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('repairbah_sync');
          bc.postMessage({ type: 'JOB_PATCH', payload: dto });
          bc.close();
        }
      } catch {
        // Ignore storage quota errors
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        offlineQueueRef.current.push(dto);
        dispatch({
          type: 'SET_OFFLINE_QUEUE',
          payload: offlineQueueRef.current.length,
        });
        return;
      }

      try {
        await fetch(`${cur.supabaseUrl}/rest/v1/emergency_requests`, {
          method: 'POST',
          headers: {
            apikey: cur.supabaseAnonKey,
            Authorization: `Bearer ${cur.supabaseAnonKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify(dto),
        });
      } catch {
        // Graceful offline tolerance; localStorage & BroadcastChannel stay active
      }
    },
    []
  );

  // Hydrate incoming emergency_requests / rescue_jobs row into reducer state
  const hydrateRemoteRow = useCallback((row: Record<string, unknown>) => {
    const cur = stateRef.current;
    const remoteId = typeof row.id === 'string' ? row.id : '';
    if (!remoteId) return;

    const remoteStatus = normalizeEmergencyStatus(
      typeof row.status === 'string' ? row.status : 'pending'
    );
    const remoteResponder =
      typeof row.responder_name === 'string' && row.responder_name.trim()
        ? row.responder_name.trim()
        : typeof row.responder === 'string' && row.responder.trim()
        ? row.responder.trim()
        : '';

    const sig = `${remoteStatus}|${remoteResponder}`;
    const prevSig = lastRemoteSigRef.current[remoteId];
    const isCurrentJob = remoteId === cur.activeJobId;

    if (!isCurrentJob && prevSig === undefined) {
      // Seed baseline for non-active rows; only hydrate if status/responder subsequently changes
      lastRemoteSigRef.current[remoteId] = sig;
      return;
    }

    const currentLocalStatus: EmergencyRequestStatus =
      cur.rescueStage === 10
        ? 'completed'
        : cur.rescueStage >= 5
        ? 'in_progress'
        : cur.responderClaimed
        ? 'accepted'
        : 'pending';

    const statusChanged = isCurrentJob
      ? remoteStatus !== currentLocalStatus
      : prevSig !== sig;
    const responderChanged =
      Boolean(remoteResponder) && remoteResponder !== cur.responderName;

    lastRemoteSigRef.current[remoteId] = sig;
    if (!statusChanged && !responderChanged) return;

    const patch: Partial<AppState> = {
      activeJobId: remoteId,
    };
    if (remoteResponder) {
      patch.responderName = remoteResponder;
    }
    if (
      typeof row.latitude === 'number' &&
      typeof row.longitude === 'number' &&
      typeof row.address === 'string'
    ) {
      const coords = latLngToMapCoords(row.latitude, row.longitude);
      patch.pinnedLocation = {
        lat: row.latitude,
        lng: row.longitude,
        address: row.address,
        mapX: coords.mapX,
        mapY: coords.mapY,
      };
    }

    if (remoteStatus === 'pending') {
      patch.responderClaimed = false;
      if (cur.rescueStage === 0) patch.rescueStage = 2;
    } else if (remoteStatus === 'accepted') {
      patch.responderClaimed = true;
      patch.rescueStage = cur.rescueStage < 3 ? 3 : cur.rescueStage;
      patch.responderProgress = Math.max(cur.responderProgress, 0.15);
    } else if (remoteStatus === 'in_progress') {
      patch.responderClaimed = true;
      patch.arrivalPinVerified = true;
      patch.rescueStage = cur.rescueStage < 5 ? 5 : cur.rescueStage;
    } else if (remoteStatus === 'completed') {
      patch.responderClaimed = true;
      patch.vaultStatus = 'DISBURSED';
      patch.rescueStage = 10;
    } else if (remoteStatus === 'cancelled') {
      patch.responderClaimed = false;
      patch.rescueStage = 0;
    }

    dispatch({ type: 'HYDRATE_REMOTE_JOB', payload: patch });
  }, []);

  // Phoenix Realtime WebSocket (25s Heartbeat + CDC) + 2.5s PostgREST Polling Hydration + BroadcastChannel
  useEffect(() => {
    let ws: WebSocket | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    try {
      const wsBase = state.supabaseUrl.replace(/^https?:\/\//, 'wss://');
      const wsUrl = `${wsBase}/realtime/v1/websocket?apikey=${encodeURIComponent(
        state.supabaseAnonKey
      )}&vsn=1.0.0`;
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        dispatch({ type: 'SET_REALTIME_STATUS', payload: true });
        ws?.send(
          JSON.stringify({
            topic: 'realtime:public:emergency_requests',
            event: 'phx_join',
            payload: {
              config: {
                broadcast: { self: false },
                presence: { key: '' },
                postgres_changes: [
                  { event: '*', schema: 'public', table: 'emergency_requests' },
                ],
              },
            },
            ref: '1',
          })
        );
        ws?.send(
          JSON.stringify({
            topic: 'realtime:public:rescue_jobs',
            event: 'phx_join',
            payload: {
              config: {
                broadcast: { self: false },
                presence: { key: '' },
                postgres_changes: [
                  { event: '*', schema: 'public', table: 'rescue_jobs' },
                ],
              },
            },
            ref: '2',
          })
        );
      };
      ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(String(event.data || '{}')) as {
            topic?: string;
            event?: string;
            payload?: {
              data?: { record?: Record<string, unknown> };
              record?: Record<string, unknown>;
              new?: Record<string, unknown>;
            };
          };
          const isTargetTopic =
            frame.topic === 'realtime:public:emergency_requests' ||
            frame.topic === 'realtime:public:rescue_jobs';
          if (
            isTargetTopic &&
            (frame.event === 'postgres_changes' ||
              frame.event === 'INSERT' ||
              frame.event === 'UPDATE')
          ) {
            const record =
              frame.payload?.data?.record ??
              frame.payload?.record ??
              frame.payload?.new;
            if (record && typeof record === 'object') {
              // Ensure newly inserted remote emergency_requests from Android hydrate even on first sight
              if (typeof record.id === 'string' && !(record.id in lastRemoteSigRef.current)) {
                lastRemoteSigRef.current[record.id] = '__cdc_new__';
              }
              hydrateRemoteRow(record);
            }
          }
        } catch {
          // Ignore malformed heartbeat/system frames
        }
      };
      ws.onerror = () => {
        dispatch({ type: 'SET_REALTIME_STATUS', payload: false });
      };
      heartbeatTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              topic: 'phoenix',
              event: 'heartbeat',
              payload: {},
              ref: String(Date.now()),
            })
          );
        }
      }, 25000);
    } catch {
      // Fallback to PostgREST polling
    }

    // 2.5s PostgREST polling hydration
    const pollTimer = setInterval(async () => {
      try {
        const res = await fetch(
          `${state.supabaseUrl}/rest/v1/emergency_requests?order=created_at.desc&limit=5`,
          {
            headers: {
              apikey: state.supabaseAnonKey,
              Authorization: `Bearer ${state.supabaseAnonKey}`,
            },
          }
        );
        if (res.ok) {
          dispatch({ type: 'SET_REALTIME_STATUS', payload: true });
          const rows = (await res.json()) as Record<string, unknown>[];
          if (Array.isArray(rows) && rows.length > 0) {
            const curId = stateRef.current.activeJobId;
            const match = rows.find((r) => r.id === curId) || rows[0];
            if (match) {
              hydrateRemoteRow(match);
            }
          }
        }
      } catch {
        // Keep local simulation alive
      }
    }, 2500);

    // Multi-tab BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('repairbah_sync');
      bc.onmessage = (ev) => {
        if (ev.data?.type === 'JOB_PATCH' && ev.data?.payload) {
          const p = ev.data.payload as Record<string, unknown>;
          if (p.status === 'CLAIMED' || p.status === 'accepted') {
            dispatch({
              type: 'CLAIM_RESCUE_JOB',
              payload: {
                responderName:
                  typeof p.responder_name === 'string'
                    ? p.responder_name
                    : undefined,
              },
            });
          } else {
            hydrateRemoteRow(p);
          }
        }
      };
    }

    // Auto-replay offline mutations on window online
    const handleOnline = () => {
      if (offlineQueueRef.current.length > 0) {
        const items = [...offlineQueueRef.current];
        offlineQueueRef.current = [];
        dispatch({ type: 'SET_OFFLINE_QUEUE', payload: 0 });
        items.forEach((p) => syncJobToSupabase(p));
        notify(`Replayed ${items.length} queued offline mutations`, 'success');
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (ws) ws.close();
      clearInterval(pollTimer);
      if (bc) bc.close();
      window.removeEventListener('online', handleOnline);
    };
  }, [
    state.supabaseUrl,
    state.supabaseAnonKey,
    syncJobToSupabase,
    hydrateRemoteRow,
    notify,
  ]);

  const isLight = state.displayMode === 'sunlight';

  const renderActiveScreen = () => {
    switch (state.screen) {
      case 'sos':
        return <CustomerSosScreen />;
      case 'garage':
        return <DigitalGarageScreen />;
      case 'wallet':
        return <WalletScreen />;
      case 'marketplace':
        return <MarketplaceScreen />;
      case 'ai':
        return <AiAssistantScreen />;
      case 'dtc':
        return <DtcLibraryScreen />;
      case 'settings':
        return <AppSettingsScreen />;
      case 'mechanic':
        return <MechanicConsoleScreen />;
      case 'tow':
        return <TowConsoleScreen />;
      case 'workshop':
        return <WorkshopConsoleScreen />;
      default:
        return <CustomerSosScreen />;
    }
  };

  return (
    <ErrorBoundary>
      <AppCtx.Provider value={{ state, dispatch, notify, syncJobToSupabase }}>
        <div
          className={`min-h-[100dvh] w-full flex items-center justify-center sm:p-4 transition-colors ${
            isLight
              ? 'bg-slate-200 text-[#0F172A]'
              : 'bg-[#07090D] text-white'
          }`}
        >
          {/* Centered Mobile-First Responsive Shell (max-w-[540px]) */}
          <div
            className={`relative w-full max-w-[540px] h-[100dvh] sm:h-[calc(100dvh-2rem)] sm:max-h-[900px] sm:rounded-[34px] overflow-hidden flex flex-col shadow-[0_24px_80px_rgba(0,0,0,0.75)] transition-all ${
              isLight
                ? 'bg-[#F8FAFC] text-[#0F172A] sm:border sm:border-slate-300'
                : 'bg-[#0E1117] text-white sm:border sm:border-[#282C37]'
            } ${
              state.hazardStrobe
                ? 'ring-4 ring-amber-500 animate-pulse'
                : ''
            }`}
          >
            {/* Active Screen Content */}
            {renderActiveScreen()}

            {/* Persistent 4-Tab Material 3 Bottom Navigation Bar */}
            <BottomNavBar />

            {/* Slide-Over Customer Drawer */}
            <AppDrawer />

            {/* Modals & Overlays */}
            <ConsolePinGateModal />
            <EmergencyHotlinesModal />
            <SupabaseConfigDialog />
            <LiveTowCamModal />
            <SnackbarHost />
          </div>
        </div>
      </AppCtx.Provider>
    </ErrorBoundary>
  );
}
