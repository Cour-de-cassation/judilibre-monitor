#!/bin/bash

export CURL="curl -s --retry 5 --retry-delay 2"

if [ ! -z "${APP_SELF_SIGNED}" ];then
  export CURL="${CURL} -k"
fi;

if ${CURL} ${APP_SCHEME}://${APP_HOST}:${APP_PORT}/healthcheck | grep -q '"disponible"' ; then
    echo "✅  test api ${APP_HOST}/healthcheck"
else
    if ${CURL} -k ${APP_SCHEME}://${APP_HOST}:${APP_PORT}/healthcheck | grep -q '"disponible"' ; then
        echo -e "\e[33m⚠️   test api ${APP_HOST}/healthcheck (invalid SSL cert)\e[0m"
    else
        echo -e "\e[31m❌ test api ${APP_HOST}/healthcheck !\e[0m"
        echo ${CURL} ${APP_SCHEME}://${APP_HOST}:${APP_PORT}/healthcheck
        ${CURL} ${APP_SCHEME}://${APP_HOST}:${APP_PORT}/healthcheck
        exit 1
    fi
fi

if ${CURL} ${APP_SCHEME}://${APP_HOST}:${APP_PORT}/stats | grep -q '"api_requests_number":' ; then
    echo "✅  test api ${APP_HOST}/stats"
else
    if ${CURL} -k ${APP_SCHEME}://${APP_HOST}:${APP_PORT}/stats | grep -q '"v":' ;then
        echo -e "\e[33m⚠️   test api ${APP_HOST}/stats (invalid SSL cert)\e[0m";
        exit 2;
    else
        echo -e "\e[31m❌ test api ${APP_HOST}/stats !\e[0m";
        echo ${CURL} ${APP_SCHEME}://${APP_HOST}:${APP_PORT}/stats;
        ${CURL} ${APP_SCHEME}://${APP_HOST}:${APP_PORT}/stats;
        exit 1;
    fi;
fi
