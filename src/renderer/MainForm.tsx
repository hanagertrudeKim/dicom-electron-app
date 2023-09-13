import {
  AppBar,
  Button,
  Container,
  CssBaseline,
  Grid,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import * as S from './MainForm.styled';
import defaultValues from './model';

function MainForm() {
  const [formValues, setFormValues] = useState<
    defaultValues | Record<string, never>
  >({});
  const [files, setFiles] = useState<FileList | null | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current !== null) {
      inputRef.current.setAttribute('directory', 'true');
      inputRef.current.setAttribute('webkitdirectory', 'true');
    }
  }, [inputRef]);

  const handleInputChange = (e: any) => {
    e.preventDefault();
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value,
    });
  };

  const handleFileUpload = () => {
    setFiles(inputRef?.current?.files);
    console.log(inputRef);
  };

  const clickBtn = (e: any) => {
    e.preventDefault();
    // console.log(formValues);
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
    <>
      <CssBaseline />
      <AppBar
        position="absolute"
        color="default"
        elevation={0}
        sx={{
          position: 'relative',
          borderBottom: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Toolbar>
          <Typography variant="h6" color="inherit" noWrap>
            DICOM Form
          </Typography>
        </Toolbar>
      </AppBar>
      <Container
        component="main"
        sx={{ my: { xs: 3, md: 6 }, p: { xs: 2, md: 3 }, width: '50vw' }}
      >
        <Typography
          component="h1"
          variant="h4"
          align="center"
          sx={{ 'margin-bottom': '120px' }}
        >
          Checkout
        </Typography>
        <form onSubmit={clickBtn}>
          <Button
            component="label"
            variant="contained"
            startIcon={<CloudUploadIcon />}
            href="#file-up`load"
            sx={{ marginBottom: '70px' }}
          >
            Upload dicom file
            <S.VisuallyHiddenInput
              type="file"
              ref={inputRef}
              // accept=".sh,application/x-executable"
              onChange={handleFileUpload}
            />
          </Button>
          <div>{files?.length} files uploaded</div>
          <Grid container spacing={7}>
            <Grid item xs={12}>
              <TextField
                required
                id="subj"
                name="subj"
                label="Subject"
                fullWidth
                variant="standard"
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                id="patient_name"
                name="patient_name"
                label="Patient Name"
                fullWidth
                variant="standard"
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                id="patient_id"
                name="patient_id"
                label="Patient Id"
                fullWidth
                variant="standard"
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="ct_date"
                name="ct_date"
                label="CT Date"
                fullWidth
                variant="standard"
                onChange={handleInputChange}
                type="date"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                id="slice_thickness"
                name="slice-_hickness"
                label="Slice Thickness"
                fullWidth
                variant="standard"
                onChange={handleInputChange}
                type="number"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                id="number_of_slices"
                name="number-_of_slices"
                label="Number Of Slices"
                fullWidth
                variant="standard"
                onChange={handleInputChange}
                type="number"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="study_description"
                name="study_description"
                label="Study Description"
                fullWidth
                variant="standard"
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="series_description"
                name="series_description"
                label="Series Description"
                fullWidth
                variant="standard"
                onChange={handleInputChange}
              />
            </Grid>
            <Button
              variant="contained"
              type="submit"
              sx={{
                mt: 3,
                ml: 1,
                display: 'absolute',
                marginLeft: 'auto',
                marginTop: '60px',
              }}
            >
              submit
            </Button>
          </Grid>
        </form>
      </Container>
    </>
  );
}

export default MainForm;
