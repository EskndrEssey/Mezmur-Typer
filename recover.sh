#!/bin/bash
cd ~/mezmur-bot/Mezmur-Typer

# Get all commit hashes for Mera.json
commits=$(git log --format="%H" -- data/Mera.json)

echo "["
first=true
seen_ids=""

for commit in $commits; do
  # Get the Mera.json at this commit
  content=$(git show "$commit:data/Mera.json" 2>/dev/null)
  if [ -z "$content" ]; then continue; fi
  
  # Extract each hymn id and check for duplicates
  ids=$(echo "$content" | python3 -c "
import json,sys
try:
  data = json.load(sys.stdin)
  if isinstance(data, list):
    for h in data:
      print(h.get('id',''))
  elif isinstance(data, dict):
    print(data.get('id',''))
except: pass
")
  
  for id in $ids; do
    if [[ ! " $seen_ids " =~ " $id " ]]; then
      seen_ids="$seen_ids $id"
      hymn=$(echo "$content" | python3 -c "
import json,sys
try:
  data = json.load(sys.stdin)
  if isinstance(data, list):
    for h in data:
      if h.get('id') == '$id':
        print(json.dumps(h, ensure_ascii=False, indent=2))
  elif isinstance(data, dict) and data.get('id') == '$id':
    print(json.dumps(data, ensure_ascii=False, indent=2))
except: pass
")
      if [ -n "$hymn" ]; then
        if [ "$first" = true ]; then
          echo "$hymn"
          first=false
        else
          echo ",$hymn"
        fi
      fi
    fi
  done
done

echo "]"
