import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { FunctionsUsingCSI, NgTerminal } from 'ng-terminal';
import { Observer } from 'rxjs';
import { BleService } from './ble.service';
import { TerminalConnector } from './terminal-connector';
import { WsService } from './ws.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements AfterViewInit, Observer<Object> {
  readonly title = 'ble-terminal';
  readonly prompt = '\n' + FunctionsUsingCSI.cursorColumn(1) + '$ ';
  @ViewChild('interm', { static: false }) inchild!: NgTerminal;
  @ViewChild('outerm', { static: false }) outchild!: NgTerminal;
  buffer = '';
  connectionService: TerminalConnector | undefined;

  constructor() {

  }

  ngAfterViewInit(): void {
    this.outchild.write(this.prompt);
    this.outchild.onData().subscribe((input) => { // Callback für Eingaben im Terminal
      if (this.connectionService?.isConnected()) {
        switch (input) {
          case '\u0003':   // End of Text (When Ctrl and C are pressed) disconnect BLE
            this.connectionService.disconnect();
            this.connectionService = undefined;
            break;

          default:  // Alle weiteren Eingaben werden gesendet
            this.outchild.write(input);
            this.connectionService.write(input);
            break;
        }
      } else
        switch (input) {
          case '\r': // Carriage Return (When Enter is pressed)
            this.handleBuffer();
            break;

          case '\u007f': // Delete (When Backspace is pressed)
            if (this.outchild.underlying!.buffer.active.cursorX > 2) {
              this.outchild.write('\b \b');
              this.buffer = this.buffer.substring(0, this.buffer.length - 1);
            }
            break;

          case '\u0003':   // End of Text (When Ctrl and C are pressed)
            this.outchild.write('^C');
            this.outchild.write(this.prompt);
            this.buffer = '';
            break;

          default:  // Alle weiteren Eingaben werden gepuffert
            this.outchild.write(input);
            this.buffer += input;
            break;
        }
    });
  }

  private handleBuffer() {
    switch (this.buffer) { // Parsen von Steuerer Befehlen aus Puffer
      case 'connect':
      case 'con':
      case 'ble':
      case 'bluetooth':
        if (this.connectionService?.isConnected()) {

        } else {
          console.log('BLE connect');
          this.connectionService = new BleService();
          this.connectionService.connect(this);
        }
        break;

      case 'ws':
      case 'wss':
        if (this.connectionService?.isConnected()) {

        } else {
          console.log('BLE connect');
          this.connectionService = new WsService();
          this.connectionService.connect(this, 'lsm6');
        }
        break;

      default: // Falls sich kein Befahlt im Puffer befindet wird gesendet
        // console.log('BLE write:' + this.buffer);
        // this.ble.write(this.buffer);
        break;
    }
    this.buffer = ''; // Puffer leeren
    this.outchild.write(this.prompt); // Neuer Promt
  }

  next(bleMessage: Object) {            // Callback für Daten von BLE
    console.log(bleMessage);
    this.inchild.write(bleMessage.toString());
  };
  error(err: any) { this.next(err) };   // Callback für Felher vom BLE service
  complete!: () => void;
}
