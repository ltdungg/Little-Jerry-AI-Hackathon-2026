#!/bin/bash
# Run this script after closing all node processes (VS Code, npm dev, etc.)
# Usage: bash scripts/rename-frontend.sh

cd "$(dirname "$0")/.."

if [ ! -d "frontend-reactjs" ]; then
  echo "frontend-reactjs/ not found — rename may have already been done."
  exit 0
fi

# Backup old Next.js frontend
if [ -d "frontend" ]; then
  echo "Backing up frontend/ → frontend-nextjs/"
  mv frontend frontend-nextjs
fi

# Promote React frontend
echo "Renaming frontend-reactjs/ → frontend/"
mv frontend-reactjs frontend

echo "Done! Frontend directory structure:"
ls -d frontend/ frontend-nextjs/ 2>/dev/null
