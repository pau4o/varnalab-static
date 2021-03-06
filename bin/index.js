#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2))

if (argv.help) {
  console.log('--config /path/to/config.json')
  console.log('--render /path/to/render/location/')
  console.log('--server')
  console.log('--env environment')
  process.exit()
}

if (!argv.config) {
  console.log('Specify --config /path/to/config.json')
  process.exit()
}

var env = process.env.NODE_ENV || argv.env

if (!env) {
  console.log('Specify --env environment')
  process.exit()
}

if (argv.render && typeof argv.render !== 'string') {
  console.log('Specify --render /path/to/render/location/')
  process.exit()
}


var fs = require('fs')
var path = require('path')
var config = require(path.resolve(process.cwd(), argv.config))[env]
var render = require('./render')
var Server = require('./server')


if (argv.render) {
  var location = path.resolve(process.cwd(), argv.render)
  if (!fs.existsSync(location)) {
    fs.mkdirSync(location)
    if (!fs.existsSync(path.join(location, '/events'))) {
      fs.mkdirSync(path.join(location, '/events'))
    }
  }
  render(config, location)
    .then(() => console.log('VarnaLab Static Render Complete'))
    .catch((err) => console.error(err))
}

else if (argv.server) {
  var server = Server(config)
  server.listen(config.port, () =>
    console.log('VarnaLab Static Server', config.port)
  )
}

else {
  console.log('Specify --render or --server')
}
