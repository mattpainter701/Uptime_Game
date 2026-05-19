import { useState, useEffect } from 'react';
import { useLabImportStore } from '../../store/labImportStore';

interface NodeInfo {
  id: string;
  name: string;
  type: string;
  status: string;
}

const ROLES = ['router', 'switch', 'firewall', 'server', 'client'];

function StepCredentials() {
  const { serverUrl, username, password, setCredentials, setStep, setLabs } =
    useLabImportStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!serverUrl || !username || !password) {
      setError('All fields are required');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch('/api/labs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_url: serverUrl, username, password }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.detail || 'Failed to fetch labs');
      }
      setLabs(data.labs || []);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-gray-800 rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold text-white">Step 1: EVE-NG Credentials</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Server URL (e.g. https://192.168.1.100)"
          value={serverUrl}
          onChange={(e) => setCredentials(e.target.value, username, password)}
          className="w-full p-2 bg-gray-700 text-white rounded"
        />
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setCredentials(serverUrl, e.target.value, password)}
          className="w-full p-2 bg-gray-700 text-white rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setCredentials(serverUrl, username, e.target.value)}
          className="w-full p-2 bg-gray-700 text-white rounded"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Fetch Labs'}
        </button>
      </form>
    </div>
  );
}

function StepSelectLab() {
  const { labs, setSelectedLab, setStep } = useLabImportStore();
  return (
    <div className="p-6 max-w-lg mx-auto bg-gray-800 rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold text-white">Step 2: Select a Lab</h2>
      <div className="grid gap-3">
        {labs.length === 0 && (
          <p className="text-gray-400">No labs found. Go back and check credentials.</p>
        )}
        {labs.map((lab) => (
          <button
            key={lab.path || lab.id}
            onClick={() => {
              setSelectedLab(lab);
              setStep(3);
            }}
            className="text-left p-3 bg-gray-700 hover:bg-gray-600 rounded text-white"
          >
            <span className="font-medium">{lab.name}</span>
            <span className="text-gray-400 text-sm ml-2">({lab.path})</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setStep(1)}
        className="text-sm text-cyan-400 hover:underline"
      >
        &larr; Back
      </button>
    </div>
  );
}

function StepNodeMapping() {
  const { selectedLab, nodeMappings, setNodeMapping, setStep } = useLabImportStore();
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedLab) {
      setLoading(true);
      setError('');
      fetch(`/api/nodes/${encodeURIComponent(selectedLab.path || '')}/list`)
        .then((r) => r.json())
        .then((data) => {
          // handle different response shapes
          const nodeList = Array.isArray(data) ? data : data.nodes || [];
          setNodes(nodeList);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [selectedLab]);

  return (
    <div className="p-6 max-w-lg mx-auto bg-gray-800 rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold text-white">Step 3: Map Node Roles</h2>
      {selectedLab && (
        <p className="text-gray-300">
          Lab: <strong>{selectedLab.name}</strong>
        </p>
      )}
      {loading && <p className="text-gray-400">Loading nodes...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && nodes.length === 0 && (
        <p className="text-gray-400">No nodes found for this lab.</p>
      )}
      {nodes.map((node) => (
        <div key={node.id} className="flex items-center justify-between bg-gray-700 p-2 rounded">
          <div>
            <span className="text-white font-medium">{node.name || node.id}</span>
            <span className="text-gray-400 text-sm ml-2">({node.type || 'unknown'})</span>
          </div>
          <select
            value={nodeMappings[node.id] || ''}
            onChange={(e) => setNodeMapping(node.id, e.target.value)}
            className="p-1 bg-gray-600 text-white rounded"
          >
            <option value="">-- role --</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      ))}
      <div className="flex justify-between pt-4">
        <button
          onClick={() => setStep(2)}
          className="text-sm text-cyan-400 hover:underline"
        >
          &larr; Back
        </button>
        <button
          onClick={() => {
            // TODO: submit import
            alert('Lab import completed!');
            // You can integrate actual submission logic here.
          }}
          className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded"
        >
          Finish Import
        </button>
      </div>
    </div>
  );
}

export function LabImportWizard() {
  const step = useLabImportStore((s) => s.step);

  return (
    <div className="min-h-[400px]">
      {step === 1 && <StepCredentials />}
      {step === 2 && <StepSelectLab />}
      {step === 3 && <StepNodeMapping />}
    </div>
  );
}

export default LabImportWizard;
