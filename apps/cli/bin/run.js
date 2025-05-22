#!/usr/bin/env node

(async () => {
  const oclif = await import('@oclif/core')
  // eslint-disable-next-line no-undef
  await oclif.execute({dir: __dirname})
})()
