import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { FunctionsUsingCSI, NgTerminal } from 'ng-terminal';
import { BluetoothCore } from '@manekinekko/angular-web-bluetooth';
import { Observer } from 'rxjs';
import { BleService } from './ble.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements AfterViewInit, Observer<Object> {
  readonly title = 'ble-terminal';
  readonly prompt = '\n' + FunctionsUsingCSI.cursorColumn(1) + '$ ';
  @ViewChild('term', { static: false }) child!: NgTerminal;
  buffer = '';
  ble: BleService;

  constructor() {
    this.ble = new BleService();
    this.ble.subject.subscribe(this);
  }

  ngAfterViewInit(): void {
    this.child.write(this.prompt);
    this.child.onData().subscribe((input) => {
      if (input === '\r') { // Carriage Return (When Enter is pressed)

        switch (this.buffer) {
          case 'connect':
            console.log('TRY connect');
            this.ble.connectButtonPressed();
            break;

          default:
            console.log('TRY write:' + this.buffer);
            this.ble.write(this.buffer);
            break;
        }
        this.buffer = '';
        this.child.write(this.prompt);
      } else if (input === '\u007f') { // Delete (When Backspace is pressed)
        if (this.child.underlying.buffer.active.cursorX > 2) {
          this.child.write('\b \b');
        }
      } else if (input === '\u0003') { // End of Text (When Ctrl and C are pressed)
        this.child.write('^C');
        this.child.write(this.prompt);
      } else
        this.child.write(input);
      this.buffer += input;
    });
  }

  next(bleMessage: Object) {
    console.log(bleMessage);
    this.child.write(bleMessage.toString());
    this.child.write(this.prompt);
  };
  error(err: any) { this.next(err) };
  complete!: () => void;
}
