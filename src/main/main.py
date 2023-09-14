import sys

if len(sys.argv) != 2:
    print("Usage: python your_python_script.py folder_path")
    sys.exit(1)

folder_path = sys.argv[1]

# 폴더 경로를 사용한 작업 수행
print(f"Selected folder path: {folder_path}")
