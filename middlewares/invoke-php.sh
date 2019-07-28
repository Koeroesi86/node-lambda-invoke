#!/bin/bash

while true; do
  MESSAGE=read -u $NODE_CHANNEL_FD
  if [[ "$MESSAGE" ]]; then
    echo " => message from parent process => $MESSAGE"
  fi
done

echo "Reader exiting"
