from __future__ import print_function
from flask import Flask, request, jsonify
from dicom_deidentifier import run_batch_or_not, run_deidentifier_batch, run_deidentifier

app = Flask(__name__)


@app.route('/', methods=["GET"])
def hello():
    return "Server active!"


@app.route('/deidentifier', methods=['GET'])
def deidentify_dcm_folder():
    # Get the folder path from the query parameters
    src_path = request.args.get('path')
    run_deidentifier(src_path)


@app.route('/deidentifier/batch', methods=['GET'])
def deidentify_dcm_folders():
    # Get the folder path from the query parameters
    src_path = request.args.get('path')
    run_deidentifier_batch(src_path)


# :5000 is the flask default port.
# You can change it to something else if you would like.
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
