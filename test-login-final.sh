#!/bin/bash

curl -i -X POST https://mizan-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://mizan.work" \
  --data @- << 'EOF'
{"email":"anna@mizan.com","password":"MizanAdmin2024!"}
EOF
