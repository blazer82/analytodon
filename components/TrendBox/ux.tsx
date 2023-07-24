import Typography from '@mui/material/Typography';
import {styled} from '@mui/material/styles';

export const TrendContent = styled(Typography<'span'>, {
    shouldForwardProp: (prop) => prop !== 'amount',
})<{amount: number}>(({amount}) => ({
    display: 'inline-block',
    marginLeft: '0.5rem',
    color: amount >= 0 ? 'green' : 'red',
}));
