var _ = require('lodash');
var mssql = require('mssql');
var Query = require('./query');
var sql = require('./sql.js');
var utils = require('./utils');
var CursorJoin = require('waterline-cursor');

/**
 * sails-sqlserver
 *
 * Most of the methods below are optional.
 *
 * If you don't need / can't get to every method, just implement
 * what you have time for.  The other methods will only fail if
 * you try to call them!
 *
 * For many adapters, this file is all you need.  For very complex adapters,
 * you may need more flexiblity. In any case, it's probably a good idea to
 * start with one file and refactor only if necessary. If you do go that route,
 * it's conventional in Node to create a `./lib` directory for your private
 * submodules and load them at the top of the file with other dependencies.
 * e.g. var update = `require('./lib/update')`;
 */
module.exports = (function () {

  // You'll want to maintain a reference to each connection
  // that gets registered with this adapter.
  var connections = { };

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

    // Set to true if this adapter supports (or requires) things like data
    // types, validations, keys, etc. If true, the schema for models using this
    // adapter will be automatically synced when the server starts. Not
    // terribly relevant if your data store is not SQL/schemaful.  If setting
    // syncable, you should consider the migrate option, which allows you to
    // set how the sync will be performed. It can be overridden globally in an
    // app (config/adapters.js) and on a per-model basis.  IMPORTANT: `migrate`
    // is not a production data migration solution! In production, always use
    // `migrate: safe`  drop   => Drop schema and data, then recreate it alter
    // => Drop/add columns as necessary. safe   => Don't change anything (good
    // for production DBs)
    syncable: true,

    // Default configuration for connections
    defaults: {
      port: process.env.MSSQL_PORT || 1433,
      host: process.env.MSSQL_HOST || 'localhost',
      database: process.env.MSSQL_DATABASE,
      user: process.env.MSSQL_USER,
      password: process.env.MSSQL_PASSWORD,
      schema: true,

      connectionTimeout: 60 * 1000,
      requestTimeout: 60 * 1000,
      persistent: false,

      options: {
        encrypt: false
      },

      pool: {
        min: 5,
        max: 30,
        idleTimeout: 300 * 1000
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
      // e.g. connections[connection.identity] = new Database(connection,
      // collections);
      connections[connection.identity] = {
        config: connection,
        collections: collections
      };

      return cb();
    },

    /**
     * Ensures that the given connection is connected with the marshalled
     * configuration.
     * @param {String} connection
     * @param {Function} cb
     */
    connectConnection: function(connection, cb){
      var uniqId = _.uniqueId();
      var isPersistent = connections[connection].config.persistent;

      if (isPersistent && (!connections[connection].mssqlConnection || !connections[connection].mssqlConnection.connected)) {
        connections[connection].mssqlConnection = new mssql.Connection(marshalConfig(connections[connection].config));
        connections[connection].mssqlConnection.connect()
          .then(cb);
      }
      else if (!isPersistent && (!connections[connection].mssqlConnection || !connections[connection].mssqlConnection[uniqId] || !connections[connection].mssqlConnection[uniqId].connected)) {
        if (!connections[connection].mssqlConnection) {
          connections[connection].mssqlConnection = [];
        }

        connections[connection].mssqlConnection[uniqId] = new mssql.Connection(marshalConfig(connections[connection].config));
        connections[connection].mssqlConnection[uniqId].connect()
          .then(function(err) {
            cb(err, uniqId);
          });
      }
      else {
        _.defer(cb);
      }
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
        _.each(connections, function (c) {
          if (c.persistent) {
            c.mssqlConnection && c.mssqlConnection.close();
          }
          else {
            _.each(c.mssqlConnection, function(handle) {
              handle && handle.close();
            });
          }
        });
        connections = { };
        return cb();
      }
      if (!connections[conn]) return cb();

      if (connections[conn].persistent) {
        connections[conn].mssqlConnection.close();
      }
      else {
        _.each(connections[conn], function(handle) {
          handle.mssqlConnection && handle.mssqlConnection.close();
        });
      }
      delete connections[conn];

      cb();
    },

    // Return attributes
    describe: function (connection, collection, cb) {
			// Add in logic here to describe a collection (e.g. DESCRIBE TABLE logic)
      var tableName = collection;
      var statement = "SELECT c.name AS ColumnName,TYPE_NAME(c.user_type_id) AS TypeName,c.is_nullable AS Nullable,c.is_identity AS AutoIncrement,ISNULL((SELECT is_unique FROM sys.indexes i LEFT OUTER JOIN sys.index_columns ic ON i.index_id=ic.index_id WHERE i.object_id=t.object_id AND ic.object_id=t.object_id AND ic.column_id=c.column_id),0) AS [Unique],ISNULL((SELECT is_primary_key FROM sys.indexes i LEFT OUTER JOIN sys.index_columns ic ON i.index_id=ic.index_id WHERE i.object_id=t.object_id AND ic.object_id=t.object_id AND ic.column_id=c.column_id),0) AS PrimaryKey,ISNULL((SELECT COUNT(*) FROM sys.indexes i LEFT OUTER JOIN sys.index_columns ic ON i.index_id=ic.index_id WHERE i.object_id=t.object_id AND ic.object_id=t.object_id AND ic.column_id=c.column_id),0) AS Indexed FROM sys.tables t INNER JOIN sys.columns c ON c.object_id=t.object_id LEFT OUTER JOIN sys.index_columns ic ON ic.object_id=t.object_id WHERE t.name='" + tableName + "'";
      adapter.connectConnection(connection, function __DESCRIBE__(err, uniqId) {
        if (err) {
          console.error(err);
          return cb(err);
        }

        uniqId = uniqId || false;
        var mssqlConnect;
        if (!uniqId) {
          mssqlConnect = connections[connection].mssqlConnection;
        }
        else {
          mssqlConnect = connections[connection].mssqlConnection[uniqId];
        }

        var request = new mssql.Request(mssqlConnect);
        request.query(statement, function(err, recordset) {
          if (err) return cb(err);
          if (recordset.length === 0) return cb();
          var normalizedSchema = sql.normalizeSchema(recordset);
          connections[connection].config.schema = normalizedSchema;
          if (!connections[connection].persistent) {
            mssqlConnect && mssqlConnect.close();
          }
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
      adapter.connectConnection(connection, function __DEFINE__(err, uniqId) {
        if (err) {
          console.error(err);
          return cb(err);
        }
        var schema = sql.schema(collection, definition);
        var statement = 'CREATE TABLE [' + collection + '] (' + schema + ')';

        uniqId = uniqId || false;
        var mssqlConnect;
        if (!uniqId) {
          mssqlConnect = connections[connection].mssqlConnection;
        }
        else {
          mssqlConnect = connections[connection].mssqlConnection[uniqId];
        }

        var request = new mssql.Request(mssqlConnect);
        request.query(statement, function(err, recordset) {
          if (err) return cb(err);
          if (!connections[connection].persistent) {
            mssqlConnect && mssqlConnect.close();
          }
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
      var statement = 'IF OBJECT_ID(\'dbo.'+ collection + '\', \'U\') IS NOT NULL DROP TABLE [' + collection + ']';
      adapter.connectConnection(connection, function __DROP__(err, uniqId) {
        if (err) {
          console.error(err);
          return cb(err);
        }

        uniqId = uniqId || false;
        var mssqlConnect;
        if (!uniqId) {
          mssqlConnect = connections[connection].mssqlConnection;
        }
        else {
          mssqlConnect = connections[connection].mssqlConnection[uniqId];
        }

        var request = new mssql.Request(mssqlConnect);
        request.query(statement, function (err) {
          if (err) return cb(err);
          if (!connections[connection].persistent) {
            mssqlConnect && mssqlConnect.close();
          }
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
      adapter.connectConnection(connection, function __FIND__(err, uniqId) {
        if (err) {
          console.error(err);
          return cb(err);
        }

        uniqId = uniqId || false;
        var mssqlConnect;
        if (!uniqId) {
          mssqlConnect = connections[connection].mssqlConnection;
        }
        else {
          mssqlConnect = connections[connection].mssqlConnection[uniqId];
        }

        var request = new mssql.Request(mssqlConnect);
        //console.log('find:', statement);
        request.query(statement, function(err, recordset) {
          if (err) return cb(err);
          if (!connections[connection].persistent) {
            mssqlConnect && mssqlConnect.close();
          }
          cb(null, recordset);
        });

      });
    },
    // Raw Query Interface
    query: function (connection, collection, query, data, cb) {
      if (_.isFunction(data)) {
        cb = data;
        data = null;
      }

      adapter.connectConnection(connection, function __FIND__(err, uniqId) {
        if (err) {
          console.error(err);
          return cb(err);
        }

        uniqId = uniqId || false;
        var mssqlConnect;
        if (!uniqId) {
          mssqlConnect = connections[connection].mssqlConnection;
        }
        else {
          mssqlConnect = connections[connection].mssqlConnection[uniqId];
        }

        var request = new mssql.Request(mssqlConnect);
        request.query(query, function (err, recordset) {
          if (err) return cb(err);
          if (!connections[connection].persistent) {
            mssqlConnect && mssqlConnect.close();
          }
          cb(null, recordset);
        });

      });
    },

    create: function (connection, collection, values, cb) {
      var identityInsert = false;
      var pk = adapter.getPrimaryKey(connection, collection);
      //console.log('pk=', pk);
      Object.keys(values).forEach(function(key) {
        values[key] = utils.prepareValue(values[key]);
        if (pk == key && pk == 'id') {
          identityInsert = true;
          //console.log(pk, '==', key);
        }
      });
      var statement = sql.insertQuery(collection, values);
      if (identityInsert) {
        statement = 'SET IDENTITY_INSERT '+ collection + ' ON; '+
          statement +
          'SET IDENTITY_INSERT '+ collection + ' OFF;';
      }

      //console.log('create statement:', statement);

      adapter.connectConnection(connection, function __CREATE__(err, uniqId) {
        if (err) {
          console.error(err);
          return cb(err);
        }

        uniqId = uniqId || false;
        var mssqlConnect;
        if (!uniqId) {
          mssqlConnect = connections[connection].mssqlConnection;
        }
        else {
          mssqlConnect = connections[connection].mssqlConnection[uniqId];
        }

        var request = new mssql.Request(mssqlConnect);
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

          //console.log('castValues', castValues);
          if (!connections[connection].persistent) {
            mssqlConnect && mssqlConnect.close();
          }
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
      adapter.connectConnection(connection, function __UPDATE__(err, uniqId) {
        if (err) {
          console.error(err);
          return cb(err);
        }

        uniqId = uniqId || false;
        var mssqlConnect;
        if (!uniqId) {
          mssqlConnect = connections[connection].mssqlConnection;
        }
        else {
          mssqlConnect = connections[connection].mssqlConnection[uniqId];
        }

        var request = new mssql.Request(mssqlConnect);
        request.query(statement, function(err, recordset) {
          if (err) return cb(err);
          //console.log('updating pks', recordset);
          if (_.isEmpty(recordset)) {
            return cb(null, [ ]);
          }

          var pks = [];
          recordset.forEach(function(row) {
            pks.push(row[pk]);
          });

          Object.keys(values).forEach(function(key) {
            values[key] = utils.prepareValue(values[key]);
          });

          delete values[pk];

          statement = 'UPDATE [' + tableName + '] SET ' + sql.updateCriteria(collection, values) + ' ';
          statement += sql.serializeOptions(collection, options);

          request.query(statement, function(err, _recordset) {
            if (err) return cb(err);

            var criteria;

            if (pks.length === 1) {
              criteria = { where: {}, limit: 1 };
              criteria.where[pk] = pks[0];
            } else {
              criteria = { where: {}};
              criteria.where[pk] = pks;
            }

            if (!connections[connection].persistent) {
              mssqlConnect && mssqlConnect.close();
            }
            return adapter.find(connection, collection, criteria, cb);
          });
        });
      });
    },

    destroy: function (connection, collection, options, cb) {
      var tableName = collection;
      var statement = 'DELETE FROM [' + tableName + '] ';
      statement += sql.serializeOptions(collection, options);
      adapter.connectConnection(connection, function __DELETE__(err, uniqId) {
        if (err) {
          console.error(err);
          return cb(err);
        }

        adapter.find(connection, collection, options, function (err, records){
          if (err) return cb(err);

          uniqId = uniqId || false;
          var mssqlConnect;
          if (!uniqId) {
            mssqlConnect = connections[connection].mssqlConnection;
          }
          else {
            mssqlConnect = connections[connection].mssqlConnection[uniqId];
          }

          var request = new mssql.Request(mssqlConnect);
          request.query(statement, function(err, emptyDeleteRecordSet) {
            if (err) return cb(err);
            if (!connections[connection].persistent) {
              mssqlConnect && mssqlConnect.close();
            }
            cb(null, records);
          });
        });

      });
    },

    join: function (connectionName, collectionName, criteria, cb) {
      if (_.isObject(criteria)) {
        delete criteria.select;
      }

      CursorJoin({
        instructions: criteria,
        parentCollection: collectionName,
        //nativeJoins: true,

        $find: function (collectionIdentity, criteria, cb) {
          return adapter.find(connectionName, collectionIdentity, criteria, cb);
        },

        $getPK: function (collectionIdentity) {
          if (!collectionIdentity) return;
          var connectionObject = connections[connectionName];
          var collection = connectionObject.collections[collectionIdentity];
          return collection.getPrimaryKey();
        }
      }, cb);
    }

  };

	function marshalConfig(_config) {
		var config = _.defaults(_config, {
			server: _config.host,
			pool: {
				max: _config.pool.max,
				min: _config.pool.min,
				idleTimeoutMillis: _config.pool.idleTimeout * 1000
			}
    });

    return config;
	}

  return adapter;
})();
