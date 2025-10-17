import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { FunctionsUsingCSI, NgTerminal } from 'ng-terminal';
import { Observer } from 'rxjs';
import { BleService } from './ble.service';
import { TerminalConnector } from './terminal-connector';
import { WsService } from './ws.service';
import { WebSerialService } from './web-serial.service';
import { JsonCompactPipe } from './json-compact-pipe';
import { NgxWebSerial } from 'ngx-web-serial';
import PouchDB from 'pouchdb';

const JsonCompact = new JsonCompactPipe();
const historyLength = 10;
export type LastCommands = {
  type: "last_commands"
  history: string[]
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false
})

export class AppComponent implements AfterViewInit, Observer<Object> {
  readonly title = 'ble-terminal';
  readonly prompt = '\n' + FunctionsUsingCSI.cursorColumn(1) + '$ ';
  readonly connect_prompt = '\n' + FunctionsUsingCSI.cursorColumn(1) + '# ';
  readonly connect_prompt_cl = FunctionsUsingCSI.eraseInLine(2) + FunctionsUsingCSI.cursorColumn(1) + '# ';

  @ViewChild('interm', { static: false }) inchild!: NgTerminal;
  @ViewChild('outerm', { static: false }) outchild!: NgTerminal;
  buffer = '';
  connectionService: TerminalConnector | undefined;
  private db: PouchDB.Database<LastCommands>;
  countUp = -1;
  codebook: string = 'cmd_history'; // default document id for command history

  constructor(private serial: NgxWebSerial) {
    this.db = new PouchDB("cmd_history_db");
  }

  ngAfterViewInit(): void {
    this.outchild.write(this.prompt);
    this.outchild.onData().subscribe((input) => { // Callback für Eingaben im Terminal
      if (this.connectionService?.isConnected()) { // Wenn verbunden werden Eingaben gepuffert und mit Enter abgeschickt
        switch (input) {
          case '\u0003':   // End of Text (When Ctrl and C are pressed) disconnect BLE
            this.connectionService.disconnect();
            this.connectionService = undefined;
            break;

          case '\u007f': // Delete (When Backspace is pressed)
            if (this.outchild.underlying!.buffer.active.cursorX > 2) {
              this.outchild.write('\b \b');
              this.buffer = this.buffer.substring(0, this.buffer.length - 1);
            }
            break;

          case '\u001b[A': // Arrow Up
            this.outchild.write(this.connect_prompt_cl);
            this.historyToBuffer(++this.countUp);
            break;

          case '\u001b[B': // Arrow Down
            this.outchild.write(this.connect_prompt_cl);
            this.historyToBuffer(--this.countUp);
            break;

          case '\u001b[3~': // Entf  (When Delete is pressed)
            this.outchild.write(this.connect_prompt_cl);
            this.removeFromHistory(this.buffer);
            break;

          case '\r': // Enter
            const command = this.buffer;
            this.connectionService.write(command + '\r\n');            
            this.buffer = '';
            this.countUp = -1;
            this.db.get(this.codebook).catch((err) => {
              if (err.name === 'not_found') {
                return this.newCmdHistoryDoc();
              } else
                throw err;
            }).then(doc => this.db.put(this.appendCmd(doc, command))).catch(console.log);
            break;

          default:  // Alle weiteren Eingaben werden gepuffert
            this.outchild.write(input);
            this.buffer += input;
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
  removeFromHistory(s: string) {
    this.db.get(this.codebook).then(doc => {
      const index = doc.history.indexOf(s);
      if (index !== -1) {
        doc.history.splice(index, 1);
        this.db.put(doc).catch(console.log);
        console.log('Command history:' + JSON.stringify(doc));
      }
    }).catch(err => console.log(err));
  }

  private appendCmd(doc: PouchDB.Core.Document<LastCommands>, command: string): PouchDB.Core.Document<LastCommands> {
    if (!doc.history) doc.history = [];
    const index = doc.history.indexOf(command);
    if (index !== -1) {
      // Wenn der Befehl existiert, diesen aus der History entfernen
      doc.history.splice(index, 1);
    }
    if (doc.history.length >= historyLength) {
      doc.history.shift(); // Ältesten Befehl entfernen, wenn die History 50 Einträge überschreitet
    }
    if (command.length > 0) {
      doc.history.push(command);
    }
    console.log('Command history:' + JSON.stringify(doc));
    return doc;
  }

  private newCmdHistoryDoc(): PouchDB.Core.Document<LastCommands> {
    return {
      _id: this.codebook,
      type: "last_commands",
      history: new Array<string>(),
    };
  }

  private historyToBuffer(index: number) {
    return this.db.get(this.codebook).then(doc => {
      index = Math.min(index, doc.history.length - 1);
      index = Math.max(index, -1);
      this.countUp = index;
      console.log('History index:' + index);
      for (let i = 0; i < index; i++)
        this.buffer = doc.history.pop() || '';
      if (index < 0)
        this.buffer = '';
      else
        this.buffer = doc.history.pop() || this.buffer || '';
      this.outchild.write(this.buffer);
    }).catch(err => console.log(err));

  }

  private handleBuffer() {
    //split the buffer into command and arguments
    const parts = this.buffer.split(' ');
    const command = parts[0];
    const args = parts.slice(1);
    let url = 'mft.protronic-gmbh.de'; // default WS URL
    console.log('Command: ' + command + ' args: ' + args);
    // Arg to global variable if needed in future expansions only if arg exist
    if (args.length > 0) {
      this.codebook = args[0];
      if (args.length > 1)
        url = args[1];
    } else
      this.codebook = 'cmd_history'; // reset to default if no arg
    this.countUp = -1;
    switch (command) { // Je nach Befehl werden die entsprechenden Funktionen ausgeführt
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
          console.log('WS connect');
          this.connectionService = new WsService();
          this.connectionService.connect(this, url);
        }
        break;

      case 'serial':
      case 'ser':
        if (this.connectionService?.isConnected()) {

        } else {
          console.log('WebSerial connect');
          this.connectionService = new WebSerialService(this.serial);
          this.connectionService.connect(this);
        }
        break;

      case 'sync':
        // Synchronisation der Datenbank mit einem CouchDB Server wenn kein codebook angegeben ist
        // oder synchronisation des angegebenen codebooks            
        if (this.codebook !== 'cmd_history') {
          this.outchild.write('\r\nDatabase sync only available for default codebook\r\n');
          break;
        }
        // Sync nur starten wenn noch kein Sync läuft
        if ((this.db as any)._replicationStates && Object.keys((this.db as any)._replicationStates).length > 0) {
          this.outchild.write('\r\nDatabase sync already running\r\n');
          break;
        }
        this.db.sync('http://couchdb/couchdb/cmd_history_db', {
          live: true,
          retry: true
        }).on('change', (info) => {
          console.log('Sync change:' + JSON.stringify(info));
        }).on('paused', (err) => {
          console.log('Sync paused:' + JSON.stringify(err));
        }).on('active', () => {
          console.log('Sync active');
        }).on('denied', (err) => {
          console.log('Sync denied:' + JSON.stringify(err));
        }).on('complete', (info) => {
          console.log('Sync complete:' + JSON.stringify(info));
          this.outchild.write('Database sync completed');
        }).on('error', (err) => {
          console.log('Sync error:' + JSON.stringify(err));
        });
        this.outchild.write('\r\nDatabase sync started');
        this.outchild.write(this.prompt); // Neuer Promt
        break;

      case 'list':
      case 'ls':
        // Ausgabe der Befehls-History nur wenn ein codebook angegeben ist
        // oder liste der codebooks wenn kein codebook angegeben ist
        if (this.codebook === 'cmd_history') {
          this.outchild.write('\r\nAvailable codebooks:\r\n');
          this.db.allDocs({ include_docs: false }).then(result => {
            result.rows.forEach(row => {
              this.outchild.write(` - ${row.id}\r\n`);
            });
            this.outchild.write(this.prompt);
          }).catch(err => console.log(err));
          break;
        } else {
          this.db.get(this.codebook).then(doc => {
            this.outchild.write('Command history:\r\n');
            doc.history.forEach((cmd, index) => {
              this.outchild.write(` ${index}: ${cmd}\r\n`);
            });
            this.outchild.write(this.prompt);
          }).catch(err => console.log(err));
        }
        break;

      case 'remove':
      case 'rm':
        // Löschen des angegebenen codebooks
        if (this.codebook === 'cmd_history') {
          this.outchild.write('Cannot remove default codebook\r\n');
          break;
        }
        this.db.get(this.codebook).then(doc => {
          return this.db.remove(doc);
        }).then(() => {
          this.outchild.write(`Codebook ${this.codebook} removed\r\n`);
          this.codebook = 'cmd_history'; // reset to default
        }).catch(err => console.log(err));
        break;

      case 'clear':
      case 'cls':
        this.outchild.write(FunctionsUsingCSI.eraseInDisplay(3) + this.prompt);
        break;

      case 'exit':
        // Exit the application
        if (this.connectionService?.isConnected()) {
          this.connectionService.disconnect();
          this.connectionService = undefined;
        }
        this.outchild.write('Exiting application...\r\n');
        setTimeout(() => {
          window.close();
        }, 1000);
        break;

      case 'help':
      case 'h':
      case '?':
        this.outchild.write(
          '\r\n# Prompt when connected to a device\r\n' +
          '$ Prompt following available commands:\r\n' +
          ' connect|con|ble|bluetooth  xxx      Connect to a BLE device\r\n' +
          ' ws|wss                     xxx URL  Connect to a WebSocket server\r\n' +
          ' serial|ser                 xxx      Connect to a Serial device\r\n' +
          '                            xxx = selects the codebook to use\r\n' +
          ' Codebook following available commands:\r\n' +
          ' sync                       Synchronize the command history with the CouchDB server\r\n' +
          ' list|ls                    List available codebooks or commands in the current codebook\r\n' +
          ' remove|rm                  Remove the current codebook (cannot remove default codebook)\r\n' +
          ' clear|cls                  Clear the terminal screen\r\n' +
          ' help|h|?                   Show this help message\r\n' +
          ' Press Ctrl+C to disconnect from the current connection\r\n' +
          this.prompt
        );
        break;

      case '':
      // Nur Enter wurde gedrückt
      default: // Falls sich kein Befahlt im Puffer befindet wird gesendet
        this.outchild.write(this.prompt);
        break;
    }
    // console.log('BLE write:' + this.buffer);
    // this.ble.write(this.buffer);        
    this.buffer = ''; // Puffer leeren
  }

  next(bleMessage: Object) {            // Callback für Daten von BLE
    console.log(bleMessage);
    this.outchild.write(this.connect_prompt);
    if (typeof bleMessage === 'string')
      this.inchild.write(bleMessage);
    else
      this.inchild.write(JsonCompact.transform(bleMessage) + '\r\n');
  };
  error(err: any) { this.next(err) };   // Callback für Felher vom BLE service
  complete!: () => void;
}
