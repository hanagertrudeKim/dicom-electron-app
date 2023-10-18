import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material';
import App from './App';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

root.render(
  <ThemeProvider theme={darkTheme}>
    <App />
  </ThemeProvider>
);
