<?php
$channel = getenv('NODE_CHANNEL_FD');
echo "channel $channel";

$run = true;
while (true) {
    $filename = "php://fd/$channel";
    if (!file_exists($filename)) {
        echo "not exists $channel";
        exit(0);
    }
    $size = filesize($filename);
    if ($size == 0) continue;

    $handle = fopen($filename, 'r');
    $result = fread($handle, $size);
    echo ">> $result";
//    if ($result != '') {
//        echo "message $result";
//    }
}
