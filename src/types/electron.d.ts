export {};

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      quit: () => void;
      getPathForFile: (file: File) => string | null;
    };
  }
}
