from flask import Flask, render_template, request, jsonify
from dicom_deidentifier import main
import zipfile
import os

app = Flask(__name__)


@app.route("/")
def index():
    return render_template('./index.html')


@app.route('/upload', methods=['POST'])
def upload_folder():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'})

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'})

    # 압축 파일을 저장하고 압축 해제
    file.save('static/dicom')  # 압축 파일 저장 경로
    with zipfile.ZipFile('path/to/save/directory/folder.zip', 'r') as zip_ref:
        zip_ref.extractall('static/dicom')  # 압축 해제 경로

    return jsonify({'message': 'Folder successfully uploaded and extracted'})


@app.route('/deidentify', methods=['POST'])
def deidentify_dcm_folder():
    # Get the folder path from the query parameters
    src_path = request.json.get('path')
    result = main(src_path)
    return jsonify(result)


@app.route('/deidentify/batch', methods=['POST'])
def deidentify_dcm_folders():
    # Get the folder path from the query parameters
    src_path = request.json.get('path')
    result = main(src_path)
    return jsonify(result)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
