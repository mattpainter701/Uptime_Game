/**
 * labImportStore.ts - Zustand store for EVE-NG lab import wizard
 */
import { create } from 'zustand';

export interface LabInfo {
  name: string;
  path: string;
  author?: string;
  description?: string;
  version?: string;
}

export interface NodeMapping {
  nodeId: string;
  nodeName: string;
  role: 'router' | 'switch' | 'firewall' | 'unknown';
}

interface LabImportState {
  step: number;
  serverUrl: string;
  username: string;
  password: string;
  labs: LabInfo[];
  selectedLab: LabInfo | null;
  nodeMappings: NodeMapping[];
  loading: boolean;
  error: string | null;

  setStep: (step: number) => void;
  setServerUrl: (url: string) => void;
  setUsername: (username: string) => void;
  setPassword: (password: string) => void;
  setLabs: (labs: LabInfo[]) => void;
  setSelectedLab: (lab: LabInfo | null) => void;
  setNodeMappings: (mappings: NodeMapping[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  step: 1,
  serverUrl: '',
  username: '',
  password: '',
  labs: [],
  selectedLab: null,
  nodeMappings: [],
  loading: false,
  error: null,
};

export const useLabImportStore = create<LabImportState>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setUsername: (username) => set({ username }),
  setPassword: (password) => set({ password }),
  setLabs: (labs) => set({ labs }),
  setSelectedLab: (selectedLab) => set({ selectedLab }),
  setNodeMappings: (nodeMappings) => set({ nodeMappings }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
