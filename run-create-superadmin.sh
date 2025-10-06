#!/bin/bash

echo "🔐 Creating superadmin user via API..."
echo ""
echo "Calling: https://mizan-backend-production.up.railway.app/api/create-superadmin-temp"
echo ""

response=$(curl -s -X POST https://mizan-backend-production.up.railway.app/api/create-superadmin-temp)

echo "Response:"
echo "$response"
echo ""

if echo "$response" | grep -q "success.*true"; then
    echo "✅ SUCCESS! Superadmin user created/updated!"
    echo ""
    echo "You can now login at: https://mizan.work/login"
    echo "Email: anna@mizan.com"
    echo "Password: MizanAdmin2024!"
    echo ""
else
    echo "❌ Something went wrong. Check the response above."
fi
