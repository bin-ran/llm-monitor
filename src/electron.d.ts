export interface IElectronAPI {
  message: (text: string) => Promise<void>
}

declare global {
  interface Window {
    binran: IElectronAPI
  }
}
