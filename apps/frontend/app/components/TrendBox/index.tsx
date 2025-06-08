import * as React from 'react';

import Typography from '@mui/material/Typography';
import Title from '~/components/Title';
import { formatNumber } from '~/utils/formatters';

import { TrendContent } from './ux';

const Trend: React.FunctionComponent<{ amount: number }> = ({ amount }) => {
  return (
    <TrendContent component="span" variant="h6" amount={amount}>
      ({amount >= 0 ? '+' : ''}
      {(amount * 100).toFixed(0)}%)
    </TrendContent>
  );
};

const TrendBox: React.FunctionComponent<{
  title: string;
  subtitle: string;
  amount: number;
  trend?: number | null;
  isLoading?: boolean;
}> = ({ title, subtitle, amount, trend, isLoading }) => {
  if (isLoading) {
    return (
      <React.Fragment>
        <Title>{title}</Title>
        <Typography component="p" variant="h4" sx={{ opacity: 0.5 }}>
          Loading...
        </Typography>
        <Typography color="text.secondary" sx={{ flex: 1, opacity: 0.5 }}>
          {subtitle}
        </Typography>
      </React.Fragment>
    );
  }
  return (
    <React.Fragment>
      <Title>{title}</Title>
      <Typography component="p" variant="h4">
        {formatNumber(amount)}
        {trend !== null && trend !== undefined && isFinite(trend) && <Trend amount={trend} />}
      </Typography>
      <Typography color="text.secondary" sx={{ flex: 1 }}>
        {subtitle}
      </Typography>
    </React.Fragment>
  );
};

export default TrendBox;
