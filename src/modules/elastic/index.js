require('../env');
const fs = require('fs');

class Elastic {
  constructor() {
    if (process.env.WITHOUT_ELASTIC) {
      this.data = null;
    } else {
      const { Client } = require('@elastic/elasticsearch');
      this.client = new Client({
        node: `${process.env.ELASTIC_NODE}`,
        tls: {
          ca: fs.readFileSync(`${process.env.ELASTIC_CERT}`),
          rejectUnauthorized: false
        }
      });
    }
  }

  async stats(query) {
    return await require('./stats').apply(this, [query]);
  }
}

module.exports = new Elastic();
