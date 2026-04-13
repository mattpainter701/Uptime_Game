import { useGameStore } from '../../store/gameStore';
import { NPCS } from '../../data/npcs';

export function DialoguePanel() {
  const { activeDialogue, advanceDialogue, acceptStoryArc } = useGameStore();

  if (!activeDialogue) return null;

  const npc = NPCS.find((n) => n.id === activeDialogue.npcId);
  if (!npc) return null;

  const node = npc.dialogueTree.find((n) => n.id === activeDialogue.nodeId);
  if (!node) {
    // Node not found, end dialogue
    advanceDialogue(null);
    return null;
  }

  const handleResponse = (response: { text: string; nextId: string | null; action?: string; actionParam?: string }) => {
    if (response.action === 'accept-arc' && response.actionParam) {
      acceptStoryArc(response.actionParam);
    }
    advanceDialogue(response.nextId);
  };

  return (
    <div className="absolute inset-0 flex items-end justify-center z-20 bg-black/40 backdrop-blur-sm pb-8">
      <div className="w-full max-w-2xl mx-4 glass-panel">
        {/* NPC header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-700">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
            style={{ backgroundColor: npc.color + '40', border: `2px solid ${npc.color}` }}
          >
            {npc.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-white">{npc.name}</div>
            <div className="text-xs text-gray-400">{npc.role}</div>
          </div>
        </div>

        {/* Dialogue text */}
        <div className="p-6">
          <p className="text-gray-200 text-lg leading-relaxed">{node.text}</p>
        </div>

        {/* Responses */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          {node.responses && node.responses.length > 0 ? (
            node.responses.map((response, i) => (
              <button
                key={i}
                onClick={() => handleResponse(response)}
                className="w-full text-left px-4 py-3 rounded-lg bg-white/5 border border-gray-600 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all"
              >
                {response.action === 'accept-arc' && <span className="mr-2">📖</span>}
                {response.text}
              </button>
            ))
          ) : (
            <button
              onClick={() => advanceDialogue(null)}
              className="w-full text-left px-4 py-3 rounded-lg bg-white/5 border border-gray-600 text-gray-300 hover:bg-white/10 transition-all"
            >
              [End conversation]
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
