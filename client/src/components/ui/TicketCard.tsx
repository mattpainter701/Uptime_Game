import React from 'react';
import { DifficultyBadge } from './DifficultyBadge';

interface Ticket {
  id: string;
  title: string;
  description: string;
  difficulty: number; // 1-5
  // ... other ticket fields
}

interface TicketCardProps {
  ticket: Ticket;
}

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-white">{ticket.title}</h3>
        <DifficultyBadge difficulty={ticket.difficulty} />
      </div>
      <p className="text-gray-400 text-sm">{ticket.description}</p>
    </div>
  );
}

export default TicketCard;
