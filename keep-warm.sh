#!/bin/bash
# Script to keep Render service warm by pinging it every 10 minutes

echo "Starting keep-warm service for Render backend..."
while true; do
    echo "$(date): Pinging backend to keep it warm..."
    curl -s https://youtube-rag-backend-5eik.onrender.com/ > /dev/null
    echo "$(date): Ping completed"
    sleep 600  # Wait 10 minutes
done
