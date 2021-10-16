require('../modules/env');
const express = require('express');
const api = express.Router();
const { checkSchema, validationResult } = require('express-validator');
const Elastic = require('../modules/elastic');
const route = 'stats';

api.get(
  `/${route}`,
  checkSchema({
    query: {
      in: 'query',
      isString: true,
      matches: {
        options: [/\b(api_requests_number|api_request_date_histogram|decision_uniq_number|search_top_50|errors_histogram|requests_ip_source|latencty_date_histogram|pods_number|cpu_date_histogram|mem_date_histogram|bandwith_date_histogram)\b/],
        errorMessage: "Invalid query"
      }
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
    cluster: {
      in: 'query',
      isString: true,
      errorMessage: `Cluster must be a string.`,
      optional: true,
    }
  }),
  async (req, res) => {
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
      .json({ route: `${req.method} ${req.path}`, errors: [{ msg: 'Internal Server Error', error: e.message }] });
  }
});

async function getStats(query) {
  return await Elastic.stats(query);
}

module.exports = api;
