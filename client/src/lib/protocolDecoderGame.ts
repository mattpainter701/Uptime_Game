/**
 * Protocol Decoder Mini-game
 * 
 * An interactive terminal mini-game where players decode raw packet hex dumps.
 * Players identify protocols, flags, and fields with scoring based on accuracy and speed.
 */

export interface PacketChallenge {
  id: string;
  hexDump: string[];
  description: string;
  questions: Question[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Question {
  prompt: string;
  options: string[];
  correctAnswer: string;
  hint: string;
  points: number;
}

export interface GameState {
  currentChallenge: number;
  score: number;
  streak: number;
  bestStreak: number;
  startTime: number;
  questionsAnswered: number;
  correctAnswers: number;
  challenges: PacketChallenge[];
  isComplete: boolean;
}

export interface AnswerResult {
  correct: boolean;
  pointsEarned: number;
  explanation: string;
  correctAnswer: string;
}

// Pre-built packet challenges
const CHALLENGES: PacketChallenge[] = [
  {
    id: 'tcp_syn',
    hexDump: [
      '45 00 00 3c 1c 46 40 00 40 06',
      'b1 e6 ac 10 2a 01 ac 10 2a 02',
      '00 14 00 50 00 00 00 00 00 00',
      '00 00 a0 02 72 10 00 00 00 00',
    ],
    description: 'Ethernet/IPv4/TCP packet',
    difficulty: 'easy',
    questions: [
      {
        prompt: 'What is the IP version? (hint: first nibble of first byte)',
        options: ['4', '6', '5', '8'],
        correctAnswer: '4',
        hint: 'The first nibble (4 bits) of the IP header indicates the version. 0x45 = 4 (version) and 5 (header length in 32-bit words)',
        points: 10,
      },
      {
        prompt: 'What is the IP header length in bytes? (hint: second nibble x 4)',
        options: ['20', '24', '32', '40'],
        correctAnswer: '20',
        hint: '0x45: second nibble is 5, multiplied by 4 = 20 bytes',
        points: 10,
      },
      {
        prompt: 'What is the TCP destination port?',
        options: ['20', '80', '443', '25'],
        correctAnswer: '80',
        hint: 'Bytes 22-23 (0x00 0x50) = port 80 (HTTP)',
        points: 15,
      },
      {
        prompt: 'What TCP flags are set?',
        options: ['SYN', 'ACK', 'FIN', 'RST'],
        correctAnswer: 'SYN',
        hint: 'Byte 47 (0x02) = SYN flag only',
        points: 20,
      },
    ],
  },
  {
    id: 'dns_query',
    hexDump: [
      '00 01 08 00 00 00 40 00 00 00',
      '00 00 00 00 00 00 00 01 00 01',
      '00 00 29 00 10 00 00 00 00 00',
      '00 00 00 00 03 77 77 77 06 67',
    ],
    description: 'Ethernet/IPv4/UDP/DNS packet',
    difficulty: 'medium',
    questions: [
      {
        prompt: 'What transport protocol is used? (hint: IP protocol field)',
        options: ['TCP (6)', 'UDP (17)', 'ICMP (1)', 'SCTP (132)'],
        correctAnswer: 'UDP (17)',
        hint: 'Protocol field at byte 9: check if its 6 (TCP) or 17 (UDP)',
        points: 15,
      },
      {
        prompt: 'Is this a DNS query or response?',
        options: ['Query (QR=0)', 'Response (QR=1)', 'Notify', 'Update'],
        correctAnswer: 'Query (QR=0)',
        hint: 'In DNS header, the QR flag indicates direction. 0=query, 1=response',
        points: 20,
      },
      {
        prompt: 'What is the DNS query type?',
        options: ['A (1)', 'AAAA (28)', 'MX (15)', 'CNAME (5)'],
        correctAnswer: 'A (1)',
        hint: 'Query type field contains the record type being requested',
        points: 15,
      },
    ],
  },
  {
    id: 'icmp_echo',
    hexDump: [
      '45 00 00 54 00 00 40 00 40 01',
      '3c 97 c0 a8 01 01 c0 a8 01 02',
      '08 00 4a 2c 00 01 00 01',
    ],
    description: 'Ethernet/IPv4/ICMP Echo Request',
    difficulty: 'easy',
    questions: [
      {
        prompt: 'What is the ICMP type?',
        options: ['Type 0 (Echo Reply)', 'Type 8 (Echo Request)', 'Type 3 (Dest Unreachable)', 'Type 11 (Time Exceeded)'],
        correctAnswer: 'Type 8 (Echo Request)',
        hint: 'ICMP type is the first byte after the IP header. 0x08 = Echo Request',
        points: 15,
      },
      {
        prompt: 'What is the ICMP code?',
        options: ['0', '1', '3', '8'],
        correctAnswer: '0',
        hint: 'ICMP code is the second byte after the IP header',
        points: 10,
      },
      {
        prompt: 'What is the total IP packet length in bytes?',
        options: ['54', '64', '84', '100'],
        correctAnswer: '84',
        hint: 'Bytes 2-3 of IP header (0x00 0x54) = 84 decimal',
        points: 20,
      },
    ],
  },
  {
    id: 'arp_request',
    hexDump: [
      '08 00 27 94 a7 2a 00 00 00 00',
      '00 00 08 06 00 01 08 00 06 04',
      '00 01 00 00 00 00 00 00 c0 a8',
      '01 01 00 00 00 00 00 00 c0 a8',
    ],
    description: 'Ethernet ARP Request',
    difficulty: 'medium',
    questions: [
      {
        prompt: 'What is the EtherType?',
        options: ['0x0800 (IPv4)', '0x0806 (ARP)', '0x86DD (IPv6)', '0x8100 (VLAN)'],
        correctAnswer: '0x0806 (ARP)',
        hint: 'Bytes 12-13 of Ethernet frame: 0x08 0x06 = ARP',
        points: 15,
      },
      {
        prompt: 'Is this an ARP request or reply?',
        options: ['Request (opcode 1)', 'Reply (opcode 2)', 'RARP request', 'RARP reply'],
        correctAnswer: 'Request (opcode 1)',
        hint: 'ARP opcode at bytes 20-21: 0x00 0x01 = request',
        points: 20,
      },
      {
        prompt: 'What protocol address is being resolved?',
        options: ['IPv4', 'IPv6', 'MAC', 'IPX'],
        correctAnswer: 'IPv4',
        hint: 'ARP protocol type at bytes 12-13 of ARP payload: 0x08 0x00 = IPv4',
        points: 15,
      },
    ],
  },
  {
    id: 'https_tls',
    hexDump: [
      '16 03 01 00 5b 02 00 00 57 03',
      '01 00 00 00 00 00 00 00 00 00',
      '00 00 55 00 00 00 00 00 00 00',
      '00 00 00 00 00 00 00 00 00 00',
    ],
    description: 'TLS 1.3 ClientHello handshake',
    difficulty: 'hard',
    questions: [
      {
        prompt: 'What is the TLS content type?',
        options: ['20 (ChangeCipherSpec)', '21 (Alert)', '22 (Handshake)', '23 (Application)'],
        correctAnswer: '22 (Handshake)',
        hint: 'First byte: 0x16 = 22 decimal = Handshake',
        points: 20,
      },
      {
        prompt: 'What TLS version is being negotiated?',
        options: ['TLS 1.0', 'TLS 1.2', 'TLS 1.3', 'SSL 3.0'],
        correctAnswer: 'TLS 1.3',
        hint: 'Bytes 2-3: 0x03 0x01 = TLS 1.3 (legacy version field shows 1.0 for compatibility)',
        points: 25,
      },
      {
        prompt: 'What handshake message type is this?',
        options: ['ClientHello (1)', 'ServerHello (2)', 'Certificate (11)', 'Finished (20)'],
        correctAnswer: 'ClientHello (1)',
        hint: 'Byte 5 (after length): 0x02 0x00 0x00... check the handshake type field',
        points: 20,
      },
    ],
  },
];

/** Create a new game state */
export function createGameState(difficulty?: 'easy' | 'medium' | 'hard'): GameState {
  let challenges = [...CHALLENGES];
  if (difficulty) {
    challenges = challenges.filter(c => c.difficulty === difficulty);
  }
  // Shuffle challenges
  for (let i = challenges.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [challenges[i], challenges[j]] = [challenges[j], challenges[i]];
  }
  
  return {
    currentChallenge: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    startTime: Date.now(),
    questionsAnswered: 0,
    correctAnswers: 0,
    challenges: challenges.slice(0, 5), // Play 5 challenges
    isComplete: false,
  };
}

/** Get current challenge */
export function getCurrentChallenge(state: GameState): PacketChallenge | null {
  if (state.currentChallenge >= state.challenges.length) {
    return null;
  }
  return state.challenges[state.currentChallenge];
}

/** Get total questions so far */
function getTotalQuestionsAnswered(state: GameState): number {
  return state.questionsAnswered;
}

/** Check if current challenge is done */
function isCurrentChallengeDone(state: GameState): boolean {
  const challenge = getCurrentChallenge(state);
  if (!challenge) return true;
  
  let totalQuestionsBefore = 0;
  for (let i = 0; i < state.currentChallenge; i++) {
    totalQuestionsBefore += state.challenges[i].questions.length;
  }
  
  const questionsInThisChallenge = getTotalQuestionsAnswered(state) - totalQuestionsBefore;
  return questionsInThisChallenge >= challenge.questions.length;
}

/** Get current question for the challenge */
export function getCurrentQuestion(state: GameState): Question | null {
  if (isCurrentChallengeDone(state)) {
    state.currentChallenge++;
  }
  
  const challenge = getCurrentChallenge(state);
  if (!challenge) return null;
  
  let totalQuestionsBefore = 0;
  for (let i = 0; i < state.currentChallenge; i++) {
    totalQuestionsBefore += state.challenges[i].questions.length;
  }
  
  const localIndex = getTotalQuestionsAnswered(state) - totalQuestionsBefore;
  
  if (localIndex >= challenge.questions.length) {
    return null;
  }
  
  return challenge.questions[localIndex];
}

/** Submit an answer */
export function submitAnswer(state: GameState, answer: string): AnswerResult {
  const question = getCurrentQuestion(state);
  if (!question) {
    return {
      correct: false,
      pointsEarned: 0,
      explanation: 'No question available',
      correctAnswer: '',
    };
  }
  
  const correct = answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
  let pointsEarned = 0;
  
  if (correct) {
    pointsEarned = question.points;
    // Streak bonus
    if (state.streak >= 3) {
      pointsEarned = Math.floor(pointsEarned * 1.5);
    }
    state.score += pointsEarned;
    state.streak++;
    state.correctAnswers++;
    if (state.streak > state.bestStreak) {
      state.bestStreak = state.streak;
    }
  } else {
    state.streak = 0;
  }
  
  state.questionsAnswered++;
  
  // Check if game is complete
  if (state.currentChallenge >= state.challenges.length) {
    state.isComplete = true;
  }
  
  return {
    correct,
    pointsEarned,
    explanation: question.hint,
    correctAnswer: question.correctAnswer,
  };
}

/** Format hex dump for display with line numbers */
export function formatHexDump(lines: string[]): string {
  return lines.map((line, i) => {
    const offset = i * 10;
    const hex = line.padEnd(29);
    return `${offset.toString(16).padStart(4, '0')}  ${hex}`;
  }).join('\n');
}

/** Get game summary */
export function getGameSummary(state: GameState): string {
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const accuracy = state.questionsAnswered > 0 
    ? Math.round((state.correctAnswers / state.questionsAnswered) * 100)
    : 0;
  
  let grade = 'F';
  if (accuracy >= 90) grade = 'A';
  else if (accuracy >= 80) grade = 'B';
  else if (accuracy >= 70) grade = 'C';
  else if (accuracy >= 60) grade = 'D';
  
  return [
    '',
    '\x1b[1;36m╔══════════════════════════════════════════╗',
    '║        PROTOCOL DECODER RESULTS          ║',
    '╠══════════════════════════════════════════╣',
    `║  Score: ${state.score.toString().padStart(6)} points              ║`,
    `║  Accuracy: ${accuracy}% (${state.correctAnswers}/${state.questionsAnswered})`.padEnd(43) + '║',
    `║  Best Streak: ${state.bestStreak.toString().padStart(3)} correct             ║`,
    `║  Time: ${minutes}:${seconds.toString().padStart(2, '0')}                        ║`,
    `║  Grade: ${grade}                              ║`,
    '╚══════════════════════════════════════════╝\x1b[0m',
    '',
  ].join('\n');
}
