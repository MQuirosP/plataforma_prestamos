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
      console.warn('REST Countries API failed. Returning premium fallback listing.');
      // Return fallback array with common Latin American countries
      const fallbackList: Country[] = [
        {
          name: { common: 'Costa Rica' },
          cca2: 'CR',
          flag: '🇨🇷',
          currencies: { CRC: { name: 'Colón costarricense', symbol: '₡' } }
        },
        {
          name: { common: 'Colombia' },
          cca2: 'CO',
          flag: '🇨🇴',
          currencies: { COP: { name: 'Peso colombiano', symbol: '$' } }
        },
        {
          name: { common: 'México' },
          cca2: 'MX',
          flag: '🇲🇽',
          currencies: { MXN: { name: 'Peso mexicano', symbol: '$' } }
        },
        {
          name: { common: 'Panamá' },
          cca2: 'PA',
          flag: '🇵🇦',
          currencies: { PAB: { name: 'Balboa panameño', symbol: 'B/.' } }
        },
        {
          name: { common: 'Estados Unidos' },
          cca2: 'US',
          flag: '🇺🇸',
          currencies: { USD: { name: 'Dólar estadounidense', symbol: '$' } }
        },
        {
          name: { common: 'España' },
          cca2: 'ES',
          flag: '🇪🇸',
          currencies: { EUR: { name: 'Euro', symbol: '€' } }
        },
        {
          name: { common: 'Argentina' },
          cca2: 'AR',
          flag: '🇦🇷',
          currencies: { ARS: { name: 'Peso argentino', symbol: '$' } }
        },
        {
          name: { common: 'Chile' },
          cca2: 'CL',
          flag: '🇨🇱',
          currencies: { CLP: { name: 'Peso chileno', symbol: '$' } }
        },
        {
          name: { common: 'Perú' },
          cca2: 'PE',
          flag: '🇵🇪',
          currencies: { PEN: { name: 'Sol peruano', symbol: 'S/.' } }
        },
        {
          name: { common: 'Ecuador' },
          cca2: 'EC',
          flag: '🇪🇨',
          currencies: { USD: { name: 'Dólar estadounidense', symbol: '$' } }
        },
        {
          name: { common: 'Guatemala' },
          cca2: 'GT',
          flag: '🇬🇹',
          currencies: { GTQ: { name: 'Quetzal guatemalteco', symbol: 'Q' } }
        },
        {
          name: { common: 'Honduras' },
          cca2: 'HN',
          flag: '🇭🇳',
          currencies: { HNL: { name: 'Lempira hondureño', symbol: 'L' } }
        },
        {
          name: { common: 'Nicaragua' },
          cca2: 'NI',
          flag: '🇳🇮',
          currencies: { NIO: { name: 'Córdoba nicaragüense', symbol: 'C$' } }
        },
        {
          name: { common: 'El Salvador' },
          cca2: 'SV',
          flag: '🇸🇻',
          currencies: { USD: { name: 'Dólar estadounidense', symbol: '$' } }
        },
        {
          name: { common: 'República Dominicana' },
          cca2: 'DO',
          flag: '🇩🇴',
          currencies: { DOP: { name: 'Peso dominicano', symbol: 'RD$' } }
        }
      ];
      return fallbackList.sort((a, b) => a.name.common.localeCompare(b.name.common));
    }
  }
}
