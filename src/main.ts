import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { inject } from '@vercel/analytics';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

const privateRoutes = /^\/(dashboard|template|sign|admin|pdf)(\/|$)/;

inject({
  beforeSend: (event) => {
    const pathname = new URL(event.url, window.location.origin).pathname;
    return privateRoutes.test(pathname) ? null : event;
  },
});

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)],
}).catch((error) => {
  console.error(error);
});
