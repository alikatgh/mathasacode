import('./scripts/serve.mjs')
  .then(({ startSite }) => startSite())
  .catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
