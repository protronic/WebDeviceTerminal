import { Injectable } from '@angular/core';
import { TerminalConnector } from './terminal-connector';
import { Observer } from 'rxjs';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root'
})
export class WsService implements TerminalConnector {

  public url = 'ws://lsm6:8088/echo';
  wsSubject!: WebSocketSubject<Object>;

  isConnected(): boolean {
    return (this.wsSubject !== undefined && !this.wsSubject.closed)
  }

  public connect(observable: Observer<Object>, host?: string) {
    if (host == "mft.protronic-gmbh.com")
      this.url = 'wss://' + host + '/echo';
    else
      this.url = 'ws://' + host + ':8088/echo';
    console.log('LSM6_Chat: ' + this.url);
    if (this.wsSubject && !this.wsSubject.closed) {
      this.wsSubject.complete();
      console.log('LSM6_mes closed: ' + this.wsSubject.closed);
    }
    this.wsSubject = webSocket(this.url);
    this.wsSubject.subscribe(observable);
  }

  disconnect() {
    if (this.wsSubject !== undefined) this.wsSubject.complete();
  }

  write(data: string): void {
    if (this.isConnected()) {
      this.wsSubject.next(data);
    }
  }
}
