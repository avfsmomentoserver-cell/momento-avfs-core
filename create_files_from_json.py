#!/usr/bin/env python3
import json
import os

def create_structure(data, base_path="."):
    for item in data:
        item_path = os.path.join(base_path, item['name'])
        
        if item['type'] == 'folder':
            os.makedirs(item_path, exist_ok=True)
            print(f"Created directory: {item_path}")
            
            if 'children' in item and item['children']:
                create_structure(item['children'], item_path)
        else:
            with open(item_path, 'w') as f:
                f.write("")  # Create empty file
            print(f"Created file: {item_path}")

if __name__ == "__main__":
    with open('momento_file_tree_data.json', 'r') as f:
        data = json.load(f)
    
    create_structure(data)
    print("File structure created successfully.")
