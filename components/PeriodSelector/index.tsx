import * as React from 'react';
import {ToggleButton, ToggleButtonGroup} from '@mui/material';
import {Timeframe} from '@/types/Timeframe';

const periods: {value: Timeframe; label: string}[] = [
    {value: 'last30days', label: 'Last 30 Days'},
    {value: 'thisweek', label: 'This Week'},
    {value: 'thismonth', label: 'This Month'},
    {value: 'thisyear', label: 'This Year'},
    {value: 'lastweek', label: 'Last Week'},
    {value: 'lastmonth', label: 'Last Month'},
    {value: 'lastyear', label: 'Last Year'},
];

const PeriodSelector: React.FunctionComponent<{timeframe: Timeframe; onChange?: (value: Timeframe) => void}> = ({timeframe, onChange}) => {
    return (
        <ToggleButtonGroup color="primary" value={timeframe} onChange={(_, value) => onChange && onChange(value)} exclusive aria-label="Period">
            {periods.map(({value, label}) => (
                <ToggleButton key={value} value={value}>
                    {label}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    );
};

export default PeriodSelector;
