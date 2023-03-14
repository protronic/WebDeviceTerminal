import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgTerminalModule } from 'ng-terminal';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgTerminalModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
