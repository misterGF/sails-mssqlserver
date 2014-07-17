# sails-mssql

This is a fork of swelham/sails-mssql that aims to bring sails/waterline .0.10x support to mssql.

This module is a Waterline/Sails adapter, an early implementation of a rapidly-developing, tool-agnostic data standard.  Its goal is to provide a set of declarative interfaces, conventions, and best-practices for integrating with all sorts of data sources.  Not just databases-- external APIs, proprietary web services, or even hardware.

Strict adherence to an adapter specification enables the (re)use of built-in generic test suites, standardized documentation, reasonable expectations around the API for your users, and overall, a more pleasant development experience for everyone.


### Interfaces
> queryable
> semantic
> associations
>TODO: migrations

### Running the tests

Add test database configuration in ./test/integration/runner.js
>npm install
>npm test

The exposed interfaces are generally passing unit tests.  There are few exceptions resulting from the TODOs below:
>>TODO: Associations suite is complaining about "keyAt" although this same problem exists when running the unit tests in sails-mysqlv.10.0-rc7.  This is causing database tables to not be cleaned up.  Subsequent test runs will need to have these tables dropped before testing again.



>>TODO: Support "skip" for >SqlServer2012 via OFFSET.  Currently supported with an inner query.




