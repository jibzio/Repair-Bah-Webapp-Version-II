import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  AppDrawer,
  BottomNavBar,
  EmergencyHotlinesModal,
  SnackbarHost,
  SupabaseConfigDialog,
} from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LiveTowCamModal } from './components/modals/LiveTowCamModal';
import { PERSISTED_STATE_KEY } from './constants/sabahData';
import { AppCtx } from './context/AppContext';
import { latLngToMapCoords } from './engines/domainEngines';
import {
  AiAssistantScreen,
  AppSettingsScreen,
  DigitalGarageScreen,
  DtcLibraryScreen,
  MarketplaceScreen,
  WalletScreen,
} from './screens/CustomerScreens';
import { CustomerSosScreen } from './screens/CustomerSosScreen';
import {
  ConsolePinGateModal,
  MechanicConsoleScreen,
  TowConsoleScreen,
  WorkshopConsoleScreen,
} from './screens/WorkforceConsoles';
import { realtimeBus } from './services/realtimeBus';
import { appReducer, getInitialState } from './state/appReducer';
import {
  AppState,
  EmergencyRequestDto,
  EmergencyRequestStatus,
  normalizeEmergencyStatus,
  normalizeServiceType,
  SnackbarMessage,
} from './types/repairbah';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);
  const stateRef = useRef<AppState>(state);
  stateRef.current = state;
  const offlineQueueRef = useRef<EmergencyRequestDto[]>([]);
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
      const stageToPersist =
        state.rescueStage > 0
          ? state.rescueStage
          : state.resumableStage ?? 0;
      localStorage.setItem(
        PERSISTED_STATE_KEY,
        JSON.stringify({
          activeJobId: state.activeJobId,
          vehicles: state.vehicles,
          activeVehicleId: state.activeVehicleId,
          vaultBalance: state.vaultBalance,
          ledger: state.ledger,
          displayMode: state.displayMode,
          language: state.language,
          rescueStage: stageToPersist,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [
    state.activeJobId,
    state.vehicles,
    state.activeVehicleId,
    state.vaultBalance,
    state.ledger,
    state.displayMode,
    state.language,
    state.rescueStage,
    state.resumableStage,
  ]);

  // Sync URL hash safely
  useEffect(() => {
    try {
      window.location.hash = `#${state.screen}`;
    } catch {
      // Ignore sandbox hash restrictions
    }
  }, [state.screen]);

  // PostgREST + Unified RealtimeBus BroadcastChannel + Offline Queue Sync Bridge
  const syncJobToSupabase = useCallback(
    async (patch: Record<string, unknown>) => {
      const cur = stateRef.current;
      const activeVeh =
        cur.vehicles.find((v) => v.id === cur.activeVehicleId) || cur.vehicles[0];
      const dto: EmergencyRequestDto = {
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
      } catch {
        // Ignore storage quota errors
      }
      realtimeBus.publishJobPatch(dto);

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

  // Unified RealtimeBus (Single WS + Heartbeat + CDC + BroadcastChannel) + 2.5s PostgREST Poll
  useEffect(() => {
    const disconnectBus = realtimeBus.connect(
      state.supabaseUrl,
      state.supabaseAnonKey
    );

    const unsubConn = realtimeBus.onConnectionChange((connected) => {
      dispatch({ type: 'SET_REALTIME_STATUS', payload: connected });
    });

    const unsubCdc = realtimeBus.onCdcRecord((record) => {
      if (typeof record.id === 'string' && !(record.id in lastRemoteSigRef.current)) {
        lastRemoteSigRef.current[record.id] = '__cdc_new__';
      }
      hydrateRemoteRow(record);
    });

    const unsubPatch = realtimeBus.onJobPatch((p) => {
      if (p.status === 'CLAIMED' || p.status === 'accepted') {
        dispatch({
          type: 'CLAIM_RESCUE_JOB',
          payload: {
            responderName:
              typeof p.responder_name === 'string' ? p.responder_name : undefined,
          },
        });
      } else {
        hydrateRemoteRow(p);
      }
    });

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

    // Auto-replay offline mutations on window online
    const handleOnline = () => {
      if (offlineQueueRef.current.length > 0) {
        const items = [...offlineQueueRef.current];
        offlineQueueRef.current = [];
        dispatch({ type: 'SET_OFFLINE_QUEUE', payload: 0 });
        items.forEach((p) => syncJobToSupabase(p as unknown as Record<string, unknown>));
        notify(`Replayed ${items.length} queued offline mutations`, 'success');
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      unsubConn();
      unsubCdc();
      unsubPatch();
      disconnectBus();
      clearInterval(pollTimer);
      window.removeEventListener('online', handleOnline);
    };
  }, [
    state.supabaseUrl,
    state.supabaseAnonKey,
    syncJobToSupabase,
    hydrateRemoteRow,
    notify,
  ]);

  // Subscribe to realtime:job_tracking:<jobId> POS_UPDATE telemetry during active rescue
  useEffect(() => {
    const trackingActive =
      (state.rescueStage >= 2 && state.rescueStage <= 9) ||
      state.responderClaimed;
    if (!trackingActive || !state.activeJobId) return;

    const jobId = state.activeJobId;
    realtimeBus.joinJobTrackingChannel(jobId);

    const unsubPos = realtimeBus.onPosUpdate((pos) => {
      if (pos.jobId && pos.jobId !== stateRef.current.activeJobId) return;
      dispatch({
        type: 'SET_RESPONDER_POS',
        payload: {
          progress: Math.max(0, Math.min(1, pos.progress)),
          lat: pos.lat,
          lng: pos.lng,
        },
      });
    });

    return () => {
      unsubPos();
      realtimeBus.leaveJobTrackingChannel(jobId);
    };
  }, [state.activeJobId, state.rescueStage, state.responderClaimed]);

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
    <ErrorBoundary fallbackTitle="RepairBah Sabah SOS Recovery Shield">
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
            <ErrorBoundary
              compact
              fallbackTitle="Live Tow-Cam Recovery Shield"
              onRecover={() =>
                dispatch({ type: 'SET_TOWCAM_OPEN', payload: false })
              }
            >
              <LiveTowCamModal />
            </ErrorBoundary>
            <SnackbarHost />
          </div>
        </div>
      </AppCtx.Provider>
    </ErrorBoundary>
  );
}
