import React, { useEffect, useState } from 'react';
import {
  Building2,
  Car,
  Copy,
  CreditCard,
  Database,
  FileText,
  Menu,
  Phone,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { I18N, SABAH_HOTLINES } from '../constants/sabahData';
import { useApp } from '../context/AppContext';
import { ScreenId } from '../types/repairbah';

export const ScreenTopBar: React.FC<{
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

export const SnackbarHost: React.FC = () => {
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

export const EmergencyHotlinesModal: React.FC = () => {
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

export const SupabaseConfigDialog: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const [url, setUrl] = useState(state.supabaseUrl);
  const [anonKey, setAnonKey] = useState(state.supabaseAnonKey);

  useEffect(() => {
    if (state.supabaseDialogOpen) {
      setUrl(state.supabaseUrl);
      setAnonKey(state.supabaseAnonKey);
    }
  }, [state.supabaseDialogOpen, state.supabaseUrl, state.supabaseAnonKey]);

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

export const AppDrawer: React.FC = () => {
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
      <div
        onClick={() => dispatch({ type: 'SET_DRAWER', payload: false })}
        className={`fixed inset-0 z-40 bg-black/65 backdrop-blur-xs transition-opacity duration-200 ${
          state.drawerOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-[82%] max-w-[320px] border-r flex flex-col transition-transform duration-300 ease-out ${
          state.drawerOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#141923] border-[#282C37] text-white'
        }`}
      >
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

export const BottomNavBar: React.FC = () => {
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
