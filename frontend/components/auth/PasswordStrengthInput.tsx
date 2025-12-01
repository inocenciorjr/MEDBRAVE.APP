'use client';

import { useState, useEffect } from 'react';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

interface PasswordStrengthInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  showStrength?: boolean;
}

export function PasswordStrengthInput({
  value,
  onChange,
  label = 'Senha',
  placeholder = '••••••••',
  error,
  showStrength = true,
}: PasswordStrengthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [requirements, setRequirements] = useState<PasswordRequirement[]>([
    { label: 'Mínimo de 8 caracteres', test: (p) => p.length >= 8, met: false },
    { label: 'Pelo menos uma letra maiúscula', test: (p) => /[A-Z]/.test(p), met: false },
    { label: 'Pelo menos uma letra minúscula', test: (p) => /[a-z]/.test(p), met: false },
    { label: 'Pelo menos um número', test: (p) => /\d/.test(p), met: false },
    { label: 'Pelo menos um caractere especial (!@#$%^&*)', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p), met: false },
  ]);

  useEffect(() => {
    setRequirements(prev =>
      prev.map(req => ({
        ...req,
        met: req.test(value),
      }))
    );
  }, [value]);

  const allRequirementsMet = requirements.every(req => req.met);
  const metCount = requirements.filter(req => req.met).length;
  const strengthPercentage = (metCount / requirements.length) * 100;

  const getStrengthColor = () => {
    if (strengthPercentage < 40) return 'bg-red-500';
    if (strengthPercentage < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strengthPercentage < 40) return 'Fraca';
    if (strengthPercentage < 80) return 'Média';
    return 'Forte';
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
        {label}
      </label>

      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-800 border ${
            error ? 'border-red-500' : 'border-border-light dark:border-border-dark'
          } rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-gray-500 transition-all outline-none`}
        />
        
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
        >
          <span className="material-symbols-outlined text-xl">
            {showPassword ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {showStrength && value.length > 0 && (
        <div className="space-y-3 mt-4">
          {/* Strength Bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-light-secondary dark:text-text-dark-secondary">
                Força da senha
              </span>
              <span className={`font-medium ${
                strengthPercentage < 40 ? 'text-red-600 dark:text-red-400' :
                strengthPercentage < 80 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-green-600 dark:text-green-400'
              }`}>
                {getStrengthText()}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                style={{ width: `${strengthPercentage}%` }}
              />
            </div>
          </div>

          {/* Requirements Checklist */}
          <div className="space-y-2">
            {requirements.map((req, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className={`material-symbols-outlined text-base transition-colors ${
                  req.met 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-gray-400 dark:text-gray-600'
                }`}>
                  {req.met ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span className={`transition-colors ${
                  req.met 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-text-light-secondary dark:text-text-dark-secondary'
                }`}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
