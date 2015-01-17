/**
 * Run integration tests
 *
 * Uses the `waterline-adapter-tests` module to
 * run mocha tests against the appropriate version
 * of Waterline.  Only the interfaces explicitly
 * declared in this adapter's `package.json` file
 * are tested. (e.g. `queryable`, `semantic`, etc.)
 */

var util = require('util');
var mocha = require('mocha');
var log = new (require('captains-log'))();
var TestRunner = require('waterline-adapter-tests');
var Adapter = require('../../lib/adapter.js');

// Grab targeted interfaces from this adapter's `package.json` file:
var package = {};
var interfaces = [];
try {
  package = require('../../package.json');
  interfaces = package.waterlineAdapter.interfaces;
}
catch (e) {
  throw new Error(
    '\n'+
    'Could not read supported interfaces from `waterlineAdapter.interfaces`'+'\n' +
    'in this adapter\'s `package.json` file ::' + '\n' +
    util.inspect(e)
  );
}

log.info('Testing `' + package.name + '`, a Sails/Waterline adapter.');
log.info('Running `waterline-adapter-tests` against ' + interfaces.length + ' interfaces...');
log.info('( ' + interfaces.join(', ') + ' )');
console.log();
log('Latest draft of Waterline adapter interface spec:');
log('http://links.sailsjs.org/docs/plugins/adapters/interfaces');
console.log();

var mssql = require('mssql');

console.log('Preparing database...');
var connection = new mssql.Connection({
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST,
    database: process.env.MSSQL_DATABASE,
    options: {
      encrypt: true
    }
  }, function (err) {
    new mssql.Request(connection).query([
      'IF OBJECT_ID(\'dbo.apartmentTable\', \'U\') IS NOT NULL DROP TABLE apartmentTable',
      'IF OBJECT_ID(\'dbo.customer_manyTable\', \'U\') IS NOT NULL DROP TABLE customer_manyTable',
      'IF OBJECT_ID(\'dbo.customerbelongsTable\', \'U\') IS NOT NULL DROP TABLE customerbelongsTable',
      'IF OBJECT_ID(\'dbo.customerTable\', \'U\') IS NOT NULL DROP TABLE customerTable',
      'IF OBJECT_ID(\'dbo.driver_taxis_taxi_drivers\', \'U\') IS NOT NULL DROP TABLE driver_taxis_taxi_drivers',
      'IF OBJECT_ID(\'dbo.driverTable\', \'U\') IS NOT NULL DROP TABLE driverTable',
      'IF OBJECT_ID(\'dbo.payment_manyTable\', \'U\') IS NOT NULL DROP TABLE payment_manyTable',
      'IF OBJECT_ID(\'dbo.paymentbelongsTable\', \'U\') IS NOT NULL DROP TABLE paymentbelongsTable',
      'IF OBJECT_ID(\'dbo.paymentTable\', \'U\') IS NOT NULL DROP TABLE paymentTable',
      'IF OBJECT_ID(\'dbo.profileTable\', \'U\') IS NOT NULL DROP TABLE profileTable',
      'IF OBJECT_ID(\'dbo.stadiumTable\', \'U\') IS NOT NULL DROP TABLE stadiumTable',
      'IF OBJECT_ID(\'dbo.taxiTable\', \'U\') IS NOT NULL DROP TABLE taxiTable',
      'IF OBJECT_ID(\'dbo.teamTable\', \'U\') IS NOT NULL DROP TABLE teamTable',
      'IF OBJECT_ID(\'dbo.user_resourceTable\', \'U\') IS NOT NULL DROP TABLE user_resourceTable',
      'IF OBJECT_ID(\'dbo.userTable\', \'U\') IS NOT NULL DROP TABLE userTable',
      'IF OBJECT_ID(\'dbo.userTable2\', \'U\') IS NOT NULL DROP TABLE userTable2',
      'IF OBJECT_ID(\'dbo.venueTable\', \'U\') IS NOT NULL DROP TABLE venueTable'
    ].join(';'), function (err, results) {
      if (err) throw err;

      console.log('Running tests...');
      
      new TestRunner({

        mocha: {
          reporter: 'spec',
          timeout: 120000
        },

        // Load the adapter module.
        adapter: Adapter,

        // ADD YOUR CONFIG HERE
        config: {
          timeout: 120000,
          pool: {
            min: 1,
            max: 1,
            idleTimeout: 120000
          },
          migrate: 'drop'
        },

        failOnError: true,

        // The set of adapter interfaces to test against.
        // (grabbed these from this adapter's package.json file above)
        interfaces: interfaces

        // Most databases implement 'semantic' and 'queryable'.
        //
        // As of Sails/Waterline v0.10, the 'associations' interface
        // is also available.  If you don't implement 'associations',
        // it will be polyfilled for you by Waterline core.  The core
        // implementation will always be used for cross-adapter / cross-connection
        // joins.
        //
        // In future versions of Sails/Waterline, 'queryable' may be also
        // be polyfilled by core.
        //
        // These polyfilled implementations can usually be further optimized at the
        // adapter level, since most databases provide optimizations for internal
        // operations.
        //
        // Full interface reference:
        // https://github.com/balderdashy/sails-docs/blob/master/adapter-specification.md
      });
    });
  });

/**
 * Integration Test Runner
 *
 * Uses the `waterline-adapter-tests` module to
 * run mocha tests against the specified interfaces
 * of the currently-implemented Waterline adapter API.
 */
