import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crosshair,
  Download,
  ExternalLink,
  Loader2,
  Lock,
  MapPin,
  Menu,
  MessageSquare,
  Navigation,
  Phone,
  Radio,
  ShieldCheck,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AppMapView } from '../components/map/AppMapView';
import {
  ARRIVAL_GEOFENCE_METERS,
  I18N,
  KOLOMBONG_HQ_LAT,
  KOLOMBONG_HQ_LNG,
  RESCUE_HANDSHAKE_PIN,
  SABAH_LANDMARKS,
  SERVICES,
} from '../constants/sabahData';
import { useApp } from '../context/AppContext';
import {
  haversineDistanceMeters,
  latLngToMapCoords,
  LhdnEInvoiceGenerator,
  MalaysianTaxEngine,
  mapCoordsToLatLng,
  PdfInvoiceGenerator,
  SmsFallbackEncoder,
} from '../engines/domainEngines';
import {
  acquireDeviceGpsLocation,
  findNearestSabahLandmark,
  reverseGeocodeSabah,
} from '../services/locationService';
import {
  formatTicketCode,
  Language,
  normalizeServiceType,
  RescueStage,
  SabahLandmark,
} from '../types/repairbah';

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
        <div className="absolute inset-0 rounded-full bg-red-600/10 border border-red-500/20 animate-ping [animation-duration:3s]" />
        <div className="absolute inset-3 rounded-full bg-red-950/40 border border-red-500/30" />
        <div className="absolute inset-6 rounded-full bg-red-950/60 border border-red-500/40" />

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

export const CustomerSosScreen: React.FC = () => {
  const { state, dispatch, notify, syncJobToSupabase } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const t = I18N[state.language];
  const activeVehicle =
    state.vehicles.find((v) => v.id === state.activeVehicleId) ||
    state.vehicles[0];

  const [mapZoom, setMapZoom] = useState(1.35);
  const [flyTrigger, setFlyTrigger] = useState(0);
  const [addressQuery, setAddressQuery] = useState(
    state.pinnedLocation.address
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nominatimResults, setNominatimResults] = useState<
    { label: string; lat: number; lng: number }[]
  >([]);
  const [enteredPin, setEnteredPin] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const geoRequestIdRef = useRef(0);
  const geoAbortRef = useRef<AbortController | null>(null);
  const autoGpsAttemptedRef = useRef(false);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingSig = useRef(false);

  const handleGpsLocate = useCallback(
    async (options?: { silent?: boolean }) => {
      const requestId = ++geoRequestIdRef.current;
      geoAbortRef.current?.abort();
      const abortController = new AbortController();
      geoAbortRef.current = abortController;

      setIsLocating(true);
      try {
        const { lat, lng, accuracyMeters } = await acquireDeviceGpsLocation();
        if (requestId !== geoRequestIdRef.current) return;

        const coords = latLngToMapCoords(lat, lng);
        const initialAddress = `Pinned: ${lat.toFixed(4)}, ${lng.toFixed(
          4
        )} (Locating street...)`;

        setAddressQuery(initialAddress);
        setShowSuggestions(false);
        setMapZoom(1.65);
        setFlyTrigger((c) => c + 1);
        dispatch({
          type: 'UPDATE_PIN_LOCATION',
          payload: {
            lat: Number(lat.toFixed(5)),
            lng: Number(lng.toFixed(5)),
            address: initialAddress,
            mapX: coords.mapX,
            mapY: coords.mapY,
            accuracyMeters,
            source: 'gps',
          },
        });

        const resolvedAddress = await reverseGeocodeSabah(
          lat,
          lng,
          abortController.signal
        );
        if (requestId !== geoRequestIdRef.current) return;

        setAddressQuery(resolvedAddress);
        dispatch({
          type: 'UPDATE_PIN_LOCATION',
          payload: {
            lat: Number(lat.toFixed(5)),
            lng: Number(lng.toFixed(5)),
            address: resolvedAddress,
            mapX: coords.mapX,
            mapY: coords.mapY,
            accuracyMeters,
            source: 'gps',
          },
        });

        if (!options?.silent) {
          notify(
            `GPS Locked (±${accuracyMeters}m): ${resolvedAddress}`,
            'success'
          );
        }
      } catch (err) {
        if (requestId !== geoRequestIdRef.current) return;
        if (!options?.silent) {
          const message =
            err instanceof Error
              ? err.message
              : 'Unable to acquire GPS fix. Drag the map pin instead.';
          notify(message, 'warning');
        }
      } finally {
        if (requestId === geoRequestIdRef.current) {
          setIsLocating(false);
        }
      }
    },
    [dispatch, notify]
  );

  useEffect(() => {
    return () => {
      geoAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (state.rescueStage === 0) {
      autoGpsAttemptedRef.current = false;
      return;
    }
    if (state.rescueStage === 1) {
      setFlyTrigger((c) => c + 1);
      setAddressQuery(state.pinnedLocation.address);
      if (!autoGpsAttemptedRef.current) {
        autoGpsAttemptedRef.current = true;
        if (
          typeof navigator !== 'undefined' &&
          'permissions' in navigator &&
          typeof navigator.permissions?.query === 'function'
        ) {
          navigator.permissions
            .query({ name: 'geolocation' as PermissionName })
            .then((perm) => {
              if (perm.state === 'granted') {
                void handleGpsLocate({ silent: true });
              }
            })
            .catch(() => {
              // Permissions API unsupported in this browser
            });
        }
      }
    }
  }, [state.rescueStage, handleGpsLocate]);

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
  }, [
    state.rescueStage,
    state.dispatchWarning,
    state.responderProgress,
    dispatch,
  ]);

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
            data.map(
              (d: { display_name: string; lat: string; lon: string }) => ({
                label: d.display_name.split(',').slice(0, 2).join(', '),
                lat: Number(Number(d.lat).toFixed(4)),
                lng: Number(Number(d.lon).toFixed(4)),
              })
            )
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

  const handleMapPanUpdate = (
    newX: number,
    newY: number,
    exactLat?: number,
    exactLng?: number
  ) => {
    ++geoRequestIdRef.current;
    geoAbortRef.current?.abort();
    setIsLocating(false);

    const fallback = mapCoordsToLatLng(newX, newY);
    const lat = Number((exactLat ?? fallback.lat).toFixed(5));
    const lng = Number((exactLng ?? fallback.lng).toFixed(5));
    const nearest = findNearestSabahLandmark(lat, lng);
    const formatted = `Pinned: ${lat.toFixed(4)}, ${lng.toFixed(4)} (${
      nearest.name
    })`;
    setAddressQuery(formatted);
    dispatch({
      type: 'UPDATE_PIN_LOCATION',
      payload: {
        lat,
        lng,
        address: formatted,
        mapX: newX,
        mapY: newY,
        source: 'manual',
      },
    });
  };

  const selectLandmark = (lm: SabahLandmark) => {
    ++geoRequestIdRef.current;
    geoAbortRef.current?.abort();
    setIsLocating(false);

    const coords = latLngToMapCoords(lm.lat, lm.lng);
    const formatted = `Pinned: ${lm.lat.toFixed(4)}, ${lm.lng.toFixed(4)} (${
      lm.name
    })`;
    setAddressQuery(formatted);
    setShowSuggestions(false);
    setFlyTrigger((c) => c + 1);
    dispatch({
      type: 'UPDATE_PIN_LOCATION',
      payload: {
        lat: lm.lat,
        lng: lm.lng,
        address: formatted,
        mapX: coords.mapX,
        mapY: coords.mapY,
        source: 'landmark',
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
        formatTicketCode(state.activeJobId),
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
    const ticketCode = formatTicketCode(state.activeJobId);
    const blob = PdfInvoiceGenerator.generateBinaryPdfBlob({
      invoiceNo: `INV-${ticketCode}`,
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
    link.download = `RepairBah_LHDN_${ticketCode}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    notify('Downloaded official %PDF-1.4 LHDN MyInvois Receipt', 'success');
  };

  if (state.rescueStage === 0) {
    return (
      <div className="flex-1 flex flex-col justify-between px-4 pt-3 pb-24 overflow-y-auto">
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

        <SosRadialButton
          isLight={isLight}
          lang={state.language}
          onTrigger={() => {
            dispatch({ type: 'SET_RESCUE_STAGE', payload: 1 });
            notify('SOS Armed — Confirm Sabah Breakdown Location', 'warning');
          }}
        />

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

  if (state.rescueStage === 1) {
    const filteredLandmarks = SABAH_LANDMARKS.filter(
      (lm) =>
        lm.name.toLowerCase().includes(addressQuery.toLowerCase()) ||
        lm.district.toLowerCase().includes(addressQuery.toLowerCase())
    );

    return (
      <div className="flex-1 flex flex-col relative overflow-hidden pb-20">
        <div className="flex-1 relative">
          <ErrorBoundary compact fallbackTitle="Sabah Map Recovery Shield">
            <AppMapView
              centerX={state.pinnedLocation.mapX}
              centerY={state.pinnedLocation.mapY}
              zoom={mapZoom}
              stage={state.rescueStage}
              pinLat={state.pinnedLocation.lat}
              pinLng={state.pinnedLocation.lng}
              locationSource={state.pinnedLocation.source}
              responderLat={responderLat}
              responderLng={responderLng}
              flyToTrigger={flyTrigger}
              onPanUpdate={handleMapPanUpdate}
              onZoomChange={setMapZoom}
              isLight={isLight}
            />
          </ErrorBoundary>

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

          <button
            onClick={() => void handleGpsLocate()}
            disabled={isLocating}
            aria-label="Recenter GPS"
            aria-busy={isLocating}
            className="absolute right-3 bottom-4 w-11 h-11 rounded-full bg-[#141923]/95 border border-[#282C37] text-red-400 shadow-xl flex items-center justify-center z-20 disabled:opacity-75"
          >
            {isLocating ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            ) : (
              <Crosshair className="w-5 h-5" />
            )}
          </button>
        </div>

        <div
          className={`rounded-t-3xl border-t p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.65)] z-30 ${
            isLight
              ? 'bg-white border-slate-200 text-slate-900'
              : 'bg-[#141923] border-[#282C37] text-white'
          }`}
        >
          <div className="w-10 h-1 rounded-full bg-gray-600/50 mx-auto mb-3" />
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-xs font-black tracking-[0.15em] text-red-400 uppercase">
              {t.confirmLocation}
            </h2>
            <div className="flex items-center gap-1.5">
              {state.pinnedLocation.source === 'gps' &&
                state.pinnedLocation.accuracyMeters !== undefined && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/35 text-blue-400 text-[10px] font-mono font-bold">
                    GPS ±{state.pinnedLocation.accuracyMeters}m
                  </span>
                )}
              <span className="text-[11px] font-mono text-gray-400">
                ETA ~{state.selectedService.etaMin} mins
              </span>
            </div>
          </div>

          <div className="relative mb-3">
            <label
              className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${
                isLight ? 'text-slate-500' : 'text-gray-400'
              }`}
            >
              {t.addressLabel}
            </label>
            <div
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border ${
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
                  ++geoRequestIdRef.current;
                  geoAbortRef.current?.abort();
                  setIsLocating(false);
                  setAddressQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Search Sabah landmark or drag map..."
                className="flex-1 bg-transparent text-xs font-semibold outline-none truncate min-w-0"
              />
              {addressQuery && (
                <button
                  onClick={() => {
                    ++geoRequestIdRef.current;
                    geoAbortRef.current?.abort();
                    setIsLocating(false);
                    setAddressQuery('');
                    setShowSuggestions(true);
                  }}
                  aria-label="Clear address"
                  className="p-1 text-gray-400 hover:text-white shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => void handleGpsLocate()}
                disabled={isLocating}
                aria-label="Use current GPS location"
                aria-busy={isLocating}
                className="px-2 py-1 rounded-lg bg-blue-600/20 text-blue-400 text-[10px] font-bold shrink-0 flex items-center gap-1 disabled:opacity-70"
              >
                {isLocating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Crosshair className="w-3 h-3" />
                )}
                GPS
              </button>
              <button
                onClick={() => setShowSuggestions((s) => !s)}
                className="px-2 py-1 rounded-lg bg-red-600/20 text-red-400 text-[10px] font-bold shrink-0"
              >
                Landmarks
              </button>
            </div>

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
                      ++geoRequestIdRef.current;
                      geoAbortRef.current?.abort();
                      setIsLocating(false);
                      const coords = latLngToMapCoords(nr.lat, nr.lng);
                      const formatted = `Pinned: ${nr.lat.toFixed(
                        4
                      )}, ${nr.lng.toFixed(4)} (${nr.label})`;
                      setAddressQuery(formatted);
                      setShowSuggestions(false);
                      setFlyTrigger((c) => c + 1);
                      dispatch({
                        type: 'UPDATE_PIN_LOCATION',
                        payload: {
                          lat: nr.lat,
                          lng: nr.lng,
                          address: formatted,
                          mapX: coords.mapX,
                          mapY: coords.mapY,
                          source: 'search',
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
                `SOS Broadcasted (${formatTicketCode(
                  state.activeJobId
                )}) via Supabase Realtime`,
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
              Job{' '}
              <span className="font-mono text-white">
                {formatTicketCode(state.activeJobId)}
              </span>{' '}
              • {state.selectedService.nameEn} (RM {state.selectedService.price})
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
              <Wifi className="w-3.5 h-3.5" /> Supabase Realtime Channel Active
            </div>
          </div>

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
        <div className="flex-1 relative">
          <ErrorBoundary compact fallbackTitle="Sabah Map Recovery Shield">
            <AppMapView
              centerX={state.pinnedLocation.mapX}
              centerY={state.pinnedLocation.mapY}
              zoom={1.35}
              stage={state.rescueStage}
              pinLat={state.pinnedLocation.lat}
              pinLng={state.pinnedLocation.lng}
              responderLat={responderLat}
              responderLng={responderLng}
              interactive={false}
              showResponder={true}
              responderProgress={state.responderProgress}
              isLight={isLight}
            />
          </ErrorBoundary>

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
              Haversine Geofence:{' '}
              <strong
                className={
                  withinGeofence ? 'text-emerald-400' : 'text-amber-400'
                }
              >
                {distanceMeters}m
              </strong>
            </span>
            <span
              className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                withinGeofence
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
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
              <ShieldCheck className="w-4 h-4" /> Responder On-Site Verification (
              {distanceMeters}m)
            </div>
            {!withinGeofence && (
              <div className="mb-3">
                <p className="text-[11px] text-amber-400 mb-2 font-semibold">
                  Haversine Guard Active: Unit is {distanceMeters}m away (&gt;
                  150m).
                </p>
                <button
                  onClick={() => {
                    dispatch({ type: 'SET_RESPONDER_PROGRESS', payload: 1 });
                    notify(
                      'Responder entered 150m geofence — PIN unlocked!',
                      'success'
                    );
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

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs px-1 text-gray-400">
            <span>Vault Balance: RM {state.vaultBalance.toFixed(2)}</span>
            <span>Auto-FPX Top-Up Ready</span>
          </div>
          <button
            onClick={() => {
              const nonce = `NONCE-${formatTicketCode(
                state.activeJobId
              )}-${Date.now()}`;
              dispatch({
                type: 'LOCK_ESCROW',
                payload: { amount: taxBreakdown.grandTotal, nonce },
              });
              syncJobToSupabase({
                status: 'in_progress',
                quoted_price: taxBreakdown.grandTotal,
              });
              fetch(`${state.supabaseUrl}/rest/v1/vault_holds`, {
                method: 'POST',
                headers: {
                  apikey: state.supabaseAnonKey,
                  Authorization: `Bearer ${state.supabaseAnonKey}`,
                  'Content-Type': 'application/json',
                  Prefer: 'resolution=merge-duplicates',
                },
                body: JSON.stringify({
                  job_id: state.activeJobId,
                  customer_id: 'ahmad_sbh_8821',
                  authorized_amount: taxBreakdown.grandTotal,
                  vault_status: 'reserved',
                }),
              }).catch(() => {
                // Non-blocking vault hold sync
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

          <div className="mb-4 px-4 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <Lock className="w-4 h-4" />
              <span>VaultStatus.RESERVED</span>
            </div>
            <span className="font-mono font-black text-sm text-emerald-300">
              RM {taxBreakdown.grandTotal.toFixed(2)} Held
            </span>
          </div>

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
                    <span className="text-[10px] text-gray-500">
                      Tap to verify
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

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

  return (
    <div className="flex-1 flex flex-col justify-between px-4 pt-4 pb-24 overflow-y-auto">
      <div>
        <div className="text-center mb-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-2 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black">Rescue & Escrow Settled</h2>
          <p className="text-xs text-gray-400">
            VaultStatus.DISBURSED • Job {formatTicketCode(state.activeJobId)}
          </p>
        </div>

        <div
          className={`rounded-2xl border p-4 mb-4 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-[#181C24] border-[#282C37]'
          }`}
        >
          <div className="flex items-center gap-4">
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
