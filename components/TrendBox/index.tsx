import * as React from 'react';
import Typography from '@mui/material/Typography';
import Title from '@/components/Title';
import {TrendContent} from './ux';
import {formatNumber} from '@/helpers/localization';

const Trend: React.FunctionComponent<{amount: number}> = ({amount}) => {
    return (
        <TrendContent component="span" variant="h6" amount={amount}>
            ({amount >= 0 ? '+' : ''}
            {(amount * 100).toFixed(0)}%)
        </TrendContent>
    );
};

const TrendBox: React.FunctionComponent<{title: string; subtitle: string; amount: number; trend?: number}> = ({title, subtitle, amount, trend}) => {
    return (
        <React.Fragment>
            <Title>{title}</Title>
            <Typography component="p" variant="h4">
                {formatNumber(amount)}
                {trend && <Trend amount={trend} />}
            </Typography>
            <Typography color="text.secondary" sx={{flex: 1}}>
                {subtitle}
            </Typography>
        </React.Fragment>
    );
};

export default TrendBox;
