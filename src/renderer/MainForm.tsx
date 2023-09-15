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
import { useState } from 'react';
import FormValues from './model';

function MainForm() {
  const [formValues, setFormValues] = useState<
    FormValues | Record<string, never>
  >({});

  const handleInputChange = (e: any) => {
    e.preventDefault();
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value,
    });
  };

  const [filePath, setFilePath] = useState<string>();

  function selectFolder() {
    window.electron.ipcRenderer.sendMessage('ipc-dicom');
    // main ipc에서 응답 받기
    window.electron.ipcRenderer.on('ipc-dicom-reply', (arg: any) => {
      console.log('ipc-dicom-reply:', arg);
      setFilePath(arg);
    });
  }

  const clickBtn = (e: any) => {
    e.preventDefault();
    console.log(formValues);

    // main ipc로 form data 보내기
    window.electron.ipcRenderer.sendMessage(
      'ipc-form',
      JSON.stringify(formValues)
    );
    // main ipc에서 응답 받기
    window.electron.ipcRenderer.on('ipc-form-reply', (arg: any) => {
      console.log('ipc-form-reply:', arg);
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
          <Button onClick={() => selectFolder()}>Select Folder</Button>
          <div>{filePath}</div>
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
