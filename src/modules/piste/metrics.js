require('../env');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const checkToken = require('./oauth');

const DEFAULT_ENV = "production";
const DEFAULT_DATE_END = "now";
const DEFAULT_DATE_START = "now-1d";


const piste_metrics_url = (date_start, date_end, env) => {
  return `https://${env === "recette" ? "sandbox-" : ""}api.piste.gouv.fr/v1/piste/metrics/summary?dateEnd=${date_end}&dateStart=${date_start}`;
}

const toMS = {
  d: 1000 * 24 * 60 * 60,
  h: 1000 * 3600,
  m: 1000 * 24 * 60 * 60 * 30,
  w: 1000 * 24 * 60 * 60 * 7,
  y: 1000 * 24 * 60 * 60 * 365,
  M: 1000 * 24 * 60
}

const convertESdate = (dateString) => {
  const match = dateString.match(/^now(-(\d+)(m|h|d|y|w|M))?$/);
  if (match) {
    if (dateString === "now") {
      return (new Date(Date.now())).toISOString().replace(/T.*/,'');
    } else {
      const n = match[2];
      const i = toMS[match[3]];
      return (new Date(Date.now() - n*i)).toISOString().replace(/T.*/,'');
    }
  } else {
    return dateString;
  }
}

const metrics = async (query) => {

  const checkedQuery = {
    query: "piste",
    env: (query.env === 'secours' ? 'production' : query.env )|| DEFAULT_ENV,
    date_end: convertESdate(query.date_end || DEFAULT_DATE_END),
    date_start: convertESdate(query.date_start || DEFAULT_DATE_START),
  };

  if (!['production','recette'].includes(checkedQuery.env)) {
    throw {message: "Invalid env"};
  }

  let token, response, json;
  try {
    token = await checkToken(checkedQuery.env);
    response = await fetch(piste_metrics_url(checkedQuery.date_start, checkedQuery.date_end, checkedQuery.env), {
      method: 'GET',
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw {message: `Piste error ${response.status}`};
    }

    json = await response.json();

    if (!json.result) {
      throw {message: "Invalid query"};
    }

    const result = {
      [checkedQuery.query]: {
        data: {},
        type: "histogram"
      }
    };

    json.result.forEach((d) => {
      if (d.organizationname === "Universelle") {
        let shortAppId = d.orgapplication.replace(/^(Universelle: (APP_SANDBOX_(.*@(.*))$)?)(.*)$/,'$4$5');
        shortAppId = shortAppId.replace(/^(m4x|gmail|outlook|apple|icloud|hotmail|orange|wanadoo|aol|free)\.(fr|org|com)$/,'autre');
        result[checkedQuery.query].data[shortAppId] = result[checkedQuery.query].data[shortAppId] ?
          result[checkedQuery.query].data[shortAppId] + d.totalnummessages : d.totalnummessages;
      }
    });
    result[checkedQuery.query].scope = {
      env: checkedQuery.env,
      date_end: checkedQuery.date_end,
      date_start: checkedQuery.date_start
    };
    return result;
  } catch(e) {
    console.log('metrics', token, response, json, e.message);
    throw(e);
  }
}

module.exports = metrics;
