#!/usr/bin/env node

(async () => {
  // Load environment variables from .env file if it exists
  const dotenv = await import('dotenv');
  // eslint-disable-next-line no-undef
  dotenv.config({path: `${__dirname}/../.env`});

  const oclif = await import('@oclif/core');
  // Import the compiled logger
  const { logger } = await import('../dist/helpers/logger.js');

  await oclif.execute({
    // Following oclif logging example: dir is script path, loadOptions.root is script directory
    // eslint-disable-next-line no-undef
    dir: __filename, // Path to this run.js file
    loadOptions: {
      // eslint-disable-next-line no-undef
      root: __dirname, // Directory of this run.js file, oclif uses this as CLI root
      logger,        // Pass the custom logger to oclif
    },
  });
})()
