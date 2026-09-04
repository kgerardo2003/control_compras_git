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

    // 4. Preset Predeterminado: Emblema Oficial del Organismo Judicial de Guatemala (Escudo de Armas con Quetzal, Fusiles, Espadas, Laureles y Pergamino)
    const primaryColor = lightMode ? '#1b365d' : '#f8fafc';
    const accentGold = '#d4af37';
    const pergaminoBg = lightMode ? '#ffffff' : '#0f172a';

    return (
      <div 
        className={`${iconSizes[size]} relative flex items-center justify-center p-0.5 transition-transform duration-200 hover:scale-105 flex-shrink-0 select-none`}
        title="Emblema Oficial - Organismo Judicial de Guatemala"
      >
        <svg 
          viewBox="0 0 500 560" 
          className="w-full h-full drop-shadow-xs"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <path id="oj-arch-text" d="M 65 210 A 185 185 0 0 1 435 210" fill="none" />
          </defs>

          {/* TEXTO ARQUEADO SUPERIOR: ORGANISMO JUDICIAL */}
          <text 
            fontFamily="'Times New Roman', 'Cinzel', serif" 
            fontSize="34" 
            fontWeight="bold" 
            fill={primaryColor} 
            letterSpacing="4"
          >
            <textPath href="#oj-arch-text" startOffset="50%" textAnchor="middle">
              ORGANISMO JUDICIAL
            </textPath>
          </text>

          {/* RAMAS DE LAUREL (CORONA CÍVICA) */}
          {/* Rama izquierda */}
          <path d="M 230 460 C 130 440 60 350 75 220 C 80 180 95 140 120 110" stroke={primaryColor} strokeWidth="4.5" fill="none" />
          <g fill={primaryColor}>
            <path d="M 80 230 C 60 220 55 195 72 205 C 80 210 85 220 80 230 Z" />
            <path d="M 90 260 C 65 255 60 230 80 240 C 90 245 95 255 90 260 Z" />
            <path d="M 105 295 C 80 295 75 270 95 275 C 105 280 110 290 105 295 Z" />
            <path d="M 125 335 C 100 340 95 315 115 315 C 125 320 130 330 125 335 Z" />
            <path d="M 150 375 C 125 385 120 360 140 355 C 150 360 155 370 150 375 Z" />
            <path d="M 185 415 C 160 425 155 400 175 395 C 185 400 190 410 185 415 Z" />
            <path d="M 220 445 C 195 455 190 430 210 425 C 220 430 225 440 220 445 Z" />
            <path d="M 95 215 C 110 200 125 215 110 225 C 100 225 95 220 95 215 Z" />
            <path d="M 110 250 C 125 235 140 250 125 260 C 115 260 110 255 110 250 Z" />
            <path d="M 130 290 C 145 275 160 290 145 300 C 135 300 130 295 130 290 Z" />
            <path d="M 155 330 C 170 315 185 330 170 340 C 160 340 155 335 155 330 Z" />
            <path d="M 185 370 C 200 355 215 370 200 380 C 190 380 185 375 185 370 Z" />
          </g>

          {/* Rama derecha */}
          <path d="M 270 460 C 370 440 440 350 425 220 C 420 180 405 140 380 110" stroke={primaryColor} strokeWidth="4.5" fill="none" />
          <g fill={primaryColor}>
            <path d="M 420 230 C 440 220 445 195 428 205 C 420 210 415 220 420 230 Z" />
            <path d="M 410 260 C 435 255 440 230 420 240 C 410 245 405 255 410 260 Z" />
            <path d="M 395 295 C 420 295 425 270 405 275 C 395 280 390 290 395 295 Z" />
            <path d="M 375 335 C 400 340 405 315 385 315 C 375 320 370 330 375 335 Z" />
            <path d="M 350 375 C 375 385 380 360 360 355 C 350 360 345 370 350 375 Z" />
            <path d="M 315 415 C 340 425 345 400 325 395 C 315 400 310 410 315 415 Z" />
            <path d="M 280 445 C 305 455 310 430 290 425 C 280 430 275 440 280 445 Z" />
            <path d="M 405 215 C 390 200 375 215 390 225 C 400 225 405 220 405 215 Z" />
            <path d="M 390 250 C 375 235 360 250 375 260 C 385 260 390 255 390 250 Z" />
            <path d="M 370 290 C 355 275 340 290 355 300 C 365 300 370 295 370 290 Z" />
            <path d="M 345 330 C 330 315 315 330 330 340 C 340 340 345 335 345 330 Z" />
            <path d="M 315 370 C 300 355 285 370 300 380 C 310 380 315 375 315 370 Z" />
          </g>

          {/* Lazo base */}
          <path d="M 230 460 Q 250 470 270 460 Q 250 455 230 460 Z" fill={primaryColor} />
          <path d="M 245 460 C 235 480 225 490 215 495" stroke={primaryColor} strokeWidth="3" fill="none" />
          <path d="M 255 460 C 265 480 275 490 285 495" stroke={primaryColor} strokeWidth="3" fill="none" />

          {/* DOS ESPADAS CRUZADAS */}
          <line x1="170" y1="410" x2="350" y2="170" stroke={primaryColor} strokeWidth="4" />
          <line x1="160" y1="400" x2="190" y2="420" stroke={accentGold} strokeWidth="4.5" />
          <circle cx="155" cy="425" r="7" fill="none" stroke={accentGold} strokeWidth="2.5" />

          <line x1="330" y1="410" x2="150" y2="170" stroke={primaryColor} strokeWidth="4" />
          <line x1="340" y1="400" x2="310" y2="420" stroke={accentGold} strokeWidth="4.5" />
          <circle cx="345" cy="425" r="7" fill="none" stroke={accentGold} strokeWidth="2.5" />

          {/* DOS FUSILES REMINGTON CRUZADOS CON BAYONETAS */}
          {/* Fusil 1 */}
          <line x1="120" y1="415" x2="365" y2="155" stroke={primaryColor} strokeWidth="5.5" />
          <path d="M 360 160 L 390 128 L 368 152 Z" fill={primaryColor} stroke={primaryColor} strokeWidth="2" />
          <path d="M 125 410 L 95 440 Q 105 450 125 445 L 145 425 Z" fill={primaryColor} />
          <path d="M 160 380 Q 155 390 168 395" stroke={primaryColor} strokeWidth="3" fill="none" />

          {/* Fusil 2 */}
          <line x1="380" y1="415" x2="135" y2="155" stroke={primaryColor} strokeWidth="5.5" />
          <path d="M 140 160 L 110 128 L 132 152 Z" fill={primaryColor} stroke={primaryColor} strokeWidth="2" />
          <path d="M 375 410 L 405 440 Q 395 450 375 445 L 355 425 Z" fill={primaryColor} />
          <path d="M 340 380 Q 345 390 332 395" stroke={primaryColor} strokeWidth="3" fill="none" />

          {/* PERGAMINO CENTRAL */}
          <path 
            d="M 195 210 Q 180 210 180 230 L 180 345 Q 180 365 200 365 L 300 365 Q 320 365 320 345 L 320 230 Q 320 210 300 210 Z" 
            fill={pergaminoBg} 
            stroke={primaryColor} 
            strokeWidth="4" 
          />
          <path d="M 195 210 C 185 200 170 205 170 220 C 170 235 185 235 195 225" fill={pergaminoBg} stroke={primaryColor} strokeWidth="3" />
          <path d="M 180 345 C 165 345 165 365 180 375 C 195 385 205 375 200 365" fill={pergaminoBg} stroke={primaryColor} strokeWidth="3" />
          <path d="M 305 210 C 315 200 330 205 330 220 C 330 235 315 235 305 225" fill={pergaminoBg} stroke={primaryColor} strokeWidth="3" />
          <line x1="205" y1="355" x2="235" y2="355" stroke={primaryColor} strokeWidth="1.5" />

          {/* TEXTO EN EL PERGAMINO */}
          <text x="250" y="246" fontFamily="'Times New Roman', serif" fontSize="13" fontWeight="bold" fill={primaryColor} textAnchor="middle" letterSpacing="1.5">
            LIBERTAD
          </text>
          <text x="250" y="266" fontFamily="'Times New Roman', serif" fontSize="12" fontWeight="bold" fill={primaryColor} textAnchor="middle" letterSpacing="1.5">
            15 DE
          </text>
          <text x="250" y="286" fontFamily="'Times New Roman', serif" fontSize="11" fontWeight="bold" fill={primaryColor} textAnchor="middle" letterSpacing="1">
            SEPTIEMBRE
          </text>
          <text x="250" y="306" fontFamily="'Times New Roman', serif" fontSize="11" fontWeight="bold" fill={primaryColor} textAnchor="middle" letterSpacing="1.5">
            DE 1821
          </text>

          {/* EL QUETZAL */}
          <circle cx="258" cy="148" r="11" fill={primaryColor} />
          <path d="M 248 147 L 238 149 L 248 152 Z" fill={primaryColor} />
          <circle cx="255" cy="146" r="2" fill={lightMode ? '#ffffff' : '#0f172a'} />
          <path d="M 258 137 C 260 130 266 132 264 139 Z" fill={primaryColor} />
          <path d="M 262 138 C 266 132 272 135 268 142 Z" fill={primaryColor} />
          <path d="M 252 155 C 245 168 250 188 262 195 C 275 195 285 180 275 160 Z" fill={primaryColor} />
          <path d="M 268 162 C 285 170 295 195 285 220 C 275 220 270 195 265 178 Z" fill={primaryColor} stroke={lightMode ? '#ffffff' : '#0f172a'} strokeWidth="1.2" />
          <line x1="262" y1="195" x2="260" y2="208" stroke={primaryColor} strokeWidth="3" />
          <line x1="270" y1="195" x2="272" y2="208" stroke={primaryColor} strokeWidth="3" />
          <path d="M 280 210 C 300 230 320 265 315 310 C 310 350 285 390 280 435" stroke={primaryColor} strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M 284 215 C 305 240 326 280 320 330 C 315 370 290 410 286 455" stroke={primaryColor} strokeWidth="3.5" fill="none" strokeLinecap="round" />

          {/* TEXTO INFERIOR: GUATEMALA, C.A. */}
          <text 
            x="250" 
            y="525" 
            fontFamily="'Times New Roman', 'Cinzel', serif" 
            fontSize="34" 
            fontWeight="bold" 
            fill={primaryColor} 
            textAnchor="middle" 
            letterSpacing="4"
          >
            GUATEMALA, C.A.
          </text>
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
