const apis = [];

apis.push(require('./stats'));
apis.push(require('./healthcheck'));

module.exports = apis;
