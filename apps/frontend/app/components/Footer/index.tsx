import { FunctionComponent } from 'react';

import { Typography } from '@mui/material';
import Link from '@mui/material/Link';
import { useRouteLoaderData } from '@remix-run/react';

const Footer: FunctionComponent = () => {
  // Get ENV from the root loader data
  const rootData = useRouteLoaderData<{ ENV: { MARKETING_URL: string; SUPPORT_EMAIL: string } }>('root');

  // Default values in case we're in an error boundary where loader data isn't available
  const marketingUrl = rootData?.ENV?.MARKETING_URL || 'https://analytodon.com';
  const supportEmail = rootData?.ENV?.SUPPORT_EMAIL || 'support@analytodon.com';

  return (
    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 8, mb: 4 }}>
      {'Brought to you by '}
      <Link color="inherit" href={marketingUrl}>
        Analytodon
      </Link>
      {' | '}
      <Link color="inherit" href={`mailto:${supportEmail}?subject=Support`}>
        Get Support
      </Link>
    </Typography>
  );
};

export default Footer;
