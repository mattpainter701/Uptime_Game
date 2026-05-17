import { useGameStore } from '../../store/gameStore';
import type { TierStats, CategoryStats, AnalyticsSnapshot } from '../../types/game';

// ─── Difficulty Indicator (HUD mini) ──────────────────────────────────────

function getWinRateColor(winRate: number): string {
  if (winRate >= 0.8) return 'text-green-400';
  if (winRate >= 0.5) return 'text-yellow-400';
  return 'text-red-400';
}

function getWinRateBg(winRate: number): string {
  if (winRate >= 0.8) return 'bg-green-400';
  if (winRate >= 0.5) return 'bg-yellow-400';
  return 'bg-red-400';
}

export function DifficultyIndicator() {
  const analytics = useGameStore((s) => s.analytics);

  if (!analytics || analytics.overall.totalAttempts === 0) {
    return (
      <div className="flex items-center gap-2" title="No difficulty data yet — complete tickets to see stats">
        <span className="text-xl">📈</span>
        <div>
          <div className="text-xs text-gray-400">Difficulty</div>
          <div className="text-lg font-bold text-gray-500">--</div>
        </div>
      </div>
    );
  }

  const { overall } = analytics;

  return (
    <div className="flex items-center gap-2" title={`${overall.totalWins}/${overall.totalAttempts} tickets completed`}>
      <span className="text-xl">📈</span>
      <div>
        <div className="text-xs text-gray-400">Difficulty</div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${getWinRateBg(overall.winRate)}`} />
          <span className={`text-lg font-bold ${getWinRateColor(overall.winRate)}`}>
            {(overall.winRate * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Difficulty Curve Panel ────────────────────────────────────────────────

interface DifficultyCurvePanelProps {
  onClose?: () => void;
}

function WinRateBar({ winRate, label, detail }: { winRate: number; label: string; detail?: string }) {
  const pct = Math.round(winRate * 100);
  const barColor = winRate >= 0.8 ? 'bg-green-500' : winRate >= 0.5 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = getWinRateColor(winRate);

  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-300">{label}</span>
        <span className={`text-sm font-bold ${textColor}`}>{pct}%{detail ? ` (${detail})` : ''}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-4">
        <div
          className={`${barColor} h-4 rounded-full transition-all duration-500`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
    </div>
  );
}

function TierTable({ tiers }: { tiers: TierStats[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2 pr-4">Tier</th>
            <th className="text-right py-2 px-2">Attempts</th>
            <th className="text-right py-2 px-2">Wins</th>
            <th className="text-right py-2 px-2">Losses</th>
            <th className="text-right py-2 px-2">Win Rate</th>
            <th className="text-right py-2 px-2">Avg Time</th>
            <th className="text-right py-2 pl-2">Avg Score</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((t) => (
            <tr key={t.difficulty} className="border-b border-gray-800 hover:bg-white/5">
              <td className="py-2 pr-4">
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getWinRateBg(t.winRate)}`} />
                  <span className="text-white">
                    {'★'.repeat(t.difficulty)}
                    {'☆'.repeat(5 - t.difficulty)}
                  </span>
                </span>
              </td>
              <td className="text-right py-2 px-2 text-gray-300">{t.attempts}</td>
              <td className="text-right py-2 px-2 text-green-400">{t.wins}</td>
              <td className="text-right py-2 px-2 text-red-400">{t.losses}</td>
              <td className={`text-right py-2 px-2 font-bold ${getWinRateColor(t.winRate)}`}>
                {(t.winRate * 100).toFixed(0)}%
              </td>
              <td className="text-right py-2 px-2 text-gray-300">
                {formatTime(t.avgTimeMs)}
              </td>
              <td className="text-right py-2 pl-2 text-gray-300">
                {t.avgScore > 0 ? (t.avgScore * 100).toFixed(0) + '%' : '--'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoryBars({ categories }: { categories: CategoryStats[] }) {
  return (
    <div className="space-y-2">
      {categories.map((c) => (
        <div key={c.category}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-300 capitalize">{c.category.replace(/-/g, ' ')}</span>
            <span className={`text-xs font-bold ${getWinRateColor(c.winRate)}`}>
              {c.wins}/{c.attempts} ({(c.winRate * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 flex overflow-hidden">
            <div
              className="bg-green-500 h-3 transition-all duration-500"
              style={{ width: `${c.attempts > 0 ? (c.wins / c.attempts) * 100 : 0}%` }}
            />
            <div
              className="bg-red-500 h-3 transition-all duration-500"
              style={{ width: `${c.attempts > 0 ? (c.losses / c.attempts) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendDisplay({ trend }: { trend: ('completed' | 'failed')[] }) {
  return (
    <div className="flex gap-1.5">
      {trend.length === 0 ? (
        <span className="text-sm text-gray-500">No data yet</span>
      ) : (
        trend.map((outcome, i) => (
          <span
            key={i}
            className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
              outcome === 'completed'
                ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                : 'bg-red-500/30 text-red-400 border border-red-500/50'
            }`}
            title={`Ticket ${trend.length - i}: ${outcome}`}
          >
            {outcome === 'completed' ? '✓' : '✗'}
          </span>
        ))
      )}
    </div>
  );
}

function formatTime(ms: number): string {
  if (ms <= 0) return '--';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function DifficultyCurvePanel({ onClose }: DifficultyCurvePanelProps) {
  const analytics = useGameStore((s) => s.analytics);
  const sessionHistory = useGameStore((s) => s.sessionHistory);

  if (!analytics || analytics.overall.totalAttempts === 0) {
    return (
      <div className="glass-panel p-6 max-w-2xl mx-auto mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-cyan-400">Difficulty Curve</h2>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
          )}
        </div>
        <div className="text-center py-12 text-gray-400">
          <span className="text-4xl block mb-4">📊</span>
          <p className="text-lg">No difficulty data available yet</p>
          <p className="text-sm mt-2">
            Complete or fail some tickets to see your difficulty curve.
            {sessionHistory.length === 0
              ? ' Try accepting a ticket from the Tickets panel!'
              : ''}
          </p>
        </div>
      </div>
    );
  }

  const { tiers, categories, overall, trend, recommendations } = analytics;

  return (
    <div className="glass-panel p-6 max-w-3xl mx-auto mt-8 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-cyan-400">📊 Difficulty Curve</h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl transition-colors">✕</button>
        )}
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white/5 rounded p-3 text-center">
          <div className="text-2xl font-bold text-cyan-400">{overall.totalAttempts}</div>
          <div className="text-xs text-gray-400">Tickets</div>
        </div>
        <div className="bg-white/5 rounded p-3 text-center">
          <div className={`text-2xl font-bold ${getWinRateColor(overall.winRate)}`}>
            {(overall.winRate * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-400">Win Rate</div>
        </div>
        <div className="bg-white/5 rounded p-3 text-center">
          <div className="text-2xl font-bold text-gray-300">{formatTime(overall.avgTimeMs)}</div>
          <div className="text-xs text-gray-400">Avg Time</div>
        </div>
        <div className="bg-white/5 rounded p-3 text-center">
          <div className="text-2xl font-bold text-gray-300">
            {overall.avgScore > 0 ? (overall.avgScore * 100).toFixed(0) + '%' : '--'}
          </div>
          <div className="text-xs text-gray-400">Avg Score</div>
        </div>
      </div>

      {/* Tier Difficulty Table */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-300 mb-3">Per-Tier Performance</h3>
        {tiers.length > 0 ? (
          <TierTable tiers={tiers} />
        ) : (
          <p className="text-sm text-gray-500">No tier data</p>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-300 mb-3">Per-Category Performance</h3>
        {categories.length > 0 ? (
          <CategoryBars categories={categories} />
        ) : (
          <p className="text-sm text-gray-500">No category data</p>
        )}
      </div>

      {/* Trend */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-300 mb-3">
          Recent Trend
          <span className="text-sm font-normal text-gray-500 ml-2">(last {trend.length} tickets)</span>
        </h3>
        <TrendDisplay trend={trend} />
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-yellow-400 mb-3">⚠️ Recommendations</h3>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div key={i} className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-sm text-yellow-300">
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview bars */}
      <div className="mb-2">
        <h3 className="text-lg font-bold text-gray-300 mb-3">Overview</h3>
        <WinRateBar
          winRate={overall.winRate}
          label="Overall Win Rate"
          detail={`${overall.totalWins}W / ${overall.totalLosses}L`}
        />
      </div>
    </div>
  );
}

export default DifficultyCurvePanel;
