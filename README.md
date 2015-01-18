# <img src="http://cdn.tjw.io/images/sails-logo.png" height='48px' /> + <img src="http://cdn.tjw.io/images/sqlserver_logo.png" height='44px' />
[![Build status][ci-image]][ci-url]
[![Dependency Status][daviddm-image]][daviddm-url]

A Waterline adapter for Microsoft SQL Server. Tested on SQL Server 2012 and 2014, but should support any SQL Server 2005 and newer.

### 1. Install
```sh
$ npm install sails-sqlserver --save
```

### 2. Configure

#### `config/models.js`
```js
{
  connection: 'sqlserver'
}
```

#### `config/connections.js`
```js
{
  sqlserver: {
    adapter: 'sails-sqlserver',
    user: 'cnect',
    password: 'pass',
    host: 'abc123.database.windows.net' // azure database
    database: 'mydb',
    options: {
      encrypt: true
    }
  }
}
```

## License
MIT

[sails-logo]: http://cdn.tjw.io/images/sails-logo.png
[sails-url]: https://sailsjs.org
[ci-image]: https://img.shields.io/circleci/project/cnect/sails-mssql.svg?style=flat-square
[ci-url]: https://circleci.com/gh/cnect/sails-mssql
[daviddm-image]: http://img.shields.io/david/cnect/sails-mssql.svg?style=flat-square
[daviddm-url]: https://david-dm.org/cnect/sails-mssql
