import { Box, Typography } from '@mui/material';

interface LogoProps {
  size?: 'x-small' | 'small' | 'medium' | 'large';
  color?: string;
  withText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', color = 'primary', withText = true }) => {
  const getSize = () => {
    switch (size) {
      case 'x-small':
        return 40;
      case 'small':
        return 60;
      case 'large':
        return 120;
      case 'medium':
      default:
        return 80;
    }
  };

  const logoSize = getSize();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box
        sx={{
          width: logoSize,
          height: logoSize,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          mb: withText ? 1 : 0,
        }}
      >
        <img
          src="/images/logo-tr.png"
          alt="Analytodon Logo"
          width={logoSize}
          height={logoSize}
          style={{ objectFit: 'contain' }}
        />
      </Box>
      {withText && (
        <Typography
          variant="h6"
          component="span"
          sx={{
            fontWeight: 700,
            letterSpacing: 1,
            color: color === 'primary' ? 'primary.main' : color,
          }}
        >
          Analytodon
        </Typography>
      )}
    </Box>
  );
};

export default Logo;
