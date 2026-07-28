import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';

import { routes } from './app.routes';
import { authInterceptor } from './services/auth.interceptor';

import { MAT_DATE_LOCALE, DateAdapter, NativeDateAdapter } from '@angular/material/core';

export class CustomMondayDateAdapter extends NativeDateAdapter {
  override getFirstDayOfWeek(): number {
    return 1; // 1 = Lunes
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    { provide: MAT_DATE_LOCALE, useValue: 'es-CR' },
    { provide: DateAdapter, useClass: CustomMondayDateAdapter }
  ]
};



