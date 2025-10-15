#!/bin/bash

# Fix import paths in backend files
echo "Fixing import paths in backend..."

# Fix db imports in routes
find src/routes -name "*.ts" -exec sed -i '' 's|from "./db/|from "../db/|g' {} \;
find src/routes -name "*.ts" -exec sed -i '' 's|from '\''./db/|from '\''../db/|g' {} \;

# Fix db imports in services
find src/services -name "*.ts" -exec sed -i '' 's|from '\''../../../db/|from '\''../../db/|g' {} \;
find src/services -name "*.ts" -exec sed -i '' 's|from '\''../../../../db/|from '\''../../../db/|g' {} \;
find src/services -name "*.ts" -exec sed -i '' 's|from '\''../../../../../db/|from '\''../../../../db/|g' {} \;

# Fix middleware imports
find src/middleware -name "*.ts" -exec sed -i '' 's|from '\''../../db/|from '\''../db/|g' {} \;

# Fix utils imports  
find src/utils -name "*.ts" -exec sed -i '' 's|from '\''../../db/|from '\''../db/|g' {} \;

# Fix types imports
find src/types -name "*.ts" -exec sed -i '' 's|from '\''../../db/|from '\''../db/|g' {} \;

echo "Import paths fixed!"
