import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Ticket, TicketCategory } from '../../types/game';
import { ITEM_DEFINITIONS } from '../../types/game';

const CATEGORY_INFO: Record<TicketCategory, { icon: string; color: string; label: string }> = {
  'network-basics': { icon: '🌐', color: 'text-blue-400', label: 'Network Basics' },
  'switching': { icon: '🔀', color: 'text-green-400', label: 'Switching' },
  'routing': { icon: '🛤️', color: 'text-yellow-400', label: 'Routing' },
  'security': { icon: '🔒', color: 'text-red-400', label: 'Security' },
  'systems': { icon: '🖥️', color: 'text-purple-400', label: 'Systems' },
  'automation': { icon: '🤖', color: 'text-cyan-400', label: 'Automation' },
  'high-availability': { icon: '🔄', color: 'text-orange-400', label: 'High Availability' },
};

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={i < rating ? 'text-yellow-400' : 'text-gray-600'}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function TicketCard({ ticket, onAccept }: { ticket: Ticket; onAccept: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasRequiredItems = useGameStore((state) => state.hasRequiredItems);
  const hasItem = useGameStore((state) => state.hasItem);
  const category = CATEGORY_INFO[ticket.category];

  const requiredItems = ticket.requiredItems || [];
  const consumeItems = ticket.consumeItems || [];
  const canAccept = requiredItems.length === 0 || hasRequiredItems(requiredItems);

  return (
    <div className="glass-panel p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
      <div onClick={() => setExpanded(!expanded)}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{category.icon}</span>
            <div>
              <div className={`text-xs ${category.color}`}>{category.label}</div>
              <div className="font-bold text-white">{ticket.title}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">{ticket.id}</div>
            <StarRating rating={ticket.difficulty} />
          </div>
        </div>

        {/* Quick info */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-400">💰 ${ticket.rewardCredits}</span>
          <span className="text-cyan-400">📊 +{ticket.rewardXp} XP</span>
          <span className="text-orange-400">⏱️ {ticket.timeLimit} min</span>
        </div>

        {/* Required items preview (when collapsed) */}
        {requiredItems.length > 0 && !expanded && (
          <div className="mt-2 flex items-center gap-1">
            <span className="text-xs text-gray-500">Requires:</span>
            {requiredItems.map((itemId) => {
              const item = ITEM_DEFINITIONS[itemId];
              const owned = hasItem(itemId);
              return (
                <span
                  key={itemId}
                  className={owned ? 'opacity-100' : 'opacity-40'}
                  title={`${item.name}${owned ? ' (owned)' : ' (missing)'}`}
                >
                  {item.icon}
                </span>
              );
            })}
            {!canAccept && (
              <span className="text-xs text-red-400 ml-1">Missing items</span>
            )}
          </div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-gray-300 text-sm mb-4">{ticket.description}</p>

          {/* Required items section */}
          {requiredItems.length > 0 && (
            <div className="mb-4 p-3 bg-gray-800/50 rounded">
              <div className="text-xs text-gray-400 mb-2">Required Equipment:</div>
              <div className="flex flex-wrap gap-2">
                {requiredItems.map((itemId) => {
                  const item = ITEM_DEFINITIONS[itemId];
                  const owned = hasItem(itemId);
                  const isConsumed = consumeItems.includes(itemId);
                  return (
                    <div
                      key={itemId}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                        owned
                          ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                          : 'bg-red-500/20 border border-red-500/50 text-red-400'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                      {owned ? (
                        <span className="text-xs">✓</span>
                      ) : (
                        <span className="text-xs">✗</span>
                      )}
                      {isConsumed && (
                        <span className="text-xs text-orange-400 ml-1" title="Will be consumed">
                          (consumed)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {!canAccept && (
                <div className="mt-2 text-xs text-red-400">
                  Visit the supply table in your office to collect missing equipment.
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              {ticket.hints.length} hints available
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (canAccept) {
                  onAccept();
                }
              }}
              disabled={!canAccept}
              className={`px-4 py-2 rounded font-bold transition-all ${
                canAccept
                  ? 'bg-green-500/30 border border-green-500 text-green-400 hover:bg-green-500/50'
                  : 'bg-gray-500/20 border border-gray-500 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canAccept ? 'Accept Ticket' : 'Missing Equipment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TicketPanel() {
  const { availableTickets, activeTicket, acceptTicket, setView } = useGameStore();
  const [filter, setFilter] = useState<TicketCategory | 'all'>('all');

  const filteredTickets = filter === 'all'
    ? availableTickets
    : availableTickets.filter(t => t.category === filter);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[80vh] m-4 glass-panel flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📋</span>
            <div>
              <h2 className="text-xl font-bold text-white">Ticket Queue</h2>
              <p className="text-sm text-gray-400">
                {availableTickets.length} tickets available
              </p>
            </div>
          </div>
          <button
            onClick={() => setView('office')}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl"
          >
            ✕
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 p-4 border-b border-gray-700 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded text-sm whitespace-nowrap transition-all ${
              filter === 'all'
                ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500'
                : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
            }`}
          >
            All
          </button>
          {Object.entries(CATEGORY_INFO).map(([key, info]) => (
            <button
              key={key}
              onClick={() => setFilter(key as TicketCategory)}
              className={`px-3 py-1.5 rounded text-sm whitespace-nowrap transition-all flex items-center gap-1 ${
                filter === key
                  ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500'
                  : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
              }`}
            >
              <span>{info.icon}</span>
              <span>{info.label}</span>
            </button>
          ))}
        </div>

        {/* Ticket list */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTicket ? (
            <div className="text-center text-gray-400 py-8">
              <p className="text-lg mb-2">You already have an active ticket</p>
              <p className="text-sm">Complete or abandon your current ticket to accept a new one</p>
              <button
                onClick={() => setView('terminal')}
                className="mt-4 px-4 py-2 bg-cyan-500/30 border border-cyan-500 rounded text-cyan-400"
              >
                Go to Terminal
              </button>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p className="text-lg">No tickets available</p>
              <p className="text-sm">Check back later for new tickets</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onAccept={() => acceptTicket(ticket)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TicketPanel;
