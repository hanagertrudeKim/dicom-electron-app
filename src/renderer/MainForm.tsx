function MainForm() {
  const clickBtn = () => {
    window.electron.ipcRenderer.sendMessage('ipc-example', ['form-data']);

    window.electron.ipcRenderer.once('ipc-example', (arg) => {
      console.log('ipc-renderer:', arg);
    });
  };

  return (
    <div>
      <button type="button" onClick={clickBtn}>
        <span role="img" aria-label="folded hands">
          🙏
        </span>
        Donate
      </button>
    </div>
  );
}

export default MainForm;
