import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  template: `
    <nav class="topnav">
      <a class="nav-brand" routerLink="/">Ejder Acenta Sözleşme</a>
      <div class="nav-links">
        <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Yeni Sözleşme</a>
      </div>
    </nav>
    <router-outlet></router-outlet>
  `,
  styles: [
    `
      .topnav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        height: 56px;
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid rgba(54, 39, 20, 0.1);
        position: sticky;
        top: 0;
        z-index: 100;
      }

      .nav-brand {
        font-family: Georgia, serif;
        font-weight: 700;
        font-size: 1rem;
        color: #6d291b;
        text-decoration: none;
        letter-spacing: 0.01em;
      }

      .nav-links {
        display: flex;
        gap: 6px;
      }

      .nav-links a {
        text-decoration: none;
        color: #66584c;
        font-size: 0.9rem;
        padding: 6px 14px;
        border-radius: 999px;
        transition:
          background 140ms ease,
          color 140ms ease;
      }

      .nav-links a:hover {
        background: rgba(143, 61, 42, 0.08);
        color: #6d291b;
      }

      .nav-links a.active {
        background: rgba(143, 61, 42, 0.12);
        color: #6d291b;
        font-weight: 600;
      }

      @media (max-width: 560px) {
        .topnav {
          align-items: start;
          flex-direction: column;
          gap: 8px;
          height: auto;
          padding: 12px 16px;
        }

        .nav-links {
          width: 100%;
        }

        .nav-links a {
          flex: 1;
        }
      }
    `,
  ],
})
export class AppComponent {}
