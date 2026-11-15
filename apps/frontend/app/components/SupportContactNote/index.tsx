import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Box, Link } from '@mui/material';

interface SupportContactNoteProps {
  supportEmail: string;
}

/**
 * "If this message persists please contact support." with the support link inline.
 *
 * The whole sentence is a single translation (`common:messages.persistentIssueContactSupport`)
 * so every language controls its own word order, spacing and punctuation; the link therefore
 * has no margin of its own and sits inline in the surrounding (centered) text. `common` is the
 * default namespace and is loaded on every page, so no `handle.i18n` entry is needed.
 */
const SupportContactNote: React.FC<SupportContactNoteProps> = ({ supportEmail }) => {
  const { t } = useTranslation('common');

  return (
    <Box component="span">
      <Trans
        t={t}
        i18nKey="messages.persistentIssueContactSupport"
        components={{
          supportLink: (
            <Link
              href={`mailto:${supportEmail}?subject=Support`}
              sx={{
                textDecoration: 'none',
                position: 'relative',
                display: 'inline-block',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: -2,
                  left: 0,
                  width: '100%',
                  height: '2px',
                  backgroundColor: 'primary.main',
                  borderRadius: '2px',
                  opacity: 0.7,
                },
                '&:hover': {
                  '&::after': {
                    opacity: 1,
                  },
                },
              }}
            />
          ),
        }}
      />
    </Box>
  );
};

export default SupportContactNote;
