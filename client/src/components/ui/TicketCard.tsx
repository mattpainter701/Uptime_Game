import React from 'react';
import { Ticket } from '../../types/ticket';

interface TicketCardProps {
  ticket: Ticket;
  onSelect?: (ticket: Ticket) => void;
}

const DifficultyBadge: React.FC<{ difficulty: number }> = ({ difficulty }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span
        key={i}
        className={`text-lg ${i <= difficulty ? 'text-yellow-400' : 'text-gray-600'}`}
        aria-label={`Star ${i} ${i <= difficulty ? 'filled' : 'empty'}`}
      >
        ★
      </span>
    );
  }
  return (
    <div className="difficulty-badge flex items-center gap-0.5" title={`Difficulty: ${difficulty}/5`}>
      <span className="text-xs text-gray-500 mr-1 font-mono">DIFF</span>
      {stars}
    </div>
  );
};

const TicketCard: React.FC<TicketCardProps> = ({ ticket, onSelect }) => {
  return (
    <div
      className="ticket-card bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-lg hover:border-cyan-500 transition-all cursor-pointer select-none"
      onClick={() => onSelect?.(ticket)}
    >
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold text-white leading-tight">{ticket.title}</h3>
        <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 ml-2 whitespace-nowrap">
          {ticket.status}
        </span>
      </div>
      <p className="text-sm text-gray-400 mt-2 line-clamp-2">{ticket.description}</p>
      <div className="mt-3 flex items-center justify-between">
        <DifficultyBadge difficulty={ticket.difficulty} />
        <span className="text-xs text-gray-600">
          {new Date(ticket.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

export default TicketCard;
