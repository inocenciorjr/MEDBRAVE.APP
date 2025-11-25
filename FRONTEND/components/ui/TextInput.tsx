'use client';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  fullWidth?: boolean;
  className?: string;
  error?: string;
  id?: string;
  name?: string;
  type?: 'text' | 'email' | 'password';
}

export default function TextInput({
  value,
  onChange,
  placeholder = '',
  label,
  fullWidth = false,
  className = '',
  error,
  id,
  name,
  type = 'text',
}: TextInputProps) {
  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2 pl-1">
          {label}
        </label>
      )}
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-[60px] px-4 rounded-xl 
                   bg-background-light dark:bg-background-dark 
                   border-2 ${error ? 'border-red-500' : 'border-primary/20 dark:border-primary/20'}
                   text-text-light-primary dark:text-text-dark-primary 
                   placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary 
                   focus:ring-4 focus:ring-primary/20 focus:border-primary 
                   shadow-md hover:shadow-lg dark:shadow-dark-md dark:hover:shadow-dark-lg 
                   hover:scale-[1.01] transition-all duration-200 
                   text-sm font-medium`}
      />
      {error && (
        <p className="mt-2 text-sm text-red-500 pl-1">{error}</p>
      )}
    </div>
  );
}
