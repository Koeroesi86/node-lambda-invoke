#!/usr/bin/bash

#echo "path $PATH"

env | sort

#printf "ready\n" 1>&$NODE_CHANNEL_FD

#sleep 1
while :
do
#  MESSAGE=$("read -u $NODE_CHANNEL_FD")
#  MESSAGE=$(read -u $NODE_CHANNEL_FD)
#  $("read MESSAGE <&$NODE_CHANNEL_FD")
  MESSAGE=`read -u $NODE_CHANNEL_FD`
  if [[ ! -z "$MESSAGE" ]]
  then
    echo "message received $MESSAGE"
  fi
  sleep 1
done
