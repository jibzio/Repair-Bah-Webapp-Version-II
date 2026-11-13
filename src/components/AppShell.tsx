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
  UserPlus,
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
          aria-label="Open menu"
          className={`w-11 h-11 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
            isLight
              ? 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              : 'bg-[#141923] border-[#232936] text-white hover:bg-[#181C24]'
          }`}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-extrabold tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p
              className={`text-[11px] truncate ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              {subtitle}
            </p>
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
            ? 'border-emerald-500/50 bg-[#11221C] text-emerald-100'
            : sb.tone === 'warning'
            ? 'border-amber-500/50 bg-[#241C10] text-amber-100'
            : sb.tone === 'error'
            ? 'border-red-500/50 bg-[#261215] text-red-100'
            : 'border-[#232936] bg-[#141923] text-white';

        return (
          <div
            key={sb.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-2xl text-xs font-semibold transition-all ${toneStyles}`}
          >
            <span className="leading-snug">{sb.text}</span>
            <button
              onClick={() =>
                dispatch({ type: 'DISMISS_SNACKBAR', payload: sb.id })
              }
              aria-label="Dismiss notification"
              className="p-1.5 rounded-full hover:bg-white/10 shrink-0"
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
    <div className="fixed inset-0 z-[70] bg-black/75 flex items-end sm:items-center justify-center p-3">
      <div
        className={`w-full max-w-[490px] rounded-t-3xl sm:rounded-3xl border p-5 max-h-[85dvh] overflow-y-auto ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#141923] border-[#232936] text-white'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-red-500">
              Sabah Emergency Hotlines
            </h3>
            <p
              className={`text-[11px] ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              One-Tap Direct Dial &amp; Dispatch Copy
            </p>
          </div>
          <button
            onClick={() =>
              dispatch({ type: 'SET_HOTLINES_OPEN', payload: false })
            }
            aria-label="Close hotlines"
            className={`w-10 h-10 rounded-full border flex items-center justify-center ${
              isLight
                ? 'bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-[#181C24] border-[#232936] text-slate-300'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {SABAH_HOTLINES.map((h) => (
            <div
              key={h.name}
              className={`rounded-xl border p-3.5 flex items-center justify-between gap-2 ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#181C24] border-[#232936]'
              }`}
            >
              <div className="min-w-0">
                <div className="text-[10px] font-bold tracking-wider text-red-500 uppercase">
                  {h.badge}
                </div>
                <div className="text-xs font-bold mt-0.5">{h.name}</div>
                <div
                  className={`text-[11px] ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  {h.desc}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(h.number);
                    notify(`Copied ${h.number}`, 'info');
                  }}
                  aria-label={`Copy ${h.number}`}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-700'
                      : 'bg-[#141923] border-[#232936] text-slate-300'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a
                  href={`tel:${h.number}`}
                  className="px-3.5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs flex items-center gap-1.5 whitespace-nowrap active:scale-[0.99] transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="font-mono">{h.number}</span>
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

  const labelSurface = isLight ? 'bg-white' : 'bg-[#141923]';

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 flex items-center justify-center p-4">
      <div
        className={`w-full max-w-[460px] rounded-3xl border p-5 ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#141923] border-[#232936] text-white'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-extrabold">
              Supabase Realtime &amp; Sync Bridge
            </h3>
          </div>
          <button
            onClick={() =>
              dispatch({ type: 'SET_SUPABASE_DIALOG', payload: false })
            }
            aria-label="Close bridge settings"
            className={`w-9 h-9 rounded-full border flex items-center justify-center ${
              isLight
                ? 'bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-[#181C24] border-[#232936] text-slate-300'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className={`text-[11px] space-y-1 mb-4 font-mono p-3 rounded-xl border ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-600'
              : 'bg-[#181C24] border-[#232936] text-slate-400'
          }`}
        >
          <div>
            WS Status:{' '}
            <span className="text-emerald-500 font-semibold">
              {state.realtimeConnected ? 'PHX_JOINED (25s Heartbeat)' : 'POLLING'}
            </span>
          </div>
          <div>Channels: public:emergency_requests, public:rescue_jobs</div>
          <div>PostgREST Hydration: Every 2.5s + BroadcastChannel</div>
          <div>Offline Mutation Queue: {state.offlineQueueCount} pending</div>
        </div>

        <div className="space-y-4 mb-4">
          <div
            className={`relative rounded-xl border ${
              isLight
                ? 'bg-white border-slate-300 focus-within:border-[#DC2626]'
                : 'bg-[#181C24] border-[#232936] focus-within:border-[#DC2626]'
            }`}
          >
            <label
              className={`absolute -top-2 left-3 px-1 text-[10px] font-semibold font-mono ${labelSurface} ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              SUPABASE_URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-transparent text-xs font-mono outline-none"
            />
          </div>
          <div
            className={`relative rounded-xl border ${
              isLight
                ? 'bg-white border-slate-300 focus-within:border-[#DC2626]'
                : 'bg-[#181C24] border-[#232936] focus-within:border-[#DC2626]'
            }`}
          >
            <label
              className={`absolute -top-2 left-3 px-1 text-[10px] font-semibold font-mono ${labelSurface} ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              SUPABASE_ANON_KEY
            </label>
            <input
              type="text"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-transparent text-xs font-mono outline-none"
            />
          </div>
        </div>

        <button
          onClick={() => {
            dispatch({
              type: 'UPDATE_CONFIG',
              payload: { supabaseUrl: url, supabaseAnonKey: anonKey },
            });
            dispatch({ type: 'SET_SUPABASE_DIALOG', payload: false });
            notify('Updated Supabase Realtime Credentials', 'success');
          }}
          className="w-full py-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs active:scale-[0.99] transition-all"
        >
          Apply &amp; Reconnect
        </button>
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
        className={`fixed inset-0 z-40 bg-black/70 transition-opacity duration-200 ${
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
            : 'bg-[#141923] border-[#232936] text-white'
        }`}
      >
        <div
          className={`p-5 border-b ${
            isLight ? 'border-slate-200' : 'border-[#232936]'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-[#DC2626] text-white font-extrabold text-base flex items-center justify-center">
              {state.userProfile.initials}
            </div>
            <button
              onClick={() => dispatch({ type: 'SET_DRAWER', payload: false })}
              aria-label="Close drawer"
              className={`w-10 h-10 rounded-full border flex items-center justify-center ${
                isLight
                  ? 'bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-[#181C24] border-[#232936] text-slate-300'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="font-extrabold text-sm flex items-center gap-1.5">
            <span className="truncate">{state.userProfile.fullName}</span>
            {!state.userProfile.isGuest && (
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
          </div>
          <div
            className={`text-xs font-mono mt-0.5 truncate ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}
          >
            {activeVehicle
              ? `${activeVehicle.makeModel} · ${activeVehicle.plate}`
              : state.userProfile.isGuest
              ? 'Guest Session · No Vehicle Linked'
              : 'No Vehicle Registered'}
          </div>

          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'SET_DRAWER', payload: false });
              dispatch({ type: 'SET_AUTH_MODAL', payload: true });
            }}
            className={`mt-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] ${
              state.userProfile.isGuest
                ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white'
                : isLight
                ? 'bg-slate-100 border border-slate-300 text-slate-800 hover:bg-slate-200'
                : 'bg-[#181C24] border border-[#232936] text-slate-200 hover:bg-[#1E2430]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>
              {state.userProfile.isGuest
                ? 'Register / Sign In'
                : 'Account & Profile'}
            </span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const active = state.screen === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => dispatch({ type: 'NAVIGATE', payload: item.id })}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-colors ${
                  active
                    ? 'bg-red-600/15 text-red-500 border border-red-500/35'
                    : isLight
                    ? 'text-slate-700 hover:bg-slate-100 border border-transparent'
                    : 'text-slate-300 hover:bg-[#181C24] border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active
                      ? 'text-red-500'
                      : isLight
                      ? 'text-slate-500'
                      : 'text-slate-400'
                  }`}
                />
                <span className="truncate flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div
          className={`p-4 border-t flex items-center justify-between text-[10px] font-mono ${
            isLight
              ? 'border-slate-200 text-slate-500'
              : 'border-[#232936] text-slate-500'
          }`}
        >
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
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-[#141923] border-[#232936] text-white'
      }`}
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
              className={`px-4 py-1 rounded-full transition-colors duration-150 ${
                active
                  ? 'bg-red-600/15 text-red-500'
                  : isLight
                  ? 'text-slate-500 group-hover:text-slate-800'
                  : 'text-slate-400 group-hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] font-bold mt-1 whitespace-nowrap ${
                active
                  ? isLight
                    ? 'text-slate-900'
                    : 'text-white'
                  : isLight
                  ? 'text-slate-500'
                  : 'text-slate-400'
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
