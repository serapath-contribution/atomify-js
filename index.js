var browserify = require('browserify')
  , path       = require('path')
  , watchify   = require('watchify')
  , shim       = require('browserify-shim')
  , ejsify     = require('ejsify')
  , hbsfy      = require('hbsfy')
  , jadeify    = require('jadeify')
  , envify     = require('envify')
  , partialify = require('partialify')
  , resrcify   = require('resrcify')
  , brfs       = require('brfs')
  , writer     = require('write-to-path')

module.exports = function (opts, cb) {
  if (Array.isArray(opts)) opts = {entries: opts}
  if (typeof opts === 'string') opts = {entries: [opts]}
  if (opts.entry) opts.entries = [opts.entry]

  if (opts.output && cb) throw new Error('opts.output and a callback are mutually exclusive')

  if (typeof cb === 'string') opts.output = cb
  if (opts.output) cb = writer(path.resolve(process.cwd(), opts.output), {debug: opts.debug})

  opts.debug = opts.debug || false

  var b = opts.watch ? watchify() : browserify()
  if (opts.shim) b = shim(b, opts.shim)

  if (opts.watch) {
    b.on('update', function () {
      b.bundle(opts, cb)
    })
  }

  opts.entries.forEach(function (entry) {
    b.add(path.resolve(process.cwd(), entry))
  })

  // Browserify modifies the transforms property once opts is passed in to bundle()
  // so we copy that prop here to ensure we only use what is passed in from config
  if (!opts._transforms) {
    opts._transforms = opts.transforms ? opts.transforms.slice(0) : []
  }

  // ensure brfs runs last because it requires valid js
  var transforms = [envify, ejsify, hbsfy, jadeify, partialify].concat(opts._transforms).concat([brfs])
  transforms.forEach(function (transform) {
    if (Array.isArray(transform)) {
      b.transform(transform[1], transform[0])
    } else {
      b.transform(transform)
    }
  })

  if (opts.assets) {
    var assets = ['resrcify', {
      dest: opts.assets.dest || ''
      , prefix: opts.assets.prefix || ''
    }]

    opts.globalTransforms = opts.globalTransforms || []
    opts.globalTransforms.push(assets)
  }

  if (opts.globalTransforms) {
    opts.globalTransforms.forEach(function (gt) {
      if (Array.isArray(gt)) {
        var gto = gt[1]
        gto.global = true
        b.transform(gto, gt[0])
      } else {
        b.transform({global: true}, gt)
      }
    })
  }

  return b.bundle(opts, cb)
}
