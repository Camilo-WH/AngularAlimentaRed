import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { Login } from './login/login';
import { Panel } from './panel/panel';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'panel', component: Panel, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'panel' },
  { path: '**', redirectTo: 'panel' },
];