import { useGameStore } from '../../store/gameStore';
import { STORY_ARCS } from '../../data/storyArcs';

export function StoryPanel() {
  const { setView, storyProgress, completedTicketIds, player } = useGameStore();

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] m-4 glass-panel flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📖</span>
            <div>
              <h2 className="text-xl font-bold text-white">Story Arcs</h2>
              <p className="text-sm text-gray-400">Your journey at NetOps Tower</p>
            </div>
          </div>
          <button
            onClick={() => setView('office')}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {STORY_ARCS.map((arc) => {
            const progress = storyProgress[arc.id];
            const isAccepted = progress?.accepted ?? false;
            const isCompleted = progress?.completed ?? false;
            const completedCount = arc.ticketIds.filter((id) => completedTicketIds.includes(id)).length;
            const totalCount = arc.ticketIds.length;
            const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

            const meetsLevel = !arc.requiredLevel || player.level >= arc.requiredLevel;
            const meetsPrereq = !arc.prerequisiteArcId || storyProgress[arc.prerequisiteArcId]?.completed;
            const isAvailable = meetsLevel && meetsPrereq;

            return (
              <div
                key={arc.id}
                className={`p-4 rounded-lg border transition-all ${
                  isCompleted
                    ? 'border-green-500/40 bg-green-500/10'
                    : isAccepted
                    ? 'border-cyan-500/40 bg-cyan-500/5'
                    : isAvailable
                    ? 'border-gray-600 bg-white/5'
                    : 'border-gray-700 bg-white/[0.02] opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    {isCompleted ? '✅' : isAccepted ? '📖' : isAvailable ? '📋' : '🔒'}
                    {arc.title}
                  </h3>
                  <span className="text-xs text-gray-400">
                    {completedCount}/{totalCount} tickets
                  </span>
                </div>

                <p className="text-sm text-gray-400 mb-3">{arc.description}</p>

                {/* Progress bar */}
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-green-500' : 'bg-cyan-500'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Rewards */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="text-green-400">${arc.reward.credits}</span>
                  <span className="text-cyan-400">{arc.reward.xp} XP</span>
                  <span className="text-yellow-400">+{arc.reward.reputation} Rep</span>
                  {!isAvailable && (
                    <span className="ml-auto text-red-400">
                      {!meetsLevel ? `Requires Level ${arc.requiredLevel}` : `Complete "${STORY_ARCS.find(a => a.id === arc.prerequisiteArcId)?.title}" first`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
