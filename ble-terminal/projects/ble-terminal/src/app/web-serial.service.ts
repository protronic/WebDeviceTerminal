import { Injectable } from '@angular/core';
import { TerminalConnector } from './terminal-connector';
import { Observer, Subject } from 'rxjs';
import { NgxWebSerial, provideNgxWebSerial } from 'ngx-web-serial';

@Injectable({
  providedIn: 'root'
})
export class WebSerialService implements TerminalConnector {
  subject: Subject<Object>;

  constructor(private serial: NgxWebSerial) {
    this.subject = new Subject();
  }

  isConnected(): boolean {
    return this.serial.isConnected();
  }

  public connect(observable: Observer<Object>, host?: string) {
    this.serial.open().subscribe()
    this.serial.
  }

  disconnect() {
    
  }

  write(data: string): void {
    this.serial.write(data).subscribe();
  }
}
