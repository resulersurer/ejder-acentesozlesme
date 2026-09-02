import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppHeaderComponent } from './components/app-header/app-header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, AppHeaderComponent],
  template: `
    <app-header />
    <router-outlet></router-outlet>
  `,
})
export class AppComponent {}
