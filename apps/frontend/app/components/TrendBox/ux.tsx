import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

export const TrendContent = styled(Typography<'span'>, {
  shouldForwardProp: (prop) => prop !== 'amount',
})<{ amount: number }>(({ theme, amount }) => ({
  display: 'inline-block',
  marginLeft: theme.spacing(1),
  color: amount >= 0 ? theme.palette.success.main : theme.palette.error.main,
  fontWeight: 600,
}));
