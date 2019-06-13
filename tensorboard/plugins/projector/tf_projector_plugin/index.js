export function render() {
  const style = document.createElement('style');
  style.innerText = `
html,
body {
  height: 100%;
  margin: 0;
  width: 100%;
}`;
  document.head.appendChild(style);

  const iframe = document.createElement('iframe');
  iframe.src = './projector_binary.html';
  Object.assign(iframe.style, {
    border: 0,
    height: '100%',
    width: '100%',
  });
  document.body.appendChild(iframe);
}
