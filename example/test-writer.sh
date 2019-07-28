#!/bin/bash

pipe=./testpipe

if [[ ! -p $pipe ]]; then
    echo "Reader not running"
    exit 1
fi

# echo "$(cat ./test-message.json)" > ./testpipe
# echo `<./test-message.json` > ./testpipe

if [[ "$1" ]]; then
    echo "$1" >$pipe
fi