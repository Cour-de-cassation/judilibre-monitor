require('../env');

class Elastic {
  constructor() {
    if (process.env.WITHOUT_ELASTIC) {
      this.data = null;
    } else {
      const { Client } = require('@elastic/elasticsearch');
      this.client = new Client({ node: `${process.env.ELASTIC_NODE}`, ssl: { rejectUnauthorized: false } });
    }
  }

  async stats(query) {
    return await require('./stats').apply(this, [query]);
  }
}

module.exports = new Elastic();
