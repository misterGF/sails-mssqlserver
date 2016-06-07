![sails logo](http://sailsjs.org/images/bkgd_squiddy.png)

# Sails-MSsqlserver
[![NPM version][npm-image]][npm-url]
[![Build status][ci-image]][ci-url]
[![Dependency Status][daviddm-image]][daviddm-url]



Microsoft SQL Server adapter for [sails.js](http://sailsjs.org/). Tested on SQL Server 2012 and 2014,
but should support any SQL Server 2005 and newer. CI tests are run against SQL
Server Express. Originally published by [c*nect](http://www.cnectdata.com/).

The development and acceptance of pull request have stalled on the original project. Therefore I am publishing this project with some enhancements.

## Getting Started
### 1. Install
```sh
$ npm install sails-mssqlserver --save
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
    adapter: 'sails-mssqlserver',
    user: 'sa',
    password: 'secureP@ssword',
    host: 'abc123.database.windows.net' // azure database
    database: 'mydb',
    options: {
      encrypt: true   // use this for Azure databases
    }
  }
}
```

## Query Examples

### Select with certain columns
``` javascript
Plugins.find({
  select: ['name','author'] // Optional
})
.where({
  framework: 'sails.js'
})
.then(function(results){
  if (results) {
    results.forEach(function(plugin)){
      console.log(plugin)
    }      
  } else {
    console.log('No plugins found')
 }
})
```

For further examples check out Sail's [Waterline ORM page](http://sailsjs.org/documentation/concepts/models-and-orm/query-language)

## License
MIT

[npm-image]: https://img.shields.io/npm/v/sails-mssqlserver.svg?style=flat-square
[npm-url]: https://npmjs.org/package/sails-mssqlserver


[ci-image]: https://img.shields.io/circleci/project/misterGF/sails-mssqlserver/master.svg?style=flat-square
[ci-url]: https://circleci.com/gh/misterGF/sails-mssqlserver

[daviddm-image]: http://img.shields.io/david/misterGF/sails-mssqlserver.svg?style=flat-square
[daviddm-url]: https://david-dm.org/misterGF/sails-mssqlserver
