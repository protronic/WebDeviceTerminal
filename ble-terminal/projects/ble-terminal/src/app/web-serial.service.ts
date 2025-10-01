import { Injectable } from '@angular/core';
import { TerminalConnector } from './terminal-connector';
import { BehaviorSubject, merge, Observer, Subject, switchMap } from 'rxjs';
import { NgxWebSerial, provideNgxWebSerial } from 'ngx-web-serial';

@Injectable({
  providedIn: 'root'
})
export class WebSerialService implements TerminalConnector {

  // added connection state and subscription holder
  private connected$ = new BehaviorSubject<boolean>(false);

  constructor(private serial: NgxWebSerial) { }

  isConnected(): boolean {
    return this.connected$.value
  }

  public connect(observable: Observer<Object>, host?: string) {
    // Open the serial port, then subscribe to the data stream
    this.serial.open().pipe(
      switchMap(() => (this.serial).read())
    ).subscribe(observable);
    this.serial.isConnected().subscribe(this.connected$);
  }

  disconnect() {
    this.serial.close();
  }

  write(data: string): void {
    this.serial.write(data).subscribe();
  }
}
