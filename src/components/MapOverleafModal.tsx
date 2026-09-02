import React from 'react';
import { Map as MapIcon, ExternalLink, X } from 'lucide-react';
import { MapOverleafModalState } from '../types';

interface MapOverleafModalProps {
  isOpen?: boolean;
  modalState?: MapOverleafModalState;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  embedUrl?: string;
  externalUrl?: string;
}

export const MapOverleafModal: React.FC<MapOverleafModalProps> = ({
  isOpen: propIsOpen,
  modalState,
  onClose,
  title: propTitle,
  subtitle: propSubtitle,
  embedUrl: propEmbedUrl,
  externalUrl: propExternalUrl
}) => {
  const isOpen = propIsOpen !== undefined ? propIsOpen : (modalState ? modalState.isOpen : false);
  if (!isOpen) return null;

  const title = propTitle || (modalState ? modalState.title : '');
  const subtitle = propSubtitle || (modalState ? modalState.subtitle : '');
  const embedUrl = propEmbedUrl || (modalState ? modalState.embedUrl : '');
  const externalUrl = propExternalUrl || (modalState ? modalState.externalUrl : '');

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity" onClick={onClose} />
      <div className="bg-white dark:bg-[#151515] rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] relative z-10 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/80 dark:bg-gray-900/80 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <MapIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate">
                {title || 'Google Maps Preview'}
              </h3>
              {subtitle && (
                <p className="text-[10px] text-gray-400 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {externalUrl && externalUrl !== '#' && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span>Open in Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 w-full h-full relative bg-gray-950">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-xs">
              No embed available. Click "Open in Maps" above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
