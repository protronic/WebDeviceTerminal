import { Injectable } from '@angular/core';
import { TerminalConnector } from './terminal-connector';
import { Observer } from 'rxjs';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root'
})
export class WsService implements TerminalConnector {
 
  public url = 'wss://mft.protronic-gmbh.de/echo';
  wsSubject!: WebSocketSubject<Object>;

  isConnected(): boolean {
    return (this.wsSubject !== undefined && !this.wsSubject.closed)
  }

  public connect(observable: Observer<Object>, host?: string) {
    if (host !== undefined)
      this.url = 'ws://' + host + ':8088/echo';
    console.log('WS: ' + this.url);
    if (this.wsSubject && !this.wsSubject.closed) {
      this.wsSubject.complete();
      console.log('WS: ' + this.wsSubject.closed);
    }
    this.wsSubject = webSocket(this.url);
    this.wsSubject.subscribe(observable);
  }

  disconnect() {
    if (this.wsSubject !== undefined) this.wsSubject.complete();
  }

  write(data: string): void {
    if (this.isConnected()) {      
      let o: any = data
      try {
        o = JSON.parse(data);
      } catch (e) {
        // not json
      }
      this.wsSubject.next(o);
      console.log('WS send: ' + o);
    }
  }
}
