import * as React from 'react';

import { ToggleButton, ToggleButtonGroup } from '@mui/material';

export type Timeframe = 'last30days' | 'thisweek' | 'thismonth' | 'thisyear' | 'lastweek' | 'lastmonth' | 'lastyear';

interface PeriodSelectorProps {
  timeframe: Timeframe;
  onChange: (newTimeframe: Timeframe) => void;
  disabled?: boolean;
}

const timeframes: { value: Timeframe; label: string }[] = [
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisweek', label: 'This Week' },
  { value: 'thismonth', label: 'This Month' },
  { value: 'thisyear', label: 'This Year' },
  { value: 'lastweek', label: 'Last Week' },
  { value: 'lastmonth', label: 'Last Month' },
  { value: 'lastyear', label: 'Last Year' },
];

const PeriodSelector: React.FunctionComponent<PeriodSelectorProps> = ({ timeframe, onChange, disabled }) => {
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
      aria-label="Timeframe selector"
      disabled={disabled}
      size="small"
    >
      {timeframes.map((item) => (
        <ToggleButton key={item.value} value={item.value} aria-label={item.label} sx={{ px: 2, fontWeight: 500 }}>
          {item.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
};

export default PeriodSelector;
