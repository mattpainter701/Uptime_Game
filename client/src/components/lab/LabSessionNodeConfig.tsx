import { FC } from 'react';

interface LabSessionNodeConfigProps {
  nodeName: string;
  config: string;
}

const LabSessionNodeConfig: FC<LabSessionNodeConfigProps> = ({ nodeName, config }) => {
  const handleDownload = () => {
    const blob = new Blob([config], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nodeName}_${new Date().toISOString().slice(0, 10)}.cfg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="node-config flex-1 flex flex-col">
      <h2 className="text-lg font-semibold mb-2">Configuration</h2>
      <textarea
        className="flex-1 bg-gray-800 text-green-400 font-mono p-4 rounded"
        value={config}
        readOnly
      />
      <button
        onClick={handleDownload}
        className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
      >
        Download Config
      </button>
    </div>
  );
};

export default LabSessionNodeConfig;
