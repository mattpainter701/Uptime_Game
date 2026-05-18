import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { SessionRecord } from '../../types/game';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface CategoryInfo {
  key: string;
  label: string;
  color: string;
  icon: string;
}

const CATEGORY_INFO: Record<string, CategoryInfo> = {
  'network-basics': { key: 'network-basics', label: 'Network Basics', color: 'bg-blue-500', icon: '🌐' },
  'switching': { key: 'switching', label: 'Switching', color: 'bg-green-500', icon: '🔀' },
  'routing': { key: 'routing', label: 'Routing', color: 'bg-purple-500', icon: '🔗' },
  'security': { key: 'security', label: 'Security', color: 'bg-red-500', icon: '🔒' },
  'systems': { key: 'systems', label: 'Systems', color: 'bg-yellow-500', icon: '🖥️' },
  'automation': { key: 'automation', label: 'Automation', color: 'bg-cyan-500', icon: '🤖' },
  'high-availability': { key: 'high-availability', label: 'High Availability', color: 'bg-orange-500', icon: '🔄' },
};

// Category colors for bar chart (same as above in hex)
const CATEGORY_COLORS_HEX: Record<string, string> = {
  'network-basics': '#3b82f6',
  'switching': '#22c55e',
  'routing': '#a855f7',
  'security': '#ef4444',
  'systems': '#eab308',
  'automation': '#06b6d4',
  'high-availability': '#f97316',
};

function DifficultyPie({ records }: { records: SessionRecord[] }) {
  const completed = records.filter(r => r.outcome === 'completed');
  if (completed.length === 0) return null;

  const difficultyBuckets = [0, 0, 0, 0, 0]; // 1-5
  for (const r of completed) {
    if (r.difficulty >= 1 && r.difficulty <= 5) {
      difficultyBuckets[r.difficulty - 1]++;
    }
  }

  const total = completed.length;
  const colors = ['bg-green-500', 'bg-cyan-500', 'bg-blue-500', 'bg-purple-500', 'bg-red-500'];
  const labels = ['★', '★★', '★★★', '★★★★', '★★★★★'];

  return (
    <div>
      <h4 className="text-xs font-bold text-gray-400 mb-2">DIFFICULTY DISTRIBUTION</h4>
      <div className="flex items-center gap-3">
        <div className="flex gap-1 h-6 rounded-full overflow-hidden flex-1">
          {difficultyBuckets.map((count, i) => {
            const pct = total > 0 ? (count / total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={i}
                className={`${colors[i]} h-full transition-all`}
                style={{ width: `${pct}%`, minWidth: pct > 0 ? '8px' : '0' }}
                title={`${labels[i]}: ${count} (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>
        <div className="flex flex-col gap-0.5 text-xs">
          {difficultyBuckets.map((count, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded ${colors[i]}`} />
              <span className="text-gray-400">{labels[i]}: {count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryBar({ records }: { records: SessionRecord[] }) {
  const cats = new Map<string, { completed: number; failed: number }>();

  for (const r of records) {
    const existing = cats.get(r.category) || { completed: 0, failed: 0 };
    if (r.outcome === 'completed') existing.completed++;
    else existing.failed++;
    cats.set(r.category, existing);
  }

  if (cats.size === 0) return null;

  const maxCount = Math.max(...Array.from(cats.values()).map(v => v.completed + v.failed), 1);

  return (
    <div>
      <h4 className="text-xs font-bold text-gray-400 mb-2">CATEGORY BREAKDOWN</h4>
      <div className="space-y-1.5">
        {Array.from(cats.entries()).map(([cat, counts]) => {
          const info = CATEGORY_INFO[cat] || { label: cat, icon: '📋', color: 'bg-gray-500' };
          const total = counts.completed + counts.failed;
          const pct = (total / maxCount) * 100;
          const hexColor = CATEGORY_COLORS_HEX[cat] || '#6b7280';

          return (
            <div key={cat} className="flex items-center gap-2">
              <span className="text-sm w-5 text-center">{info.icon}</span>
              <span className="text-xs text-gray-300 w-28 truncate">{info.label}</span>
              <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden flex">
                {counts.completed > 0 && (
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(counts.completed / total) * pct}%`,
                      backgroundColor: hexColor,
                    }}
                  />
                )}
                {counts.failed > 0 && (
                  <div
                    className="h-full bg-red-500/40 transition-all"
                    style={{
                      width: `${(counts.failed / total) * pct}%`,
                    }}
                  />
                )}
              </div>
              <span className="text-xs text-gray-400 w-14 text-right">
                {counts.completed}/{total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SessionSummaryScreen() {
  const player = useGameStore((s) => s.player);
  const sessionHistory = useGameStore((s) => s.sessionHistory);
  const setView = useGameStore((s) => s.setView);
  const saveGame = useGameStore((s) => s.saveGame);

  const stats = useMemo(() => {
    const completed = sessionHistory.filter(r => r.outcome === 'completed');
    const failed = sessionHistory.filter(r => r.outcome === 'failed');
    const totalTickets = sessionHistory.length;
    const successRate = totalTickets > 0 ? Math.round((completed.length / totalTickets) * 100) : 0;
    const totalCredits = completed.reduce((sum, r) => sum + r.creditsEarned, 0);
    const totalXp = completed.reduce((sum, r) => sum + r.xpEarned, 0);
    const avgValidation = completed.length > 0
      ? Math.round((completed.reduce((sum, r) => sum + r.validationScore, 0) / completed.length) * 100)
      : 0;
    const totalTime = sessionHistory.reduce((sum, r) => sum + r.timeTaken, 0);
    const avgUptimeBonus = completed.length > 0
      ? completed.reduce((sum, r) => sum + r.uptimeBonus, 0) / completed.length
      : 0;
    const totalHints = sessionHistory.reduce((sum, r) => sum + r.hintsUsed, 0);

    // Sort by most recent first
    const sorted = [...sessionHistory].sort((a, b) => b.timestamp - a.timestamp);

    return {
      completed,
      failed,
      totalTickets,
      successRate,
      totalCredits,
      totalXp,
      avgValidation,
      totalTime,
      avgUptimeBonus,
      totalHints,
      sorted,
    };
  }, [sessionHistory]);

  const handleExport = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      player: {
        name: player.name,
        level: player.level,
        title: player.title,
        credits: player.credits,
        reputation: player.reputation,
        xp: player.xp,
      },
      sessionSummary: {
        totalTickets: stats.totalTickets,
        completed: stats.completed.length,
        failed: stats.failed.length,
        successRate: stats.successRate,
        totalCreditsEarned: stats.totalCredits,
        totalXpEarned: stats.totalXp,
        totalTimeSeconds: stats.totalTime,
        avgUptimeBonus: stats.avgUptimeBonus,
        avgValidationScore: stats.avgValidation,
        hintsUsed: stats.totalHints,
      },
      history: sessionHistory.map(r => ({
        ticketId: r.ticketId,
        title: r.title,
        category: r.category,
        difficulty: r.difficulty,
        outcome: r.outcome,
        timeTaken: r.timeTaken,
        creditsEarned: r.creditsEarned,
        xpEarned: r.xpEarned,
        uptimeBonus: r.uptimeBonus,
        validationScore: r.validationScore,
        hintsUsed: r.hintsUsed,
        timestamp: new Date(r.timestamp).toISOString(),
      })),
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netops-session-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] m-4 glass-panel flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
            <div>
              <h2 className="text-xl font-bold text-white">Session Summary</h2>
              <p className="text-sm text-gray-400">
                {stats.totalTickets > 0
                  ? `${stats.totalTickets} tickets • ${stats.successRate}% success`
                  : 'No tickets attempted yet'}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Stats dashboard */}
          {stats.totalTickets > 0 && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <SummaryStatBox icon="📋" label="Tickets Solved" value={`${stats.completed.length}/${stats.totalTickets}`} color="text-green-400" />
                <SummaryStatBox icon="💰" label="Total Credits" value={`$${stats.totalCredits.toLocaleString()}`} color="text-green-400" />
                <SummaryStatBox icon="📊" label="Total XP" value={`${stats.totalXp.toLocaleString()}`} color="text-cyan-400" />
                <SummaryStatBox icon="🎯" label="Success Rate" value={`${stats.successRate}%`} color="text-emerald-400" />
                <SummaryStatBox icon="⏱️" label="Total Time" value={formatDuration(stats.totalTime)} color="text-yellow-400" />
                <SummaryStatBox icon="✅" label="Avg Validation" value={`${stats.avgValidation}%`} color="text-purple-400" />
              </div>

              {/* Charts */}
              <div className="space-y-4">
                <DifficultyPie records={sessionHistory} />
                <CategoryBar records={sessionHistory} />
              </div>

              {/* Ticket list */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 mb-2">RECENT TICKETS</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {stats.sorted.map((record) => {
                    return (
                      <div
                        key={`${record.ticketId}-${record.timestamp}`}
                        className={`flex items-center gap-3 p-2 rounded ${
                          record.outcome === 'completed'
                            ? 'bg-green-500/5 border border-green-500/20'
                            : 'bg-red-500/5 border border-red-500/20'
                        }`}
                      >
                        <span className={`text-lg ${record.outcome === 'completed' ? '' : 'opacity-50'}`}>
                          {record.outcome === 'completed' ? '✅' : '❌'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">{record.title}</div>
                          <div className="text-xs text-gray-400 flex items-center gap-2">
                            <span className="text-cyan-400">{record.ticketId}</span>
                            <span>{formatTimeAgo(record.timestamp)}</span>
                            {record.outcome === 'completed' && (
                              <span className="text-green-400">+${record.creditsEarned}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-400">
                          <div>{formatDuration(record.timeTaken)}</div>
                          <div>{'⭐'.repeat(record.difficulty)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {stats.totalTickets === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-400 text-lg">No tickets attempted yet</p>
              <p className="text-gray-500 text-sm mt-2">Complete some tickets to see your session stats here!</p>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="p-4 border-t border-gray-700 bg-black/20 flex items-center gap-3">
          <button
            onClick={() => {
              setView('office');
              saveGame();
            }}
            className="flex-1 px-6 py-3 bg-cyan-500/30 border border-cyan-500 rounded-lg text-cyan-400 font-bold hover:bg-cyan-500/50 transition-all flex items-center justify-center gap-2"
          >
            <span>▶</span>
            Continue Playing
          </button>
          <button
            onClick={handleExport}
            disabled={stats.totalTickets === 0}
            className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
              stats.totalTickets > 0
                ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400 hover:bg-purple-500/30'
                : 'bg-gray-700 border border-gray-600 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>📤</span>
            Export Summary
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryStatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="glass-panel p-3 text-center">
      <div className="text-lg mb-1">{icon}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

export default SessionSummaryScreen;
