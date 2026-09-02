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
        <div class="nav-group">
          <div class="nav-group-links">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Grup Paket</a>
            <a routerLink="/grup-paket-listesi" routerLinkActive="active">Grup Paket Listesi</a>
          </div>
        </div>

        <div class="nav-group">
          <div class="nav-group-links">
            <a routerLink="/bireysel-katilimli-ozel-grup" routerLinkActive="active">
              Bireysel Katılımlı Özel Grup
            </a>
            <a routerLink="/bireysel-katilimli-ozel-grup-listesi" routerLinkActive="active">
              Bireysel Katılımlı Özel Grup Listesi
            </a>
          </div>
        </div>
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
        min-height: 56px;
        background: rgba(255, 255, 255, 0.84);
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
        gap: 18px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .nav-group {
        display: grid;
      }

      .nav-group-links {
        display: grid;
        gap: 5px;
      }

      .nav-group-links a {
        text-decoration: none;
        color: #66584c;
        font-size: 0.9rem;
        padding: 6px 14px;
        border-radius: 999px;
        transition:
          background 140ms ease,
          color 140ms ease;
      }

      .nav-group-links a:hover {
        background: rgba(143, 61, 42, 0.08);
        color: #6d291b;
      }

      .nav-group-links a.active {
        background: rgba(143, 61, 42, 0.12);
        color: #6d291b;
        font-weight: 600;
      }

      @media (max-width: 680px) {
        .topnav {
          align-items: start;
          flex-direction: column;
          gap: 8px;
          height: auto;
          padding: 12px 16px;
        }

        .nav-links {
          width: 100%;
          justify-content: start;
          gap: 12px;
        }

        .nav-group {
          width: 100%;
        }

        .nav-group-links a {
          flex: 1 1 auto;
          text-align: center;
        }
      }
    `,
  ],
})
export class AppComponent {}
