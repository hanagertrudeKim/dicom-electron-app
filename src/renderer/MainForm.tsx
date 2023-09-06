import { Button, TextField } from '@mui/material';
import { useState } from 'react';
import './MainForm.css';

const defaultValues = {
  name: '',
  age: 0,
  sex: '',
  os: '',
  favoriteNumber: 0,
  address: '',
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
    window.electron.ipcRenderer.sendMessage(
      'icp-form-data',
      JSON.stringify(formValues)
    );

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
            id="name-input"
            name="name"
            label="Name"
            type="text"
            value={formValues.name}
            onChange={handleInputChange}
            className="input"
          />
          <TextField
            id="age-input"
            name="age"
            label="Age"
            type="text"
            value={formValues.age}
            onChange={handleInputChange}
            className="input"
          />
          <TextField
            id="sex-input"
            name="sex"
            label="Sex"
            type="text"
            value={formValues.sex}
            onChange={handleInputChange}
            className="input"
          />
          <TextField
            id="os-input"
            name="os"
            label="Os"
            type="text"
            value={formValues.os}
            onChange={handleInputChange}
            className="input"
          />
          <TextField
            id="favoriteNumber-input"
            name="favoriteNumber"
            label="favoriteNumber"
            type="text"
            value={formValues.favoriteNumber}
            onChange={handleInputChange}
            className="input"
          />
          <TextField
            id="address-input"
            name="address"
            label="address"
            type="text"
            value={formValues.address}
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
