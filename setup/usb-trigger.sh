#!/bin/bash
DEVICE=$1
LOGfile="/tmp/usb-automator.log"

# Absolute paths are required for Systemd
LSBLK="/usr/bin/lsblk"
CURL="/usr/bin/curl"
DATE="/usr/bin/date"

# Try Udev ENV first, fallback to lsblk
UUID=$ID_FS_UUID
if [ -z "$UUID" ]; then
    sleep 1
    UUID=$($LSBLK -no UUID /dev/$DEVICE | head -n 1)
fi

# Log execution
echo "--------------------------------" >> $LOGfile
$DATE >> $LOGfile
echo "Device: $DEVICE | UUID: $UUID" >> $LOGfile

if [ -n "$UUID" ]; then
    echo ">> Sending to Docker..." >> $LOGfile
    # Send Webhook to Docker App
    HTTP_CODE=$($CURL -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/trigger \
         -H "Content-Type: application/json" \
         -d "{\"device\": \"$DEVICE\", \"uuid\": \"$UUID\"}" \
         --max-time 5)
    echo ">> Response: $HTTP_CODE" >> $LOGfile
else
    echo ">> Ignored: No UUID" >> $LOGfile
fi
