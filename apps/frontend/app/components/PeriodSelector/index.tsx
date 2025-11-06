import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { ToggleButton, ToggleButtonGroup } from '@mui/material';

export type Timeframe = 'last30days' | 'thisweek' | 'thismonth' | 'thisyear' | 'lastweek' | 'lastmonth' | 'lastyear';

interface PeriodSelectorProps {
  timeframe: Timeframe;
  onChange: (newTimeframe: Timeframe) => void;
  disabled?: boolean;
}

const timeframes: { value: Timeframe; key: string }[] = [
  { value: 'last30days', key: 'common:timeframes.last30days' },
  { value: 'thisweek', key: 'common:periods.thisWeek' },
  { value: 'thismonth', key: 'common:periods.thisMonth' },
  { value: 'thisyear', key: 'common:periods.thisYear' },
  { value: 'lastweek', key: 'common:periods.lastWeek' },
  { value: 'lastmonth', key: 'common:periods.lastMonth' },
  { value: 'lastyear', key: 'common:periods.lastYear' },
];

const PeriodSelector: React.FunctionComponent<PeriodSelectorProps> = ({ timeframe, onChange, disabled }) => {
  const { t } = useTranslation('components.periodSelector');
  const handleAlignment = (_event: React.MouseEvent<HTMLElement>, newAlignment: Timeframe | null) => {
    if (newAlignment !== null) {
      onChange(newAlignment);
    }
  };

  return (
    <ToggleButtonGroup
      value={timeframe}
      exclusive
      onChange={handleAlignment}
      aria-label={t('ariaLabel')}
      disabled={disabled}
      size="small"
    >
      {timeframes.map((item) => (
        <ToggleButton key={item.value} value={item.value} aria-label={t(item.key)} sx={{ px: 2, fontWeight: 500 }}>
          {t(item.key)}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
};

export default PeriodSelector;
