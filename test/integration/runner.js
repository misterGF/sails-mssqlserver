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

console.log('Dropping any existing tables...');
var connection = new mssql.Connection({
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST,
    database: process.env.MSSQL_DATABASE,
  }, function (err) {
    if (err) throw err;

    new mssql.Request(connection).query([
      'while(exists(select 1 from INFORMATION_SCHEMA.TABLE_CONSTRAINTS where CONSTRAINT_TYPE=\'FOREIGN KEY\'))',
      'begin',
        'declare @sql nvarchar(2000)',
        'SELECT TOP 1 @sql=(\'ALTER TABLE \' + TABLE_SCHEMA + \'.[\' + TABLE_NAME + \'] DROP CONSTRAINT [\' + CONSTRAINT_NAME + \']\')',
        'FROM information_schema.table_constraints',
        'WHERE CONSTRAINT_TYPE = \'FOREIGN KEY\'',
        'exec (@sql)',
        'PRINT @sql',
      'end;',
      'while(exists(select 1 from INFORMATION_SCHEMA.TABLES where TABLE_NAME != \'__MigrationHistory\'))',
      'begin',
        'SELECT TOP 1 @sql=(\'DROP TABLE \' + TABLE_SCHEMA + \'.[\' + TABLE_NAME + \']\')',
        'FROM INFORMATION_SCHEMA.TABLES',
        'WHERE TABLE_NAME != \'__MigrationHistory\'',
        'exec (@sql)',
        'PRINT @sql',
      'end'
    ].join(' '), function (err, results) {
      if (err) throw err;
      console.log('Starting test runner...');
      
      new TestRunner({

        mocha: {
          reporter: 'spec',
          timeout: 300 * 1000
        },

        // Load the adapter module.
        adapter: Adapter,

        // ADD YOUR CONFIG HERE
        config: {
          timeout: 300 * 1000,
          pool: {
            max: 100
          }
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
