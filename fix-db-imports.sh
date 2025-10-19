#!/bin/bash

echo "Fixing database import paths..."

# Fix files in src/services/agents/*/  (4 levels deep)
for file in src/services/agents/culture/culture-agent.ts \
           src/services/agents/hiring/hiring-agent.ts \
           src/services/agents/lxp/lxp-agent.ts \
           src/services/agents/performance/performance-agent.ts \
           src/services/agents/skills/skills-agent.ts \
           src/services/agents/structure/structure-agent.ts \
           src/services/agents/talent/talent-agent.ts; do
  if [ -f "$file" ]; then
    echo "Fixing $file (4 levels deep)"
    sed -i '' "s|from '\.\./\.\./\.\./db/index'|from '../../../../db/index'|g" "$file"
    sed -i '' "s|from '\.\./\.\./\.\./db/schema|from '../../../../db/schema|g" "$file"
  fi
done

# Fix files in src/services/agents/ (3 levels deep)
for file in src/services/agents/structure-agent.ts \
           src/services/agents/agent-manager.ts; do
  if [ -f "$file" ]; then
    echo "Fixing $file (3 levels deep)"
    sed -i '' "s|from '\.\./\.\./db/index'|from '../../../db/index'|g" "$file"
    sed -i '' "s|from '\.\./\.\./db/schema|from '../../../db/schema|g" "$file"
  fi
done

# Fix files in src/services/modules/*/*  (5 levels deep)
file="src/services/modules/hiring/core/culture-fit-assessor.ts"
if [ -f "$file" ]; then
  echo "Fixing $file (5 levels deep)"
  sed -i '' "s|from '\.\./\.\./\.\./\.\./db/index'|from '../../../../../db/index'|g" "$file"
  sed -i '' "s|from '\.\./\.\./\.\./db/index'|from '../../../../../db/index'|g" "$file"
fi

# Fix files in src/services/modules/*/ (4 levels deep)
for file in src/services/modules/hiring/hiring-module.ts \
           src/services/modules/lxp/lxp-module.ts; do
  if [ -f "$file" ]; then
    echo "Fixing $file (4 levels deep)"
    sed -i '' "s|from '\.\./\.\./\.\./db/index'|from '../../../../db/index'|g" "$file"
    sed -i '' "s|from '\.\./\.\./\.\./db/schema|from '../../../../db/schema|g" "$file"
  fi
done

# Fix files in src/services/*/ (3 levels deep)
for file in src/services/monitoring/health-check.ts \
           src/services/orchestrator/architect-ai.ts \
           src/services/results/trigger-engine.ts \
           src/services/social-media/scheduler.ts \
           src/services/workflow/automated-flow.ts; do
  if [ -f "$file" ]; then
    echo "Fixing $file (3 levels deep)"
    sed -i '' "s|from '\.\./\.\./db/index'|from '../../../db/index'|g" "$file"
    sed -i '' "s|from '\.\./\.\./db/schema|from '../../../db/schema|g" "$file"
  fi
done

# Fix src/routes/upload.ts (2 levels deep)
file="src/routes/upload.ts"
if [ -f "$file" ]; then
  echo "Fixing $file (2 levels deep)"
  sed -i '' "s|from '\.\./db/index'|from '../../db/index'|g" "$file"
  sed -i '' "s|from '\.\./db/schema|from '../../db/schema|g" "$file"
fi

echo "Import paths fixed!"