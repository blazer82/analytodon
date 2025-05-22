#!/usr/bin/env node_modules/.bin/ts-node

;(async () => {
  const oclif = await import('@oclif/core')
  // eslint-disable-next-line no-undef
  await oclif.execute({development: true, dir: __dirname})
})()
