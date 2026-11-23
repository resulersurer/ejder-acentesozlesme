import { Routes } from '@angular/router';
import { SenderFormComponent } from './pages/sender-form/sender-form.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { AgencyFormComponent } from './pages/agency-form/agency-form.component';
import { ContractsDashboardComponent } from './pages/contracts-dashboard/contracts-dashboard.component';
import { TemplateEditorComponent } from './pages/template-editor/template-editor.component';
import { ContractPdfComponent } from './pages/contract-pdf/contract-pdf.component';

export const routes: Routes = [
  { path: '', component: SenderFormComponent, data: { contractKind: 'group-package' } },
  { path: 'grup-paket-listesi', component: ContractsDashboardComponent, data: { contractKind: 'group-package' } },
  {
    path: 'bireysel-katilimli-ozel-grup',
    component: SenderFormComponent,
    data: { contractKind: 'individual-participation-group' },
  },
  {
    path: 'bireysel-katilimli-ozel-grup-listesi',
    component: ContractsDashboardComponent,
    data: { contractKind: 'individual-participation-group' },
  },
  { path: 'dashboard', redirectTo: 'grup-paket-listesi' },
  { path: 'template', component: TemplateEditorComponent },
  { path: 'admin/:id', component: AdminDashboardComponent },
  { path: 'sign/:id', component: AgencyFormComponent },
  { path: 'pdf/:id', component: ContractPdfComponent },
  { path: '**', redirectTo: '' },
];
