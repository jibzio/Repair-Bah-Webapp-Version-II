import React, { useEffect, useState } from 'react';
import { Car, LogOut, ShieldCheck, UserCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AuthModal: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const isLight = state.displayMode === 'sunlight';
  const isGuest = state.userProfile.isGuest;

  const [fullName, setFullName] = useState(
    isGuest ? '' : state.userProfile.fullName
  );
  const [phone, setPhone] = useState(
    isGuest ? '+60 ' : state.userProfile.phone || '+60 '
  );
  const [email, setEmail] = useState(isGuest ? '' : state.userProfile.email);
  const [vehicleMakeModel, setVehicleMakeModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  useEffect(() => {
    if (state.authModalOpen) {
      setFullName(
        state.userProfile.isGuest ? '' : state.userProfile.fullName
      );
      setPhone(
        state.userProfile.isGuest
          ? '+60 '
          : state.userProfile.phone || '+60 '
      );
      setEmail(state.userProfile.isGuest ? '' : state.userProfile.email);
      setVehicleMakeModel('');
      setVehiclePlate('');
    }
  }, [state.authModalOpen, state.userProfile]);

  if (!state.authModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();

    if (cleanName.length < 2) {
      notify('Please enter your full name', 'warning');
      return;
    }
    if (!/^\+?60[\d\s-]{8,14}$/.test(cleanPhone)) {
      notify('Enter a valid Malaysian phone number (e.g. +60 12-345 6789)', 'warning');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      notify('Enter a valid email address', 'warning');
      return;
    }

    const cleanPlate = vehiclePlate.trim().toUpperCase();
    if (
      cleanPlate &&
      !/^[A-Z]{1,3}\s?\d{1,4}\s?[A-Z]{0,2}$/.test(cleanPlate)
    ) {
      notify('Invalid JPJ Plate format (e.g. SAB 1234 A)', 'warning');
      return;
    }

    const wasGuest = state.userProfile.isGuest;
    dispatch({
      type: 'REGISTER_OR_SIGNIN',
      payload: {
        fullName: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        vehicleMakeModel: vehicleMakeModel.trim() || undefined,
        vehiclePlate: cleanPlate || undefined,
      },
    });
    notify(
      wasGuest
        ? `Welcome ${cleanName}! RM 20.00 Sabah Member Credit added to Vault.`
        : `Updated profile for ${cleanName}`,
      'success'
    );
  };

  const labelSurface = isLight ? 'bg-white' : 'bg-[#141923]';
  const inputBoxClass = `relative rounded-xl border transition-colors ${
    isLight
      ? 'bg-white border-slate-300 focus-within:border-[#DC2626]'
      : 'bg-[#181C24] border-[#232936] focus-within:border-[#DC2626]'
  }`;

  return (
    <div className="fixed inset-0 z-[75] bg-black/75 flex items-end sm:items-center justify-center p-3">
      <div
        className={`w-full max-w-[490px] rounded-t-3xl sm:rounded-3xl border p-5 max-h-[90dvh] overflow-y-auto ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#141923] border-[#232936] text-white'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {isGuest ? 'Register or Sign In' : 'Sabah Member Account'}
              </h3>
              <p
                className={`text-xs ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {isGuest
                  ? 'Unlock RM 20.00 Protected Vault welcome credit'
                  : `Signed in · ${state.userProfile.id}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_AUTH_MODAL', payload: false })}
            aria-label="Close account modal"
            className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${
              isLight
                ? 'bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-[#181C24] border-[#232936] text-slate-300'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isGuest && (
          <div
            className={`rounded-xl border px-3.5 py-2.5 mb-4 flex items-center gap-2.5 text-xs ${
              isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-[#181C24] border-emerald-500/30 text-emerald-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              New members receive <strong className="font-mono">RM 20.00</strong>{' '}
              Sabah Member Welcome Credit immediately on registration.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={inputBoxClass}>
            <label
              className={`absolute -top-2 left-3 px-1 text-[10px] font-semibold ${labelSurface} ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Nurul Aisyah Binti Rahman"
              className="w-full px-3.5 py-3 bg-transparent text-xs font-medium outline-none"
            />
          </div>

          <div className={inputBoxClass}>
            <label
              className={`absolute -top-2 left-3 px-1 text-[10px] font-semibold ${labelSurface} ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              Malaysian Phone (+60)
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+60 12-345 6789"
              className="w-full px-3.5 py-3 bg-transparent text-xs font-mono outline-none"
            />
          </div>

          <div className={inputBoxClass}>
            <label
              className={`absolute -top-2 left-3 px-1 text-[10px] font-semibold ${labelSurface} ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="motorist@sabah.my"
              className="w-full px-3.5 py-3 bg-transparent text-xs outline-none"
            />
          </div>

          <div
            className={`pt-2 border-t ${
              isLight ? 'border-slate-200' : 'border-[#232936]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold mb-3">
              <Car className="w-3.5 h-3.5 text-slate-400" />
              <span>Optional Vehicle Link (Digital Garage)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  value={vehicleMakeModel}
                  onChange={(e) => setVehicleMakeModel(e.target.value)}
                  placeholder="Perodua Bezza 1.3X"
                  className="w-full px-3.5 py-3 bg-transparent text-xs outline-none"
                />
              </div>
              <div className={inputBoxClass}>
                <label
                  className={`absolute -top-2 left-3 px-1 text-[10px] font-semibold ${labelSurface} ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  JPJ Plate
                </label>
                <input
                  type="text"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  placeholder="SAB 1234 A"
                  className="w-full px-3.5 py-3 bg-transparent text-xs font-mono uppercase outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm active:scale-[0.99] transition-all"
            >
              {isGuest
                ? 'Register & Claim RM 20 Credit'
                : 'Save Account Details'}
            </button>

            {!isGuest && (
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'SIGN_OUT_TO_GUEST' });
                  notify('Signed out — active session is now Guest', 'info');
                }}
                className={`w-full py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-[#181C24] border-[#232936] text-slate-300 hover:bg-[#1E2430]'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out to Guest Session
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
