import { useTranslation } from 'react-i18next';

import { MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { useFetcher } from '@remix-run/react';
import { AVAILABLE_LANGUAGES } from '~/constants/language';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const fetcher = useFetcher();

  const handleLanguageChange = (event: SelectChangeEvent) => {
    const newLang = event.target.value;
    fetcher.submit({ language: newLang }, { method: 'post', action: '/api/set-language' });
  };

  return (
    <Select value={i18n.language} onChange={handleLanguageChange} size="small" sx={{ minWidth: 120 }}>
      {AVAILABLE_LANGUAGES.map((lang) => (
        <MenuItem key={lang.code} value={lang.code}>
          {lang.nativeName}
        </MenuItem>
      ))}
    </Select>
  );
}
