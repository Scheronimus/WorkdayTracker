const repositoryName = 'WorkdayTracker'
const productionOrigin = 'https://scheronimus.github.io'

export const deployment = Object.freeze({
  repositoryName,
  productionOrigin,
  basePath: `/${repositoryName}/`,
  productionUrl: `${productionOrigin}/${repositoryName}/`,
})

export function deploymentAsset(path) {
  return `${deployment.basePath}${path.replace(/^\/+/, '')}`
}
