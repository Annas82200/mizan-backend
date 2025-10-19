#!/bin/bash

# Fix all import paths in src/services
find src/services -name "*.ts" -type f | while read file; do
  # Replace '../../../db/index' with '../../../db/index'
  sed -i '' "s|from '\.\./\.\./\.\./db/index'|from '../../../db/index'|g" "$file"
  # Replace '../../db/index' with '../../db/index'
  sed -i '' "s|from '\.\./\.\./db/index'|from '../../db/index'|g" "$file"
  # Replace '../db/index' with '../db/index'
  sed -i '' "s|from '\.\./db/index'|from '../db/index'|g" "$file"
done

# Fix all import paths in src/routes
find src/routes -name "*.ts" -type f | while read file; do
  # Replace '../db/index' with '../../db/index'
  sed -i '' "s|from '\.\./db/index'|from '../../db/index'|g" "$file"
done

echo "Import paths fixed"
