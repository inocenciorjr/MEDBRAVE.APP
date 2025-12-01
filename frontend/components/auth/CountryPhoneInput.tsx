'use client';

import { useState, useEffect } from 'react';
import Dropdown from '@/components/ui/Dropdown';

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colômbia', dialCode: '+57', flag: '🇨🇴' },
  { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽' },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪' },
  { code: 'UY', name: 'Uruguai', dialCode: '+598', flag: '🇺🇾' },
  { code: 'PY', name: 'Paraguai', dialCode: '+595', flag: '🇵🇾' },
  { code: 'BO', name: 'Bolívia', dialCode: '+591', flag: '🇧🇴' },
  { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪' },
  { code: 'EC', name: 'Equador', dialCode: '+593', flag: '🇪🇨' },
  { code: 'ES', name: 'Espanha', dialCode: '+34', flag: '🇪🇸' },
  { code: 'FR', name: 'França', dialCode: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Itália', dialCode: '+39', flag: '🇮🇹' },
  { code: 'DE', name: 'Alemanha', dialCode: '+49', flag: '🇩🇪' },
  { code: 'GB', name: 'Reino Unido', dialCode: '+44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canadá', dialCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Austrália', dialCode: '+61', flag: '🇦🇺' },
];

interface CountryPhoneInputProps {
  value: string;
  onChange: (phone: string, countryCode: string) => void;
  error?: string;
}

export function CountryPhoneInput({ value, onChange, error }: CountryPhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');

  // Detecta país pelo DDI digitado
  useEffect(() => {
    if (value.startsWith('+')) {
      const matchedCountry = COUNTRIES.find(c => value.startsWith(c.dialCode));
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
        setPhoneNumber(value.substring(matchedCountry.dialCode.length));
      }
    }
  }, [value]);

  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      setSelectedCountry(country);
      onChange(country.dialCode + phoneNumber, country.code);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
    
    // Se começar com +, detecta país
    if (e.target.value.startsWith('+')) {
      const matchedCountry = COUNTRIES.find(c => e.target.value.startsWith(c.dialCode));
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
        input = e.target.value.substring(matchedCountry.dialCode.length).replace(/\D/g, '');
      }
    }

    // Formata para Brasil (com DDD)
    if (selectedCountry.code === 'BR') {
      if (input.length <= 2) {
        input = input;
      } else if (input.length <= 7) {
        input = `(${input.slice(0, 2)}) ${input.slice(2)}`;
      } else if (input.length <= 11) {
        input = `(${input.slice(0, 2)}) ${input.slice(2, 7)}-${input.slice(7)}`;
      } else {
        input = `(${input.slice(0, 2)}) ${input.slice(2, 7)}-${input.slice(7, 11)}`;
      }
    }

    setPhoneNumber(input);
    const cleanPhone = input.replace(/\D/g, '');
    onChange(selectedCountry.dialCode + cleanPhone, selectedCountry.code);
  };

  const countryOptions = COUNTRIES.map(country => ({
    value: country.code,
    label: `${country.flag} ${country.name} (${country.dialCode})`
  }));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
        Telefone
      </label>
      
      <div className="flex gap-2">
        {/* Country Selector */}
        <div className="w-48">
          <Dropdown
            value={selectedCountry.code}
            onChange={handleCountryChange}
            options={countryOptions}
            placeholder="País"
            fullWidth
          />
        </div>

        {/* Phone Input */}
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary font-medium">
            {selectedCountry.dialCode}
          </div>
          <input
            type="tel"
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder={selectedCountry.code === 'BR' ? '(11) 99999-9999' : '999999999'}
            className={`w-full pl-16 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
              error ? 'border-red-500' : 'border-border-light dark:border-border-dark'
            } rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-gray-500 transition-all outline-none`}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
