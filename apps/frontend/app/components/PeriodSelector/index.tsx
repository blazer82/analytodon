import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { type Dayjs } from 'dayjs';

export type Timeframe =
  | 'last30days'
  | 'thisweek'
  | 'thismonth'
  | 'thisyear'
  | 'lastweek'
  | 'lastmonth'
  | 'lastyear'
  | 'custom';

export interface DateRange {
  from: string;
  to: string;
}

interface PeriodSelectorProps {
  timeframe: Timeframe;
  onChange: (newTimeframe: Timeframe, dateRange?: DateRange) => void;
  disabled?: boolean;
  dateFrom?: string | null;
  dateTo?: string | null;
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

const MAX_RANGE_DAYS = 366;

const PeriodSelector: React.FunctionComponent<PeriodSelectorProps> = ({
  timeframe,
  onChange,
  disabled,
  dateFrom,
  dateTo,
}) => {
  const { t } = useTranslation('components.periodSelector');

  const [fromDate, setFromDate] = React.useState<Dayjs | null>(dateFrom ? dayjs(dateFrom) : null);
  const [toDate, setToDate] = React.useState<Dayjs | null>(dateTo ? dayjs(dateTo) : null);

  const handleAlignment = (_event: React.MouseEvent<HTMLElement>, newAlignment: Timeframe | null) => {
    if (newAlignment === null) return;

    if (newAlignment === 'custom') {
      const defaultTo = dayjs();
      const defaultFrom = defaultTo.subtract(30, 'day');
      const newFrom = fromDate ?? defaultFrom;
      const newTo = toDate ?? defaultTo;
      setFromDate(newFrom);
      setToDate(newTo);
      onChange('custom', { from: newFrom.format('YYYY-MM-DD'), to: newTo.format('YYYY-MM-DD') });
    } else {
      onChange(newAlignment);
    }
  };

  const handleFromChange = (value: Dayjs | null) => {
    setFromDate(value);
    if (value?.isValid() && toDate?.isValid()) {
      onChange('custom', { from: value.format('YYYY-MM-DD'), to: toDate.format('YYYY-MM-DD') });
    }
  };

  const handleToChange = (value: Dayjs | null) => {
    setToDate(value);
    if (fromDate?.isValid() && value?.isValid()) {
      onChange('custom', { from: fromDate.format('YYYY-MM-DD'), to: value.format('YYYY-MM-DD') });
    }
  };

  const today = dayjs();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <ToggleButtonGroup
          value={timeframe}
          exclusive
          onChange={handleAlignment}
          aria-label={t('ariaLabel')}
          disabled={disabled}
          size="small"
          sx={{ flexWrap: 'wrap' }}
        >
          {timeframes.map((item) => (
            <ToggleButton key={item.value} value={item.value} aria-label={t(item.key)} sx={{ px: 2, fontWeight: 500 }}>
              {t(item.key)}
            </ToggleButton>
          ))}
          <ToggleButton value="custom" aria-label={t('common:timeframes.custom')} sx={{ px: 2, fontWeight: 500 }}>
            {t('common:timeframes.custom')}
          </ToggleButton>
        </ToggleButtonGroup>

        {timeframe === 'custom' && (
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <DatePicker
              label={t('from')}
              value={fromDate}
              onChange={handleFromChange}
              minDate={toDate ? toDate.subtract(MAX_RANGE_DAYS, 'day') : undefined}
              maxDate={toDate ?? today}
              disabled={disabled}
              slotProps={{ textField: { size: 'small' } }}
              format="YYYY-MM-DD"
            />
            <Box sx={{ mx: 0.5 }}>&ndash;</Box>
            <DatePicker
              label={t('to')}
              value={toDate}
              onChange={handleToChange}
              minDate={fromDate ?? undefined}
              maxDate={(() => {
                const maxByRange = fromDate ? fromDate.add(MAX_RANGE_DAYS, 'day') : today;
                return maxByRange.isBefore(today) ? maxByRange : today;
              })()}
              disabled={disabled}
              slotProps={{ textField: { size: 'small' } }}
              format="YYYY-MM-DD"
            />
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default PeriodSelector;
