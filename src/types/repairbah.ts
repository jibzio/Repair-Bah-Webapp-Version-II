export type DisplayMode = 'obsidian' | 'sunlight';
export type Language = 'EN' | 'BM';
export type ScreenId =
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

export type RescueStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type VaultStatus = 'IDLE' | 'RESERVED' | 'DISBURSED';

export interface ServiceOption {
  id: string;
  code: string;
  nameEn: string;
  nameBm: string;
  price: number;
  etaMin: number;
  unitType: 'PATROL' | 'TOW' | 'MOBILE';
}

export interface QuoteLineItem {
  id: string;
  description: string;
  category: 'LABOR' | 'PARTS';
  qty: number;
  unitPrice: number;
}

export interface SabahLandmark {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  mapX: number; // 0..1000 normalized Sabah map coordinates
  mapY: number;
}

export interface VehicleProfile {
  id: string;
  makeModel: string;
  variant: string;
  plate: string;
  vin: string;
  year: number;
  jpjVerified: boolean;
  roadtaxExpiry: string;
}

export interface MarketplacePart {
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

export interface CartItem {
  part: MarketplacePart;
  qty: number;
}

export interface LedgerEntry {
  id: string;
  title: string;
  timestamp: string;
  amount: number;
  type: 'CREDIT' | 'RESERVE' | 'DEBIT';
  ref: string;
}

export interface WorkshopBay {
  bayNumber: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'DIAGNOSTICS';
  plate: string | null;
  vehicle: string | null;
  tech: string | null;
  stage: 'Checked-In' | 'DVI/OBD' | 'Active Repair' | 'Completed';
}

export interface SnackbarMessage {
  id: string;
  text: string;
  tone: 'info' | 'success' | 'warning' | 'error';
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendedServiceId?: string;
  likelyCause?: string;
}

export type EmergencyServiceType =
  | 'battery'
  | 'towing'
  | 'tyre'
  | 'callout'
  | 'diagnostic';

export type EmergencyRequestStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface EmergencyRequestDto {
  id: string;
  user_id: string;
  service_type: EmergencyServiceType;
  status: EmergencyRequestStatus;
  latitude: number;
  longitude: number;
  address: string;
  notes: string;
  vehicle_plate: string;
  vehicle_model: string;
  quoted_price: number;
}

export type LocationSource = 'gps' | 'manual' | 'landmark' | 'search';

export interface PinnedLocation {
  lat: number;
  lng: number;
  address: string;
  mapX: number;
  mapY: number;
  accuracyMeters?: number;
  source?: LocationSource;
}

export interface AppState {
  screen: ScreenId;
  drawerOpen: boolean;
  displayMode: DisplayMode;
  language: Language;
  hazardStrobe: boolean;

  // Rescue 10-Stage FSM
  rescueStage: RescueStage;
  resumableStage: RescueStage | null;
  activeJobId: string;
  selectedService: ServiceOption;
  pinnedLocation: PinnedLocation;
  responderClaimed: boolean;
  responderOnline: boolean;
  responderName: string;
  responderUnit: string;
  responderProgress: number; // 0..1 interpolated position
  responderLocation: { lat: number; lng: number } | null;
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

export type AppAction =
  | { type: 'NAVIGATE'; payload: ScreenId }
  | { type: 'SET_DRAWER'; payload: boolean }
  | { type: 'TOGGLE_DISPLAY_MODE' }
  | { type: 'TOGGLE_LANGUAGE' }
  | { type: 'TOGGLE_HAZARD' }
  | { type: 'SET_RESCUE_STAGE'; payload: RescueStage }
  | { type: 'RESUME_SAVED_RESCUE' }
  | { type: 'DISMISS_RESUMABLE_RESCUE' }
  | { type: 'SELECT_SERVICE'; payload: ServiceOption }
  | {
      type: 'UPDATE_PIN_LOCATION';
      payload: PinnedLocation;
    }
  | { type: 'CLAIM_RESCUE_JOB'; payload?: { responderName?: string } }
  | { type: 'TOGGLE_RESPONDER_ONLINE' }
  | { type: 'SET_RESPONDER_PROGRESS'; payload: number }
  | {
      type: 'SET_RESPONDER_POS';
      payload: { progress: number; lat: number; lng: number };
    }
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
  | {
      type: 'UPDATE_CONFIG';
      payload: {
        supabaseUrl: string;
        supabaseAnonKey: string;
        geminiApiKey?: string;
      };
    }
  | { type: 'SET_REALTIME_STATUS'; payload: boolean }
  | { type: 'SET_OFFLINE_QUEUE'; payload: number }
  | { type: 'SET_HOTLINES_OPEN'; payload: boolean }
  | { type: 'SET_SUPABASE_DIALOG'; payload: boolean }
  | { type: 'SET_TOWCAM_OPEN'; payload: boolean }
  | { type: 'PUSH_SNACKBAR'; payload: Omit<SnackbarMessage, 'id'> }
  | { type: 'DISMISS_SNACKBAR'; payload: string }
  | { type: 'HYDRATE_REMOTE_JOB'; payload: Partial<AppState> };

export function normalizeServiceType(raw?: string): EmergencyServiceType {
  const key = (raw || '').toLowerCase().trim();
  if (
    key === 'patrol_tow' ||
    key === 'tow_truck' ||
    key === 'towing' ||
    key.includes('tow')
  ) {
    return 'towing';
  }
  return 'callout';
}

export function normalizeEmergencyStatus(raw?: string): EmergencyRequestStatus {
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

const ANY_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function generateUuid(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isValidUuid(val: unknown): val is string {
  return typeof val === 'string' && ANY_UUID_REGEX.test(val.trim());
}

export function formatTicketCode(id: string): string {
  return `RB-${id.slice(0, 4).toUpperCase()}`;
}
