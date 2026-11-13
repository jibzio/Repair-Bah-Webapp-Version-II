import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Battery,
  Bluetooth,
  CheckCircle2,
  Database,
  Gauge,
  Globe,
  Minus,
  Moon,
  Plus,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Sun,
  Thermometer,
  X,
  Zap,
} from 'lucide-react';
import { ScreenTopBar } from '../components/AppShell';
import {
  DTC_LIBRARY,
  MARKETPLACE_PARTS,
  SERVICES,
} from '../constants/sabahData';
import { useApp } from '../context/AppContext';
import { MalaysianTaxEngine } from '../engines/domainEngines';
import { AiMessage, QuoteLineItem } from '../types/repairbah';

export const DigitalGarageScreen: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const activeVehicle =
    state.vehicles.find((v) => v.id === state.activeVehicleId) ||
    state.vehicles[0];

  const [showAddForm, setShowAddForm] = useState(false);
  const [makeModel, setMakeModel] = useState('');
  const [plate, setPlate] = useState('');
  const [vin, setVin] = useState('');

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

export const WalletScreen: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';

  return (
    <div className="flex-1 px-4 pt-3 pb-24 overflow-y-auto">
      <ScreenTopBar
        title="Wallet & Protected Vault"
        subtitle="BNM-Compliant Escrow & FPX Top-Up"
      />

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

export const MarketplaceScreen: React.FC = () => {
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

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => setFulfillment('EXPRESS_60M')}
                    className={`p-3 rounded-xl border text-left ${
                      fulfillment === 'EXPRESS_60M'
                        ? 'border-red-500 bg-red-600/15'
                        : 'border-gray-800'
                    }`}
                  >
                    <div className="text-xs font-bold">
                      Roadside Express 60m
                    </div>
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

export const AiAssistantScreen: React.FC = () => {
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

  const generateLocalDiagnostic = (
    q: string
  ): Omit<AiMessage, 'id' | 'role'> => {
    const low = q.toLowerCase();
    if (
      low.includes('batt') ||
      low.includes('click') ||
      low.includes('start')
    ) {
      return {
        text: 'Rapid relay clicking with dim cabin lights indicates a discharged or sulfated NS60LS 12V battery (< 11.2V). Avoid repeated cranking to protect the starter solenoid.',
        severity: 'HIGH',
        likelyCause: '12V Battery Cell Failure / Alternator Undercharge',
        recommendedServiceId: 'battery_swap',
      };
    }
    if (
      low.includes('tyre') ||
      low.includes('tire') ||
      low.includes('puncture')
    ) {
      return {
        text: 'Pull onto a wide shoulder with hazard lights active. Our Mobile Tyre Unit carries 185/55 R15 Michelin XM2+ spares and torque wrenches.',
        severity: 'MEDIUM',
        likelyCause: 'Sidewall Puncture / Rapid Pressure Loss',
        recommendedServiceId: 'flat_tyre',
      };
    }
    if (
      low.includes('heat') ||
      low.includes('smoke') ||
      low.includes('gear') ||
      low.includes('cvt')
    ) {
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

export const DtcLibraryScreen: React.FC = () => {
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
                notify(
                  `Pre-filled SOS for ${dtc.code} (${svc.nameEn})`,
                  'info'
                );
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

export const AppSettingsScreen: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const [geminiKeyInput, setGeminiKeyInput] = useState(state.geminiApiKey);
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinVerified, setAdminPinVerified] = useState(state.demoMode);

  const handleVersionTap = () => {
    if (adminUnlocked) return;
    const next = versionTapCount + 1;
    setVersionTapCount(next);
    if (next >= 7) {
      setAdminUnlocked(true);
      notify('Admin Demo Mode controls unlocked', 'info');
    }
  };

  return (
    <div className="flex-1 px-4 pt-3 pb-24 overflow-y-auto">
      <ScreenTopBar
        title="App Settings"
        subtitle="Display Contrast, Localization & Cloud Bridge"
      />

      <div className="space-y-3">
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
                Active:{' '}
                {state.language === 'EN' ? 'English (MY)' : 'Bahasa Malaysia'}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              dispatch({ type: 'TOGGLE_LANGUAGE' });
              notify(
                `Language set to ${
                  state.language === 'EN'
                    ? 'Bahasa Malaysia (BM)'
                    : 'English (EN)'
                }`,
                'info'
              );
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
          >
            {state.language === 'EN' ? 'Switch to BM' : 'Switch to EN'}
          </button>
        </div>

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
                {state.realtimeConnected
                  ? 'Connected • 2.5s Sync'
                  : 'Offline Queue'}
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

        {(adminUnlocked || state.demoMode) && (
          <div
            className={`rounded-2xl border p-4 space-y-3 ${
              isLight
                ? 'bg-amber-50 border-amber-300 text-slate-900'
                : 'bg-[#181C24] border-amber-500/40 text-white'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  Admin Demo Mode
                </div>
                <div className="text-[11px] text-gray-400">
                  Shows 1-tap SOS, claim & arrival simulation controls
                </div>
              </div>
              {(adminPinVerified || state.demoMode) && (
                <button
                  type="button"
                  onClick={() => {
                    const next = !state.demoMode;
                    dispatch({ type: 'SET_DEMO_MODE', payload: next });
                    notify(
                      next
                        ? 'Admin Demo Mode enabled'
                        : 'Admin Demo Mode disabled (Production UI)',
                      'info'
                    );
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black ${
                    state.demoMode
                      ? 'bg-amber-500 text-black'
                      : 'bg-[#242A36] text-gray-200 border border-gray-700'
                  }`}
                >
                  {state.demoMode ? 'ON' : 'OFF'}
                </button>
              )}
            </div>

            {!adminPinVerified && !state.demoMode && (
              <div className="flex gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  placeholder="Enter Admin PIN"
                  className="flex-1 px-3 py-2 rounded-xl bg-black/25 border border-gray-700 text-xs font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (adminPinInput.trim() === '4402') {
                      setAdminPinVerified(true);
                      setAdminPinInput('');
                      dispatch({ type: 'SET_DEMO_MODE', payload: true });
                      notify('Admin Demo Mode enabled', 'success');
                    } else {
                      notify('Invalid Admin PIN', 'error');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-black font-black text-xs"
                >
                  Unlock
                </button>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 pb-2 text-center">
          <button
            type="button"
            onClick={handleVersionTap}
            className="text-[11px] font-mono text-gray-500 hover:text-gray-400 select-none"
          >
            RepairBah Sabah Live • v2.4
          </button>
        </div>
      </div>
    </div>
  );
};
