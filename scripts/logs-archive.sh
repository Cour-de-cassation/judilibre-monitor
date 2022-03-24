#!/bin/bash

: ${SCW_REGION:="fr-par"}
export RCLONE_CONFIG_S3_TYPE=s3
export RCLONE_CONFIG_S3_ACCESS_KEY_ID=${SCW_LOG_ACCESS_KEY}
export RCLONE_CONFIG_S3_SECRET_ACCESS_KEY=${SCW_LOG_SECRET_KEY}
export RCLONE_CONFIG_S3_ENV_AUTH=false
export RCLONE_CONFIG_S3_ENDPOINT=s3.${SCW_REGION}.scw.cloud
export RCLONE_CONFIG_S3_REGION=${SCW_REGION}
export RCLONE_CONFIG_S3_SERVER_SIDE_ENCRYPTION=
export RCLONE_CONFIG_S3_FORCE_PATH_STYLE=false
export RCLONE_CONFIG_S3_LOCATION_CONSTRAINT=
export RCLONE_CONFIG_S3_STORAGE_CLASS=
export RCLONE_CONFIG_S3_ACL=private

# if [ ! -f ${SCW_LOG_BUCKET}.list ]; then
#   for month in 202201 202202; do
#     for day in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31; do
#       echo ${month}${day};
#       rclone ls --checkers=1024 --fast-list s3:${SCW_LOG_BUCKET} --include=**/${month}${day}** | awk '{print $2}' >> ${SCW_LOG_BUCKET}.list;
#     done;
#   done;
# fi;

# while (true); do
#     rclone -v copy --files-from ${SCW_LOG_BUCKET}.list  --transfers=45 --checkers=1024 --ignore-existing --retries 1 s3:${SCW_LOG_BUCKET} logs/;
#     sleep 1;
# done
 #| grep '/2021' | awk '{print $2}' | xargs -I{} rclone delete s3:${SCW_LOG_BUCKET}/{}

# while (true);do
#     rclone -v copy --order-by modtime --fast-list --transfers=45 --checkers=1024 --ignore-existing --exclude=**/2021** --retries 5 s3:${SCW_LOG_BUCKET} logs/;
#     sleep 1
# done

# while (true);do
#     rclone -v copy --order-by modtime --fast-list --transfers=45 --checkers=1024 --ignore-existing --exclude=**/2021** --retries 5 s3:${SCW_LOG_BUCKET}/judilibre-dev/fr-par-1/judilibre-scw-dev-par1-dev/202201/20220124 logs/judilibre-dev/fr-par-1/judilibre-scw-dev-par1-dev/202201/20220124
# done

# while (true);do
#  for SCW_ENV in judilibre-monitor/fr-par-1/monitor judilibre-prod/fr-par-2/judilibre-scw-prod-par2-master judilibre-prod/fr-par-1/judilibre-scw-prod-par1-master judilibre-sbx/fr-par-2/judilibre-scw-sbx-par2-dev judilibre-sbx/fr-par-1/judilibre-scw-sbx-par1-dev judilibre-dev/fr-par-1/judilibre-scw-dev-par1-dev; do
#   for month in 202201 202202; do
#     for day in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31; do
#       echo $SCW_ENV/${month}/${month}${day};
#       rclone -v copy --fast-list --retries 5 --ignore-existing s3:${SCW_LOG_BUCKET}/${SCW_ENV}/${month}/${month}${day} logs/${SCW_ENV}/${month}/${month}${day};
#     done;
#   done;
#  done;
# done

# for ENV_DAY_DIR in $(find -type d -mindepth 5); do
#     find ${ENV_DAY_DIR} -type f | sort

#for dir in $(find logs -type d -mindepth 5 -maxdepth 5 | sort);do echo $dir;(cat $(find $dir -type f -iname '*.jsonl' | sort) | gzip > $dir.jsonl.gz) && rm -rf $dir ;done
              LOG_DIR=$(pwd)/logs
              TODAY=$(date +%Y%m%d)
              YESTERDAY=$(date -d "@$(($(date +%s) - 86400))" +%Y%m%d)
              echo TODAY=${TODAY} YESTERDAY=${YESTERDAY} archives:${SCW_LOG_ARCHIVE_BUCKET} logs:${SCW_LOG_BUCKET}
              rclone -v copy --checkers=8 --transfers=8 --ignore-existing s3:${SCW_LOG_BUCKET} ${LOG_DIR};
                for LOG_DIR_ENVDAY in $(find ${LOG_DIR} -mindepth 5 -maxdepth 5 -type d | grep -v "/${TODAY}" | grep -v "/${YESTERDAY}" | sort);do
                  echo concatenating and zipping ${LOG_DIR_ENVDAY};
                  (cat $(find ${LOG_DIR_ENVDAY} -type f -iname '*.jsonl' | sort) | gzip > ${LOG_DIR_ENVDAY}.jsonl.gz) && rm -rf ${LOG_DIR_ENVDAY};
                done
                rclone -v copy --checkers=8 --transfers=8 --ignore-existing ${LOG_DIR} s3:${SCW_LOG_ARCHIVE_BUCKET} --include=**.jsonl.gz;
                rclone -v delete --checkers=8 --transfers=8 s3:${SCW_LOG_BUCKET} --exclude=**/${TODAY}** --exclude=**/${YESTERDAY}**;
