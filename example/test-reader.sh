#!/bin/bash

pipe=./testpipe

trap "rm -f $pipe" EXIT

if [[ ! -p $pipe ]]; then
    mkfifo $pipe
fi

while true
do
    if read line <$pipe; then
        if [[ "$line" == 'quit' ]]; then
            break
        fi
        echo $line | php ./test.php
    fi
    MESSAGE=read -u $NODE_CHANNEL_FD
    echo " => message from parent process => $MESSAGE"
done

echo "Reader exiting"
