#!/bin/bash

curl -X POST https://mizan-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"anna@mizan.com\",\"password\":\"MizanAdmin2024!\"}" \
  -v
