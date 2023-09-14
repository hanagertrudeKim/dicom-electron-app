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
// import CloudUploadIcon from '@mui/icons-material/CloudUpload';
// import * as S from './MainForm.styled';
import defaultValues from './model';

function MainForm() {
  const [formValues, setFormValues] = useState<
    defaultValues | Record<string, never>
  >({});
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

  // const handleFileUpload = (e: any) => {
  //   console.log(inputRef);
  //   setFormValues({
  //     ...formValues,
  //     [e.target.name]: inputRef?.current?.files,
  //   });
  // };

  function selectFolder() {
    console.log('실행');
    window.electron.ipcRenderer.sendMessage('ipc-dicom');
  }

  const clickBtn = (e: any) => {
    e.preventDefault();
    console.log(formValues);
    // main ipc로 form data 보내기
    window.electron.ipcRenderer.sendMessage(
      'ipc-dicom',
      JSON.stringify(formValues)
    );
    // main ipc에서 응답 받기
    window.electron.ipcRenderer.once('ipc-dicom', (arg) => {
      console.log('ipc-dicom-renderer:', arg);
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
          {/* <Button
            component="label"
            variant="contained"
            startIcon={<CloudUploadIcon />}
            href="#file-up`load"
            sx={{ marginBottom: '70px' }}
          >
            Upload dicom folder
            <S.VisuallyHiddenInput
              type="file"
              ref={inputRef}
              name="dicom"
              // accept=".sh,application/x-executable"
              onChange={handleFileUpload}
            />
          </Button> */}
          <div>{formValues?.dicom?.length} files uploaded</div>
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
