module.exports = {
  daemon: require('./daemon'),
  plugins: require('./plugins'),
  ai: require('./ai-engine'),
  config: require('./config-store'),
  patchEngine: require('./patch-engine'),
  controlServer: require('./control-server')
};
