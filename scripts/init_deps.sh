#!/bin/bash

export GIT_OPS=judilibre-ops
export DEPS_SRC=$(pwd)/${GIT_OPS}
export SCRIPTS_SRC=${DEPS_SRC}/scripts
export KUBE_SRC=${DEPS_SRC}/k8s

# clone
if [ ! -d ${SCRIPTS_SRC} ];then
    if ! (git clone https://Cour-de-cassation/${GIT_OPS} > /dev/null 2>&1); then
        echo -e "\e[31m❌ init failed, couldn't clone git ${GIT_OPS} repository \e[0m" && exit 1;
        if [ "${GIT_BRANCH}" == "master" ]; then
            cd ${GIT_OPS};
            git checkout master;
            cd ..;
        fi;
    fi;
fi;

# scripts

for file in $(ls ${SCRIPTS_SRC}); do
    if [ ! -f "./scripts/$file" ]; then
        ln -s ${SCRIPTS_SRC}/$file ./scripts/$file;
    fi;
done;

# kube configs
for file in $(ls ${KUBE_SRC}); do
    if [ ! -f "./k8s/$file" ]; then
        ln -s ${KUBE_SRC}/$file ./k8s/$file;
    fi;
done;
