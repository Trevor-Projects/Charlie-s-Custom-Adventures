import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Compass,
  X,
  Sparkles,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Shield,
  Skull,
  Landmark,
  Home,
  Flame,
  Trees,
  Layers,
  ChevronRight,
  Navigation,
  Eye,
  EyeOff,
  Wand2,
  BookOpen,
  AlertTriangle,
  Info,
  Scroll,
  Check,
} from 'lucide-react';
import { GameState, WorldMapData, MapLocationPin } from '../types';
import { soundManager } from '../utils/audio';
import defaultWorldMapImage from '../assets/images/campaign_world_map_1786909507957.jpg';

interface WorldMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onUpdateWorldMap: (mapData: WorldMapData) => void;
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  isOpen,
  onClose,
  gameState,
  onUpdateWorldMap,
}) => {
  if (!isOpen) return null;

  const { worldName, worldSummary, settingName, milestones, currentMilestoneIndex, worldMap, historicalInspirations } = gameState;
  const currentMilestone = milestones[currentMilestoneIndex] || {
    chapter: 1,
    title: 'The Starting Horizon',
    description: 'Venturing forth into the realm.',
  };

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedPin, setSelectedPin] = useState<MapLocationPin | null>(null);
  const [showPins, setShowPins] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'milestones' | 'settlements' | 'dungeons'>('all');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedStyle, setSelectedStyle] = useState<string>('antique');
  const [mapGenError, setMapGenError] = useState<string | null>(null);

  // Default fallback map structure if no map generated yet
  const getDefaultMapData = (): WorldMapData => {
    const locations: MapLocationPin[] = [
      {
        id: 'loc_start',
        name: `${worldName || 'High-Seat'} Citadel & Haven`,
        type: 'capital',
        x: 28,
        y: 42,
        description: `The grand sovereign bastion of ${worldName || 'the realm'}. Sturdy stone walls and vibrant merchant guilds provide sanctuary before the wilderness.`,
        dangerLevel: 'Safe',
        discovered: true,
        chapterMilestone: 1,
      },
      {
        id: 'loc_ch2',
        name: 'Whispering Blackwood & Sunken Barrow',
        type: 'dungeon',
        x: 52,
        y: 35,
        description: 'An ancient mist-shrouded woodland rumored to harbor the forgotten ruins of an ancient dynasty.',
        dangerLevel: 'Dangerous',
        discovered: currentMilestoneIndex >= 1,
        chapterMilestone: 2,
      },
      {
        id: 'loc_ch3',
        name: 'Shattered Crag Fortress & Dragon Peak',
        type: 'ruins',
        x: 74,
        y: 28,
        description: 'Jagged volcanic needles pierced by ancient dwarven fortifications and arcane watchtowers.',
        dangerLevel: 'Dangerous',
        discovered: currentMilestoneIndex >= 2,
        chapterMilestone: 3,
      },
      {
        id: 'loc_ch4',
        name: 'The Abyssal Rift & Sunken Altar',
        type: 'temple',
        x: 65,
        y: 72,
        description: 'The epic terminus of the grand campaign where cosmic forces converge.',
        dangerLevel: 'Lethal',
        discovered: currentMilestoneIndex >= 3,
        chapterMilestone: 4,
      },
      {
        id: 'loc_sea',
        name: 'The Gilded Coast & Leviathan Deep',
        type: 'wilderness',
        x: 22,
        y: 75,
        description: 'Windswept cliffs overlooking tempestuous waters where ancient galleons trade with island nomadic leagues.',
        dangerLevel: 'Moderate',
        discovered: true,
      },
      {
        id: 'loc_oasis',
        name: 'Moonwell Sanctuary & Sacred Grove',
        type: 'temple',
        x: 82,
        y: 60,
        description: 'A hidden verdant oasis radiating protective druidic enchantments.',
        dangerLevel: 'Safe',
        discovered: true,
      },
    ];

    return {
      imageUrl: defaultWorldMapImage,
      mapTitle: `The Great Cartography of ${worldName || 'The Known Realm'}`,
      styleDescription: 'Antique hand-drawn sepia parchment with gold-leaf heraldry',
      regionSummary: `An expansive tapestry of ancient realms, craggy ranges, and mystical coastlines spanning the continents of ${worldName || 'the realm'}.`,
      cartographerNotes: '"Heed the trade winds and watchful spires; beyond the marked contours lie things older than men."',
      locations,
      currentPartyLocation: {
        x: 28,
        y: 42,
        locationName: `${worldName || 'High-Seat'} Citadel`,
      },
      generatedAt: new Date().toISOString(),
    };
  };

  const activeMap: WorldMapData = worldMap || getDefaultMapData();

  // If no world map saved in GameState, initialize it on open
  useEffect(() => {
    if (!worldMap) {
      onUpdateWorldMap(getDefaultMapData());
    }
  }, [worldMap]);

  // Handle AI generation / regeneration
  const handleGenerateMap = async (style: string = selectedStyle) => {
    setIsGenerating(true);
    setMapGenError(null);
    soundManager.playDiceRoll();

    try {
      const response = await fetch('/api/gemini/generate-world-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worldName,
          worldSummary,
          settingName,
          milestones,
          historicalInspirations,
          mapStyle: style,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate world map');
      }

      const newMapData: WorldMapData = await response.json();
      
      // If AI didn't return an image, keep the high-res default world map image
      if (!newMapData.imageUrl) {
        newMapData.imageUrl = defaultWorldMapImage;
      }

      onUpdateWorldMap(newMapData);
      soundManager.playSuccess();
    } catch (err: any) {
      console.error('World map generation error:', err);
      setMapGenError('Could not generate visual map with AI. Using the master realm cartography.');
      soundManager.playPageTurn();
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter locations
  const filteredLocations = activeMap.locations.filter((loc) => {
    if (activeFilter === 'milestones') return !!loc.chapterMilestone;
    if (activeFilter === 'settlements') return loc.type === 'capital' || loc.type === 'settlement';
    if (activeFilter === 'dungeons') return loc.type === 'dungeon' || loc.type === 'ruins';
    return true;
  });

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'capital':
        return <Landmark className="w-3.5 h-3.5" />;
      case 'settlement':
        return <Home className="w-3.5 h-3.5" />;
      case 'dungeon':
        return <Skull className="w-3.5 h-3.5" />;
      case 'ruins':
        return <Scroll className="w-3.5 h-3.5" />;
      case 'temple':
        return <Flame className="w-3.5 h-3.5" />;
      case 'wilderness':
        return <Trees className="w-3.5 h-3.5" />;
      default:
        return <MapPin className="w-3.5 h-3.5" />;
    }
  };

  const getDangerBadge = (danger: string) => {
    switch (danger) {
      case 'Safe':
        return 'bg-emerald-950 text-emerald-300 border-emerald-700/60';
      case 'Moderate':
        return 'bg-amber-950 text-amber-300 border-amber-700/60';
      case 'Dangerous':
        return 'bg-orange-950 text-orange-300 border-orange-700/60';
      case 'Lethal':
        return 'bg-rose-950 text-rose-300 border-rose-700/60 animate-pulse';
      default:
        return 'bg-stone-900 text-stone-300 border-stone-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-stone-900 border border-amber-800/80 rounded-2xl max-w-6xl w-full h-[92vh] shadow-2xl text-stone-100 relative flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="bg-stone-950 border-b border-amber-800/60 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-950/90 rounded-xl border border-amber-700/70 text-amber-300 shadow-inner">
              <Compass className="w-5 h-5 animate-spin [animation-duration:15s]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif font-bold text-amber-100">
                  {activeMap.mapTitle}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
                  World Map
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-sans hidden sm:block truncate max-w-md">
                {activeMap.regionSummary}
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Filter Pills */}
            <div className="hidden md:flex items-center gap-1 bg-stone-900 p-1 rounded-lg border border-stone-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  activeFilter === 'all' ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                All ({activeMap.locations.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('milestones')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  activeFilter === 'milestones' ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Chapters
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('settlements')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  activeFilter === 'settlements' ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Havens
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('dungeons')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  activeFilter === 'dungeons' ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Dungeons
              </button>
            </div>

            {/* Toggle Pins */}
            <button
              type="button"
              onClick={() => setShowPins(!showPins)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                showPins
                  ? 'bg-amber-950/70 border-amber-700 text-amber-300'
                  : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
              }`}
              title={showPins ? 'Hide Location Markers' : 'Show Location Markers'}
            >
              {showPins ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            {/* AI Re-generate Button */}
            <button
              type="button"
              onClick={() => handleGenerateMap()}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold font-serif transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-amber-600/20"
              title="Regenerate Cartography & Visuals with Gemini AI"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Mapping Realm...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">AI Regenerate</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-amber-200 hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {mapGenError && (
          <div className="bg-amber-950/70 border-b border-amber-800 px-4 py-1.5 text-xs text-amber-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400" /> {mapGenError}
            </span>
            <button
              onClick={() => setMapGenError(null)}
              className="text-stone-400 hover:text-stone-200 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Content Area: Map Canvas + Sidebar */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Map Viewer Container */}
          <div className="flex-1 bg-stone-950 relative overflow-hidden flex items-center justify-center select-none border-b lg:border-b-0 lg:border-r border-stone-800">
            {/* Background Map Canvas Wrapper with Zoom */}
            <div
              className="relative w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
              }}
            >
              {/* Map Illustration Image */}
              <img
                src={activeMap.imageUrl || defaultWorldMapImage}
                alt={activeMap.mapTitle}
                referrerPolicy="no-referrer"
                className="max-h-full max-w-full object-contain pointer-events-none rounded shadow-2xl"
                style={{
                  filter: 'contrast(102%) brightness(98%) sepia(8%)',
                }}
              />

              {/* Parchment Grid & Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-stone-950/20 pointer-events-none" />

              {/* Decorative Corner Ornaments */}
              <div className="absolute top-4 left-4 p-2 bg-stone-950/70 border border-amber-900/50 rounded-lg text-amber-400/80 pointer-events-none hidden sm:flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                  Septentrio / North
                </span>
              </div>

              {/* Interactive Location Pins Overlay */}
              {showPins && (
                <div className="absolute inset-0 max-w-full max-h-full pointer-events-auto">
                  {/* Current Active Party Marker Beacon */}
                  {activeMap.currentPartyLocation && (
                    <div
                      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                      style={{
                        left: `${activeMap.currentPartyLocation.x}%`,
                        top: `${activeMap.currentPartyLocation.y}%`,
                      }}
                      onClick={() => {
                        soundManager.playPageTurn();
                        setSelectedPin({
                          id: 'party_current',
                          name: `Party Camp: ${activeMap.currentPartyLocation.locationName}`,
                          type: 'capital',
                          x: activeMap.currentPartyLocation.x,
                          y: activeMap.currentPartyLocation.y,
                          description: `The active camp and staging ground of the party in Chapter ${currentMilestone.chapter}: ${currentMilestone.title}.`,
                          dangerLevel: 'Safe',
                          discovered: true,
                        });
                      }}
                    >
                      <div className="relative flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-amber-500/30 animate-ping absolute" />
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-stone-950 flex items-center justify-center text-stone-950 shadow-xl z-10">
                          <Navigation className="w-4 h-4 animate-bounce" />
                        </div>
                      </div>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 bg-stone-950/95 border border-amber-500 text-amber-200 text-[11px] rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-serif font-bold">
                        📍 Party: {activeMap.currentPartyLocation.locationName}
                      </div>
                    </div>
                  )}

                  {/* Generated Landmarks / POIs */}
                  {filteredLocations.map((loc) => {
                    const isSelected = selectedPin?.id === loc.id;
                    const isChapterTarget = loc.chapterMilestone === currentMilestone.chapter;

                    return (
                      <div
                        key={loc.id}
                        className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-all duration-200 ${
                          isSelected ? 'scale-125 z-30' : 'hover:scale-115'
                        }`}
                        style={{
                          left: `${loc.x}%`,
                          top: `${loc.y}%`,
                        }}
                        onClick={() => {
                          soundManager.playPageTurn();
                          setSelectedPin(loc);
                        }}
                      >
                        <div
                          className={`p-1.5 rounded-full border shadow-lg flex items-center justify-center transition-colors ${
                            isChapterTarget
                              ? 'bg-amber-500 text-stone-950 border-amber-200 ring-2 ring-amber-400/50 animate-pulse'
                              : isSelected
                              ? 'bg-amber-600 text-stone-950 border-amber-300'
                              : 'bg-stone-900/90 text-amber-300 border-amber-700/70 hover:bg-amber-950'
                          }`}
                        >
                          {getLocationIcon(loc.type)}
                        </div>

                        {/* Location Name Label Overlay */}
                        <div
                          className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded text-[10px] font-serif font-bold whitespace-nowrap transition-all ${
                            isSelected
                              ? 'bg-amber-950 text-amber-200 border border-amber-600 shadow-lg opacity-100'
                              : 'bg-stone-950/80 text-stone-300 border border-stone-800 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {loc.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Floating Zoom & Canvas Controls */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-stone-900/90 border border-stone-800 p-1.5 rounded-xl shadow-2xl backdrop-blur-sm z-30">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.min(2.5, prev + 0.25))}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-200 transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono px-1 text-stone-400 min-w-10 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.max(0.75, prev - 0.25))}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-200 transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-200 transition-colors cursor-pointer text-xs font-mono"
                title="Reset Zoom"
              >
                1:1
              </button>
            </div>

            {/* Current Chapter Objective Badge */}
            <div className="absolute top-4 right-4 max-w-xs bg-stone-950/85 border border-amber-800/70 p-2.5 rounded-xl shadow-xl backdrop-blur-sm z-30 hidden sm:block">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-serif font-bold">
                <Shield className="w-3.5 h-3.5" />
                <span>Chapter {currentMilestone.chapter} Objective:</span>
              </div>
              <p className="text-[11px] text-stone-300 mt-0.5 line-clamp-2">
                {currentMilestone.title} - {currentMilestone.description}
              </p>
            </div>
          </div>

          {/* Right Sidebar: Location Lore Inspector & Cartographer Notes */}
          <div className="w-full lg:w-84 bg-stone-900 p-4 flex flex-col justify-between overflow-y-auto space-y-4 shrink-0">
            {/* Inspector Card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-400" /> Location Dossier
                </span>
                {selectedPin && (
                  <button
                    onClick={() => setSelectedPin(null)}
                    className="text-[10px] text-stone-400 hover:text-stone-200 font-mono"
                  >
                    Clear
                  </button>
                )}
              </div>

              {selectedPin ? (
                <div className="bg-stone-950 p-4 rounded-xl border border-amber-800/60 space-y-3 shadow-inner">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-serif font-bold text-amber-100 text-base">
                      {selectedPin.name}
                    </h4>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getDangerBadge(selectedPin.dangerLevel)}`}>
                      {selectedPin.dangerLevel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-stone-400 font-mono">
                    <span className="capitalize px-2 py-0.5 rounded bg-stone-900 border border-stone-800">
                      Type: {selectedPin.type}
                    </span>
                    <span>Coordinates: [{selectedPin.x}°, {selectedPin.y}°]</span>
                  </div>

                  <p className="text-xs text-stone-300 font-serif leading-relaxed">
                    {selectedPin.description}
                  </p>

                  {selectedPin.chapterMilestone && (
                    <div className="pt-2 border-t border-stone-900 flex items-center gap-1.5 text-xs text-amber-300 font-serif">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Linked to Campaign Chapter {selectedPin.chapterMilestone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 text-center space-y-2">
                  <Compass className="w-8 h-8 text-amber-500/40 mx-auto" />
                  <p className="text-xs text-stone-400 font-serif">
                    Click any pin on the map to inspect landmark lore, danger levels, and chapter linkages.
                  </p>
                </div>
              )}

              {/* Cartographer's Notes */}
              {activeMap.cartographerNotes && (
                <div className="bg-amber-950/20 border border-amber-900/40 p-3 rounded-xl space-y-1 text-xs">
                  <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider block">
                    📜 Cartographer's Inscription:
                  </span>
                  <p className="text-stone-300 italic font-serif leading-relaxed">
                    {activeMap.cartographerNotes}
                  </p>
                </div>
              )}

              {/* Points of Interest Index List */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest block font-bold">
                  Realm Landmarks ({activeMap.locations.length}):
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {activeMap.locations.map((loc) => (
                    <div
                      key={loc.id}
                      onClick={() => {
                        soundManager.playPageTurn();
                        setSelectedPin(loc);
                      }}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        selectedPin?.id === loc.id
                          ? 'bg-amber-950 border-amber-600 text-amber-100'
                          : 'bg-stone-950 border-stone-800 text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-amber-400 shrink-0">{getLocationIcon(loc.type)}</span>
                        <span className="truncate font-serif">{loc.name}</span>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${getDangerBadge(loc.dangerLevel)}`}>
                        {loc.dangerLevel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Style Settings & Export */}
            <div className="pt-3 border-t border-stone-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-stone-400">Map Cartography Style:</span>
                <select
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="bg-stone-950 border border-stone-700 text-amber-200 text-xs rounded px-2 py-1 cursor-pointer focus:outline-none"
                >
                  <option value="antique">Antique Sepia Parchment</option>
                  <option value="topographic">Tactical Topography</option>
                  <option value="mystic">Arcane Astral Leylines</option>
                  <option value="military">High-Seat War Map</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleGenerateMap(selectedStyle)}
                disabled={isGenerating}
                className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold font-serif transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Painting World Map...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Map with Gemini AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
