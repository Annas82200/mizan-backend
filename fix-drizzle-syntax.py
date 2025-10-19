#!/usr/bin/env python3
"""
Script to fix all db.query.* syntax to proper Drizzle ORM syntax
Complies with AGENT_CONTEXT_ULTIMATE.md requirements
"""

import re
import sys
from pathlib import Path

def fix_drizzle_syntax(content):
    """Fix db.query.*.findFirst() and db.query.*.findMany() syntax"""
    
    # Pattern 1: db.query.TABLE.findFirst({ where: eq(...) })
    # Replace with: db.select().from(TABLE).where(eq(...)).limit(1)
    pattern1 = r'db\.query\.(\w+)\.findFirst\(\{\s*where:\s*([^}]+)\s*\}\)'
    replacement1 = r'db.select().from(\1).where(\2).limit(1)'
    content = re.sub(pattern1, replacement1, content)
    
    # Pattern 2: db.query.TABLE.findFirst({ where: and(...) })
    pattern2 = r'db\.query\.(\w+)\.findFirst\(\{\s*where:\s*(and\([^)]+\))\s*\}\)'
    replacement2 = r'db.select().from(\1).where(\2).limit(1)'
    content = re.sub(pattern2, replacement2, content)
    
    # Pattern 3: db.query.TABLE.findMany({ where: eq(...) })
    pattern3 = r'db\.query\.(\w+)\.findMany\(\{\s*where:\s*([^,}]+)(?:,\s*orderBy:[^}]*)?(?:,\s*limit:[^}]*)?\s*\}\)'
    replacement3 = r'db.select().from(\1).where(\2)'
    content = re.sub(pattern3, replacement3, content)
    
    # Pattern 4: db.query.TABLE.findMany({ where: eq(...), orderBy: [...] })
    pattern4 = r'db\.query\.(\w+)\.findMany\(\{\s*where:\s*([^,}]+),\s*orderBy:\s*\[([^\]]+)\](?:,\s*limit:\s*(\d+))?\s*\}\)'
    def replacement4(match):
        table, where, orderby, limit = match.groups()
        result = f'db.select().from({table}).where({where}).orderBy({orderby})'
        if limit:
            result += f'.limit({limit})'
        return result
    content = re.sub(pattern4, replacement4, content)
    
    # Pattern 5: Simple db.query.TABLE.findMany() without where clause
    pattern5 = r'db\.query\.(\w+)\.findMany\(\)'
    replacement5 = r'db.select().from(\1)'
    content = re.sub(pattern5, replacement5, content)
    
    return content

def process_file(file_path):
    """Process a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        fixed_content = fix_drizzle_syntax(content)
        
        if original_content != fixed_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}", file=sys.stderr)
        return False

def main():
    # List of files to process
    files_to_process = [
        'src/middleware/tenant.ts',
        'src/routes/consulting.ts',
        'src/routes/orchestrator.ts',
        'src/routes/upload.ts',
        'src/services/social-media/scheduler.ts',
        'src/services/stripe.ts',
        'src/services/results/trigger-engine.ts',
        'src/services/workflow/automated-flow.ts',
        'src/services/modules/lxp/lxp-module.ts',
        'src/services/modules/hiring/hiring-module.ts',
        'src/services/orchestrator/architect-ai.ts',
        'src/services/stripe-service.ts',
    ]
    
    fixed_count = 0
    for file_path in files_to_process:
        full_path = Path(file_path)
        if full_path.exists():
            if process_file(full_path):
                print(f"✅ Fixed: {file_path}")
                fixed_count += 1
            else:
                print(f"⏭️  No changes: {file_path}")
        else:
            print(f"❌ Not found: {file_path}")
    
    print(f"\n🎉 Fixed {fixed_count} files")

if __name__ == '__main__':
    main()

