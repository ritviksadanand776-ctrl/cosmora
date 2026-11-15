import React, { useState } from 'react';
import { Check, Coins, Lock, ShoppingBag, Sparkles, X } from 'lucide-react';
import {
  BoosterStyle,
  CATALOG_ITEMS,
  CatalogItem,
  DESTINATIONS,
  FairingStyle,
  LanderFinish,
  PlumeStyle,
  ShopCategory,
  SpacecraftConfig,
} from '../types/mission';

interface ShopModalProps {
  credits: number;
  unlockedIds: string[];
  config: SpacecraftConfig;
  onBuyItem: (item: CatalogItem) => void;
  onEquipItem: (item: CatalogItem) => void;
  onClose: () => void;
}

type FilterTab = 'all' | 'colors' | 'structure' | 'systems';

export const ShopModal: React.FC<ShopModalProps> = ({
  credits,
  unlockedIds,
  config,
  onBuyItem,
  onEquipItem,
  onClose,
}) => {
  const [tab, setTab] = useState<FilterTab>('all');

  const isEquipped = (item: CatalogItem): boolean => {
    switch (item.category) {
      case 'hull':
        return config.hullColor === item.value;
      case 'accent':
        return config.accentColor === item.value;
      case 'booster':
        return config.boosterStyle === (item.value as BoosterStyle);
      case 'fairing':
        return config.fairingStyle === (item.value as FairingStyle);
      case 'foil':
        return config.landerFinish === (item.value as LanderFinish);
      case 'plume':
        return config.plumeStyle === (item.value as PlumeStyle);
    }
  };

  const categoryMatchesTab = (cat: ShopCategory): boolean => {
    if (tab === 'all') return true;
    if (tab === 'colors') return cat === 'hull' || cat === 'accent';
    if (tab === 'structure') return cat === 'booster' || cat === 'fairing';
    return cat === 'foil' || cat === 'plume';
  };

  // Show purchasable + rare items first, or all non-starter items + owned
  const filteredItems = CATALOG_ITEMS.filter((i) => categoryMatchesTab(i.category)).sort((a, b) => {
    // Put rare & shop items cleanly organized, with equipped/unlocked clear
    const scoreA = a.rarePlanet ? 2 : a.price > 0 ? 1 : 0;
    const scoreB = b.rarePlanet ? 2 : b.price > 0 ? 1 : 0;
    return scoreB - scoreA;
  });

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All Parts & Colors' },
    { id: 'colors', label: 'Color Combos' },
    { id: 'structure', label: 'Boosters & Fairings' },
    { id: 'systems', label: 'Foils & Plumes' },
  ];

  const categoryLabel: Record<ShopCategory, string> = {
    hull: 'Hull Coat',
    accent: 'Accent Trim',
    booster: 'Booster Stack',
    fairing: 'Fairing Profile',
    foil: 'Lander Foil',
    plume: 'Engine Plume',
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#070d1a] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Cosmora Aerospace Parts & Paint Shop
              </h2>
              <p className="text-xs text-slate-400">
                Earn Credits from Orbit, Landing & Science Scans · Unlock Rare Parts via Planetary Sample Search
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/50 text-amber-300 font-mono-tabular text-sm font-bold">
              <Coins className="w-4 h-4" />
              <span>${credits.toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close shop"
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800/80 bg-[#040914]">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                tab === t.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map((item) => {
            const unlocked = unlockedIds.includes(item.id);
            const equipped = isEquipped(item);
            const canAfford = credits >= item.price;
            const rareDestName = item.rarePlanet ? DESTINATIONS[item.rarePlanet].name : null;

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-3.5 flex flex-col justify-between transition-colors ${
                  equipped
                    ? 'bg-sky-950/35 border-sky-400/70'
                    : unlocked
                      ? 'bg-[#0a1324] border-slate-700/70'
                      : 'bg-[#060b16] border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                      {categoryLabel[item.category]}
                    </span>
                    {item.rarePlanet ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono-tabular font-semibold px-2 py-0.5 rounded bg-purple-500/20 border border-purple-400/40 text-purple-300">
                        <Sparkles className="w-2.5 h-2.5" />
                        Rare Relic
                      </span>
                    ) : item.price === 0 ? (
                      <span className="text-[10px] font-mono-tabular text-slate-400">Standard</span>
                    ) : (
                      <span className="text-[11px] font-mono-tabular font-bold text-amber-300">
                        ${item.price.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2.5">
                    {item.swatchHex && (
                      <span
                        className="w-6 h-6 rounded-md border border-white/25 shrink-0"
                        style={{ backgroundColor: item.swatchHex }}
                      />
                    )}
                    <div className="font-display text-sm font-bold text-white leading-tight">
                      {item.label}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400 leading-snug">{item.description}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                  {equipped ? (
                    <div className="w-full py-1.5 rounded-lg bg-sky-500/20 border border-sky-400/50 text-sky-200 text-xs font-semibold flex items-center justify-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Equipped</span>
                    </div>
                  ) : unlocked ? (
                    <button
                      type="button"
                      onClick={() => onEquipItem(item)}
                      className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Equip Now
                    </button>
                  ) : item.rarePlanet ? (
                    <div className="w-full py-1.5 px-2 rounded-lg bg-purple-950/30 border border-purple-500/30 text-purple-300 text-[11px] font-medium flex items-center justify-center gap-1.5 text-center">
                      <Lock className="w-3 h-3 shrink-0" />
                      <span>Find {rareDestName} Rare Sample</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => onBuyItem(item)}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                        canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                          : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>{canAfford ? `Buy for $${item.price.toLocaleString()}` : `Need $${item.price.toLocaleString()}`}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
