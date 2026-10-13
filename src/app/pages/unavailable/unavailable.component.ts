import { Component } from '@angular/core';

@Component({
  selector: 'app-unavailable',
  standalone: true,
  template: `
    <main>
      <section aria-labelledby="unavailable-title">
        <img src="assets/ejder-logo.png" alt="Ejder Turizm" />
        <h1 id="unavailable-title">Uygulama kullanıma kapalıdır</h1>
        <p>Şu anda uygulamaya erişim sağlanamamaktadır.</p>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; }
    main {
      min-height: 100vh;
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: #f8f6f3;
    }
    section {
      width: 100%;
      max-width: 560px;
      padding: 48px 24px;
      text-align: center;
      background: #fff;
      border: 1px solid var(--panel-border);
      border-radius: 20px;
      box-shadow: var(--shadow);
    }
    img { width: 180px; max-width: 100%; height: auto; margin-bottom: 24px; }
    h1 { margin: 0 0 16px; font-size: clamp(24px, 5vw, 32px); line-height: 1.3; }
    p { margin: 0; color: var(--muted); line-height: 1.6; }
  `],
})
export class UnavailableComponent {}
