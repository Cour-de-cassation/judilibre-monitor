require('../env');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const DEFAULT_ENV = "production";

const judilibre_stats_url = (env) => {
  return `https://${env === "recette" ? "sandbox-" : ""}api.piste.gouv.fr/cassation/judilibre/v1.0/stats`;
}

const stats = async (query) => {

  const checkedQuery = {
    query: "total_docs",
    env: (query.env === "secours" ? "production" : query.env) || DEFAULT_ENV
  };

  if (!['production','recette'].includes(checkedQuery.env)) {
    throw { message: "Invalid env" };
  }

  let response, json;
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

    return {
      [checkedQuery.query]: {
        data: json.indexedTotal,
        type: "number"
      },
      scope: {
        env: checkedQuery.env
      }
    };
  } catch(e) {
    console.log('stats', response, json, e.message);
    throw(e);
  }
}

module.exports = stats;

