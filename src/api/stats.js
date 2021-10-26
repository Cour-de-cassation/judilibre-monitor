require('../modules/env');
const express = require('express');
const api = express.Router();
const { checkSchema, validationResult } = require('express-validator');
const Elastic = require('../modules/elastic');
const metrics = require('../modules/piste');
const judilibre = require('../modules/judilibre');
const route = 'stats';

const queries = [
  "total_docs","last_decision_date","piste","api_requests_number","api_request_date_histogram","decision_uniq_number",
  "search_top_50","errors_histogram","requests_ip_source","latencty_date_histogram",
  "pods_number","cpu_date_histogram","mem_date_histogram","bandwith_date_histogram"
];

api.get(
  `/${route}`,
  checkSchema({
    query: {
      in: 'query',
      isString: true,
      isIn: {
        options: [queries]
      },
      errorMessage: 'Invalid query'
    },
    date_start: {
      in: 'query',
      isString: true,
      errorMessage: `Start date must be a valid date format.`,
      optional: true,
    },
    date_end: {
      in: 'query',
      isString: true,
      errorMessage: `End date must be a valid date format.`,
      optional: true,
    },
    date_interval: {
      isString: true,
      matches: {
        options: [/\b\d+(m|h|d|y|w|M)\b/],
        errorMessage: "Invalid interval"
      },
      optional: true,
    },
    env: {
      in: 'query',
      isIn: {
        options: [['production', 'secours', 'recette']],
        errorMessage: "Environment must be in ['production', 'secours', 'recette']",
      },
      errorMessage: "Invalid env",
      optional: true,
    }
  }),
  async (req, res, next) => {
  try {
    const result = await getStats(req.query);
    if (result.errors) {
      return res.status(400).json({
        route: `${req.method} ${req.path}`,
        errors: result.errors,
      });
    }
    return res.status(200).json(result);
  } catch (e) {
    return res
      .status(500)
      .json({ route: `${req.method} ${req.path}`, errors: [{ msg: 'Internal Server Error', error: e.message || JSON.stringify(e) }] });
  }
});

const cached = {};

async function getStats(query) {
  if (cached[JSON.stringify(query)] && cached[JSON.stringify(query)].expiration > (new Date(Date.now()))) {
    return { cached: true, ...cached[JSON.stringify(query)] };
  }
  try {
    let response;
    if (query.query === "piste") {
      response = await metrics(query);
    } else if (['total_docs','last_decision_date'].includes(query.query)) {
      response = await judilibre(query);
    } else {
      response = await Elastic.stats(query);
    }
    const date = new Date(Date.now() + 60 * 1000);
    cached[JSON.stringify(query)] = { expiration: date, ...response };
    return { cached: false, ...response };
  } catch(e) {
    if (cached[JSON.stringify(query)]) {
      return {cached: true, error: e.message, ...cached[JSON.stringify(query)]};
    } else {
      throw(e);
    }
  }
}

module.exports = api;