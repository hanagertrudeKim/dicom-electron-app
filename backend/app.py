from flask import Flask, render_template, request, jsonify
from dicom_deidentifier import main

app = Flask(__name__)


@app.route("/")
def index():
    return render_template('./index.html')


@app.route('/upload', methods=['POST'])
def upload_folder():
    if 'folder' not in request.files:
        return jsonify({'error': 'No folder part'})

    folder = request.files['folder']

    if folder.filename == '':
        return jsonify({'error': 'No selected folder'})

    # 폴더 저장
    folder.save('static/dicom')  # 저장할 폴더 경로

    return jsonify({'message': 'Dicom Folder successfully uploaded'})


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
