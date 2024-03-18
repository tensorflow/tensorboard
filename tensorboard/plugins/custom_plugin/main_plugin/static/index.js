
import * as Model from './model.js';
import * as Views from './view.js';
import * as Utils from './utils.js';

const aapl = [
  {date: new Date('2007-04-23'), close: 10.24},
  {date: new Date('2007-04-24'), close: 20.35},
  {date: new Date('2007-04-25'), close: 30.84},
  {date: new Date('2007-04-26'), close: 40.92},
  {date: new Date('2007-04-29'), close: 50.8},
  {date: new Date('2007-05-01'), close: 60.47},
  {date: new Date('2007-05-02'), close: 70.39},
  {date: new Date('2007-05-03'), close: 80.4},
  {date: new Date('2007-05-04'), close: 90.81},
  {date: new Date('2007-05-07'), close: 10.92},
  {date: new Date('2007-05-08'), close: 11.06},
  {date: new Date('2007-05-09'), close: 12.88},
  // Add more objects as needed
];

const aapl2 = [
  {date: new Date('2007-04-23'), close: 5.24},
  {date: new Date('2007-04-24'), close: 45.35},
  {date: new Date('2007-04-25'), close: 30.84},
  {date: new Date('2007-04-26'), close: 50.92},
  {date: new Date('2007-04-29'), close: 60.8},
  {date: new Date('2007-05-01'), close: 70.47},
  {date: new Date('2007-05-02'), close: 20.39},
  {date: new Date('2007-05-03'), close: 80.4},
  {date: new Date('2007-05-04'), close: 10.81},
  {date: new Date('2007-05-07'), close: 20.92},
  {date: new Date('2007-05-08'), close: 21.06},
  {date: new Date('2007-05-09'), close: 22.88}
  // Add more objects as needed
];

const multiData = [aapl,aapl2]



// Define your render function
export async function render() {


  try {
    // await loadD3();
    await Utils.createJSElement("d3.v7.min.js","d3");

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

  // Heading
  const header = createElement('div', '');
  header.classList.add('navbar');
  const tab1 = createElement('button', 'Flop Calculation');
  const tab2 = createElement('button', 'System Performance');
  tab1.classList.add('nav-option');
  tab2.classList.add('nav-option');
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

  /* Graph settings like width Height */
  var widthInput = createElement('input');
  widthInput.type = 'number';
  widthInput.placeholder = 'Width';
  widthInput.addEventListener('input', updateGraph);

  var heightInput = createElement('input');
  heightInput.type = 'number';
  heightInput.placeholder = 'Height';
  heightInput.addEventListener('input', updateGraph);

  var applyButton = createElement('button', 'Apply');
  applyButton.addEventListener('click', updateGraph);

  sideToolbar.appendChild(toolbarTitle);
  sideToolbar.appendChild(widthInput);
  sideToolbar.appendChild(heightInput);
  sideToolbar.appendChild(applyButton);

  //Selector
  sideToolbar.appendChild(runSelector);
  graphArea.appendChild(previewContainer);

// =========================================

  // graphArea.appendChild(Utils.createScaleLinear(aapl));
  // graphArea.appendChild(Utils.createLineChart(multiData));


  mainContainer.appendChild(sideToolbar);
  mainContainer.appendChild(graphArea);
  
  cardformat(graphArea);

  document.body.appendChild(mainContainer);
}

function cardformat(mainContainer){
  
    // Create cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cards-container';

    // Define the number of cards you want
    const numberOfCards = 3;

    // Create and append cards to the cards container
    for (let i = 1; i <= numberOfCards; i++) {
      const card = document.createElement('div');
      card.className = 'card';
      card.appendChild(Utils.createLineChart(multiData));
      cardsContainer.appendChild(card);
    }

    // Append the cards container to the body or any specific element
    mainContainer.appendChild(cardsContainer);
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
  console.log(tagsToScalars);
  const preview = Views.createPreviews(tagsToScalars);

  // Cancel the update if the UI has a different run selected.
  if (runSelector.value !== requestedRun) {
    return;
  }
  container.textContent = '';
  container.appendChild(preview);
}

function updateGraph() {
  const width = parseInt(document.querySelector('.width-height-options input:nth-child(1)').value);
  const height = parseInt(document.querySelector('.width-height-options input:nth-child(2)').value);
  
  // Get the existing graph container
  const graphContainer = document.querySelector('.graph');
  
  // Remove the existing graph
  graphContainer.innerHTML = '';
  
  // Create the new graph with updated width and height
  const newGraph = createLineChart(width, height);
  
  // Append the new graph to the container
  graphContainer.appendChild(newGraph);
}



