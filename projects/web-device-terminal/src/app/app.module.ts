import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { WebBluetoothModule } from '@manekinekko/angular-web-bluetooth';
import { NgTerminalModule } from 'ng-terminal';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { provideNgxWebSerial } from 'ngx-web-serial';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgTerminalModule,    
    WebBluetoothModule.forRoot({
      enableTracing: true // or false, this will enable logs in the browser's console
    })
  ],
  providers: [provideNgxWebSerial()],
  bootstrap: [AppComponent]
})
export class AppModule { }
