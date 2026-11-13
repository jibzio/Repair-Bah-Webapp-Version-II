import { getRuntimeConfig, saveRuntimeConfigOverride } from '../config/env';
import {
  INITIAL_VEHICLES,
  MARKETPLACE_PARTS,
  PERSISTED_STATE_KEY,
  SERVICES,
  SESSION_TTL_MS,
} from '../constants/sabahData';
import {
  AppAction,
  AppState,
  DisplayMode,
  formatTicketCode,
  generateUuid,
  isValidUuid,
  Language,
  LedgerEntry,
  RescueStage,
} from '../types/repairbah';

export function buildInitialState(): AppState {
  const runtimeCfg = getRuntimeConfig();

  return {
    screen: 'sos',
    drawerOpen: false,
    displayMode: 'obsidian',
    language: 'EN',
    hazardStrobe: false,

    rescueStage: 0,
    activeJobId: generateUuid(),
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
        description: 'Mechanic Dispatch & Diagnostic',
        category: 'LABOR',
        qty: 1,
        unitPrice: 85,
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
      {
        id: 'hc4',
        corner: 'Right Flank & Side Mirror Assembly',
        verified: false,
      },
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

    supabaseUrl: runtimeCfg.supabaseUrl,
    supabaseAnonKey: runtimeCfg.supabaseAnonKey,
    geminiApiKey: runtimeCfg.geminiApiKey,
    realtimeConnected: true,
    offlineQueueCount: 0,
    hotlinesOpen: false,
    supabaseDialogOpen: false,
    towCamOpen: false,
    snackbars: [],
  };
}

export function getInitialState(): AppState {
  const baseState = buildInitialState();
  try {
    const raw =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(PERSISTED_STATE_KEY)
        : null;
    if (!raw) return baseState;
    const saved = JSON.parse(raw) as Partial<AppState>;
    const validStage =
      typeof saved.rescueStage === 'number' &&
      saved.rescueStage >= 0 &&
      saved.rescueStage <= 10
        ? (saved.rescueStage as RescueStage)
        : baseState.rescueStage;
    const validVehicles =
      Array.isArray(saved.vehicles) && saved.vehicles.length > 0
        ? saved.vehicles
        : baseState.vehicles;
    const validActiveVehicleId =
      typeof saved.activeVehicleId === 'string' &&
      validVehicles.some((v) => v.id === saved.activeVehicleId)
        ? saved.activeVehicleId
        : validVehicles[0].id;
    const validBalance =
      typeof saved.vaultBalance === 'number' && !Number.isNaN(saved.vaultBalance)
        ? saved.vaultBalance
        : baseState.vaultBalance;
    const validLedger = Array.isArray(saved.ledger)
      ? saved.ledger
      : baseState.ledger;
    const validDisplayMode: DisplayMode =
      saved.displayMode === 'sunlight' || saved.displayMode === 'obsidian'
        ? saved.displayMode
        : baseState.displayMode;
    const validLanguage: Language =
      saved.language === 'BM' || saved.language === 'EN'
        ? saved.language
        : baseState.language;

    const validActiveJobId = isValidUuid(saved.activeJobId)
      ? saved.activeJobId
      : generateUuid();

    return {
      ...baseState,
      activeJobId: validActiveJobId,
      vehicles: validVehicles,
      activeVehicleId: validActiveVehicleId,
      vaultBalance: validBalance,
      ledger: validLedger,
      displayMode: validDisplayMode,
      language: validLanguage,
      rescueStage: validStage,
      responderClaimed: validStage >= 3 ? true : baseState.responderClaimed,
      arrivalPinVerified: validStage >= 5 ? true : baseState.arrivalPinVerified,
      vaultStatus:
        validStage === 10
          ? 'DISBURSED'
          : validStage >= 7
          ? 'RESERVED'
          : baseState.vaultStatus,
    };
  } catch {
    return baseState;
  }
}

export function appReducer(state: AppState, action: AppAction): AppState {
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
        title: `Protected Escrow Hold (${formatTicketCode(state.activeJobId)})`,
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
        title: `Escrow Disbursed to Kolombong HQ (${formatTicketCode(
          state.activeJobId
        )})`,
        timestamp: 'Just now',
        amount: -action.payload.amount,
        type: 'DEBIT',
        ref: `LHDN-${formatTicketCode(state.activeJobId)}`,
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
        activeJobId: generateUuid(),
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
    case 'UPDATE_CONFIG': {
      saveRuntimeConfigOverride({
        supabaseUrl: action.payload.supabaseUrl,
        supabaseAnonKey: action.payload.supabaseAnonKey,
        geminiApiKey: action.payload.geminiApiKey,
      });
      return {
        ...state,
        supabaseUrl: action.payload.supabaseUrl,
        supabaseAnonKey: action.payload.supabaseAnonKey,
        geminiApiKey:
          action.payload.geminiApiKey !== undefined
            ? action.payload.geminiApiKey
            : state.geminiApiKey,
      };
    }
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
