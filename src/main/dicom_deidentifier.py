"""
Python script to de-identify DICOM images

Requirements
1) DICOM folder name should be SUBJ_CTDATE: ex) KU39009_20220921

Input
1) Raw DICOM folder path (can be a parent folder path of multiple DICOM folders)
2) destination folder path with -d option
3) ID Mapping csv path with -f option

Output
1) De-identified DICOM folder in given destination folder path

python ./dicom_deidentifier_retro.py ./KU39009_20220921 ./deid/KU39009_20220921
python ./dicom_deidentifier_retro.py /k/Scott_CT_Data/416192_190710/ -f ./Util/output/KU_ID_mapping.csv
"""
import os
import re
from os.path import dirname, basename
import argparse
import csv
from typing import List, Dict
from pathlib import Path
import pandas as pd
from pydicom import dcmread
from tqdm import tqdm
from loguru import logger

# Setup Parser
parser = argparse.ArgumentParser(description="De-Identifier")
parser.add_argument("src", metavar="src", type=str,
                    help="DICOM source folder path")
parser.add_argument(
    "-f", "--file", action="store", type=Path, help="CSV file including ID mapping"
)
parser.add_argument("-d", "--dst", action="store",
                    type=str, help="Deid folder path")
args = parser.parse_args()

# Declare input parameters
src_path = args.src
if src_path.endswith("/"):
    src_path = src_path[:-1]
dst_path = args.dst
csv_path = args.file


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


def get_subj_from_csv(path) -> Dict[str, str]:
    df = pd.read_csv(path)
    return {str(mrn): str(id) for mrn, id in zip(df.mrn.to_list(), df.id.to_list())}


def get_dir_depth(path, depth=0):
    if not os.path.isdir(path):
        return depth

    max_depth = depth
    for entry in os.listdir(path):
        dir_path = os.path.join(path, entry)
        max_depth = max(max_depth, get_dir_depth(dir_path, depth + 1))

    return max_depth


def run_batch_or_not(path, depth=0):
    for f in os.listdir(path):
        if f == "DICOM":
            if depth == 0:
                return False
            elif depth == 1:
                return True
            else:
                logger.error("Invalid src path")
                quit()
        else:
            if depth < 2:
                return run_batch_or_not(os.path.join(path, f), depth + 1)
            else:
                logger.error("Invalid src path")
                quit()


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


def prepare_deid_dcm_dir(src_dcm_dir, subj) -> str:
    dcm_dir_root = dirname(src_dcm_dir)
    deid_dcm_dir_material = basename(dcm_dir_root).split("_")
    deid_dcm_dir_material.insert(-1, "deid")
    deid_dcm_dir = ("_").join(deid_dcm_dir_material)
    deid_dcm_dir_path = os.path.join(dirname(dcm_dir_root), deid_dcm_dir)
    deid_dcm_child_dir = ("_").join(
        [subj, basename(src_dcm_dir).split("_")[1]])
    deid_dcm_dir_child_path = os.path.join(
        deid_dcm_dir_path, deid_dcm_child_dir)

    if not os.path.exists(deid_dcm_dir_path):
        os.mkdir(deid_dcm_dir_path)

    if not os.path.exists(deid_dcm_dir_child_path):
        os.mkdir(deid_dcm_dir_child_path)

    return deid_dcm_dir_child_path


def get_file_count(src_dcm_dir) -> int:
    if get_dir_depth(src_dcm_dir) > 1:
        logger.error(f"Check {src_dcm_dir} structure")
    else:
        file_count = 0
        for _, _, files in os.walk(src_dcm_dir):
            for file in files:
                file_count += 1
        return file_count


def analyze_dcm_series(dcm_paths, subj):
    series_metadata_dict = {}
    series_path_dict = {}
    for dcm_path in tqdm(dcm_paths, desc=" Analyzing series", position=1, leave=False):
        dcm = dcmread(dcm_path)
        try:
            series_uid = dcm.SeriesInstanceUID
        except:
            logger.error(f"{dcm_path} - No SeriesInstanceUID")
            return

        if series_uid not in series_metadata_dict:
            series_metadata_dict[series_uid] = {}
            series_metadata_dict[series_uid]["subj"] = subj
            try:
                series_metadata_dict[series_uid][
                    "study_description"
                ] = dcm.StudyDescription
            except:
                series_metadata_dict[series_uid]["study_description"] = ""
            try:
                series_metadata_dict[series_uid][
                    "series_description"
                ] = dcm.SeriesDescription
            except:
                series_metadata_dict[series_uid]["series_description"] = ""
            try:
                series_metadata_dict[series_uid]["slice_thickness"] = dcm.SliceThickness
            except:
                series_metadata_dict[series_uid]["slice_thickness"] = ""
            try:
                series_metadata_dict[series_uid]["ct_date"] = dcm.AcquisitionDate
            except:
                series_metadata_dict[series_uid]["ct_date"] = ""
            try:
                series_metadata_dict[series_uid]["patient_id"] = dcm.PatientID
            except:
                series_metadata_dict[series_uid]["patient_id"] = ""
            try:
                series_metadata_dict[series_uid]["patient_name"] = dcm.PatientName
            except:
                series_metadata_dict[series_uid]["patient_name"] = ""
            series_metadata_dict[series_uid]["number_of_slices"] = 1
            series_path_dict[series_uid] = [dcm_path]
        else:
            series_metadata_dict[series_uid]["number_of_slices"] += 1
            series_path_dict[series_uid].append(dcm_path)

    return series_metadata_dict, series_path_dict


def export_series_metadata_to_csv(series_metadata_dict: Dict, deid_dcm_dir: Path):
    with open(
        os.path.join(deid_dcm_dir, "dcm_metadata.csv"), "w", newline=""
    ) as csv_output:
        csv_columns = [
            "subj",
            "patient_id",
            "patient_name",
            "ct_date",
            "slice_thickness",
            "number_of_slices",
            "study_description",
            "series_description",
        ]
        writer = csv.DictWriter(csv_output, fieldnames=csv_columns)
        writer.writeheader()

        for series_uid in series_metadata_dict:
            writer.writerow(series_metadata_dict[series_uid])


def parse_series_description(series_description: str) -> str:
    series_description = series_description.lstrip()
    series_description = series_description.rstrip()
    series_description = series_description.replace(".", "P")
    series_description = re.sub("\W+", "_", series_description)
    return series_description


def run_deidentifier(src_path: Path):
    mrn_id_mapping = get_subj_from_csv(csv_path) if csv_path else {}
    subj = basename(src_path).split("_")[0]
    subj = mrn_id_mapping[subj] if mrn_id_mapping else subj

    if dst_path:
        deid_dcm_dir = Path(dst_path)
        if not os.path.exists(deid_dcm_dir):
            os.mkdir(deid_dcm_dir)
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


def run_deidentifier_batch(src_path):
    src_dcm_dirs = os.listdir(src_path)
    for src_dcm_dir in tqdm(src_dcm_dirs, desc=" Scans", position=0):
        run_deidentifier(os.path.join(src_path, src_dcm_dir))


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
        os.mkdir(deid_series_dir_path)

    # Overwrite PatientID, PatientName, Patient BirthDate
    dcm.PatientID = dcm.PatientName = subj
    dcm.PatientBirthDate = dcm.PatientBirthDate[:-4] + "0101"

    # Remove PHI, private tags
    for tag in TAGS_TO_ANONYMIZE:
        if tag in dcm:
            delattr(dcm, tag)
            dcm.remove_private_tags()

    deid_dcm_path = os.path.join(deid_series_dir_path, basename(dcm_path))
    dcm.save_as(deid_dcm_path)


if __name__ == "__main__":
    if run_batch_or_not(src_path):
        run_deidentifier_batch(src_path)
    else:
        run_deidentifier(src_path)
