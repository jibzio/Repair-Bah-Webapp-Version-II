import React, { useEffect, useRef, useState } from 'react';
import { motion, useDragControls } from 'motion/react';

export interface EmergencyBottomSheetProps {
  collapsed: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  isLight: boolean;
  header: React.ReactNode;
  children: React.ReactNode;
}

const HEADER_PEEK_PX = 88;

export const EmergencyBottomSheet: React.FC<EmergencyBottomSheetProps> = ({
  collapsed,
  onExpand,
  onCollapse,
  isLight,
  header,
  children,
}) => {
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const wasDraggedRef = useRef(false);
  const resetDragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;

    const measure = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) {
        setSheetHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev));
      }
    };

    measure();

    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (resetDragTimerRef.current) {
        clearTimeout(resetDragTimerRef.current);
      }
    };
  }, []);

  const collapsedY = Math.max(0, Math.round(sheetHeight - HEADER_PEEK_PX));

  const handleHeaderToggle = () => {
    if (wasDraggedRef.current) return;
    if (collapsed) {
      onExpand();
    } else {
      onCollapse();
    }
  };

  return (
    <motion.div
      ref={sheetRef}
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: collapsedY }}
      dragElastic={0.08}
      onDragStart={() => {
        if (resetDragTimerRef.current) {
          clearTimeout(resetDragTimerRef.current);
          resetDragTimerRef.current = null;
        }
        wasDraggedRef.current = false;
      }}
      onDrag={(_e, info) => {
        if (Math.abs(info.offset.y) >= 6) {
          wasDraggedRef.current = true;
        }
      }}
      onDragEnd={(_e, info) => {
        const dragged = Math.abs(info.offset.y) >= 6;
        if (dragged) {
          wasDraggedRef.current = true;
          if (info.offset.y > 40 || info.velocity.y > 240) {
            onCollapse();
          } else if (info.offset.y < -30 || info.velocity.y < -240) {
            onExpand();
          }
          resetDragTimerRef.current = setTimeout(() => {
            wasDraggedRef.current = false;
            resetDragTimerRef.current = null;
          }, 80);
        } else {
          wasDraggedRef.current = false;
        }
      }}
      animate={{ y: collapsed ? collapsedY : 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 32 }}
      className={`absolute left-0 right-0 bottom-[66px] rounded-t-3xl border-t p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.65)] z-30 ${
        isLight
          ? 'bg-white/95 border-slate-200 text-slate-900'
          : 'bg-[#141923]/95 border-[#282C37] text-white'
      } backdrop-blur-md`}
    >
      <div
        role="button"
        tabIndex={0}
        onPointerDown={(e) => {
          wasDraggedRef.current = false;
          dragControls.start(e);
        }}
        onClick={handleHeaderToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleHeaderToggle();
          }
        }}
        aria-label={
          collapsed
            ? 'Expand location confirmation sheet'
            : 'Slide down to view map'
        }
        className="w-full touch-none cursor-grab active:cursor-grabbing select-none"
      >
        <div className="w-full flex flex-col items-center pb-2.5">
          <div className="w-12 h-1.5 rounded-full bg-gray-500/70" />
        </div>
        {header}
      </div>

      {children}
    </motion.div>
  );
};
