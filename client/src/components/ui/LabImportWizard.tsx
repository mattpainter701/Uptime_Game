import React, { useEffect, useState } from 'react';
import { useLabImportStore, type NodeMapping } from '../../store/labImportStore';

interface LabNode {
  id: string;
  name: string;
  status: string;
  template?: string;
  [key: string]: unknown;
}

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  className,
  ...props
}) => (
  <button
    className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 ${className || ''}`}
    {...props}
  >
    {children}
  </button>
);

export default function LabImportWizard() {
  const {
    step,
    serverUrl,
    username,
    password,
    labs,
    selectedLab,
    nodeMappings,
    setStep,
    setServerUrl,
    setUsername,
    setPassword,
    setLabs,
    setSelectedLab,
    setNodeMappings,
    addNodeMapping,
    resetStore,
  } = useLabImportStore();

  const [loadingLabs, setLoadingLabs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<LabNode[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);

  const fetchLabs = async () => {
    setLoadingLabs(true);
    setError(null);
    try {
      const response = await fetch('/api/labs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_url: serverUrl, username, password }),
      });
      if (!response.ok) throw new Error('Failed to fetch labs');
      const data = await response.json();
      if (data.success && data.labs) {
        setLabs(data.labs);
        setStep(2);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoadingLabs(false);
    }
  };

  const fetchNodes = async (labPath: string) => {
    setLoadingNodes(true);
    setError(null);
    try {
      const response = await fetch(`/api/nodes/${encodeURIComponent(labPath)}/list`);
      if (!response.ok) throw new Error('Failed to fetch nodes');
      const data = await response.json();
      setNodes(data.nodes || []);
      // Initialize nodeMappings if empty
      if (data.nodes && nodeMappings.length === 0) {
        setNodeMappings(
          data.nodes.map((node: LabNode) => ({
            nodeId: node.id,
            role: 'unknown' as const,
          }))
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load nodes');
    } finally {
      setLoadingNodes(false);
    }
  };

  useEffect(() => {
    if (step === 3 && selectedLab) {
      fetchNodes(selectedLab.path);
    }
  }, [step, selectedLab]);

  return (
    <div className="p-6 max-w-2xl mx-auto bg-gray-800 text-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-4">Import Lab from EVE-NG</h2>

      {/* Step indicator */}
      <div className="flex mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                s <= step ? 'bg-blue-500' : 'bg-gray-600'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  s < step ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-600 rounded">{error}</div>
      )}

      {/* Step 1: Server URL and credentials */}
      {step === 1 && (
        <div>
          <div className="mb-4">
            <label className="block text-sm mb-1">EVE-NG Server URL</label>
            <input
              type="text"
              className="w-full p-2 bg-gray-700 rounded border border-gray-600"
              placeholder="https://eve-ng.example.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-1">Username</label>
            <input
              type="text"
              className="w-full p-2 bg-gray-700 rounded border border-gray-600"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              className="w-full p-2 bg-gray-700 rounded border border-gray-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            onClick={fetchLabs}
            disabled={loadingLabs || !serverUrl || !username || !password}
          >
            {loadingLabs ? 'Fetching...' : 'Next: Select Lab'}
          </Button>
        </div>
      )}

      {/* Step 2: Lab selection */}
      {step === 2 && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Select a Lab</h3>
            {labs.length === 0 && <p>No labs found.</p>}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {labs.map((lab) => (
                <div
                  key={lab.path}
                  className={`p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 ${
                    selectedLab?.path === lab.path ? 'border-2 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedLab(lab)}
                >
                  <div className="font-medium">{lab.name || lab.path}</div>
                  <div className="text-sm text-gray-400">Path: {lab.path}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setStep(1)} className="bg-gray-600 hover:bg-gray-500">
              Back
            </Button>
            <Button onClick={() => selectedLab && setStep(3)} disabled={!selectedLab}>
              Next: Map Roles
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Node mapping */}
      {step === 3 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Map Nodes to Roles</h3>
          {loadingNodes && <p>Loading nodes...</p>}
          {!loadingNodes && nodes.length === 0 && <p>No nodes found.</p>}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {nodes.map((node) => {
              const mapping = nodeMappings.find((m) => m.nodeId === node.id);
              const role = mapping?.role || 'unknown';
              return (
                <div key={node.id} className="flex items-center gap-3 bg-gray-700 p-2 rounded">
                  <div className="flex-1">
                    <div className="font-medium">{node.name || node.id}</div>
                    <div className="text-sm text-gray-400">ID: {node.id}</div>
                  </div>
                  <select
                    className="p-1 bg-gray-600 rounded"
                    value={role}
                    onChange={(e) =>
                      addNodeMapping({ nodeId: node.id, role: e.target.value as NodeMapping['role'] })
                    }
                  >
                    <option value="unknown">Unknown</option>
                    <option value="router">Router</option>
                    <option value="switch">Switch</option>
                    <option value="firewall">Firewall</option>
                  </select>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => setStep(2)} className="bg-gray-600 hover:bg-gray-500">
              Back
            </Button>
            <Button onClick={() => resetStore()} className="bg-green-600 hover:bg-green-700">
              Finish Import
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
