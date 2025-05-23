#!/usr/bin/env node_modules/.bin/ts-node

;(async () => {
  // Load environment variables from .env file if it exists
  const dotenv = await import('dotenv');
  // eslint-disable-next-line no-undef
  dotenv.config({path: `${__dirname}/../.env`});

  const oclif = await import('@oclif/core');
  // When using ts-node for development, import the logger directly from its TypeScript source
  const { logger } = await import('../src/helpers/logger.ts');

  await oclif.execute({
    development: true, // Keep development mode enabled
    // Following oclif logging example: dir is script path, loadOptions.root is script directory
    // eslint-disable-next-line no-undef
    dir: __filename, // Path to this dev.js file
    loadOptions: {
      // eslint-disable-next-line no-undef
      root: __dirname, // Directory of this dev.js file, oclif uses this as CLI root
      logger,        // Pass the custom logger to oclif
    },
  });
})()
