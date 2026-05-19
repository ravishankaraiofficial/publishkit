import { Picker } from './Picker';
import {
  OUTPUT_LANGUAGES,
  formatLanguageOption,
  type OutputLanguage,
} from '../../lib/languages';

interface LanguagePickerProps {
  value: OutputLanguage;
  onChange: (value: OutputLanguage) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'pill' | 'input';
}

export function LanguagePicker({
  value,
  onChange,
  disabled = false,
  className,
  variant = 'pill',
}: LanguagePickerProps) {
  const options = OUTPUT_LANGUAGES.map((opt) => ({
    value: opt.value,
    label: formatLanguageOption(opt),
  }));

  return (
    <Picker<OutputLanguage>
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled}
      className={className}
      variant={variant}
    />
  );
}
