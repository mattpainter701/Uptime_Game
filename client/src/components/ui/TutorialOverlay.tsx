import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getTutorialStepConfig } from '../../lib/tutorialTickets';
import type { TutorialStep } from '../../types/game';

// ============================================================
// TutorialOverlay — contextual onboarding guidance
// Renders on top of the game when tutorial is active.
// Shows step-by-step instructions with UI highlights.
// ============================================================

export function TutorialOverlay() {
  const tutorial = useGameStore((state) => state.tutorial);
  const currentView = useGameStore((state) => state.currentView);
  const startTutorial = useGameStore((state) => state.startTutorial);
  const skipTutorial = useGameStore((state) => state.skipTutorial);
  const dismissGraduation = useGameStore((state) => state.dismissGraduation);
  const advanceTutorialStep = useGameStore((state) => state.advanceTutorialStep);
  const setView = useGameStore((state) => state.setView);

  const [showHint, setShowHint] = useState(false);
  const [visible, setVisible] = useState(false);

  const stepConfig = getTutorialStepConfig(tutorial.step);
  const isGraduation = tutorial.step === 'graduation';
  const isWelcome = tutorial.step === 'welcome';

  // Animate in
  useEffect(() => {
    if (tutorial.active) {
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [tutorial.active, tutorial.step]);

  // Reset hint when step changes
  useEffect(() => {
    setShowHint(false);
  }, [tutorial.step]);

  // Highlight UI elements for current step
  useEffect(() => {
    if (!tutorial.active || !stepConfig?.highlights) return;

    // Add pulsing glow to highlighted elements
    const elements: HTMLElement[] = [];
    for (const highlight of stepConfig.highlights) {
      const el = document.querySelector(highlight.selector) as HTMLElement;
      if (el) {
        const color = highlight.pulseColor || 'cyan';
        el.classList.add(`tutorial-highlight-${color}`);
        elements.push(el);
      }
    }

    return () => {
      for (const el of elements) {
        el.classList.remove(
          'tutorial-highlight-cyan',
          'tutorial-highlight-pink',
          'tutorial-highlight-green',
        );
      }
    };
  }, [tutorial.active, tutorial.step, stepConfig]);

  // Don't render if tutorial isn't active
  if (!tutorial.active) return null;

  const handleSkip = () => {
    skipTutorial();
    setVisible(false);
  };

  const handleContinue = () => {
    if (isWelcome) {
      // Advance to first ticket step
      advanceTutorialStep();
      // Navigate to office view so player can see tutorial card and ticket panel
      if (currentView !== 'office') {
        setView('office');
      }
    } else if (isGraduation) {
      dismissGraduation();
      setVisible(false);
    } else {
      // On ticket steps, "Continue" means player is ready to accept the ticket
      // Navigate to tickets view
      setView('tickets');
    }
  };

  const handleStartFromSettings = () => {
    startTutorial();
  };

  // Special case: tutorial started from settings (replay), step is 'welcome'
  // but tutorial.active was set to true by replayTutorial
  const isReplay = tutorial.active && isWelcome && !tutorial.skipped;

  return (
    <div
      className={`absolute inset-0 z-40 flex items-center justify-center transition-all duration-500 ${
        visible ? 'bg-black/70 backdrop-blur-sm' : 'bg-black/0'
      }`}
    >
      {/* Main tutorial card */}
      <div
        className={`w-full max-w-xl m-4 glass-panel border-cyan-500/40 transition-all duration-500 ${
          visible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            {isWelcome && <span className="text-2xl">👋</span>}
            {isGraduation && <span className="text-2xl">🎉</span>}
            {!isWelcome && !isGraduation && (
              <span className="text-2xl">
                {tutorial.step === 'ticket1'
                  ? '1️⃣'
                  : tutorial.step === 'ticket2'
                    ? '2️⃣'
                    : tutorial.step === 'ticket3'
                      ? '3️⃣'
                      : tutorial.step === 'ticket4'
                        ? '4️⃣'
                        : '5️⃣'}
              </span>
            )}
            <h2 className="text-xl font-bold text-white">
              {stepConfig?.title || 'Tutorial'}
            </h2>
          </div>

          {/* Skip button (always available except graduation) */}
          {!isGraduation && (
            <button
              onClick={handleSkip}
              className="px-3 py-1 text-xs text-gray-400 hover:text-red-400 border border-gray-600 hover:border-red-500/50 rounded transition-all"
              title="Skip the tutorial and unlock all tickets"
            >
              Skip Tutorial
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
            {stepConfig?.body}
          </div>

          {/* Highlights section */}
          {stepConfig?.highlights && stepConfig.highlights.length > 0 && (
            <div className="mt-4 space-y-2">
              {stepConfig.highlights.map((h, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 p-3 rounded border text-xs ${
                    h.pulseColor === 'pink'
                      ? 'border-pink-500/30 bg-pink-500/10 text-pink-300'
                      : h.pulseColor === 'green'
                        ? 'border-green-500/30 bg-green-500/10 text-green-300'
                        : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                  }`}
                >
                  <span className="mt-0.5">📍</span>
                  <span>{h.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Hint section */}
          {!isWelcome && !isGraduation && stepConfig?.hint && (
            <div className="mt-4">
              {!showHint ? (
                <button
                  onClick={() => setShowHint(true)}
                  className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <span>💡</span>
                  <span>Need help?</span>
                </button>
              ) : (
                <div className="p-3 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">💡 Hint</span>
                    <button
                      onClick={() => setShowHint(false)}
                      className="text-amber-500 hover:text-amber-300 text-lg leading-none"
                    >
                      ✕
                    </button>
                  </div>
                  <p>{stepConfig.hint}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          {/* Progress indicator (dots) */}
          {!isWelcome && !isGraduation && (
            <div className="flex items-center gap-1.5">
              {(['ticket1', 'ticket2', 'ticket3', 'ticket4', 'ticket5'] as TutorialStep[]).map(
                (s) => {
                  const stepIdx = ['ticket1', 'ticket2', 'ticket3', 'ticket4', 'ticket5'].indexOf(s);
                  const currentIdx = ['ticket1', 'ticket2', 'ticket3', 'ticket4', 'ticket5'].indexOf(
                    tutorial.step as string,
                  );
                  const isCompleted = stepIdx < currentIdx;
                  const isCurrent = stepIdx === currentIdx;

                  return (
                    <div
                      key={s}
                      className={`w-2 h-2 rounded-full transition-all ${
                        isCompleted
                          ? 'bg-cyan-400'
                          : isCurrent
                            ? 'bg-cyan-400 animate-pulse'
                            : 'bg-gray-600'
                      }`}
                    />
                  );
                },
              )}
            </div>
          )}

          {/* Action button */}
          <button
            onClick={handleContinue}
            className={`px-6 py-2.5 rounded font-bold transition-all hover:scale-105 active:scale-95 ${
              isGraduation
                ? 'bg-yellow-500/30 border border-yellow-500 text-yellow-400 hover:bg-yellow-500/50'
                : 'bg-cyan-500/30 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/50'
            }`}
          >
            {isWelcome
              ? '▶ Start Tutorial'
              : isGraduation
                ? '🎓 Claim Reward & Continue'
                : '📋 Open Ticket Panel'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TutorialOverlay;
