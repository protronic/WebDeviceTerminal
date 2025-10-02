import { Injectable } from '@angular/core';
import { TerminalConnector } from './terminal-connector';
import { BehaviorSubject, merge, Observer, Subject, Subscription, switchMap } from 'rxjs';
import { NgxWebSerial, provideNgxWebSerial } from 'ngx-web-serial';

@Injectable({
  providedIn: 'root'
})
export class WebSerialService implements TerminalConnector {

  // added connection state and subscription holder
  private connected$ = new BehaviorSubject<boolean>(false);
  private dataSubscription?: Subscription;
  private connSubscription?: Subscription;


  constructor(private serial: NgxWebSerial) { }

  isConnected(): boolean {
    return this.connected$.value
  }

  public connect(observable: Observer<Object>, host?: string) {
    this.connSubscription = this.serial.isConnected().subscribe(connected => {
      this.connected$.next(connected)
      if (!connected) {
        this.connSubscription?.unsubscribe();
        this.dataSubscription?.unsubscribe();
      }
    });
    this.dataSubscription = this.serial.open().pipe(
      switchMap(() => (this.serial).read())
    ).subscribe(observable);
  }

  disconnect() {
    this.serial.close();
    this.dataSubscription?.unsubscribe();
    this.connSubscription?.unsubscribe();
  }

  write(data: string): void {
    this.serial.write(data).subscribe();
  }
}
