import React, { useState, useEffect } from 'react';
import { Maximize, Minimize } from 'lucide-react';

interface ControllerOverlayProps {
  onButtonDown: (button: number) => void;
  onButtonUp: (button: number) => void;
  onExit: () => void;
  onToggleFullscreen?: () => void;
}

// NES Buttons based on jsnes
// 0: A
// 1: B
// 2: SELECT
// 3: START
// 4: UP
// 5: DOWN
// 6: LEFT
// 7: RIGHT

export const ControllerOverlay: React.FC<ControllerOverlayProps> = ({ onButtonDown, onButtonUp, onExit, onToggleFullscreen }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => console.log('Fullscreen error:', err));
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        (document.documentElement as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => console.log('Exit fullscreen error:', err));
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
    onToggleFullscreen?.();
  };

  const createButton = (button: number, label: string, className: string, shape: 'circle' | 'rect' | 'dpad' = 'rect') => (
    <button
      className={`flex items-center justify-center font-bold text-xs select-none ${className} ${shape === 'circle' ? 'rounded-full' : shape === 'dpad' ? '' : 'rounded'}`}
      onTouchStart={(e) => { e.preventDefault(); onButtonDown(button); }}
      onTouchEnd={(e) => { e.preventDefault(); onButtonUp(button); }}
      onMouseDown={() => onButtonDown(button)}
      onMouseUp={() => onButtonUp(button)}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-stone-800 z-50 flex flex-col items-center justify-center p-4">
      {/* Top Controls Bar */}
      <div className="absolute top-3 right-4 flex items-center gap-2 z-10">
        <button
          onClick={toggleFullscreen}
          className="bg-stone-700/90 hover:bg-stone-600 active:bg-amber-600 text-stone-200 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 backdrop-blur border border-stone-600 shadow transition select-none"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
      </div>

      <div className="relative w-full max-w-[600px] aspect-[2/1] bg-stone-300 rounded-xl shadow-2xl flex items-center justify-between px-8 py-4 border-b-8 border-r-8 border-stone-400">
        
        {/* D-Pad - using NES Constants */}
        <div className="relative w-32 h-32 ml-4">
            {createButton(4, '', 'absolute top-0 left-10 w-12 h-12 bg-black rounded-t-sm', 'dpad')}
            {createButton(5, '', 'absolute bottom-0 left-10 w-12 h-12 bg-black rounded-b-sm', 'dpad')}
            {createButton(6, '', 'absolute top-10 left-0 w-12 h-12 bg-black rounded-l-sm', 'dpad')}
            {createButton(7, '', 'absolute top-10 right-0 w-12 h-12 bg-black rounded-r-sm', 'dpad')}
            <div className="absolute top-10 left-10 w-12 h-12 bg-black"></div>
        </div>

        {/* Start/Select Panel - using NES Constants 2,3 */}
        <div className="flex flex-col gap-4 sm:gap-6 items-center">
            <div className="flex gap-4">
                {createButton(2, 'SELECT', 'w-16 h-6 bg-stone-600 text-stone-200 text-[10px]')}
                {createButton(3, 'START', 'w-16 h-6 bg-stone-600 text-stone-200 text-[10px]')}
            </div>
            <div className="flex gap-2">
                <button 
                    className="w-16 sm:w-20 h-7 bg-stone-600 hover:bg-stone-500 active:bg-amber-600 text-stone-200 font-bold rounded text-[9px] sm:text-[10px] tracking-wider transition select-none flex items-center justify-center shadow"
                    onClick={toggleFullscreen}
                    title="Fullscreen"
                >
                    FULLSCREEN
                </button>
                <button 
                    className="w-16 sm:w-20 h-7 bg-red-800 hover:bg-red-700 active:bg-red-900 text-white font-bold rounded text-[9px] sm:text-[10px] tracking-wider transition select-none flex items-center justify-center shadow"
                    onClick={onExit}
                    onTouchStart={onExit}
                >
                    EXIT
                </button>
            </div>
            <div className="text-stone-700 font-bold tracking-widest text-xl">Nintendo</div>
        </div>

        {/* A/B Buttons - using NES Constants 0,1 */}
        <div className="flex gap-6 mr-4">
            {createButton(1, 'B', 'w-20 h-20 bg-red-600 text-white shadow-inner', 'circle')}
            {createButton(0, 'A', 'w-20 h-20 bg-red-600 text-white shadow-inner', 'circle')}
        </div>
      </div>
    </div>
  );
};
