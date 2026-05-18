/**
 * LabImportWizard.tsx - Multi-step wizard for importing EVE-NG lab topology
 */
import React, { useState, useEffect } from 'react';
import { useLabImportStore, LabInfo, NodeMapping } from '../../store/labImportStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface StepProps {
  onNext: () => void;
  onBack?: () => void;
}

function Step1Credentials({ onNext }: StepProps) {
  const { serverUrl, username, password, setServerUrl, setUsername, setPassword, setError } = useLabImportStore();
  const [localUrl, setLocalUrl] = useState(serverUrl);
  const [localUser, setLocalUser] = useState(username);
  const [localPass, setLocalPass] = useState(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localUrl.trim() || !localUser.trim() || !localPass.trim()) {
      setError('All fields are required');
      return;
    }
    setServerUrl(localUrl.trim());
    setUsername(localUser.trim());
    setPassword(localPass);
    setError(null);
    onNext();
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-cyan-400">Step 1: EVE-NG Connection</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Server URL</label>
          <input
            type="text"
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
            placeholder="https://192.168.1.100"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
          <input
            type="text"
            value={localUser}
            onChange={(e) => setLocalUser(e.target.value)}
            placeholder="admin"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
          <input
            type="password"
            value={localPass}
            onChange={(e) => setLocalPass(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded transition-colors"
        >
          Connect & Fetch Labs
        </button>
      </form>
    </div>
  );
}

function Step2SelectLab({ onNext, onBack }: StepProps) {
  const { labs, selectedLab, setSelectedLab, setLabs, setLoading, setError, serverUrl, username, password } = useLabImportStore();
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    const fetchLabs = async () => {
      if (labs.length > 0) return;
      setFetching(true);
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/api/labs/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ server_url: serverUrl, username, password }),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP ${response.status}`);
        }
        const data = await response.json();
        setLabs(data.labs || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch labs');
      } finally {
        setFetching(false);
        setLoading(false);
      }
    };
    fetchLabs();
  }, []);

  const handleSelect = (lab: LabInfo) => {
    setSelectedLab(lab);
  };

  const handleNext = () => {
    if (!selectedLab) {
      setError('Please select a lab');
      return;
    }
    setError(null);
    onNext();
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-cyan-400">Step 2: Select Lab</h2>
      {fetching ? (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-gray-400">Fetching labs from EVE-NG...</p>
        </div>
      ) : labs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">No labs found on the server.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {labs.map((lab) => (
            <div
              key={lab.path}
              onClick={() => handleSelect(lab)}
              className={`p-3 rounded cursor-pointer border transition-colors ${
                selectedLab?.path === lab.path
                  ? 'border-cyan-500 bg-cyan-900/30'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-500'
              }`}
            >
              <div className="font-medium text-white">{lab.name}</div>
              {lab.description && (
                <div className="text-sm text-gray-400 mt-1">{lab.description}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">{lab.path}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-between mt-6">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedLab}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function Step3NodeMapping({ onBack }: StepProps) {
  const { selectedLab, nodeMappings, setNodeMappings, setError } = useLabImportStore();
  const [localMappings, setLocalMappings] = useState<NodeMapping[]>(nodeMappings);

  useEffect(() => {
    if (selectedLab && localMappings.length === 0) {
      // Generate initial mappings from lab nodes (simulated)
      const initialMappings: NodeMapping[] = [
        { nodeId: 'node1', nodeName: 'R1', role: 'router' },
        { nodeId: 'node2', nodeName: 'R2', role: 'router' },
        { nodeId: 'node3', nodeName: 'SW1', role: 'switch' },
        { nodeId: 'node4', nodeName: 'FW1', role: 'firewall' },
      ];
      setLocalMappings(initialMappings);
    }
  }, [selectedLab]);

  const handleRoleChange = (nodeId: string, role: NodeMapping['role']) => {
    setLocalMappings((prev) =>
      prev.map((m) => (m.nodeId === nodeId ? { ...m, role } : m))
    );
  };

  const handleFinish = () => {
    setNodeMappings(localMappings);
    setError(null);
    alert('Lab import completed! (UI placeholder)');
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-cyan-400">Step 3: Map Nodes to Roles</h2>
      {selectedLab && (
        <p className="text-sm text-gray-400 mb-4">
          Lab: <span className="text-white">{selectedLab.name}</span>
        </p>
      )}
      <div className="space-y-3">
        {localMappings.map((mapping) => (
          <div key={mapping.nodeId} className="flex items-center justify-between p-3 bg-gray-800 rounded border border-gray-700">
            <div>
              <div className="text-white font-medium">{mapping.nodeName}</div>
              <div className="text-xs text-gray-500">ID: {mapping.nodeId}</div>
            </div>
            <select
              value={mapping.role}
              onChange={(e) => handleRoleChange(mapping.nodeId, e.target.value as NodeMapping['role'])}
              className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
            >
              <option value="router">Router</option>
              <option value="switch">Switch</option>
              <option value="firewall">Firewall</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-6">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleFinish}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded transition-colors"
        >
          Finish Import
        </button>
      </div>
    </div>
  );
}

export function LabImportWizard() {
  const { step, error, setStep, reset } = useLabImportStore();

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(Math.max(1, step - 1));

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">Import EVE-NG Lab</h1>
        <button
          onClick={reset}
          className="text-gray-400 hover:text-white transition-colors"
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex px-6 py-3 bg-gray-800/50">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                s === step
                  ? 'bg-cyan-600 text-white'
                  : s < step
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
            <div className="ml-2 text-xs text-gray-400 hidden sm:block">
              {s === 1 ? 'Credentials' : s === 2 ? 'Select Lab' : 'Map Nodes'}
            </div>
            {s < 3 && <div className="flex-1 h-0.5 mx-2 bg-gray-700" />}
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="py-4">
        {step === 1 && <Step1Credentials onNext={handleNext} />}
        {step === 2 && <Step2SelectLab onNext={handleNext} onBack={handleBack} />}
        {step === 3 && <Step3NodeMapping onBack={handleBack} />}
      </div>
    </div>
  );
}

export default LabImportWizard;
