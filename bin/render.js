
var fs = require('fs')
var path = require('path')
var util = require('util')
var hogan = require('hogan.js')
var HTTP = require('./http')
var meta = require('./meta')
var write = util.promisify(fs.writeFile)


var compile = (type, template) =>
  hogan.compile(
    fs.readFileSync(
      path.resolve(__dirname, `../html/${type}/${template}.html`),
      'utf8'
    )
  )


var layout = [
  'base',
  'header',
  'footer',
  'sidebar',
]
.reduce((all, template) =>
  (all[template] = compile('layout', template), all), {})


var widgets = [
  'whois',
  'facebook',
  'google',
  'twitter',
  'calendar',
  'map',
  'mobile',
]
.reduce((all, template) =>
  (all[template] = compile('widget', template), all), {})


var content = [
  'event',
]
.reduce((all, template) =>
  (all[template] = compile('content', template), all), {})


var views = [
  'home',
  'about',
  'events',
  'past',
  'members',
  'links',
  'contacts',
]
.reduce((all, template) => (
  all[template] = {
    'layout/header': layout.header,
    'layout/sidebar': layout.sidebar,
    'layout/footer': layout.footer,

    'view/content': compile('view', template),

    'widget/whois': widgets.whois,
    'widget/facebook': widgets.facebook,
    'widget/twitter': widgets.twitter,
    'widget/google': widgets.google,
    'widget/calendar': widgets.calendar,
    'widget/map': widgets.map,
    'widget/mobile': widgets.mobile,

    'content/event': content.event,
  },
  all
), {})


var Render = (location, context) => ({
  views: () =>
    Object.keys(views)
      .map((name) => ((partials = views[name]) =>
        write(
          path.join(location, name + '.html'),
          layout.base.render(context, partials),
          'utf8'
        )
      )()),

  events: () => {
    var events = context.events
    var pages = Math.ceil(events.length / 10)

    var partials = views.past
    var files = []

    return Array(pages).fill(true)
      .map((value, index) => {
        var page = index + 1

        if (page === 1) {
          delete context.prev
          context.next = page + 1
        }
        else if (page === pages) {
          context.prev = page - 1
          delete context.next
        }
        else {
          context.prev = page - 1
          context.next = page + 1
        }

        context.events = events.slice(index * 10, index * 10 + 10)

        return write(
          path.join(location, '/events/', `${page}.html`),
          layout.base.render(context, partials),
          'utf8'
        )
      })
  }
})


module.exports = async (config, location) => {
  var varnalab = HTTP(config)

  var context = {
    path: config.path,
    api: config.api,
    meta: meta.defaults(config),
    upcoming: await varnalab.upcoming(),
    events: await varnalab.events(),
    members: await varnalab.members(),
  }

  if (!context.upcoming || !context.events || !context.members) {
    return Promise.reject('REST API Error!')
  }

  var render = Render(location, context)
  return Promise.all(render.views().concat(render.events()))
}
