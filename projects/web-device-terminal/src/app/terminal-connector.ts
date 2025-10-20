import { Observer } from "rxjs";

export interface TerminalConnector {
  isConnected(): boolean;
  connect(observable: Observer<Object>, url?: string): void;
  disconnect(): void;
  write(data: string): void;
}
