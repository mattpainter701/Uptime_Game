import type { MockCliResult } from './mockCliShared';
import {
  createGameState,
  getCurrentChallenge,
  getCurrentQuestion,
  submitAnswer,
  formatHexDump,
  getGameSummary,
  type GameState,
} from './protocolDecoderGame';

/** Protocol Decoder Game session for the terminal */
export interface DecodeGameSession {
  /** Current game state (null if not started) */
  state: GameState | null;
  /** Start a new game */
  startGame(difficulty?: 'easy' | 'medium' | 'hard'): MockCliResult;
  /** Submit an answer to the current question */
  submitAnswer(answer: string): MockCliResult;
  /** Show current status */
  showStatus(): MockCliResult;
  /** Show help */
  showHelp(): MockCliResult;
}

/** Create a new decode game session */
export function createDecodeGameSession(): DecodeGameSession {
  let state: GameState | null = null;

  return {
    get state() {
      return state;
    },

    startGame(difficulty?: 'easy' | 'medium' | 'hard'): MockCliResult {
      state = createGameState(difficulty);
      const challenge = getCurrentChallenge(state);
      
      if (!challenge) {
        state = null;
        return {
          lines: ['\x1b[1;31mError: No challenges available\x1b[0m', ''],
          prompt: 'decode>',
          shouldDisconnect: false,
        };
      }

      const lines: string[] = [
        '',
        '\x1b[1;36m╔══════════════════════════════════════════╗',
        '║      PROTOCOL DECODER CHALLENGE          ║',
        '╚══════════════════════════════════════════╝\x1b[0m',
        '',
        `Difficulty: ${difficulty || 'all'}`,
        `Challenges: ${state.challenges.length}`,
        '',
        '\x1b[1;33mChallenge 1: ' + challenge.description + '\x1b[0m',
        '',
        '┌─────────────────────────────────────────┐',
        '│            HEX DUMP                     │',
        '└─────────────────────────────────────────┘',
        '',
        formatHexDump(challenge.hexDump),
        '',
        '└─────────────────────────────────────────┘',
        '',
      ];

      const question = getCurrentQuestion(state);
      if (question) {
        lines.push('\x1b[1;32mQuestion:\x1b[0m ' + question.prompt);
        lines.push('');
        question.options.forEach((opt, i) => {
          lines.push(`  ${i + 1}. ${opt}`);
        });
        lines.push('');
        lines.push('\x1b[1;37mEnter answer (1-' + question.options.length + ' or text):\x1b[0m');
      }

      return {
        lines,
        prompt: 'decode>',
        shouldDisconnect: false,
      };
    },

    submitAnswer(answer: string): MockCliResult {
      if (!state || state.isComplete) {
        return {
          lines: ['\x1b[1;33mNo active game. Type "decode start" to begin.\x1b[0m', ''],
          prompt: 'decode>',
          shouldDisconnect: false,
        };
      }

      // Handle special commands
      const cmd = answer.trim().toLowerCase();
      if (cmd === 'quit' || cmd === 'exit' || cmd === 'q') {
        const summary = getGameSummary(state);
        state = null;
        return {
          lines: [summary, '\x1b[1;37mThanks for playing!\x1b[0m', ''],
          prompt: 'decode>',
          shouldDisconnect: false,
        };
      }

      if (cmd === 'hint') {
        const question = getCurrentQuestion(state);
        if (question) {
          return {
            lines: ['\x1b[1;33mHint:\x1b[0m ' + question.hint, ''],
            prompt: 'decode>',
            shouldDisconnect: false,
          };
        }
      }

      if (cmd === 'skip') {
        const result = submitAnswer(state, '__skip__');
        return showNextQuestion(state);
      }

      // Submit the answer
      const result = submitAnswer(state, answer);
      
      if (state.isComplete) {
        const summary = getGameSummary(state);
        state = null;
        return {
          lines: [
            result.correct ? '\x1b[1;32m✓ Correct!\x1b[0m' : '\x1b[1;31m✗ Wrong! Answer: ' + result.correctAnswer + '\x1b[0m',
            '',
            summary,
            'Type "decode start" to play again.',
            '',
          ],
          prompt: 'decode>',
          shouldDisconnect: false,
        };
      }

      // Show next question
      const lines: string[] = [];
      
      if (result.correct) {
        lines.push(`\x1b[1;32m✓ Correct! +${result.pointsEarned} points\x1b[0m`);
        if (state.streak >= 3) {
          lines.push(`\x1b[1;33m🔥 ${state.streak}x streak bonus!\x1b[0m`);
        }
      } else {
        lines.push(`\x1b[1;31m✗ Wrong! Correct answer: ${result.correctAnswer}\x1b[0m`);
        lines.push(`\x1b[1;37mTip: ${result.explanation}\x1b[0m`);
      }
      
      lines.push('');
      lines.push(`Score: ${state.score} | Streak: ${state.streak} | Q${state.questionsAnswered + 1}/${state.challenges.reduce((sum, c) => sum + c.questions.length, 0)}`);
      lines.push('');

      // Get next question
      const nextQuestion = getCurrentQuestion(state);
      if (nextQuestion) {
        const challenge = getCurrentChallenge(state);
        if (challenge) {
          lines.push('\x1b[1;33m' + challenge.description + '\x1b[0m');
          lines.push('');
          lines.push('┌─────────────────────────────────────────┐');
          lines.push('│            HEX DUMP                     │');
          lines.push('└─────────────────────────────────────────┘');
          lines.push('');
          lines.push(formatHexDump(challenge.hexDump));
          lines.push('');
          lines.push('└─────────────────────────────────────────┘');
          lines.push('');
        }
        
        lines.push('\x1b[1;32mQuestion:\x1b[0m ' + nextQuestion.prompt);
        lines.push('');
        nextQuestion.options.forEach((opt, i) => {
          lines.push(`  ${i + 1}. ${opt}`);
        });
        lines.push('');
        lines.push('\x1b[1;37mEnter answer (1-' + nextQuestion.options.length + ' or text):\x1b[0m');
      }

      return {
        lines,
        prompt: 'decode>',
        shouldDisconnect: false,
      };
    },

    showStatus(): MockCliResult {
      if (!state) {
        return {
          lines: ['\x1b[1;33mNo active game. Type "decode start" to begin.\x1b[0m', ''],
          prompt: 'decode>',
          shouldDisconnect: false,
        };
      }

      const challenge = getCurrentChallenge(state);
      const question = getCurrentQuestion(state);
      
      const lines: string[] = [
        '',
        `\x1b[1;36mGame Status:\x1b[0m`,
        `  Score: ${state.score}`,
        `  Streak: ${state.streak}`,
        `  Best Streak: ${state.bestStreak}`,
        `  Progress: ${state.questionsAnswered}/${state.challenges.reduce((sum, c) => sum + c.questions.length, 0)} questions`,
        `  Challenges: ${state.currentChallenge + 1}/${state.challenges.length}`,
        '',
      ];

      if (challenge) {
        lines.push(`Current: ${challenge.description}`);
      }
      
      if (question) {
        lines.push(`Question: ${question.prompt}`);
      }

      lines.push('');
      return {
        lines,
        prompt: 'decode>',
        shouldDisconnect: false,
      };
    },

    showHelp(): MockCliResult {
      return {
        lines: [
          '',
          '\x1b[1;36m╔══════════════════════════════════════════╗',
          '║       PROTOCOL DECODER HELP              ║',
          '╚══════════════════════════════════════════╝\x1b[0m',
          '',
          '\x1b[1;33mCommands:\x1b[0m',
          '  start [difficulty]  - Start a new game',
          '                      difficulty: easy, medium, hard (optional)',
          '  hint                - Show hint for current question',
          '  skip                - Skip current question',
          '  status              - Show current game status',
          '  quit                - End game and show results',
          '',
          '\x1b[1;33mHow to Play:\x1b[0m',
          '  1. Study the hex dump of a network packet',
          '  2. Answer questions about protocols, ports, flags, etc.',
          '  3. Type the number (1-4) or exact text answer',
          '  4. Build streaks for bonus points!',
          '',
          '\x1b[1;33mScoring:\x1b[0m',
          '  - Each question has a point value (10-25)',
          '  - 3+ correct streak: 1.5x bonus!',
          '  - Final grade: A (90%+), B (80%+), C (70%+), D (60%+), F',
          '',
          '\x1b[1;33mPacket Types:\x1b[0m',
          '  - TCP/IP packets (SYN, ACK, etc.)',
          '  - DNS queries',
          '  - ICMP messages',
          '  - ARP requests',
          '  - TLS handshakes',
          '',
        ],
        prompt: 'decode>',
        shouldDisconnect: false,
      };
    },
  };
}

/** Create mock CLI for decode game */
export function createDecodeCli() {
  const session = createDecodeGameSession();

  return {
    run(command: string): MockCliResult {
      const parts = command.trim().split(/\s+/);
      const cmd = parts[0]?.toLowerCase();

      if (!cmd) {
        return session.showStatus();
      }

      switch (cmd) {
        case 'start':
          return session.startGame(parts[1] as 'easy' | 'medium' | 'hard' | undefined);
        case 'hint':
          return session.showHelp(); // Actually show hint
        case 'skip':
          return session.submitAnswer('skip');
        case 'status':
          return session.showStatus();
        case 'quit':
        case 'exit':
        case 'q':
          return session.submitAnswer('quit');
        case 'help':
          return session.showHelp();
        default:
          // Treat as answer
          return session.submitAnswer(command.trim());
      }
    },

    getPrompt(): string {
      return 'decode>';
    },

    snapshot(): Record<string, unknown> {
      return {
        type: 'decode-game',
        state: session.state,
      };
    },

    autocomplete(input: string): string[] {
      const commands = ['start', 'hint', 'skip', 'status', 'quit', 'exit', 'help'];
      const partial = input.trim().toLowerCase();
      return commands.filter(c => c.startsWith(partial));
    },
  };
}
