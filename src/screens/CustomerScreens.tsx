import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Battery,
  Bluetooth,
  Car,
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
  UserPlus,
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
        'Invalid Malaysian JPJ Plate format (e.g. SAB 1234 A)',
        'error'
      );
      return;
    }
    if (cleanVin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin)) {
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
        makeModel: makeModel.trim() || 'Perodua Bezza 1.3X',
        variant: 'Sabah Registered Fleet',
        plate: cleanPlate,
        vin: cleanVin || 'PENDING-JPJ-SYNC',
        year: new Date().getFullYear(),
        jpjVerified: Boolean(cleanVin),
        roadtaxExpiry: 'Active',
      },
    });
    setShowAddForm(false);
    setMakeModel('');
    setPlate('');
    setVin('');
    notify(`Added ${cleanPlate} to Sabah Digital Garage`, 'success');
  };

  const cardClass = isLight
    ? 'bg-white border-slate-200 text-slate-900'
    : 'bg-[#141923] border-[#232936] text-white';
  const labelSurface = isLight ? 'bg-white' : 'bg-[#141923]';
  const inputBoxClass = `relative rounded-xl border transition-colors ${
    isLight
      ? 'bg-white border-slate-300 focus-within:border-[#DC2626]'
      : 'bg-[#181C24] border-[#232936] focus-within:border-[#DC2626]'
  }`;

  return (
    <div className="flex-1 px-4 pt-3 pb-24 overflow-y-auto">
      <ScreenTopBar
        title="Digital Garage"
        subtitle="JPJ Fleet & Live ELM327 OBD-II"
        rightSlot={
          <button
            onClick={() => setShowAddForm((s) => !s)}
            className="px-3.5 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold flex items-center gap-1 active:scale-[0.99] transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        }
      />

      {state.vehicles.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
          {state.vehicles.map((v) => {
            const active = activeVehicle ? v.id === activeVehicle.id : false;
            return (
              <button
                key={v.id}
                onClick={() =>
                  dispatch({ type: 'SELECT_VEHICLE', payload: v.id })
                }
                className={`shrink-0 px-3.5 py-2.5 rounded-xl border text-left transition-colors ${
                  active
                    ? 'border-[#DC2626] bg-red-600/15'
                    : isLight
                    ? 'bg-white border-slate-200'
                    : 'bg-[#141923] border-[#232936]'
                }`}
              >
                <div className="text-xs font-extrabold font-mono">{v.plate}</div>
                <div
                  className={`text-[11px] ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  {v.makeModel}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showAddForm && (
        <form
          onSubmit={handleAddVehicle}
          className={`rounded-2xl border p-4 mb-4 space-y-4 ${cardClass}`}
        >
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-red-500">
            Register Sabah Vehicle (JPJ + ISO 3779 VIN)
          </h3>
          <div className={inputBoxClass}>
            <label
              className={`absolute -top-2 left-3 px-1 text-[10px] font-semibold ${labelSurface} ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              Make &amp; Model
            </label>
            <input
              type="text"
              placeholder="e.g. Perodua Bezza 1.3X"
              value={makeModel}
              onChange={(e) => setMakeModel(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-transparent text-xs outline-none"
            />
          </div>
          <div className={inputBoxClass}>
            <label
              className={`absolute -top-2 left-3 px-1 text-[10px] font-semibold ${labelSurface} ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              JPJ Registration Plate
            </label>
            <input
              type="text"
              placeholder="e.g. SAB 1234 A"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-transparent text-xs font-mono uppercase outline-none"
            />
          </div>
          <div className={inputBoxClass}>
            <label
              className={`absolute -top-2 left-3 px-1 text-[10px] font-semibold ${labelSurface} ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              17-Char ISO 3779 VIN (Optional)
            </label>
            <input
              type="text"
              maxLength={17}
              placeholder="e.g. PM2B300S000551234"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-transparent text-xs font-mono uppercase outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs active:scale-[0.99] transition-all"
          >
            Validate &amp; Save Vehicle
          </button>
        </form>
      )}

      {activeVehicle ? (
        <div className={`rounded-2xl border p-4 mb-4 ${cardClass}`}>
          <div className="flex items-start justify-between mb-3 gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {activeVehicle.jpjVerified
                    ? 'JPJ & PUSPAKOM Verified'
                    : 'Sabah Fleet Registered'}
                </span>
              </div>
              <h2 className="text-lg font-extrabold truncate">
                {activeVehicle.makeModel}
              </h2>
              <p
                className={`text-xs ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {activeVehicle.variant}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div
                className={`px-2.5 py-1 rounded-lg border font-mono text-xs font-extrabold ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900'
                    : 'bg-[#181C24] border-[#232936] text-white'
                }`}
              >
                {activeVehicle.plate}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                Exp: {activeVehicle.roadtaxExpiry}
              </div>
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mb-3">
            VIN: {activeVehicle.vin}
          </div>
          <button
            onClick={handleBleScan}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
          >
            <Bluetooth className="w-4 h-4" />
            {obdConnected
              ? 'ELM327 OBD-II Live Stream Active'
              : 'Scan ELM327 OBD-II Bluetooth'}
          </button>
        </div>
      ) : (
        <div className={`rounded-2xl border p-5 mb-4 text-center ${cardClass}`}>
          <div
            className={`w-12 h-12 rounded-2xl border mx-auto mb-3 flex items-center justify-center ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-500'
                : 'bg-[#181C24] border-[#232936] text-slate-400'
            }`}
          >
            <Car className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-extrabold">No Vehicle Registered Yet</h2>
          <p
            className={`text-xs mt-1 mb-4 ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}
          >
            Add your vehicle plate for faster roadside patrol matching, or
            register an account to save your Sabah fleet.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs active:scale-[0.99] transition-all"
            >
              + Add Vehicle Plate
            </button>
            {state.userProfile.isGuest && (
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: 'SET_AUTH_MODAL', payload: true })
                }
                className={`flex-1 py-2.5 px-3 rounded-xl border font-bold text-xs ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-800'
                    : 'bg-[#181C24] border-[#232936] text-slate-200'
                }`}
              >
                Register / Sign In
              </button>
            )}
          </div>
        </div>
      )}

      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">
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
          <div key={i} className={`rounded-2xl border p-3.5 ${cardClass}`}>
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold">{g.label}</span>
              <g.icon className={`w-4 h-4 ${g.color}`} />
            </div>
            <div className="text-2xl font-extrabold font-mono">{g.value}</div>
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

      <div
        className={`rounded-3xl p-5 mb-5 border ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#141923] border-[#232936] text-white'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
            Protected Vault Balance
          </span>
          <span
            className={`text-[11px] font-mono font-semibold ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {state.vaultStatus}
          </span>
        </div>
        <div className="text-4xl font-extrabold font-mono my-2">
          RM {state.vaultBalance.toFixed(2)}
        </div>
        <p
          className={`text-[11px] mb-4 ${
            isLight ? 'text-slate-600' : 'text-slate-400'
          }`}
        >
          Funds are held in escrow and only released after your Stage 9
          handover signature.
        </p>

        {state.userProfile.isGuest && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_AUTH_MODAL', payload: true })}
            className="w-full mb-3 py-2.5 px-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Register Account to Claim RM 20.00 Welcome Credit
          </button>
        )}

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
              className={`py-2.5 rounded-xl border font-extrabold text-xs font-mono transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
                  : 'bg-[#181C24] border-[#232936] text-white hover:border-emerald-500/50'
              }`}
            >
              +RM {amt}
            </button>
          ))}
        </div>
      </div>

      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
        Escrow &amp; FPX Ledger
      </h3>
      {state.ledger.length === 0 ? (
        <div
          className={`rounded-2xl border p-5 text-center text-xs ${
            isLight
              ? 'bg-white border-slate-200 text-slate-500'
              : 'bg-[#141923] border-[#232936] text-slate-400'
          }`}
        >
          No escrow or FPX transactions yet. Register or top up via FPX to
          initialize your vault ledger.
        </div>
      ) : (
        <div className="space-y-2.5">
          {state.ledger.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border p-3.5 flex items-center justify-between gap-3 ${
                isLight
                  ? 'bg-white border-slate-200'
                  : 'bg-[#141923] border-[#232936]'
              }`}
            >
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{item.title}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {item.timestamp} · {item.ref}
                </div>
              </div>
              <div
                className={`font-mono font-extrabold text-xs shrink-0 ${
                  item.type === 'CREDIT'
                    ? 'text-emerald-500'
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
      )}
    </div>
  );
};

export const MarketplaceScreen: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const activeVehicle =
    state.vehicles.find((v) => v.id === state.activeVehicleId) ||
    state.vehicles[0];
  const [onlyVehicleFit, setOnlyVehicleFit] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [fulfillment, setFulfillment] = useState<'EXPRESS_60M' | 'BAY_SLOT'>(
    'EXPRESS_60M'
  );
  const [fpxBank, setFpxBank] = useState('Maybank2u');

  useEffect(() => {
    if (!activeVehicle && onlyVehicleFit) {
      setOnlyVehicleFit(false);
    }
  }, [activeVehicle, onlyVehicleFit]);

  const visibleParts =
    onlyVehicleFit && activeVehicle
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
            className="relative px-3.5 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold flex items-center gap-1.5 active:scale-[0.99] transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="font-mono">{totalCount}</span>
          </button>
        }
      />

      <div className="flex items-center justify-between gap-2 mb-4">
        {activeVehicle ? (
          <button
            onClick={() => setOnlyVehicleFit((v) => !v)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 truncate transition-colors ${
              onlyVehicleFit
                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500'
                : isLight
                ? 'bg-white border-slate-300 text-slate-700'
                : 'bg-[#141923] border-[#232936] text-slate-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {activeVehicle.makeModel} ({activeVehicle.plate}) Fitment Only
            </span>
          </button>
        ) : (
          <span
            className={`text-xs font-medium ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}
          >
            All Genuine Sabah Stock
          </span>
        )}
        <span className="text-[11px] font-mono text-slate-400 shrink-0">
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
                : 'bg-[#141923] border-[#232936]'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400 mb-1">
                <span className="font-bold text-blue-400">{part.category}</span>
                <span aria-hidden="true">·</span>
                <span>{part.badge}</span>
                {activeVehicle && part.myviFit && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-emerald-500">
                      Fits {activeVehicle.makeModel.split(' ')[0]}
                    </span>
                  </>
                )}
              </div>
              <h3 className="font-bold text-sm">{part.name}</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                SKU: {part.sku} · {part.stock} in Kolombong HQ
              </p>
              <div className="text-base font-extrabold font-mono text-red-500 mt-1">
                RM {part.price.toFixed(2)}{' '}
                <span className="text-[10px] font-sans font-normal text-slate-400">
                  (0% Parts SST)
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                dispatch({ type: 'ADD_TO_CART', payload: part });
                notify(`Added ${part.name} to cart`, 'success');
              }}
              className="px-3.5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs shrink-0 active:scale-[0.99] transition-all"
            >
              + Cart
            </button>
          </div>
        ))}
      </div>

      {checkoutOpen && (
        <div className="fixed inset-0 z-[65] bg-black/75 flex items-end justify-center">
          <div
            className={`w-full max-w-[540px] rounded-t-3xl border-t p-5 max-h-[88dvh] overflow-y-auto ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-[#141923] border-[#232936] text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-red-500" />
                Marketplace Escrow Checkout
              </h3>
              <button
                onClick={() => setCheckoutOpen(false)}
                aria-label="Close checkout"
                className={`w-9 h-9 rounded-full border flex items-center justify-center ${
                  isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-[#181C24] border-[#232936] text-slate-300'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {state.cart.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                Your spare parts cart is empty.
              </p>
            ) : (
              <>
                <div className="space-y-2.5 mb-4">
                  {state.cart.map((item) => (
                    <div
                      key={item.part.id}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        isLight
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-[#181C24] border-[#232936]'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate">
                          {item.part.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
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
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                            isLight
                              ? 'bg-white border-slate-300'
                              : 'bg-[#141923] border-[#232936]'
                          }`}
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
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                            isLight
                              ? 'bg-white border-slate-300'
                              : 'bg-[#141923] border-[#232936]'
                          }`}
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
                        ? 'border-[#DC2626] bg-red-600/15'
                        : isLight
                        ? 'border-slate-200 bg-slate-50'
                        : 'border-[#232936] bg-[#181C24]'
                    }`}
                  >
                    <div className="text-xs font-bold">
                      Roadside Express 60m
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Mobile Van Fitment (RM 35)
                    </div>
                  </button>
                  <button
                    onClick={() => setFulfillment('BAY_SLOT')}
                    className={`p-3 rounded-xl border text-left ${
                      fulfillment === 'BAY_SLOT'
                        ? 'border-[#DC2626] bg-red-600/15'
                        : isLight
                        ? 'border-slate-200 bg-slate-50'
                        : 'border-[#232936] bg-[#181C24]'
                    }`}
                  >
                    <div className="text-xs font-bold">Kolombong HQ Bay</div>
                    <div className="text-[10px] text-slate-400">
                      Reserved Lift Slot (RM 25)
                    </div>
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Malaysian FPX Online Banking
                  </label>
                  <select
                    value={fpxBank}
                    onChange={(e) => setFpxBank(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-[#181C24] border-[#232936] text-white'
                    }`}
                  >
                    <option>Maybank2u</option>
                    <option>CIMB Clicks</option>
                    <option>Public Bank PBe</option>
                    <option>RHB Now</option>
                    <option>Bank Islam IB</option>
                  </select>
                </div>

                <div
                  className={`space-y-1 text-xs border-t pt-3 mb-4 ${
                    isLight ? 'border-slate-200' : 'border-[#232936]'
                  }`}
                >
                  <div className="flex justify-between text-slate-400">
                    <span>Parts Subtotal (0% SST)</span>
                    <span className="font-mono">
                      RM {cartTax.partsSubtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
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
                  <div className="flex justify-between font-extrabold text-sm pt-2">
                    <span>TOTAL FPX ESCROW</span>
                    <span className="font-mono text-emerald-500">
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
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs active:scale-[0.99] transition-all"
                >
                  PAY VIA {fpxBank.toUpperCase()} &amp; BOOK FITMENT
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
  const activeVehicle =
    state.vehicles.find((v) => v.id === state.activeVehicleId) ||
    state.vehicles[0];
  const greetingName = state.userProfile.isGuest
    ? 'Motorist'
    : state.userProfile.fullName.split(' ')[0];

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: 'm0',
      role: 'assistant',
      text: `Selamat Sejahtera ${greetingName}! I am RepairBah AI Diagnostic Copilot${
        activeVehicle
          ? ` for ${activeVehicle.makeModel} (${activeVehicle.plate})`
          : ''
      }. Describe your breakdown symptom (e.g., "clicking sound when starting", "overheating on Bukit Padang", or "flat tyre at Likas").`,
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
        recommendedServiceId: 'mobile_mech',
      };
    }
    if (
      low.includes('tyre') ||
      low.includes('tire') ||
      low.includes('puncture')
    ) {
      return {
        text: 'Pull onto a wide shoulder with hazard lights active. Our Sabah Mobile Patrol carries spare replacement kits and calibrated torque wrenches.',
        severity: 'MEDIUM',
        likelyCause: 'Sidewall Puncture / Rapid Pressure Loss',
        recommendedServiceId: 'mobile_mech',
      };
    }
    if (
      low.includes('heat') ||
      low.includes('smoke') ||
      low.includes('gear') ||
      low.includes('cvt')
    ) {
      return {
        text: 'CRITICAL: Shut off the engine immediately to prevent cylinder head warpage or transmission belt slip. Do not open the radiator cap while pressurized.',
        severity: 'CRITICAL',
        likelyCause: 'Cooling System Loss / Transmission Protection',
        recommendedServiceId: 'tow_truck',
      };
    }
    return {
      text: `Based on Sabah roadside diagnostics for ${
        activeVehicle?.makeModel || 'your vehicle'
      }, an on-site OBD-II scan and fuel/ignition inspection is recommended.`,
      severity: 'MEDIUM',
      likelyCause: 'Ignition Coil / Fuel Trim Anomaly',
      recommendedServiceId: 'mobile_mech',
    };
  };

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
          vehicle: activeVehicle?.makeModel || 'Unregistered Vehicle',
          plate: activeVehicle?.plate || 'GUEST-SOS',
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
        subtitle="Gemini Automotive Triage · Sabah Edition"
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
            className={`shrink-0 px-3 py-1.5 rounded-lg border text-[11px] font-semibold ${
              isLight
                ? 'bg-white border-slate-300 text-slate-700'
                : 'bg-[#141923] border-[#232936] text-slate-300'
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
                  ? 'bg-[#DC2626] text-white font-semibold'
                  : isLight
                  ? 'bg-white border border-slate-200 text-slate-900'
                  : 'bg-[#141923] border border-[#232936] text-slate-200'
              }`}
            >
              {m.role === 'assistant' && m.severity && (
                <div
                  className={`flex items-center justify-between gap-2 mb-2 pb-1.5 border-b ${
                    isLight ? 'border-slate-200' : 'border-[#232936]'
                  }`}
                >
                  <span className="font-bold text-[10px] text-slate-400">
                    {m.likelyCause}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold font-mono ${
                      m.severity === 'CRITICAL'
                        ? 'text-red-500'
                        : m.severity === 'HIGH'
                        ? 'text-amber-400'
                        : 'text-emerald-500'
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
                  className="mt-3 w-full py-2.5 px-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-[11px] flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Dispatch Recommended SOS Unit
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs text-slate-400 animate-pulse">
            Analyzing {activeVehicle?.makeModel || 'vehicle'} telemetry &amp;
            Sabah dispatch rules...
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
          className={`flex-1 px-4 py-3 rounded-xl border text-xs outline-none focus:border-[#DC2626] ${
            isLight
              ? 'bg-white border-slate-300 text-slate-900'
              : 'bg-[#141923] border-[#232936] text-white'
          }`}
        />
        <button
          type="submit"
          aria-label="Send symptom"
          className="w-11 h-11 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white flex items-center justify-center shrink-0 active:scale-[0.99] transition-all"
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
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border mb-4 focus-within:border-[#DC2626] ${
          isLight
            ? 'bg-white border-slate-300'
            : 'bg-[#141923] border-[#232936]'
        }`}
      >
        <Search className="w-4 h-4 text-slate-400" />
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
                : 'bg-[#141923] border-[#232936]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono font-extrabold text-sm text-red-500">
                {dtc.code}
              </span>
              <span
                className={`text-[10px] font-extrabold font-mono ${
                  dtc.severity === 'CRITICAL'
                    ? 'text-red-500'
                    : dtc.severity === 'HIGH'
                    ? 'text-amber-400'
                    : 'text-blue-400'
                }`}
              >
                {dtc.severity}
              </span>
            </div>
            <h3 className="font-bold text-xs">{dtc.title}</h3>
            <p className="text-[11px] text-slate-400 mt-1">{dtc.symptoms}</p>
            <ul
              className={`mt-2 space-y-1 text-[11px] list-disc pl-4 ${
                isLight ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
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
              className="mt-3 w-full py-2.5 rounded-xl bg-red-600/15 border border-red-500/35 text-red-400 font-bold text-xs"
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

  const cardClass = isLight
    ? 'bg-white border-slate-200'
    : 'bg-[#141923] border-[#232936]';

  return (
    <div className="flex-1 px-4 pt-3 pb-24 overflow-y-auto">
      <ScreenTopBar
        title="App Settings"
        subtitle="Account, Display Contrast & Cloud Bridge"
      />

      <div className="space-y-3">
        <div
          className={`rounded-2xl border p-4 flex items-center justify-between gap-2 ${cardClass}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center font-extrabold text-xs text-red-400 shrink-0">
              {state.userProfile.initials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">
                {state.userProfile.fullName}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {state.userProfile.isGuest
                  ? 'Guest Session · Register for RM 20 credit'
                  : state.userProfile.email}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_AUTH_MODAL', payload: true })}
            className="px-3.5 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs shrink-0 active:scale-[0.99] transition-all"
          >
            {state.userProfile.isGuest ? 'Register' : 'Manage'}
          </button>
        </div>

        <div
          className={`rounded-2xl border p-4 flex items-center justify-between ${cardClass}`}
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
              <div className="text-[11px] text-slate-400">
                {isLight
                  ? 'High-Contrast Daylight (#F8FAFC)'
                  : 'Dark Obsidian (#0B0F17)'}
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
            className="px-3.5 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs active:scale-[0.99] transition-all"
          >
            Toggle
          </button>
        </div>

        <div
          className={`rounded-2xl border p-4 flex items-center justify-between ${cardClass}`}
        >
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-emerald-500" />
            <div>
              <div className="text-xs font-bold">
                Language / Bahasa Malaysia
              </div>
              <div className="text-[11px] text-slate-400">
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
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs active:scale-[0.99] transition-all"
          >
            {state.language === 'EN' ? 'Switch to BM' : 'Switch to EN'}
          </button>
        </div>

        <div
          className={`rounded-2xl border p-4 flex items-center justify-between ${cardClass}`}
        >
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-xs font-bold">
                Supabase Realtime &amp; PostgREST
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {state.realtimeConnected
                  ? 'Connected · 2.5s Sync'
                  : 'Offline Queue'}
              </div>
            </div>
          </div>
          <button
            onClick={() =>
              dispatch({ type: 'SET_SUPABASE_DIALOG', payload: true })
            }
            className={`px-3.5 py-2 rounded-xl border font-bold text-xs ${
              isLight
                ? 'bg-slate-100 border-slate-300 text-slate-800'
                : 'bg-[#181C24] border-[#232936] text-white'
            }`}
          >
            Inspect
          </button>
        </div>

        <div className={`rounded-2xl border p-4 space-y-2.5 ${cardClass}`}>
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
              className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-none focus:border-[#DC2626] ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#181C24] border-[#232936] text-white'
              }`}
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
              className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs active:scale-[0.99] transition-all"
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
                : 'bg-[#141923] border-amber-500/40 text-white'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                  Admin Demo Mode
                </div>
                <div className="text-[11px] text-slate-400">
                  Shows 1-tap SOS, claim &amp; arrival simulation controls
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
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold ${
                    state.demoMode
                      ? 'bg-amber-500 text-black'
                      : 'bg-[#181C24] text-slate-200 border border-[#232936]'
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
                  className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-[#181C24] border-[#232936] text-white'
                  }`}
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
                  className="px-4 py-2 rounded-xl bg-amber-500 text-black font-extrabold text-xs"
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
            className="text-[11px] font-mono text-slate-500 hover:text-slate-400 select-none"
          >
            RepairBah Sabah Live • v2.4
          </button>
        </div>
      </div>
    </div>
  );
};
