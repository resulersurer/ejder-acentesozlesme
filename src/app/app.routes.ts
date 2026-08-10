import { Routes } from '@angular/router';
import { SenderFormComponent } from './pages/sender-form/sender-form.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { AgencyFormComponent } from './pages/agency-form/agency-form.component';

export const routes: Routes = [
  { path: '', component: SenderFormComponent },
  { path: 'admin/:id', component: AdminDashboardComponent },
  { path: 'sign/:id', component: AgencyFormComponent },
  { path: '**', redirectTo: '' },
];
