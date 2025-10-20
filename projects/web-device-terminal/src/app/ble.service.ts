import { Injectable } from '@angular/core';
import { fromEvent, Observer, Subject } from 'rxjs';
import { TerminalConnector } from './terminal-connector';

// https://lancaster-university.github.io/microbit-docs/resources/bluetooth/bluetooth_profile.html
// An implementation of Nordic Semicondutor's UART/Serial Port Emulation over Bluetooth low energy
//const UART_SERVICE_UUID = 'd973f2e0-b19e-11e2-9e96-0800200c9a66';
const UART_SERVICE_UUID = '0000fe40-cc7a-482a-984a-7f2ed5b3e58f';   // P2P
//const UART_SERVICE_UUID   = '0000fe60-cc7a-482a-984a-7f2ed5b3e58f';   // CRS - Cable Replacement Service

// Allows the micro:bit to transmit a byte array
//const UART_TX_CHARACTERISTIC_UUID = 'd973f2e1-b19e-11e2-9e96-0800200c9a66';
const UART_TX_CHARACTERISTIC_UUID = '0000fe42-8e22-4541-9d4c-21edae82ed19';   // P2P
//const UART_TX_CHARACTERISTIC_UUID   = '0000fe61-8e22-4541-9d4c-21edae82ed19';   // CRS - Cable Replacement Service

// Allows a connected client to send a byte array
//const UART_RX_CHARACTERISTIC_UUID = 'd973f2e2-b19e-11e2-9e96-0800200c9a66';
const UART_RX_CHARACTERISTIC_UUID = '0000fe41-8e22-4541-9d4c-21edae82ed19';   // P2P
//const UART_RX_CHARACTERISTIC_UUID   = '0000fe62-8e22-4541-9d4c-21edae82ed19';   // CRS - Cable Replacement Service


@Injectable({
  providedIn: 'root',
})
export class BleService implements TerminalConnector {

  uBitDevice: BluetoothDevice | undefined;
  rxCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;
  subject: Subject<Object>;

  constructor() {
    this.subject = new Subject();
  }

  async connect(observable: Observer<Object>) {
    this.subject.subscribe(observable);
    try {
      this.subject.next('Requesting Bluetooth Device...');
      this.uBitDevice = await navigator.bluetooth.requestDevice({
        // filters: [{ namePrefix: 'BBC micro:bit' }],
        acceptAllDevices: true,
        optionalServices: [UART_SERVICE_UUID],
      });

      if (!this.uBitDevice.gatt) return;

      this.subject.next('Connecting to GATT Server...');
      const server = await this.uBitDevice.gatt.connect();

      this.subject.next('Getting Service...');
      const service = await server.getPrimaryService(UART_SERVICE_UUID);

      this.subject.next('Getting Characteristics...');
      const txCharacteristic = await service.getCharacteristic(
        UART_TX_CHARACTERISTIC_UUID
      );
      txCharacteristic.startNotifications();
      fromEvent(txCharacteristic, 'characteristicvaluechanged').subscribe(
        (event: any) => {
          if (!event || !event.target || !event.target.value)
            return;
          let receivedData = [];
          for (var i = 0; i < event.target.value.byteLength; i++) {
            receivedData[i] = event.target.value.getUint8(i);
          }

          const receivedString = String.fromCharCode.apply(null, receivedData);
          this.subject.next(receivedString);
          if (receivedString === 'S') {
            this.subject.next('Shaken!');
          }
        }
      );
      try {
        this.rxCharacteristic = await service.getCharacteristic(
          UART_RX_CHARACTERISTIC_UUID
        );
      } catch (error: any) {
        this.subject.next('Single data UUID detected: ' + error);
        this.rxCharacteristic = await service.getCharacteristic(
          UART_TX_CHARACTERISTIC_UUID
        );
      }
      this.subject.next('BLE Ready...');
    } catch (error: any) {
      console.log(error);
      this.subject.error(error);
    }
  }

  disconnect() {
    if (!this.uBitDevice || !this.uBitDevice.gatt) {
      return;
    }

    if (this.uBitDevice.gatt.connected) {
      this.uBitDevice.gatt.disconnect();
      this.subject.next('Disconnected');
    }
  }

  isConnected(): boolean {
    return !!this.rxCharacteristic;
  }

  async write(data: string) {
    if (!this.rxCharacteristic) {
      return;
    }

    try {
      let encoder = new TextEncoder();
      this.rxCharacteristic.writeValue(encoder.encode(data));
    } catch (error: any) {
      this.subject.error(error);
    }
  }
}
