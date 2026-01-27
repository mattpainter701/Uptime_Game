import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ITEM_DEFINITIONS, type ItemId } from '../../types/game';

export function InventoryPanel() {
  const inventory = useGameStore((state) => state.inventory);
  const [expanded, setExpanded] = useState(false);

  // Get list of items the player has
  const ownedItems = (Object.entries(inventory) as [ItemId, number][])
    .filter(([_, count]) => count > 0);

  const totalItems = ownedItems.reduce((sum, [_, count]) => sum + count, 0);

  if (totalItems === 0 && !expanded) {
    return (
      <div className="glass-panel px-3 py-2 text-gray-500 text-sm">
        No equipment
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden">
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎒</span>
          <span className="text-sm font-bold text-cyan-400">Inventory</span>
          <span className="text-xs text-gray-500">({totalItems})</span>
        </div>
        <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Collapsed view - show icons only */}
      {!expanded && totalItems > 0 && (
        <div className="px-3 pb-2 flex gap-1 flex-wrap">
          {ownedItems.map(([itemId, count]) => {
            const item = ITEM_DEFINITIONS[itemId];
            return (
              <div
                key={itemId}
                className="relative"
                title={`${item.name}${count > 1 ? ` x${count}` : ''}`}
              >
                <span className="text-lg">{item.icon}</span>
                {count > 1 && (
                  <span className="absolute -bottom-1 -right-1 bg-gray-800 text-cyan-400 text-xs px-1 rounded">
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Expanded view - full item list */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 max-h-64 overflow-y-auto">
          {ownedItems.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-4">
              No items collected yet.<br />
              <span className="text-xs text-gray-600">Visit the supply table in your office.</span>
            </div>
          ) : (
            ownedItems.map(([itemId, count]) => {
              const item = ITEM_DEFINITIONS[itemId];
              return (
                <div
                  key={itemId}
                  className="flex items-center gap-3 p-2 bg-white/5 rounded hover:bg-white/10 transition-colors"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.description}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {item.consumable ? (
                        <span className="text-xs text-orange-400">Consumable</span>
                      ) : (
                        <span className="text-xs text-green-400">Reusable</span>
                      )}
                      {count > 1 && (
                        <span className="text-xs text-cyan-400">x{count}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// Mini version for HUD - just shows icons
export function InventoryMini() {
  const inventory = useGameStore((state) => state.inventory);

  const ownedItems = (Object.entries(inventory) as [ItemId, number][])
    .filter(([_, count]) => count > 0);

  if (ownedItems.length === 0) {
    return (
      <div className="text-sm text-gray-500">Empty</div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {ownedItems.slice(0, 5).map(([itemId, count]) => {
        const item = ITEM_DEFINITIONS[itemId];
        return (
          <div
            key={itemId}
            className="relative"
            title={`${item.name}${count > 1 ? ` x${count}` : ''}`}
          >
            <span className="text-sm">{item.icon}</span>
            {count > 1 && (
              <span className="absolute -bottom-1 -right-1 bg-gray-800/80 text-cyan-400 text-[10px] px-0.5 rounded">
                {count}
              </span>
            )}
          </div>
        );
      })}
      {ownedItems.length > 5 && (
        <span className="text-xs text-gray-400">+{ownedItems.length - 5}</span>
      )}
    </div>
  );
}

export default InventoryPanel;
