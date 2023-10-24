"""
Python script to de-identify DICOM images
"""
import sys
import os
current_directory = os.path.dirname(os.path.abspath(__file__))
packages_path = os.path.join(current_directory, "python","site-packages")
sys.path.append(packages_path)

import re
from os.path import dirname, basename, sep
import csv
from typing import List, Dict
from pathlib import Path
import pandas as pd
from pydicom import dcmread
from tqdm import tqdm
from loguru import logger
import uuid

# Setup Parser

dst_path = None
csv_path = None

# Tags
TAGS_TO_ANONYMIZE = [
    # "PatientBirthDate",
    "PatientSex",
    "PatientAge",
    "InstitutionName",
    "InstitutionAddress",
    "InstitutionalDepartmentName",
    "ReferringPhysicianName",
    "ReferringPhysicianTelephoneNumbers",
    "ReferringPhysicianAddress",
    "PhysiciansOfRecord",
    "OperatorsName",
    "IssuerOfPatientID",
    "OtherPatientIDs",
    "OtherPatientNames",
    "OtherPatientIDsSequence",
    "PatientBirthName",
    "PatientSize",
    "PatientWeight",
    "PatientAddress",
    "PatientMotherBirthName",
    "CountryOfResidence",
    "RegionOfResidence",
    "CurrentPatientLocation",
    "PatientTelephoneNumbers",
    "SmokingStatus",
    "PregnancyStatus",
    "PatientReligiousPreference",
    "RequestingPhysician",
    "PerformingPhysicianName",
    "NameOfPhysiciansReadingStudy",
    "MilitaryRank",
    "EthnicGroup",
    "AdditionalPatientHistory",
    "PatientComments",
    "PersonName",
    "ScheduledPatientInstitutionResidence",
]


# 주어진 CSV파일 읽어서 MRN (Medical Record Number), ID (Identifier)로 이루어진 딕셔너리를 생성하는 함수
def get_subj_from_csv(path) -> Dict[str, str]:
    df = pd.read_csv(path)
    return {str(mrn): str(id) for mrn, id in zip(df.mrn.to_list(), df.id.to_list())}


# 디렉토리의 깊이를 계산하는 함수
def get_dir_depth(path, depth=0):
    if not os.path.isdir(path):
        return depth

    max_depth = depth
    for entry in os.listdir(path):
        dir_path = os.path.join(path, entry)
        max_depth = max(max_depth, get_dir_depth(dir_path, depth + 1))

    return max_depth


# dicom이 적절한 디렉토리 위치에 있는지 검사하고 맞다면 true, 아니라면 error
def run_batch_or_not(path, depth=0):
    print('os.getcwd() : ', os.getcwd())
    os.chdir(path)
    if not os.path.isdir(path):
        print('not isdir')
        return False

    max_depth = depth
    for entry in os.listdir(path):
        dir_path = os.path.join(path, entry)
        if os.path.isdir(dir_path):
            max_depth = max(max_depth, run_batch_or_not(dir_path, depth + 1))

    return max_depth


# dicom파일의 경로를 추출하여 리스트화함 (zip 파일일 경우는 반환 x)
def get_dcm_paths_from_dcm_dir(src_dcm_dir: str) -> List[Path]:
    dcm_paths = []
    for base, _, files in os.walk(src_dcm_dir):
        for file in files:
            if not file.endswith(".zip"):
                # Centricity PACS
                # full_file_path = os.path.join(base, file)
                # if str(dirname(full_file_path)) == str(src_dcm_dir):
                # dcm_paths.append(full_file_path)
                # else:
                #     logger.error(
                #         "DCM file depth greater than 1. Check the original DCM folder."
                #     )
                #     return []

                # Sectra PACS
                # if file.startswith("EE"):
                #     dcm_paths.append(os.path.join(base, file))

                # General setting
                dcm_paths.append(os.path.join(base, file))
    return dcm_paths


# 입력값인 src_dcm_dir와 subj를 사용하여 De-identification 작업을 위한 디렉터리 구조를 생성하고, 생성된 디렉터리의 경로를 반환
def prepare_deid_dcm_dir(src_dcm_dir, subj) -> str:

    dcm_dir_root = dirname(src_dcm_dir)
    print("src_dcm_dir: ", src_dcm_dir)
    print("dcm_dir_root: ", dcm_dir_root)

    dcm_dir_array = dirname(dcm_dir_root).split(os.path.sep)
    home_dir = os.path.expanduser("~")
    new_dcm_dir_root = os.path.sep.join(dcm_dir_array)
    new_dcm_dir_root = os.path.join(home_dir, new_dcm_dir_root)
    print("new_dcm_dir_root : ", new_dcm_dir_root)

    deid_dcm_dir_material = basename(dcm_dir_root).split("_")
    deid_dcm_dir_material.insert(1, "deid")
    deid_dcm_dir = ("_").join(deid_dcm_dir_material)  # KU200_deid_343

    deid_dcm_dir_path = os.path.abspath(
        os.path.join(new_dcm_dir_root, deid_dcm_dir))
    print("deid_dcm_dir_path: ", deid_dcm_dir_path)

    deid_dcm_child_dir = ("_").join(
        [subj, basename(src_dcm_dir).split("_")[1]])
    deid_dcm_dir_child_path = os.path.join(
        deid_dcm_dir_path, deid_dcm_child_dir)
    print("deid_dcm_dir_child_path: ", deid_dcm_dir_child_path)

    print("dirname(deid_dcm_dir_path) 유무 : ",
          os.path.exists(dirname(deid_dcm_dir_path)))
    if not os.path.exists(deid_dcm_dir_path):
        os.makedirs(deid_dcm_dir_path, exist_ok=True)
        os.chmod(deid_dcm_dir_path, 0o777)
        # todo : 권한 제거 코드 추가

    if not os.path.exists(deid_dcm_dir_child_path):
        os.makedirs(deid_dcm_dir_child_path, exist_ok=True)
        os.chmod(deid_dcm_dir_child_path, 0o777)
        # os.system(f'chmod 777 {deid_dcm_dir_child_path}')

    return deid_dcm_dir_child_path


# 디렉토리안의 dicom파일 개수 세는 함수
def get_file_count(src_dcm_dir) -> int:
    if get_dir_depth(src_dcm_dir) > 1:  # 1이상의 중첩 디렉토리라면 종료
        logger.error(f"Check {src_dcm_dir} structure")
    else:
        file_count = 0
        for _, _, files in os.walk(src_dcm_dir):  # 아니라면 dicom파일 세기
            for file in files:
                file_count += 1
        return file_count


# dicom_path, subj를 입력받아 DICOM파일들을 분석 => 시리즈 메타데이터와 파일 경로를 추출하고, 딕셔너리로 반환
def analyze_dcm_series(dcm_paths, subj):
    series_metadata_dict = {}
    series_path_dict = {}
    for dcm_path in tqdm(dcm_paths, desc=" Analyzing series", position=1, leave=False):
        # default force = False
        dcm = dcmread(dcm_path, force=True)
        try:
            series_uid = dcm.SeriesInstanceUID
        except:
            logger.error(f"{dcm_path} - No SeriesInstanceUID")
            continue

        if series_uid not in series_metadata_dict:
            # Initialize the dictionary for this series_uid
            series_metadata_dict[series_uid] = {
                'subj': "",
                "ct_date": "",
                "MRN": "",
            }
            series_metadata_dict[series_uid]["subj"] = subj
            series_path_dict[series_uid] = [dcm_path]
        else:
            series_metadata_dict[series_uid]["subj"] = subj
            series_path_dict[series_uid].append(dcm_path)
            try:
                series_metadata_dict[series_uid]["ct_date"] = dcm.AcquisitionDate
            except:
                series_metadata_dict[series_uid]["ct_date"] = ""
            try:
                series_metadata_dict[series_uid]["MRN"] = dcm.PatientID
            except:
                series_metadata_dict[series_uid]["MRN"] = ""

    return series_metadata_dict, series_path_dict


# 위에 추출된 메타 데이터를 통하여 csv로 저장하는 함수
def export_series_metadata_to_csv(series_metadata_dict: Dict, deid_dcm_dir: Path):
    with open(
        os.path.join(deid_dcm_dir, "dcm_metadata.csv"), "w", newline=""
    ) as csv_output:
        csv_columns = [
            "subj",
            "MRN",
            "ct_date",
        ]
        writer = csv.DictWriter(csv_output, fieldnames=csv_columns)
        writer.writeheader()

        for series_uid in series_metadata_dict:
            writer.writerow(series_metadata_dict[series_uid])


# 시리즈의 descripttion 공백을 제거하는 등 문자열을 가공하고 변환
def parse_series_description(series_description: str) -> str:
    series_description = series_description.lstrip()
    series_description = series_description.rstrip()
    series_description = series_description.replace(".", "P")
    series_description = re.sub("\W+", "_", series_description)
    return series_description


# dicom파일 deidentifier을 수행하는 함수
def run_deidentifier(src_path: Path):
    print('src_path : ', src_path)
    mrn_id_mapping = get_subj_from_csv(csv_path) if csv_path else {}

    subj = str(uuid.uuid4())

    if dst_path:
        deid_dcm_dir = Path(dst_path)
        if not os.path.exists(deid_dcm_dir):
            os.makedirs(deid_dcm_dir, exist_ok=True)
    else:
        deid_dcm_dir = prepare_deid_dcm_dir(src_path, subj)

    series_metadata_dict, series_path_dict = analyze_dcm_series(
        get_dcm_paths_from_dcm_dir(src_path), subj
    )
    export_series_metadata_to_csv(series_metadata_dict, deid_dcm_dir)

    for series_uid in tqdm(series_path_dict, desc=" Series", position=1, leave=False):
        for dcm_path in tqdm(
            series_path_dict[series_uid], desc=" Slices", position=2, leave=False
        ):
            subj = series_metadata_dict[series_uid]["subj"]
            deidentify(dcm_path, deid_dcm_dir, subj)


# 다중 dicom 파일을 일괄 처리하는 함수?
def run_deidentifier_batch(src_path):
    src_dcm_dirs = os.listdir(src_path)
    for src_dcm_dir in tqdm(src_dcm_dirs, desc=" Scans", position=0):
        if src_dcm_dir.startswith('DCM'):
            run_deidentifier(os.path.join(src_path, src_dcm_dir))


# De-identification하는 함수
def deidentify(dcm_path: Path, deid_dcm_dir: Path, subj: str):
    dcm = dcmread(dcm_path)
    try:
        parsed_series_description = parse_series_description(
            dcm.SeriesDescription)
    except:
        print(f"No series description - {dcm_path}")
        parsed_series_description = "UNKNOWN"

    deid_series_dir = ("_").join(["DCM", subj, parsed_series_description])
    deid_series_dir_path = os.path.join(deid_dcm_dir, deid_series_dir)

    if not os.path.exists(deid_series_dir_path):
        os.makedirs(deid_series_dir_path, exist_ok=True)

    # Overwrite PatientID, PatientName, Patient BirthDate
    dcm.PatientID = subj
    # Modify PatientName to Subj_CTDate
    ct_date = dcm.AcquisitionDate
    dcm.PatientName = f"{subj}_{ct_date}"

    dcm.PatientBirthDate = dcm.PatientBirthDate[:-4] + "0101"

    # Remove PHI, private tags
    for tag in TAGS_TO_ANONYMIZE:
        if tag in dcm:
            delattr(dcm, tag)
            dcm.remove_private_tags()

    deid_dcm_path = os.path.join(deid_series_dir_path, basename(dcm_path))
    dcm.save_as(deid_dcm_path)


# main 함수로 실행
def main(src_path):
    if src_path.endswith("/"):
        src_path = src_path[:-1]
    if run_batch_or_not(src_path):
        print('run batch')
        run_deidentifier_batch(src_path)
        return "success"
    else:
        print('run deidentifier')
        run_deidentifier(src_path)
        # 작업이 성공하면 종료 코드 'success'을 반환
        return "success"

    # 작업이 실패하면 종료 코드 'error'을 반환
    return "error"

print(sys.argv[1])
if len(sys.argv) > 1:
    folderPath = sys.argv[1]
    main(folderPath)

# # 스크립트 직접 실행
# if __name__ == "__main__":
#     if run_batch_or_not(src_path):
#         run_deidentifier_batch(src_path)
#         sys.exit('success')
#     else:
#         run_deidentifier(src_path)
#         # 작업이 성공하면 종료 코드 'success'을 반환
#         sys.exit('success')

#     # 작업이 실패하면 종료 코드 'error'을 반환
#     sys.exit('error')
