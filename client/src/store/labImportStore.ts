import { create } from 'zustand';

export interface Lab {
  path: string;
  name: string;
  status: string;
  [key: string]: unknown;
}

export interface NodeMapping {
  nodeId: string;
  role: 'router' | 'switch' | 'firewall' | 'unknown';
}

interface LabImportState {
  step: number;
  serverUrl: string;
  username: string;
  password: string;
  labs: Lab[];
  selectedLab: Lab | null;
  nodeMappings: NodeMapping[];

  setStep: (step: number) => void;
  setServerUrl: (url: string) => void;
  setUsername: (username: string) => void;
  setPassword: (password: string) => void;
  setLabs: (labs: Lab[]) => void;
  setSelectedLab: (lab: Lab | null) => void;
  setNodeMappings: (mappings: NodeMapping[]) => void;
  addNodeMapping: (mapping: NodeMapping) => void;
  resetStore: () => void;
}

export const useLabImportStore = create<LabImportState>((set) => ({
  step: 1,
  serverUrl: '',
  username: '',
  password: '',
  labs: [],
  selectedLab: null,
  nodeMappings: [],

  setStep: (step) => set({ step }),
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setUsername: (username) => set({ username }),
  setPassword: (password) => set({ password }),
  setLabs: (labs) => set({ labs }),
  setSelectedLab: (selectedLab) => set({ selectedLab }),
  setNodeMappings: (nodeMappings) => set({ nodeMappings }),
  addNodeMapping: (mapping) =>
    set((state) => ({
      nodeMappings: [
        ...state.nodeMappings.filter((m) => m.nodeId !== mapping.nodeId),
        mapping,
      ],
    })),
  resetStore: () =>
    set({
      step: 1,
      serverUrl: '',
      username: '',
      password: '',
      labs: [],
      selectedLab: null,
      nodeMappings: [],
    }),
}));
