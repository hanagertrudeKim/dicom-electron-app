import { Button, TextField } from '@mui/material';
import { useState } from 'react';
import './MainForm.css';

const defaultValues = {
  subj: '',
  patient_id: 0,
  patient_name: '',
  ct_date: 0,
  slice_thickness: '',
  number_of_slices: 0,
  study_description: '',
  series_description: '',
};

function MainForm() {
  const [formValues, setFormValues] = useState(defaultValues);

  const handleInputChange = (e: any) => {
    e.preventDefault();
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value,
    });
  };

  const clickBtn = (e: any) => {
    e.preventDefault();
    // main ipc로 form data 보내기
    window.electron.ipcRenderer.sendMessage(
      'icp-form-data',
      JSON.stringify(formValues)
    );
    // main ipc에서 응답 받기
    window.electron.ipcRenderer.once('icp-form-data', (arg) => {
      console.log('ipc-renderer:', arg);
    });
  };

  return (
    <div className="wrap">
      <div className="title">Form Example</div>
      <form onSubmit={clickBtn}>
        <div className="form">
          <TextField
            id="subject"
            name="subject"
            label="subject"
            type="text"
            value={formValues.subj}
            onChange={handleInputChange}
            className="input"
          />
          <TextField
            id="patient-id-input"
            name="patient-id"
            label="patient-id"
            type="number"
            value={formValues.patient_id}
            onChange={handleInputChange}
            className="input"
          />
          <TextField
            id="patient-name-input"
            name="patient-name"
            label="patient-name"
            type="text"
            value={formValues.patient_name}
            onChange={handleInputChange}
            className="input"
          />
          <TextField
            id="ct-date-input"
            name="ct-date"
            label="ct-date"
            type="number"
            value={formValues.ct_date}
            onChange={handleInputChange}
            className="input"
          />
          <TextField
            id="slice-thinkness-input"
            name="slice-thinkness"
            label="slice-thinkness"
            type="text"
            value={formValues.slice_thickness}
            onChange={handleInputChange}
            className="input"
          />
          <TextField
            id="number-of-slice-input"
            name="number-of-slice"
            label="number-of-slice"
            type="number"
            value={formValues.number_of_slices}
            onChange={handleInputChange}
            className="input"
          />
          <TextField
            id="study-description-input"
            name="study-description"
            label="study-description"
            type="text"
            value={formValues.study_description}
            onChange={handleInputChange}
            className="input"
          />
          <TextField
            id="series-description-input"
            name="series-description"
            label="series-description"
            type="text"
            value={formValues.series_description}
            onChange={handleInputChange}
            className="input"
          />
        </div>
        <div className="button">
          <Button variant="contained" color="primary" type="submit">
            Submit
          </Button>
        </div>
      </form>
    </div>
  );
}

export default MainForm;
