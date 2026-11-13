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

const PEEK_HEIGHT_PX = 96;

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
  const draggedRef = useRef(false);
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

  const collapsedOffset = Math.max(0, Math.round(sheetHeight - PEEK_HEIGHT_PX));

  return (
    <motion.div
      ref={sheetRef}
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: collapsedOffset }}
      dragElastic={0.1}
      onDragStart={() => {
        draggedRef.current = true;
      }}
      onDragEnd={(_e, info) => {
        if (info.offset.y > 45 || info.velocity.y > 260) {
          onCollapse();
        } else if (info.offset.y < -30 || info.velocity.y < -260) {
          onExpand();
        }
        setTimeout(() => {
          draggedRef.current = false;
        }, 60);
      }}
      animate={{ y: collapsed ? collapsedOffset : 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 32 }}
      className={`absolute left-0 right-0 bottom-[66px] rounded-t-3xl border-t p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.65)] z-20 ${
        isLight
          ? 'bg-white/95 border-slate-200 text-slate-900'
          : 'bg-[#141923]/95 border-[#282C37] text-white'
      } backdrop-blur-md`}
    >
      <div
        role="button"
        tabIndex={0}
        onPointerDown={(e) => {
          draggedRef.current = false;
          dragControls.start(e);
        }}
        onClick={() => {
          if (draggedRef.current) return;
          if (collapsed) {
            onExpand();
          } else {
            onCollapse();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (collapsed) onExpand();
            else onCollapse();
          }
        }}
        aria-label={
          collapsed
            ? 'Expand location confirmation sheet'
            : 'Slide down to view map'
        }
        className="w-full flex flex-col items-center pb-2.5 touch-none cursor-grab active:cursor-grabbing select-none"
      >
        <div className="w-12 h-1.5 rounded-full bg-gray-500/70" />
      </div>

      <div
        onClick={() => {
          if (collapsed) onExpand();
        }}
        className={collapsed ? 'cursor-pointer' : ''}
      >
        {header}
      </div>

      {children}
    </motion.div>
  );
};
