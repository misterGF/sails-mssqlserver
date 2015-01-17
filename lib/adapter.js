/**
 * Module Dependencies
 */
// ...
var _ = require('lodash');
var mssql = require('mssql');
var Query = require('./query');
var sql = require('./sql.js');
var utils = require('./utils');

/**
 * sails-mssql
 *
 * Most of the methods below are optional.
 *
 * If you don't need / can't get to every method, just implement
 * what you have time for.  The other methods will only fail if
 * you try to call them!
 *
 * For many adapters, this file is all you need.  For very complex adapters, you may need more flexiblity.
 * In any case, it's probably a good idea to start with one file and refactor only if necessary.
 * If you do go that route, it's conventional in Node to create a `./lib` directory for your private submodules
 * and load them at the top of the file with other dependencies.  e.g. var update = `require('./lib/update')`;
 */
module.exports = (function () {

  // You'll want to maintain a reference to each connection
  // that gets registered with this adapter.
  var connections = {};

  // You may also want to store additional, private data
  // per-connection (esp. if your data store uses persistent
  // connections).
  //
  // Keep in mind that models can be configured to use different databases
  // within the same app, at the same time.
  //
  // i.e. if you're writing a MariaDB adapter, you should be aware that one
  // model might be configured as `host="localhost"` and another might be using
  // `host="foo.com"` at the same time.  Same thing goes for user, database,
  // password, or any other config.
  //
  // You don't have to support this feature right off the bat in your
  // adapter, but it ought to get done eventually.
  //

  var adapter = {

    // Set to true if this adapter supports (or requires) things like data types, validations, keys, etc.
    // If true, the schema for models using this adapter will be automatically synced when the server starts.
    // Not terribly relevant if your data store is not SQL/schemaful.
    //
    // If setting syncable, you should consider the migrate option,
    // which allows you to set how the sync will be performed.
    // It can be overridden globally in an app (config/adapters.js)
    // and on a per-model basis.
    //
    // IMPORTANT:
    // `migrate` is not a production data migration solution!
    // In production, always use `migrate: safe`
    //
    // drop   => Drop schema and data, then recreate it
    // alter  => Drop/add columns as necessary.
    // safe   => Don't change anything (good for production DBs)
    //
    syncable: true,

    // Default configuration for connections
    defaults: {
      port: process.env.MSSQL_PORT || 1433,
      host: process.env.MSSQL_HOST || 'localhost',
      database: process.env.MSSQL_DATABASE,
      user: process.env.MSSQL_USER,
      password: process.env.MSSQL_PASSWORD,
      timeout: 5000,
      schema: true,

      options: {
        encrypt: true
      }
    },

    /**
     *
     * This method runs when a model is initially registered
     * at server-start-time.  This is the only required method.
     *
     * @param  {[type]}   connection [description]
     * @param  {[type]}   collection [description]
     * @param  {Function} cb         [description]
     * @return {[type]}              [description]
     */
    registerConnection: function(connection, collections, cb) {
      if (!connection.identity) return cb(new Error('Connection is missing an identity.'));
      if (connections[connection.identity]) return cb(new Error('Connection is already registered.'));

      // Add in logic here to initialize connection
      // e.g. connections[connection.identity] = new Database(connection, collections);
      connections[connection.identity] = {
        config: connection,
        collections: collections
      };

      return cb();
    },


    /**
     * Fired when a model is unregistered, typically when the server
     * is killed. Useful for tearing-down remaining open connections,
     * etc.
     *
     * @param  {Function} cb [description]
     * @return {[type]}      [description]
     */
    // Teardown a Connection
    teardown: function (conn, cb) {
      if (typeof conn == 'function') {
        cb = conn;
        conn = null;
      }
      if (!conn) {
        connections = {};
        return cb();
      }
      if (!connections[conn]) return cb();
      delete connections[conn];
      cb();
    },

    // Return attributes
    describe: function (connection, collection, cb) {
			// Add in logic here to describe a collection (e.g. DESCRIBE TABLE logic)
      var tableName = collection;
      var statement = "SELECT c.name AS ColumnName,TYPE_NAME(c.user_type_id) AS TypeName,c.is_nullable AS Nullable,c.is_identity AS AutoIncrement,ISNULL((SELECT is_unique FROM sys.indexes i LEFT OUTER JOIN sys.index_columns ic ON i.index_id=ic.index_id WHERE i.object_id=t.object_id AND ic.object_id=t.object_id AND ic.column_id=c.column_id),0) AS [Unique],ISNULL((SELECT is_primary_key FROM sys.indexes i LEFT OUTER JOIN sys.index_columns ic ON i.index_id=ic.index_id WHERE i.object_id=t.object_id AND ic.object_id=t.object_id AND ic.column_id=c.column_id),0) AS PrimaryKey,ISNULL((SELECT COUNT(*) FROM sys.indexes i LEFT OUTER JOIN sys.index_columns ic ON i.index_id=ic.index_id WHERE i.object_id=t.object_id AND ic.object_id=t.object_id AND ic.column_id=c.column_id),0) AS Indexed FROM sys.tables t INNER JOIN sys.columns c ON c.object_id=t.object_id LEFT OUTER JOIN sys.index_columns ic ON ic.object_id=t.object_id WHERE t.name='" + tableName + "'";
      mssql.connect(marshalConfig(connections[connection].config), function __DESCRIBE__(err) {
        if (err) {
          console.error(err);
          return cb(err);
        }

        var request = new mssql.Request();
        request.query(statement, function(err, recordset) {
          if (err) return cb(err);
          if (recordset.length === 0) return cb();
          var normalizedSchema = sql.normalizeSchema(recordset);
          connections[connection].config.schema = normalizedSchema;
          cb(null, normalizedSchema);

        });

      });
    },

    /**
     *
     * REQUIRED method if integrating with a schemaful
     * (SQL-ish) database.
     *
     */
    define: function (connection, collection, definition, cb) {
			// Add in logic here to create a collection (e.g. CREATE TABLE logic)
      mssql.connect(marshalConfig(connections[connection].config), function __DEFINE__(err) {
        if (err) {
          console.error(err);
          return cb(err);
        }
        var schema = sql.schema(collection, definition);
        var statement = 'CREATE TABLE [' + collection + '] (' + schema + ')';

        var request = new mssql.Request();
        request.query(statement, function(err, recordset) {

          if (err) return cb(err);
          cb(null, {});

        });

      });
    },

    /**
     *
     * REQUIRED method if integrating with a schemaful
     * (SQL-ish) database.
     *
     */
    drop: function (connection, collection, relations, cb) {

			// Add in logic here to delete a collection (e.g. DROP TABLE logic)
			var statement = 'DROP TABLE [' + collection + ']';
			mssql.connect(marshalConfig(connections[connection].config), function __DROP__(err) {
        if (err) {
          console.error(err);
          return cb(err);
        }

				var request = new mssql.Request();
				request.query(statement, function(err) {
					if (err) return cb(err);
					cb(null, {});
				});
			});
    },

    /**
     *
     * REQUIRED method if users expect to call Model.find(), Model.findOne(),
     * or related.
     *
     * You should implement this method to respond with an array of instances.
     * Waterline core will take care of supporting all the other different
     * find methods/usages.
     *
     */
    find: function (connection, collection, options, cb) {
		// Check if this is an aggregate query and that there is something to return
      if (options.groupBy || options.sum || options.average || options.min || options.max) {
        if (!options.sum && !options.average && !options.min && !options.max) {
          return cb(new Error('Cannot groupBy without a calculation'));
        }
      }

      options.__primaryKey__ = adapter.getPrimaryKey(connection, collection);
      var statement = sql.selectQuery(collection, options);
      mssql.connect(marshalConfig(connections[connection].config), function __FIND__(err) {
        if (err) {
          console.error(err);
          return cb(err);
        }

        var request = new mssql.Request();
        request.query(statement, function(err, recordset) {

          if (err) return cb(err);
          cb(null, recordset);

        });

      });
    },
    // Raw Query Interface
    query: function(connection, collection, query, data, cb) {
      if (_.isFunction(data)) {
        cb = data;
        data = null;
      }

     	mssql.connect(marshalConfig(connections[connection].config), function __FIND__(err) {
        if (err) {
          console.error(err);
          return cb(err);
        }

        var request = new mssql.Request();
        request.query(query, function(err, recordset) {

          if (err) return cb(err);
          cb(null, recordset);

        });

      });
    },

    create: function (connection, collection, values, cb) {
      Object.keys(values).forEach(function(value) {
        values[value] = utils.prepareValue(values[value]);
      });
      var statement = sql.insertQuery(collection, values);

      mssql.connect(marshalConfig(connections[connection].config), function __CREATE__(err) {
        if (err) {
          console.error(err);
          return cb(err);
        }

        var request = new mssql.Request();
        request.query(statement, function(err, recordsets) {
          if (err) {
            console.error(err);
            return cb(err);
          }
          var recordset = recordsets[0];
          var model = values;
          if (recordset.id) {
            model = _.extend({}, values, {
              id: recordset.id
            });
          }

          var _query = new Query(connections[connection].collections[collection].definition);
          var castValues = _query.cast(model);
          cb(err, castValues);
        });
      });
    },

    getPrimaryKey: function (connection, collection) {
      var pk = 'id';
      Object.keys(connections[connection].collections[collection].definition).forEach(function(key) {
        if(!connections[connection].collections[collection].definition[key].hasOwnProperty('primaryKey')) return;
        pk = key;
      });
      return pk;
    },

    update: function (connection, collection, options, values, cb) {
      var tableName = collection;
      var criteria = sql.serializeOptions(collection, options);

      var pk = adapter.getPrimaryKey(connection, collection);

      var statement = 'SELECT [' + pk + '] FROM [' + tableName + '] ' + criteria;
      mssql.connect(marshalConfig(connections[connection].config), function __UPDATE__(err) {
        if (err) {
          console.error(err);
          return cb(err);
        }

        var request = new mssql.Request();
        request.query(statement, function(err, recordset) {

          if (err) return cb(err);

          if (recordset.length === 0) {
            return cb(null, []);
          }

          var pks = [];
          recordset.forEach(function(row) {
            pks.push(row[pk]);
          });

          Object.keys(values).forEach(function(value) {
            values[value] = utils.prepareValue(values[value]);
          });

          statement = 'UPDATE [' + tableName + '] SET ' + sql.updateCriteria(collection, values) + ' ';
          statement += sql.serializeOptions(collection, options);

          request.query(statement, function(err, recordset) {

            if (err) return cb(err);

            var criteria;

            if(pks.length === 1) {
              criteria = { where: {}, limit: 1 };
              criteria.where[pk] = pks[0];
            } else {
              criteria = { where: {}};
              criteria.where[pk] = pks;
            }

            adapter.find(connection, collection, criteria, function(err, models) {

              if (err) return cb(err);
              var castValues = [];
              var _query = new Query(connections[connection].collections[collection].definition);

              models.forEach(function(item) {
                castValues.push(_query.cast(item));
              });

              cb(err, castValues);
            });
          });
        });
      });
    },

    destroy: function (connection, collection, options, cb) {
      var tableName = collection;
      var statement = 'DELETE FROM [' + tableName + '] ';
      statement += sql.serializeOptions(collection, options);
      mssql.connect(marshalConfig(connections[connection].config), function __DELETE__(err) {
        if (err) {
          console.error(err);
          return cb(err);
        }

        adapter.find(connection, collection, options, function (err, records){
          if (err) return cb(err);
          var request = new mssql.Request();

          request.query(statement, function(err, emptyDeleteRecordSet) {
            if (err) return cb(err);
            cb(null, records);
          });
        });

      });
    }

  };

	function marshalConfig(config) {
		return {
			user: config.user,
			password: config.password,
			server: config.host,
			port: config.port,
			database: config.database,
			timeout: config.timeout,
			pool: {
				max: (config.pool && config.pool.max) ? config.pool.max : 10,
				min: (config.pool && config.pool.min) ? config.pool.min : 0,
				idleTimeoutMillis: (config.pool && config.pool.idleTimeout) ? config.pool.idleTimeout : 30000
			},
			options: config.options
		};
	}

  // Expose adapter definition
  return adapter;
})();
