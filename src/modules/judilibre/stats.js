require('../env');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const DEFAULT_ENV = "production";

const cached = {};

const mapResponse = {
  total_docs: "indexedTotal",
  last_decision_date: "newestDecision"
}

const judilibre_stats_url = (env) => {
  return `https://${env === "recette" ? "sandbox-" : ""}api.piste.gouv.fr/cassation/judilibre/v1.0/stats`;
}

const stats = async (query) => {

  const checkedQuery = {
    query: query.query,
    env: (query.env === "secours" ? "production" : query.env) || DEFAULT_ENV
  };

  if (!['production','recette'].includes(checkedQuery.env)) {
    throw { message: "Invalid env" };
  }

  let response, json;

  if (cached[checkedQuery.env] && (cached[checkedQuery.env].expiration > (new Date(Date.now())))) {
    json = cached[checkedQuery.env];
  } else {
    try {
      response = await fetch(judilibre_stats_url(checkedQuery.env), {
        method: 'GET',
        headers: {
          "KeyId": `${checkedQuery.env === "recette" ? process.env.PISTE_JUDILIBRE_KEY : process.env.PISTE_JUDILIBRE_KEY_PROD }`
        }
      });

      if (! response.ok) {
        throw {message: `Judilibre error ${reponse.status}`};
      }

      json = await response.json();

      cached[checkedQuery.env] = json;
      cached[checkedQuery.env].expiration = new Date(Date.now() + 60 * 1000);

    } catch(e) {
      console.log('stats', response, json, e.message);
      throw(e);
    }
  }

  return {
    [checkedQuery.query]: {
      data: json[mapResponse[checkedQuery.query]],
      type: "number"
    },
    scope: {
      env: checkedQuery.env
    }
  };
}

module.exports = stats;

