import React, { useState, useRef, useEffect } from 'react';
import {
  Monitor,
  Laptop,
  Tablet,
  Smartphone,
  RotateCw,
  Maximize2,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  RefreshCw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { ViewportDevice, DeviceConfig } from '../types';

interface DeviceFrameProps {
  bundledHtml: string;
  entryPoint: string;
  availableHtmlFiles: string[];
  onSelectEntryPoint: (path: string) => void;
  onReload: () => void;
  projectName: string;
}

const DEVICE_PRESETS: DeviceConfig[] = [
  { id: 'responsive', name: 'Responsive (100%)', width: '100%', height: '100%', icon: 'Monitor' },
  { id: 'laptop', name: 'Laptop (1366 × 768)', width: 1366, height: 768, icon: 'Laptop' },
  { id: 'tablet', name: 'Tablet (768 × 1024)', width: 768, height: 1024, icon: 'Tablet' },
  { id: 'mobile_iphone', name: 'iPhone (375 × 667)', width: 375, height: 667, icon: 'Smartphone' },
  { id: 'mobile_android', name: 'Android (412 × 915)', width: 412, height: 915, icon: 'Smartphone' },
];

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  bundledHtml,
  entryPoint,
  availableHtmlFiles,
  onSelectEntryPoint,
  onReload,
  projectName,
}) => {
  const [currentDevice, setCurrentDevice] = useState<ViewportDevice>('responsive');
  const [isLandscape, setIsLandscape] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isHtmlDropdownOpen, setIsHtmlDropdownOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPreset = DEVICE_PRESETS.find(p => p.id === currentDevice) || DEVICE_PRESETS[0];

  const handlePopOut = () => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.open();
      newWindow.document.write(bundledHtml);
      newWindow.document.close();
    }
  };

  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      }
    }
  };

  // Dimensions computation
  let frameWidth: number | string = selectedPreset.width;
  let frameHeight: number | string = selectedPreset.height;

  if (typeof frameWidth === 'number' && typeof frameHeight === 'number' && isLandscape) {
    // Swap for landscape
    const temp = frameWidth;
    frameWidth = frameHeight;
    frameHeight = temp;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      {/* Top Device Toolbar */}
      <div className="h-11 bg-slate-900/90 border-b border-slate-800/80 px-3 flex items-center justify-between gap-2 select-none z-10">
        {/* URL Bar & HTML Entry Point */}
        <div className="flex items-center gap-1.5 flex-1 max-w-md bg-slate-950/80 border border-slate-800 rounded-md px-2.5 py-1 text-xs">
          <button
            onClick={onReload}
            title="Reload sandbox"
            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <span className="text-cyan-500 font-mono text-[11px]">zip://</span>

          <div className="relative flex-1">
            <button
              onClick={() => setIsHtmlDropdownOpen(!isHtmlDropdownOpen)}
              className="w-full text-left font-mono text-slate-200 hover:text-cyan-400 flex items-center justify-between transition-colors truncate"
            >
              <span className="truncate">{entryPoint}</span>
              {availableHtmlFiles.length > 1 && (
                <ChevronDown className="w-3 h-3 text-slate-400 ml-1 shrink-0" />
              )}
            </button>

            {isHtmlDropdownOpen && availableHtmlFiles.length > 1 && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsHtmlDropdownOpen(false)} />
                <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-40">
                  <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                    Switch HTML Page
                  </div>
                  {availableHtmlFiles.map(path => (
                    <button
                      key={path}
                      onClick={() => {
                        onSelectEntryPoint(path);
                        setIsHtmlDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs font-mono transition-colors ${
                        path === entryPoint ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {path}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Device Viewport Preset Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          {DEVICE_PRESETS.map(preset => {
            const isSelected = currentDevice === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setCurrentDevice(preset.id)}
                title={preset.name}
                className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                {preset.id === 'responsive' && <Monitor className="w-3.5 h-3.5" />}
                {preset.id === 'laptop' && <Laptop className="w-3.5 h-3.5" />}
                {preset.id === 'tablet' && <Tablet className="w-3.5 h-3.5" />}
                {(preset.id === 'mobile_iphone' || preset.id === 'mobile_android') && <Smartphone className="w-3.5 h-3.5" />}
                <span className="hidden xl:inline text-[11px]">{preset.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Orientation & Zoom & Popout */}
        <div className="flex items-center gap-1">
          {currentDevice !== 'responsive' && (
            <button
              onClick={() => setIsLandscape(!isLandscape)}
              title="Rotate Device (Portrait/Landscape)"
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Zoom controls */}
          <div className="hidden lg:flex items-center gap-1 text-slate-400 text-xs px-1">
            <button
              onClick={() => setZoomScale(Math.max(0.5, zoomScale - 0.25))}
              disabled={zoomScale <= 0.5}
              className="p-1 hover:text-white disabled:opacity-30"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] w-9 text-center">{Math.round(zoomScale * 100)}%</span>
            <button
              onClick={() => setZoomScale(Math.min(1.5, zoomScale + 0.25))}
              disabled={zoomScale >= 1.5}
              className="p-1 hover:text-white disabled:opacity-30"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleFullscreen}
            title="Fullscreen Sandbox"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handlePopOut}
            title="Open in new window / tab"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Frame Center Container */}
      <div
        ref={containerRef}
        className="flex-1 bg-slate-950 flex items-center justify-center p-2 sm:p-4 overflow-auto relative"
      >
        <div
          style={{
            width: typeof frameWidth === 'number' ? `${frameWidth}px` : '100%',
            height: typeof frameHeight === 'number' ? `${frameHeight}px` : '100%',
            transform: `scale(${zoomScale})`,
            transformOrigin: 'center center',
            transition: 'width 0.2s ease, height 0.2s ease',
          }}
          className={`relative bg-black transition-shadow duration-300 flex flex-col overflow-hidden ${
            currentDevice === 'responsive'
              ? 'w-full h-full rounded-none'
              : 'rounded-2xl border-4 border-slate-800 shadow-2xl shadow-black/80 max-h-full max-w-full'
          }`}
        >
          {/* Mockup Top Notch for Mobile */}
          {(currentDevice === 'mobile_iphone' || currentDevice === 'mobile_android') && (
            <div className="h-4 bg-slate-900 flex items-center justify-center shrink-0 border-b border-slate-800/40 select-none">
              <div className="w-16 h-2.5 bg-slate-950 rounded-full" />
            </div>
          )}

          {/* Sandbox Iframe */}
          <iframe
            ref={iframeRef}
            srcDoc={bundledHtml}
            title={`${projectName} - Live Sandbox`}
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals allow-downloads allow-pointer-lock allow-orientation-lock"
            allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
            className="w-full flex-1 border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
};
