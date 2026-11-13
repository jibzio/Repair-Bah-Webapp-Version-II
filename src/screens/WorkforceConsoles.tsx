import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  CheckCircle2,
  Download,
  Lock,
  Unlock,
  X,
} from 'lucide-react';
import { ScreenTopBar } from '../components/AppShell';
import {
  KOLOMBONG_HQ_LAT,
  KOLOMBONG_HQ_LNG,
  RESCUE_HANDSHAKE_PIN,
} from '../constants/sabahData';
import { useApp } from '../context/AppContext';
import {
  LhdnEInvoiceGenerator,
  MalaysianTaxEngine,
  PdfInvoiceGenerator,
} from '../engines/domainEngines';
import { realtimeBus } from '../services/realtimeBus';
import { formatTicketCode, QuoteLineItem } from '../types/repairbah';

const OFFLINE_FALLBACK_PINS = new Set(['4402', '1234']);

export const ConsolePinGateModal: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);

  if (!state.pendingConsoleTarget) return null;

  const targetName =
    state.pendingConsoleTarget === 'mechanic'
      ? 'Mobile Mechanic Patrol'
      : state.pendingConsoleTarget === 'tow'
      ? 'Flatbed Tow Operator'
      : 'Kolombong HQ Workshop';

  const verifyWorkforcePin = async (candidatePin: string) => {
    if (verifying) return;
    setVerifying(true);

    const completeUnlock = (offline = false) => {
      dispatch({
        type: 'UNLOCK_WORKFORCE',
        payload: state.pendingConsoleTarget,
      });
      setPin('');
      notify(
        offline
          ? `Offline Mode: Unlocked ${targetName} (15-min Session Cached)`
          : `Unlocked ${targetName} (15-min Session Cached)`,
        'success'
      );
    };

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (OFFLINE_FALLBACK_PINS.has(candidatePin)) {
        setTimeout(() => {
          completeUnlock(true);
          setVerifying(false);
        }, 180);
      } else {
        notify(
          'Incorrect Workforce PIN. Use 4402 (Android) or 1234 (Demo)',
          'error'
        );
        setTimeout(() => {
          setPin('');
          setVerifying(false);
        }, 250);
      }
      return;
    }

    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: candidatePin }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        valid?: boolean;
        error?: string;
      };

      if (res.ok && data.valid) {
        completeUnlock(false);
      } else {
        notify(
          data.error ||
            'Incorrect Workforce PIN. Use 4402 (Android) or 1234 (Demo)',
          'error'
        );
        setTimeout(() => setPin(''), 250);
      }
    } catch {
      if (
        typeof navigator !== 'undefined' &&
        !navigator.onLine &&
        OFFLINE_FALLBACK_PINS.has(candidatePin)
      ) {
        completeUnlock(true);
      } else {
        notify('Unable to verify Workforce PIN against server', 'error');
        setTimeout(() => setPin(''), 250);
      }
    } finally {
      setVerifying(false);
    }
  };

  const pressDigit = (d: string) => {
    if (verifying || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      void verifyWorkforcePin(next);
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
          <span className="text-white font-bold">{targetName}</span>
          {state.demoMode && (
            <>
              {' '}
              (PIN: <span className="font-mono text-emerald-400">4402</span> •
              Demo: <span className="font-mono text-emerald-400">1234</span>)
            </>
          )}
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
              disabled={verifying}
              onClick={() => pressDigit(d)}
              className="py-3 rounded-xl bg-[#181C24] border border-[#282C37] text-white font-black text-base active:scale-95 disabled:opacity-60"
            >
              {d}
            </button>
          ))}
          {state.demoMode ? (
            <button
              disabled={verifying}
              onClick={() => {
                setPin('1234');
                void verifyWorkforcePin('1234');
              }}
              className="py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 font-bold text-[11px] disabled:opacity-60"
            >
              {verifying ? 'Checking...' : 'Auto 1234'}
            </button>
          ) : (
            <div />
          )}
          <button
            disabled={verifying}
            onClick={() => pressDigit('0')}
            className="py-3 rounded-xl bg-[#181C24] border border-[#282C37] text-white font-black text-base disabled:opacity-60"
          >
            0
          </button>
          <button
            disabled={verifying}
            onClick={() => setPin((p) => p.slice(0, -1))}
            className="py-3 rounded-xl bg-[#181C24] border border-[#282C37] text-gray-400 flex items-center justify-center disabled:opacity-60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const MechanicConsoleScreen: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const [mechPin, setMechPin] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [newItemDesc, setNewItemDesc] = useState('Ignition Coil Assembly');
  const [newItemPrice, setNewItemPrice] = useState('165');
  const [newItemCat, setNewItemCat] = useState<'LABOR' | 'PARTS'>('PARTS');

  const telemetryRef = useRef({
    progress: state.responderProgress,
    activeJobId: state.activeJobId,
    responderName: state.responderName,
    pinLat: state.pinnedLocation.lat,
    pinLng: state.pinnedLocation.lng,
  });
  telemetryRef.current = {
    progress: state.responderProgress,
    activeJobId: state.activeJobId,
    responderName: state.responderName,
    pinLat: state.pinnedLocation.lat,
    pinLng: state.pinnedLocation.lng,
  };

  useEffect(() => {
    if (!state.responderClaimed || !state.responderOnline) return;
    const t = setInterval(() => {
      const cur = telemetryRef.current;
      const nextProgress = Math.min(0.98, Number((cur.progress + 0.035).toFixed(4)));
      const nextLat = Number(
        (
          KOLOMBONG_HQ_LAT +
          (cur.pinLat - KOLOMBONG_HQ_LAT) * nextProgress
        ).toFixed(5)
      );
      const nextLng = Number(
        (
          KOLOMBONG_HQ_LNG +
          (cur.pinLng - KOLOMBONG_HQ_LNG) * nextProgress
        ).toFixed(5)
      );
      realtimeBus.publishPosUpdate(cur.activeJobId, {
        jobId: cur.activeJobId,
        lat: nextLat,
        lng: nextLng,
        progress: nextProgress,
        responderId: 'kk-204-roy',
        responderName: cur.responderName,
        timestamp: Date.now(),
      });
      dispatch({
        type: 'SET_RESPONDER_POS',
        payload: { progress: nextProgress, lat: nextLat, lng: nextLng },
      });
    }, 2000);
    return () => clearInterval(t);
  }, [state.responderClaimed, state.responderOnline, dispatch]);

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
      realtimeBus.publishJobPatch({
        id: state.activeJobId,
        status: 'accepted',
        responder_id: 'kk-204-roy',
        responder_name: responderName,
      });
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
        typeof parsedBody === 'string'
          ? parsedBody
          : JSON.stringify(parsedBody || '');

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

      <div
        className={`rounded-2xl border p-4 mb-4 ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-[#181C24] border-red-500/40'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-black">
            ACTIVE SOS • {formatTicketCode(state.activeJobId)}
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

export const TowConsoleScreen: React.FC = () => {
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

export const WorkshopConsoleScreen: React.FC = () => {
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
          {(
            ['Checked-In', 'DVI/OBD', 'Active Repair', 'Completed'] as const
          ).map((st) => {
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
          })}
        </div>
      </div>

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
