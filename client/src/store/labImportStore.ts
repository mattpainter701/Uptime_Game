import { create } from 'zustand';

export interface LabItem {
  id: string;
  name: string;
  path: string;
  [key: string]: unknown;
}

export interface LabImportState {
  step: number; // 1: credentials, 2: select lab, 3: map roles
  serverUrl: string;
  username: string;
  password: string;
  labs: LabItem[];
  selectedLab: LabItem | null;
  nodeMappings: Record<string, string>; // nodeId -> role

  setStep: (step: number) => void;
  setCredentials: (serverUrl: string, username: string, password: string) => void;
  setLabs: (labs: LabItem[]) => void;
  setSelectedLab: (lab: LabItem | null) => void;
  setNodeMapping: (nodeId: string, role: string) => void;
  reset: () => void;
}

export const useLabImportStore = create<LabImportState>((set) => ({
  step: 1,
  serverUrl: '',
  username: '',
  password: '',
  labs: [],
  selectedLab: null,
  nodeMappings: {},

  setStep: (step) => set({ step }),
  setCredentials: (serverUrl, username, password) => set({ serverUrl, username, password }),
  setLabs: (labs) => set({ labs }),
  setSelectedLab: (lab) => set({ selectedLab: lab }),
  setNodeMapping: (nodeId, role) =>
    set((state) => ({
      nodeMappings: { ...state.nodeMappings, [nodeId]: role },
    })),
  reset: () =>
    set({
      step: 1,
      serverUrl: '',
      username: '',
      password: '',
      labs: [],
      selectedLab: null,
      nodeMappings: {},
    }),
}));
