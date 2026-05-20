import React from 'react';
import NodeStatusIndicator from '../ui/NodeStatusIndicator';

interface TopologyNode {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'warning' | 'error';
}

const sampleNodes: TopologyNode[] = [
  { id: '1', name: 'Router-1', status: 'online' },
  { id: '2', name: 'Switch-A', status: 'offline' },
  { id: '3', name: 'Firewall-1', status: 'warning' },
  { id: '4', name: 'Server-1', status: 'error' },
];

export const TopologyView: React.FC = () => {
  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <h2 className="text-xl font-bold mb-4">Network Topology</h2>
      <ul className="space-y-2">
        {sampleNodes.map((node) => (
          <li key={node.id} className="flex items-center gap-3">
            <span className="font-mono">{node.name}</span>
            <NodeStatusIndicator status={node.status} />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TopologyView;
