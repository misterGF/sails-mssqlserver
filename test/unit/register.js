/**
 * Test dependencies
 */
/* global it:true describe:true */
var Adapter = require('../../')

describe('registerCollection', function () {
  it('should not hang or encounter any errors', function (done) {
    Adapter.registerCollection({
      identity: 'mssqlserver'
    }, done)
  })

  // e.g.
  // it('should create a mysql connection pool', function () {})
  // it('should create an HTTP connection pool', function () {})
  // ... and so on.
})
