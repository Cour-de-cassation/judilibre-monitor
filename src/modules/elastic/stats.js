require('../env');

const DEFAULT_QUERY_TYPE = "api_requests_number";
const DEFAULT_CLUSTER = "judilibre-scw-prod-par2";
const DEFAULT_DATE_END = "now";
const DEFAULT_DATE_START = "now-1d";
const DEFAULT_DATE_INTERVAL = "30m";

async function stats(query) {
  const response = {
  };

  const checkedQuery = {
    query: query.query || DEFAULT_QUERY_TYPE,
    cluster: query.cluster || DEFAULT_CLUSTER,
    date_end: query.date_end || DEFAULT_DATE_END,
    date_start: query.date_start || DEFAULT_DATE_START,
    date_interval: query.date_interval || DEFAULT_DATE_INTERVAL,
    size: query.size || 10
  };

  const elasticQuery = computeQuery({...checkedQuery});

  if (!elasticQuery) {
    throw "Invalid query parameters";
  }

  let content;
  try {
    content = await this.client.search({
      index: process.env.ELASTIC_INDEX,
      size: 0,
      track_total_hits: true,
      body: elasticQuery
    });
  } catch(e) {
    console.log(JSON.stringify(e));
    return;
  }

  if (content && content.body) {
    response[checkedQuery.query] = {};
    if (content.body.aggregations && content.body.aggregations["0"] && content.body.aggregations["0"].buckets) {
      if (content.body.aggregations["0"].buckets[0].key_as_string) {
        // time series
        response[checkedQuery.query].data = content.body.aggregations["0"].buckets.map(b => {
          let data = { date: b.key_as_string };
          Object.keys(b).forEach(k => {
            if (b[k].buckets) {
              b[k].buckets.forEach(bb => {
                data[bb.key]=bb.doc_count;
              })
            } else if (b[k].values) {
              data = {...data, ...b[k].values};
            } else if (b[k].value) {
              data[k] = b[k].value;
            }
          });
          return data;
        });
        response[checkedQuery.query].type = "time_series";
      } else {
        // histogram
        let data = {};
        content.body.aggregations["0"].buckets.forEach(b => {
          data[b.key] = b.doc_count;
        });
        response[checkedQuery.query].data = data;
        response[checkedQuery.query].type = "histogram";
      }
    } else {
        // total or simple aggregation
        response[checkedQuery.query] = {
          data: (content.body.aggregations && content.body.aggregations["0"] && content.body.aggregations["0"].value ) || content.body.hits.total.value,
          type: "number"
        }
    }
    response[checkedQuery.query].scope = {
      cluster: checkedQuery.cluster,
      date_end: checkedQuery.date_end,
      date_start: checkedQuery.date_start,
      date_interval: checkedQuery.date_interval
    };

    // response[checkedQuery.query].raw_response=content.body;
    // response[checkedQuery.query].query=elasticQuery;

  }

  return response;
}

function renameKeys(keysMap, obj) {
  console.log("ici");
  return Object.keys(obj).reduce(
    (acc, key) => ({
      ...acc,
      ...{ [keysMap[key] || key]: obj[key] }
    }),
    {}
  );
}

function computeQuery({query,cluster,date_end,date_start,date_interval}) {
  const queries = {
    "api_requests_number": {
        "aggs": {},
        "size": 0,
        "fields": [
          {
            "field": "@timestamp",
            "format": "date_time"
          },
          {
            "field": "container_timestamp",
            "format": "date_time"
          },
          {
            "field": "date",
            "format": "date_time"
          },
          {
            "field": "request_params_date_end",
            "format": "date_time"
          },
          {
            "field": "request_params_date_start",
            "format": "date_time"
          }
        ],
        "script_fields": {},
        "stored_fields": [
          "*"
        ],
        "runtime_mappings": {},
        "_source": {
          "excludes": []
        },
        "query": {
          "bool": {
            "must": [],
            "filter": [
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "kubernetes_cluster_name.keyword": `${cluster}`
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "exists": {
                  "field": "request_api.keyword"
                }
              },
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "status.keyword": "200"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "204"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "206"
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "range": {
                  "date": {
                    "gte": `${date_start}`,
                    "lte": `${date_end}`,
                    "format": "strict_date_optional_time"
                  }
                }
              }
            ],
            "should": [],
            "must_not": [
              {
                "match_phrase": {
                  "request_api.keyword": "healthcheck"
                }
              }
            ]
          }
        }
      },
    "api_requests_date_histogram": {
        "aggs": {
          "0": {
            "date_histogram": {
              "field": "date",
              "fixed_interval": `${date_interval}`,
              "time_zone": "Europe/Paris"
            },
            "aggs": {
              "1": {
                "terms": {
                  "field": "request_api.keyword",
                  "order": {
                    "_count": "desc"
                  },
                  "size": 6
                }
              }
            }
          }
        },
        "size": 0,
        "fields": [
          {
            "field": "@timestamp",
            "format": "date_time"
          },
          {
            "field": "container_timestamp",
            "format": "date_time"
          },
          {
            "field": "date",
            "format": "date_time"
          },
          {
            "field": "request_params_date_end",
            "format": "date_time"
          },
          {
            "field": "request_params_date_start",
            "format": "date_time"
          }
        ],
        "script_fields": {},
        "stored_fields": [
          "*"
        ],
        "runtime_mappings": {},
        "_source": {
          "excludes": []
        },
        "query": {
          "bool": {
            "must": [],
            "filter": [
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "kubernetes_cluster_name.keyword": `${cluster}`
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "exists": {
                  "field": "request_api.keyword"
                }
              },
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "status.keyword": "200"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "204"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "206"
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "range": {
                  "date": {
                    "gte": `${date_start}`,
                    "lte": `${date_end}`,
                    "format": "strict_date_optional_time"
                  }
                }
              }
            ],
            "should": [],
            "must_not": [
              {
                "match_phrase": {
                  "request_api.keyword": "healthcheck"
                }
              }
            ]
          }
        }
      },
    "decision_uniq_number": {
        "aggs": {
          "0": {
            "cardinality": {
              "field": "request_params_id.keyword"
            }
          }
        },
        "size": 0,
        "fields": [
          {
            "field": "@timestamp",
            "format": "date_time"
          },
          {
            "field": "container_timestamp",
            "format": "date_time"
          },
          {
            "field": "date",
            "format": "date_time"
          },
          {
            "field": "request_params_date_end",
            "format": "date_time"
          },
          {
            "field": "request_params_date_start",
            "format": "date_time"
          }
        ],
        "script_fields": {},
        "stored_fields": [
          "*"
        ],
        "runtime_mappings": {},
        "_source": {
          "excludes": []
        },
        "query": {
          "bool": {
            "must": [],
            "filter": [
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "kubernetes_cluster_name.keyword": `${cluster}`
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "exists": {
                  "field": "request_api.keyword"
                }
              },
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "status.keyword": "200"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "204"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "206"
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "match_phrase": {
                  "request_api.keyword": "decision"
                }
              },
              {
                "range": {
                  "date": {
                    "gte": `${date_start}`,
                    "lte": `${date_end}`,
                    "format": "strict_date_optional_time"
                  }
                }
              }
            ],
            "should": [],
            "must_not": [
              {
                "match_phrase": {
                  "request_api.keyword": "healthcheck"
                }
              }
            ]
          }
        }
      },
    "search_top_50": {
        "aggs": {
          "0": {
            "terms": {
              "field": "request_params_query.keyword",
              "order": {
                "_count": "desc"
              },
              "size": 50
            }
          }
        },
        "size": 0,
        "fields": [
          {
            "field": "@timestamp",
            "format": "date_time"
          },
          {
            "field": "container_timestamp",
            "format": "date_time"
          },
          {
            "field": "date",
            "format": "date_time"
          },
          {
            "field": "request_params_date_end",
            "format": "date_time"
          },
          {
            "field": "request_params_date_start",
            "format": "date_time"
          }
        ],
        "script_fields": {},
        "stored_fields": [
          "*"
        ],
        "runtime_mappings": {},
        "_source": {
          "excludes": []
        },
        "query": {
          "bool": {
            "must": [],
            "filter": [
              {
                "multi_match": {
                  "type": "best_fields",
                  "query": "nginx-ingress-controller",
                  "lenient": true
                }
              },
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "kubernetes_cluster_name.keyword": `${cluster}`
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "exists": {
                  "field": "request_params_query.keyword"
                }
              },
              {
                "range": {
                  "date": {
                    "gte": `${date_start}`,
                    "lte": `${date_end}`,
                    "format": "strict_date_optional_time"
                  }
                }
              }
            ],
            "should": [],
            "must_not": [
              {
                "match_phrase": {
                  "request_params_query.keyword": "test"
                }
              }
            ]
          }
        }
      },
    "errors_histogram": {
        "aggs": {
          "0": {
            "terms": {
              "field": "status.keyword",
              "order": {
                "_count": "desc"
              },
              "size": 11
            }
          }
        },
        "size": 0,
        "fields": [
          {
            "field": "@timestamp",
            "format": "date_time"
          },
          {
            "field": "container_timestamp",
            "format": "date_time"
          },
          {
            "field": "date",
            "format": "date_time"
          },
          {
            "field": "request_params_date_end",
            "format": "date_time"
          },
          {
            "field": "request_params_date_start",
            "format": "date_time"
          }
        ],
        "script_fields": {},
        "stored_fields": [
          "*"
        ],
        "runtime_mappings": {},
        "_source": {
          "excludes": []
        },
        "query": {
          "bool": {
            "must": [],
            "filter": [
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "kubernetes_cluster_name.keyword": `${cluster}`
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "exists": {
                  "field": "request_api.keyword"
                }
              },
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "status.keyword": "499"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "502"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "500"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "429"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "400"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "404"
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "range": {
                  "date": {
                    "gte": `${date_start}`,
                    "lte": `${date_end}`,
                    "format": "strict_date_optional_time"
                  }
                }
              }
            ],
            "should": [],
            "must_not": [
              {
                "match_phrase": {
                  "request_api.keyword": "healthcheck"
                }
              },
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "status.keyword": "200"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "204"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "206"
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              }
            ]
          }
        }
      },
    "requests_ip_source": {
        "aggs": {
          "0": {
            "terms": {
              "field": "clientip.keyword",
              "order": {
                "_count": "desc"
              },
              "size": 2
            }
          }
        },
        "size": 0,
        "fields": [
          {
            "field": "@timestamp",
            "format": "date_time"
          },
          {
            "field": "container_timestamp",
            "format": "date_time"
          },
          {
            "field": "date",
            "format": "date_time"
          },
          {
            "field": "request_params_date_end",
            "format": "date_time"
          },
          {
            "field": "request_params_date_start",
            "format": "date_time"
          }
        ],
        "script_fields": {},
        "stored_fields": [
          "*"
        ],
        "runtime_mappings": {},
        "_source": {
          "excludes": []
        },
        "query": {
          "bool": {
            "must": [],
            "filter": [
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "kubernetes_cluster_name.keyword": `${cluster}`
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "exists": {
                  "field": "request_api.keyword"
                }
              },
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "status.keyword": "200"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "204"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "206"
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "clientip.keyword": "185.24.185.49"
                      }
                    },
                    {
                      "match_phrase": {
                        "clientip.keyword": "80.87.226.10"
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "range": {
                  "date": {
                    "gte": `${date_start}`,
                    "lte": `${date_end}`,
                    "format": "strict_date_optional_time"
                  }
                }
              }
            ],
            "should": [],
            "must_not": [
              {
                "match_phrase": {
                  "request_api.keyword": "healthcheck"
                }
              }
            ]
          }
        }
      },
    "latencty_date_histogram": {
        "aggs": {
          "0": {
            "date_histogram": {
              "field": "date",
              "fixed_interval": `${date_interval}`,
              "time_zone": "Europe/Paris"
            },
            "aggs": {
              "1": {
                "percentiles": {
                  "field": "request_time",
                  "percents": [
                    50
                  ]
                }
              },
              "2": {
                "percentiles": {
                  "field": "request_time",
                  "percents": [
                    95
                  ]
                }
              },
              "3": {
                "percentiles": {
                  "field": "request_time",
                  "percents": [
                    99
                  ]
                }
              }
            }
          }
        },
        "size": 0,
        "fields": [
          {
            "field": "@timestamp",
            "format": "date_time"
          },
          {
            "field": "container_timestamp",
            "format": "date_time"
          },
          {
            "field": "date",
            "format": "date_time"
          },
          {
            "field": "request_params_date_end",
            "format": "date_time"
          },
          {
            "field": "request_params_date_start",
            "format": "date_time"
          }
        ],
        "script_fields": {},
        "stored_fields": [
          "*"
        ],
        "runtime_mappings": {},
        "_source": {
          "excludes": []
        },
        "query": {
          "bool": {
            "must": [],
            "filter": [
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "kubernetes_cluster_name.keyword": `${cluster}`
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "exists": {
                  "field": "request_api.keyword"
                }
              },
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "status.keyword": "200"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "204"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "206"
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "match_phrase": {
                  "proxy_upstream_name": "search"
                }
              },
              {
                "range": {
                  "date": {
                    "gte": `${date_start}`,
                    "lte": `${date_end}`,
                    "format": "strict_date_optional_time"
                  }
                }
              }
            ],
            "should": [],
            "must_not": [
              {
                "match_phrase": {
                  "request_api.keyword": "healthcheck"
                }
              }
            ]
          }
        }
      },
    "pods_number": {
        "aggs": {
          "0": {
            "cardinality": {
              "field": "kubernetes_pod_id.keyword"
            }
          }
        },
        "size": 0,
        "fields": [
          {
            "field": "@timestamp",
            "format": "date_time"
          },
          {
            "field": "container_timestamp",
            "format": "date_time"
          },
          {
            "field": "date",
            "format": "date_time"
          },
          {
            "field": "request_params_date_end",
            "format": "date_time"
          },
          {
            "field": "request_params_date_start",
            "format": "date_time"
          }
        ],
        "script_fields": {},
        "stored_fields": [
          "*"
        ],
        "runtime_mappings": {},
        "_source": {
          "excludes": []
        },
        "query": {
          "bool": {
            "must": [],
            "filter": [
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "kubernetes_cluster_name.keyword": `${cluster}`
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "range": {
                  "date": {
                    "gte": `${date_start}`,
                    "lte": `${date_end}`,
                    "format": "strict_date_optional_time"
                  }
                }
              }
            ],
            "should": [],
            "must_not": []
          }
        }
      },
    "cpu_date_histogram": {
        "aggs": {
          "0": {
            "date_histogram": {
              "field": "date",
              "fixed_interval": `${date_interval}`,
              "time_zone": "Europe/Paris"
            },
            "aggs": {
              "1": {
                "percentiles": {
                  "field": "cpu_p",
                  "percents": [
                    50
                  ]
                }
              },
              "2": {
                "percentiles": {
                  "field": "cpu_p",
                  "percents": [
                    95
                  ]
                }
              },
              "3": {
                "percentiles": {
                  "field": "cpu_p",
                  "percents": [
                    99
                  ]
                }
              }
            }
          }
        },
        "size": 0,
        "fields": [
          {
            "field": "@timestamp",
            "format": "date_time"
          },
          {
            "field": "container_timestamp",
            "format": "date_time"
          },
          {
            "field": "date",
            "format": "date_time"
          },
          {
            "field": "request_params_date_end",
            "format": "date_time"
          },
          {
            "field": "request_params_date_start",
            "format": "date_time"
          }
        ],
        "script_fields": {},
        "stored_fields": [
          "*"
        ],
        "runtime_mappings": {},
        "_source": {
          "excludes": []
        },
        "query": {
          "bool": {
            "must": [],
            "filter": [
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "kubernetes_cluster_name.keyword": `${cluster}`
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "range": {
                  "date": {
                    "gte": `${date_start}`,
                    "lte": `${date_end}`,
                    "format": "strict_date_optional_time"
                  }
                }
              }
            ],
            "should": [],
            "must_not": []
          }
        }
      },
    "mem_date_histogram": {
        "aggs": {
          "0": {
            "date_histogram": {
              "field": "date",
              "fixed_interval": `${date_interval}`,
              "time_zone": "Europe/Paris"
            },
            "aggs": {
              "Mem.total": {
                "max": {
                  "field": "Mem.total"
                }
              },
              "Mem.used.mean": {
                "avg": {
                  "field": "Mem.used"
                }
              },
              "Mem.used.max": {
                "max": {
                  "field": "Mem.used"
                }
              },
              "Mem.used.min": {
                "min": {
                  "field": "Mem.used"
                }
              }
            }
          }
        },
        "size": 0,
        "fields": [
          {
            "field": "@timestamp",
            "format": "date_time"
          },
          {
            "field": "container_timestamp",
            "format": "date_time"
          },
          {
            "field": "date",
            "format": "date_time"
          },
          {
            "field": "request_params_date_end",
            "format": "date_time"
          },
          {
            "field": "request_params_date_start",
            "format": "date_time"
          }
        ],
        "script_fields": {},
        "stored_fields": [
          "*"
        ],
        "runtime_mappings": {},
        "_source": {
          "excludes": []
        },
        "query": {
          "bool": {
            "must": [],
            "filter": [
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "kubernetes_cluster_name.keyword": `${cluster}`
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "range": {
                  "date": {
                    "gte": `${date_start}`,
                    "lte": `${date_end}`,
                    "format": "strict_date_optional_time"
                  }
                }
              }
            ],
            "should": [],
            "must_not": []
          }
        }
      },
    "bandwidth_date_histogram": {
        "aggs": {
          "0": {
            "date_histogram": {
              "field": "date",
              "fixed_interval": `${date_interval}`,
              "time_zone": "Europe/Paris"
            },
            "aggs": {
              "body_bytes_sent": {
                "sum": {
                  "field": "body_bytes_sent"
                }
              }
            }
          }
        },
        "size": 0,
        "fields": [
          {
            "field": "@timestamp",
            "format": "date_time"
          },
          {
            "field": "container_timestamp",
            "format": "date_time"
          },
          {
            "field": "date",
            "format": "date_time"
          },
          {
            "field": "request_params_date_end",
            "format": "date_time"
          },
          {
            "field": "request_params_date_start",
            "format": "date_time"
          }
        ],
        "script_fields": {},
        "stored_fields": [
          "*"
        ],
        "runtime_mappings": {},
        "_source": {
          "excludes": []
        },
        "query": {
          "bool": {
            "must": [],
            "filter": [
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "kubernetes_cluster_name.keyword": `${cluster}`
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "exists": {
                  "field": "request_api.keyword"
                }
              },
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "status.keyword": "200"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "204"
                      }
                    },
                    {
                      "match_phrase": {
                        "status.keyword": "206"
                      }
                    }
                  ],
                  "minimum_should_match": 1
                }
              },
              {
                "range": {
                  "date": {
                    "gte": `${date_start}`,
                    "lte": `${date_end}`,
                    "format": "strict_date_optional_time"
                  }
                }
              }
            ],
            "should": [],
            "must_not": [
              {
                "match_phrase": {
                  "request_api.keyword": "healthcheck"
                }
              }
            ]
          }
        }
      }
    };
  return queries[query];
}

module.exports = stats;
