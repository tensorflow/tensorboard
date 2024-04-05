
import * as Model from './model.js';
import * as Views from './view.js';
import * as Utils from './utils.js';

// Define your render function
export async function render() {


  try {
    // await loadD3();
    await Utils.createJSElement("d3.v7.min.js","d3");
    await Utils.createJSElement("apexchart.js","apexchart");

  } catch (error) {
    console.error('Failed to load D3.js:', error);
  }

  const previewContainer = document.createElement('div');
  previewContainer.classList.add('data-container');
  const runs = await Model.getRuns();
  const runSelector = Views.createRunSelector(runs);
  const updatePreviewBound = updatePreview.bind(
    null,
    runSelector,
    previewContainer
  );

  runSelector.onchange = updatePreviewBound;

  updatePreviewBound();

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = './static/style.css';
  document.body.appendChild(stylesheet);

  const stylesheet2 = document.createElement('link');
  stylesheet2.rel = 'stylesheet';
  stylesheet2.href = './static/collapse.css';
  document.body.appendChild(stylesheet2);

  // Heading
  const header = createElement('div', '');
  header.classList.add('navbar');
  const tab1 = createElement('button', 'PyTorch Model Calculations');
  const tab2 = createElement('button', 'System Performance');
  tab1.classList.add('nav-option');
  tab2.classList.add('nav-option');

// Adding click event listeners to both buttons
  tab1.addEventListener('click', function() {TorchCalculations(tab1,tab2)});
  tab2.addEventListener('click', function() {SystemCalculations(tab2,tab1)});

  header.appendChild(tab1);
  header.appendChild(tab2);

  //Body
  var mainContainer = createElement('div');
  mainContainer.classList.add('main-container');
  mainContainer.appendChild(header);


  // Where Graph is drawn and settled.
  var graphArea = createElement('div');
  graphArea.classList.add('graph-area');


  // Side toolbar div
  var sideToolbar = createElement('div');
  sideToolbar.classList.add('side-toolbar');

  //heading of toolbar div
  var toolbarTitle = createElement('h2', 'Settings');
  toolbarTitle.classList.add('toolbar-title');

 

  //Selector
  sideToolbar.appendChild(runSelector);
  graphArea.appendChild(previewContainer);

  mainContainer.appendChild(sideToolbar);
  mainContainer.appendChild(graphArea);

  document.body.appendChild(mainContainer);
}



function createElement(tag, children) {
  const result = document.createElement(tag);
  if (children != null) {
    if (typeof children === 'string') {
      result.textContent = children;
    } else if (Array.isArray(children)) {
      for (const child of children) {
        result.appendChild(child);
      }
    } else {
      result.appendChild(children);
    }
  }
  return result;
}


function applyStyles(element, styles) {
  for (var style in styles) {
    element.style[style] = styles[style];
  }
}


async function updatePreview(runSelector, container) {
  container.textContent = 'Loading...';
  console.log("update Preview")
  const requestedRun = runSelector.value;
  const tagsToScalars = await Model.getTagsToScalars(requestedRun);
  // console.log(tagsToScalars);
  const preview = Views.createPreviews(requestedRun,tagsToScalars);

  // Cancel the update if the UI has a different run selected.
  if (runSelector.value !== requestedRun) {
    return;
  }

  container.textContent = '';
  container.appendChild(preview);
}


  // Defining the function to be called when tab1 is clicked
  function TorchCalculations(tab,systemTab) {
    const element = document.getElementById('run-selector');
    element.value="calculate_states"
    tab.classList.add('active');
    systemTab.classList.remove('active');
    console.log('Tab 1 Clicked: Flop Calculation');
    element.dispatchEvent(new Event('change'));

  }
  
  // Defining the function to be called when tab2 is clicked
  function SystemCalculations(tab,torchTab) {
    const element = document.getElementById('run-selector');
    element.value="system_performance"
    tab.classList.add('active');
    torchTab.classList.remove('active');
    console.log('Tab 2 Clicked: System Performance');
    element.dispatchEvent(new Event('change'));

  }

