from __future__ import print_function
from flask import Flask, request, jsonify
from dicom_deidentifier import main

app = Flask(__name__)


@app.route('/', methods=["GET"])
def hello():
    return "<h1> here! <h1>"


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
