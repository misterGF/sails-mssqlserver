## <a href="http://www.cnectdata.com/"><img src="http://www.cnectdata.com/wp-content/uploads/2014/04/cnect-logo-200x57-20141118.png" height='32px' /></a> All-in-One Data Management Stack

### sails-sqlserver
[![NPM version][npm-image]][npm-url]
[![Build status][ci-image]][ci-url]
[![Dependency Status][daviddm-image]][daviddm-url]

Official Microsoft SQL Server adapter for [sails.js](http://sailsjs.org/). Tested on SQL Server 2012 and 2014,
but should support any SQL Server 2005 and newer. CI tests are run against SQL
Server Express. Published by [c*nect](http://www.cnectdata.com/).

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
      encrypt: true   // use this for Azure databases
    }
  }
}
```

## License
MIT

[npm-image]: https://img.shields.io/npm/v/sails-sqlserver.svg?style=flat-square
[npm-url]: https://npmjs.org/package/sails-sqlserver
[sails-logo]: http://cdn.tjw.io/images/sails-logo.png
[sails-url]: https://sailsjs.org
[ci-image]: https://img.shields.io/circleci/project/cnect/sails-sqlserver/master.svg?style=flat-square
[ci-url]: https://circleci.com/gh/cnect/sails-sqlserver
[daviddm-image]: http://img.shields.io/david/cnect/sails-sqlserver.svg?style=flat-square
[daviddm-url]: https://david-dm.org/cnect/sails-sqlserver
