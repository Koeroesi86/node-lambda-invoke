<?php

/*$keepAlive = 15 * 60;

function _onShutdown() {
    echo "I am shutting down...\n";
}

register_shutdown_function('_onShutdown');

$keepUntil = time() + $keepAlive;
while (time() < $keepUntil) {}*/

$fp = stream_get_contents(fopen("php://stdin", "r"));
echo "[" . time() . "] " . $fp;
//print_r(json_decode($fp));
?>