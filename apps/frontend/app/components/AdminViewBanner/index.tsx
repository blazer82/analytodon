import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, Button } from '@mui/material';
import { Link } from '@remix-run/react';

interface AdminViewBannerProps {
  accountName: string;
  ownerEmail: string;
}

const AdminViewBanner: React.FC<AdminViewBannerProps> = ({ accountName, ownerEmail }) => {
  const { t } = useTranslation('components.layout');

  return (
    <Alert
      severity="info"
      variant="filled"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.drawer + 3,
        borderRadius: 0,
        py: 0.5,
        '& .MuiAlert-message': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        },
      }}
      action={
        <Button color="inherit" size="small" component={Link} to="/admin/accounts">
          {t('adminView.exit')}
        </Button>
      }
    >
      {t('adminView.banner', { accountName, ownerEmail })}
    </Alert>
  );
};

export default AdminViewBanner;
