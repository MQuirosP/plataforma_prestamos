import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Country {
  name: {
    common: string;
  };
  cca2: string;
  flag: string;
  currencies: {
    [key: string]: {
      name: string;
      symbol: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class CountriesService {
  private http = inject(HttpClient);
  private apiUrl = 'https://restcountries.com/v3.1/all?fields=name,currencies,cca2,flag';

  async getCountries(): Promise<Country[]> {
    try {
      const response = await firstValueFrom(this.http.get<Country[]>(this.apiUrl));
      // Filter out countries that do not have currencies and sort alphabetically
      return response
        .filter(c => c.currencies && Object.keys(c.currencies).length > 0)
        .sort((a, b) => a.name.common.localeCompare(b.name.common));
    } catch (error) {
      console.warn('REST Countries API failed. Returning fallback listing with Costa Rica.');
      // Return fallback array with Costa Rica
      return [
        {
          name: { common: 'Costa Rica' },
          cca2: 'CR',
          flag: '🇨🇷',
          currencies: {
            CRC: { name: 'Costa Rican colón', symbol: '₡' }
          }
        }
      ];
    }
  }
}
