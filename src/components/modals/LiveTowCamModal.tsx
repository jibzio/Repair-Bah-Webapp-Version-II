import React, { useEffect, useRef, useState } from 'react';
import { Camera, Eye, Mic, MicOff, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { realtimeBus } from '../../services/realtimeBus';

export const LiveTowCamModal: React.FC = () => {
  const { state, dispatch, notify } = useApp();
  const [irNightVision, setIrNightVision] = useState(true);
  const [pttActive, setPttActive] = useState(false);
  const [cameraFallback, setCameraFallback] = useState(false);
  const [rtcState, setRtcState] = useState<string>('initializing');
  const [liveRpm, setLiveRpm] = useState(1920);
  const [liveKmh, setLiveKmh] = useState(42);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const isBroadcaster = state.screen === 'tow';
  const slaEtaMins = Math.max(1, Math.ceil(state.slaSecondsRemaining / 60));

  useEffect(() => {
    if (!state.towCamOpen) return;
    const t = setInterval(() => {
      setLiveRpm(Math.round(1860 + Math.random() * 160));
      setLiveKmh(Math.round(39 + Math.random() * 7));
    }, 1400);
    return () => clearInterval(t);
  }, [state.towCamOpen]);

  useEffect(() => {
    if (!state.towCamOpen) return;

    let activeStream: MediaStream | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    realtimeBus.joinTowCamChannel(state.activeJobId);

    const sendSignal = (
      event: 'sdp_offer' | 'sdp_answer' | 'ice_candidate',
      payload: Record<string, unknown>
    ) => {
      realtimeBus.publishTowCamSignal(state.activeJobId, {
        type: 'WEBRTC_SIGNAL',
        event,
        jobId: state.activeJobId,
        role: isBroadcaster ? 'broadcaster' : 'receiver',
        ...payload,
      });
    };

    let pc: RTCPeerConnection | null = null;
    try {
      pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        if (pc) setRtcState(pc.connectionState || 'active');
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          sendSignal('ice_candidate', { candidate: ev.candidate.toJSON() });
        }
      };

      if (!isBroadcaster) {
        pc.ontrack = (ev) => {
          if (videoRef.current && ev.streams[0]) {
            videoRef.current.srcObject = ev.streams[0];
            setCameraFallback(false);
            setRtcState('connected');
          }
        };
      }
    } catch {
      setRtcState('simulated-p2p');
    }

    const unsubSignal = realtimeBus.onTowCamSignal(async (raw) => {
      if (!pc || raw?.type !== 'WEBRTC_SIGNAL' || raw?.jobId !== state.activeJobId) {
        return;
      }
      try {
        if (
          !isBroadcaster &&
          raw.event === 'sdp_offer' &&
          raw.sdp &&
          typeof raw.sdp === 'object'
        ) {
          setRtcState('negotiating');
          await pc.setRemoteDescription(
            new RTCSessionDescription(raw.sdp as RTCSessionDescriptionInit)
          );
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal('sdp_answer', { sdp: answer });
        } else if (
          isBroadcaster &&
          raw.event === 'sdp_answer' &&
          raw.sdp &&
          typeof raw.sdp === 'object'
        ) {
          await pc.setRemoteDescription(
            new RTCSessionDescription(raw.sdp as RTCSessionDescriptionInit)
          );
          setRtcState('connected');
        } else if (
          raw.event === 'ice_candidate' &&
          raw.candidate &&
          typeof raw.candidate === 'object' &&
          raw.role !== (isBroadcaster ? 'broadcaster' : 'receiver')
        ) {
          await pc.addIceCandidate(
            new RTCIceCandidate(raw.candidate as RTCIceCandidateInit)
          );
        }
      } catch {
        // Ignore duplicate/out-of-order signaling frames
      }
    });

    if (isBroadcaster) {
      setRtcState('broadcasting-offer');
      if (
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia
      ) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
          .then(async (stream) => {
            activeStream = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
            setCameraFallback(false);
            if (pc) {
              stream.getTracks().forEach((tr) => pc?.addTrack(tr, stream));
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              sendSignal('sdp_offer', { sdp: offer });
            }
          })
          .catch(async () => {
            setCameraFallback(true);
            if (pc) {
              try {
                pc.addTransceiver('video', { direction: 'sendonly' });
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendSignal('sdp_offer', { sdp: offer });
              } catch {
                // Ignore headless transceiver restriction
              }
            }
          });
      } else {
        setCameraFallback(true);
      }
    } else {
      setRtcState('listening (sdp_offer / ice)');
      fallbackTimer = setTimeout(() => {
        if (!videoRef.current?.srcObject) {
          setCameraFallback(true);
        }
      }, 900);
    }

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      unsubSignal();
      realtimeBus.leaveTowCamChannel(state.activeJobId);
      if (activeStream) {
        activeStream.getTracks().forEach((tr) => tr.stop());
      }
      pc?.close();
      pcRef.current = null;
    };
  }, [state.towCamOpen, state.activeJobId, isBroadcaster]);

  if (!state.towCamOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col justify-between p-4 max-w-[540px] mx-auto">
      <div className="flex items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-2 bg-black/70 border border-emerald-500/40 px-3 py-1.5 rounded-full min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
          <span className="text-[11px] font-mono font-bold text-emerald-400 truncate">
            {isBroadcaster ? 'BROADCASTER' : 'RECEIVER'} •{' '}
            {rtcState.toUpperCase()}
          </span>
        </div>
        <button
          onClick={() => dispatch({ type: 'SET_TOWCAM_OPEN', payload: false })}
          className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative flex-1 my-4 rounded-3xl overflow-hidden border-2 border-emerald-500/40 bg-[#050B08] flex items-center justify-center">
        {!cameraFallback ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              irNightVision
                ? 'sepia hue-rotate-90 saturate-200 contrast-125 brightness-90'
                : ''
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[radial-gradient(circle_at_center,#064E3B_0%,#030712_85%)]">
            <Camera className="w-12 h-12 text-emerald-400 mb-3 animate-pulse" />
            <p className="text-emerald-300 font-mono text-sm font-bold">
              REAR WINCH TELEMETRY STREAM ACTIVE
            </p>
            <p className="text-emerald-500/80 font-mono text-xs mt-1 max-w-xs">
              WebRTC {isBroadcaster ? 'Broadcaster' : 'Receiver'} P2P Signaling
              Ready ({rtcState})
            </p>
            <div className="mt-6 w-56 h-28 border border-emerald-500/50 rounded-xl relative flex items-center justify-center">
              <div className="w-40 h-16 border-2 border-dashed border-emerald-400 rounded-lg flex items-center justify-center text-xs font-mono text-emerald-300">
                SAB 8821 X • LOCKED
              </div>
            </div>
          </div>
        )}

        <div className="absolute inset-4 border border-emerald-400/30 rounded-2xl pointer-events-none flex flex-col justify-between p-3 font-mono text-[11px] text-emerald-300">
          <div className="flex justify-between gap-2">
            <span>OBD-II RPM: {liveRpm.toLocaleString()}</span>
            <span>BED TILT: 11.8° • 1,420 kgf</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>{liveKmh} km/h • JLN LINTAS</span>
            <span>SLA ETA: {slaEtaMins}m • CHOCKS 4/4</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setIrNightVision((v) => !v)}
          className={`py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border ${
            irNightVision
              ? 'bg-emerald-600 text-white border-emerald-400'
              : 'bg-[#181C24] text-gray-300 border-[#282C37]'
          }`}
        >
          <Eye className="w-4 h-4" />
          {irNightVision ? 'IR NIGHT VISION: ON' : 'IR NIGHT VISION: OFF'}
        </button>
        <button
          onPointerDown={() => {
            setPttActive(true);
            notify('Push-to-Talk Intercom Open to Cab KK-204', 'info');
          }}
          onPointerUp={() => setPttActive(false)}
          onPointerLeave={() => setPttActive(false)}
          className={`py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border ${
            pttActive
              ? 'bg-red-600 text-white border-red-400'
              : 'bg-[#181C24] text-white border-[#282C37]'
          }`}
        >
          {pttActive ? (
            <Mic className="w-4 h-4 animate-pulse" />
          ) : (
            <MicOff className="w-4 h-4" />
          )}
          {pttActive ? 'TRANSMITTING...' : 'HOLD PUSH-TO-TALK'}
        </button>
      </div>
    </div>
  );
};
