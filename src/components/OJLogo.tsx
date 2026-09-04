import React from 'react';
import { useApp } from '../context/AppContext';

interface OJLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'full' | 'icon' | 'badge';
  layout?: 'horizontal' | 'stacked';
  lightMode?: boolean;
  overrideLogo?: {
    type: 'preset' | 'custom_image';
    presetId?: 'oj_vector' | 'oj_monogram' | 'escudo_nacional';
    imageUrl?: string;
    title?: string;
    subtitle?: string;
  };
}

export const OJLogo: React.FC<OJLogoProps> = ({ 
  size = 'md', 
  variant = 'full',
  layout = 'stacked',
  lightMode = false,
  overrideLogo
}) => {
  const appContext = useApp();
  const activeLogo = overrideLogo || appContext?.customLogo || {
    type: 'preset',
    presetId: 'oj_vector',
    title: 'Organismo Judicial',
    subtitle: 'Gerencia de Informática y Telecomunicaciones (GIT)'
  };

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-14 h-14',
    lg: 'w-18 h-18 sm:w-20 sm:h-20',
    xl: 'w-24 h-24',
    '2xl': 'w-28 h-28 sm:w-32 sm:h-32'
  };

  // Renderiza el gráfico del logo según tipo/preset
  const renderEmblem = () => {
    // 1. Imagen Personalizada Subida por el Usuario
    if (activeLogo.type === 'custom_image' && activeLogo.imageUrl) {
      return (
        <div 
          className={`${iconSizes[size]} relative rounded-lg overflow-hidden flex items-center justify-center p-0.5 shadow-sm border border-slate-300/50 bg-white`}
        >
          <img 
            src={activeLogo.imageUrl} 
            alt="Logotipo Personalizado" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }

    // 2. Preset: Monograma Heráldico OJ
    if (activeLogo.presetId === 'oj_monogram') {
      return (
        <div 
          className={`${iconSizes[size]} relative rounded-lg flex items-center justify-center p-0.5 shadow-sm transition-transform duration-200 hover:scale-105`}
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '2px solid #D4AF37'
          }}
        >
          <div className="w-full h-full rounded border border-amber-400/40 flex flex-col items-center justify-center bg-slate-950/60">
            <span className="font-extrabold tracking-widest text-amber-400 font-serif text-sm sm:text-base leading-none">
              OJ
            </span>
            <span className="text-[7px] text-sky-200 font-sans uppercase font-bold tracking-tighter mt-0.5">
              LEYES
            </span>
          </div>
        </div>
      );
    }

    // 3. Preset: Escudo Cívico Nacional
    if (activeLogo.presetId === 'escudo_nacional') {
      return (
        <div 
          className={`${iconSizes[size]} relative rounded-full flex items-center justify-center p-0.5 shadow-sm transition-transform duration-200 hover:scale-105`}
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            border: '2px solid #F59E0B'
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="46" fill="#0A3254" stroke="#F59E0B" strokeWidth="2" />
            {/* Pergamino */}
            <rect x="28" y="30" width="44" height="40" rx="3" fill="#FFFBEB" stroke="#D97706" strokeWidth="1.5" />
            <line x1="33" y1="40" x2="67" y2="40" stroke="#92400E" strokeWidth="1" />
            <line x1="33" y1="46" x2="67" y2="46" stroke="#92400E" strokeWidth="1" />
            <line x1="33" y1="52" x2="67" y2="52" stroke="#92400E" strokeWidth="1" />
            <line x1="33" y1="58" x2="55" y2="58" stroke="#92400E" strokeWidth="1" />
            {/* Quetzal encima */}
            <circle cx="48" cy="24" r="5" fill="#10B981" />
            <path d="M 44 26 C 42 34, 38 42, 34 50" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 52 25 L 56 24 L 52 27 Z" fill="#F59E0B" />
          </svg>
        </div>
      );
    }

    // 4. Preset Predeterminado: Balanza y Columnas Oficiales OJ
    return (
      <div 
        className={`${iconSizes[size]} relative rounded-full flex items-center justify-center p-0.5 shadow-sm transition-transform duration-200 hover:scale-105 flex-shrink-0`}
        style={{
          background: 'linear-gradient(135deg, #0A3A60 0%, #001B30 100%)',
          border: '1.5px solid #C59B27'
        }}
      >
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Anillo dorado exterior */}
          <circle cx="50" cy="50" r="46" stroke="#D4AF37" strokeWidth="1.5" strokeDasharray="3 2" />
          
          {/* Fondo azul institucional profundo */}
          <circle cx="50" cy="50" r="43" fill="#0A3254" />
          
          {/* Laureles / Hojas doradas en la base */}
          <path 
            d="M 26 68 C 28 78, 38 84, 50 85 C 62 84, 72 78, 74 68" 
            stroke="#D4AF37" 
            strokeWidth="2" 
            strokeLinecap="round" 
            fill="none" 
          />
          <path d="M 28 72 L 32 70" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 36 78 L 40 75" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 64 78 L 60 75" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 72 72 L 68 70" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" />

          {/* Columna central / Pilar de la justicia */}
          <rect x="47.5" y="24" width="5" height="46" fill="#F3F4F6" rx="1.5" />
          <circle cx="50" cy="22" r="4" fill="#D4AF37" />
          
          {/* Base del pilar */}
          <path d="M 40 70 L 60 70 L 56 65 L 44 65 Z" fill="#D4AF37" />

          {/* Viga horizontal de la balanza */}
          <path d="M 22 34 L 78 34" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" />

          {/* Cuerdas y platos */}
          <path d="M 24 35 L 17 49 L 31 49 Z" stroke="#E5E7EB" strokeWidth="1" fill="none" />
          <path d="M 14 49 C 14 55, 34 55, 34 49 Z" fill="#D4AF37" />

          <path d="M 76 35 L 69 49 L 83 49 Z" stroke="#E5E7EB" strokeWidth="1" fill="none" />
          <path d="M 66 49 C 66 55, 86 55, 86 49 Z" fill="#D4AF37" />

          {/* Libro de la ley abierto en la base */}
          <path d="M 41 62 C 45 60, 48 61, 50 62 C 52 61, 55 60, 59 62 L 59 67 C 55 65, 52 66, 50 67 C 48 66, 45 65, 41 67 Z" fill="#FFFFFF" stroke="#0A3254" strokeWidth="0.8" />
        </svg>
      </div>
    );
  };

  if (layout === 'stacked') {
    return (
      <div className="flex flex-col items-center text-center select-none w-full">
        {/* Emblema en Área Grande Superior */}
        <div className="flex items-center justify-center p-1 relative mb-2">
          {renderEmblem()}
        </div>

        {/* Texto Institucional Debajo del Emblema */}
        {variant !== 'icon' && (
          <div className="flex flex-col items-center max-w-full px-1">
            <span className={`font-bold tracking-wider uppercase text-xs sm:text-sm font-['Cinzel',serif] leading-tight ${lightMode ? 'text-slate-900' : 'text-white'}`}>
              {activeLogo.title || 'Organismo Judicial'}
            </span>
            <div className="flex items-center justify-center gap-1.5 my-0.5">
              <span className={`h-px w-4 ${lightMode ? 'bg-amber-600/40' : 'bg-amber-400/40'}`} />
              <span className={`text-[9px] uppercase font-bold tracking-widest ${lightMode ? 'text-amber-700' : 'text-amber-400'}`}>
                Guatemala, C.A.
              </span>
              <span className={`h-px w-4 ${lightMode ? 'bg-amber-600/40' : 'bg-amber-400/40'}`} />
            </div>
            <span className={`text-[10px] sm:text-[11px] font-medium tracking-tight leading-snug line-clamp-2 ${lightMode ? 'text-slate-600' : 'text-slate-300'}`}>
              {activeLogo.subtitle || 'Gerencia de Informática y Telecomunicaciones (GIT)'}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 select-none">
      {renderEmblem()}

      {/* Texto Institucional */}
      {variant !== 'icon' && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-semibold tracking-wide uppercase text-xs sm:text-sm font-['Cinzel',serif] truncate ${lightMode ? 'text-slate-900' : 'text-white'}`}>
              {activeLogo.title || 'Organismo Judicial'}
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] uppercase font-bold tracking-wider rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 flex-shrink-0">
              Guatemala
            </span>
          </div>
          <span className={`text-[11px] sm:text-xs font-medium tracking-normal truncate ${lightMode ? 'text-blue-900' : 'text-sky-200'}`}>
            {activeLogo.subtitle || 'Gerencia de Informática y Telecomunicaciones (GIT)'}
          </span>
        </div>
      )}
    </div>
  );
};
