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

export function createRunSelector(runs,class_name="run-selector") {
    /**
     * Build a component in this form:
     *   <select class="run-selector">
     *     <option value="${run}">${run}</option>
     *     ...
     *   </select>
     */
    const element = createElement('select', class_name);
    element.id="run-selector"
    for (const run of runs) {
      element.options.add(new Option(run, run));
    }
  
    return element;
  }

export function createPreviews(tagsToScalars) {
    const fragment = document.createDocumentFragment();
  
    if (!tagsToScalars.size) {
      const messageElement = createElement('h2');
      messageElement.textContent = 'No tags found.';
      fragment.appendChild(messageElement);
      return fragment;
    }
    else{
      let extra = createLayerDrawers(tagsToScalars);
      fragment.appendChild(extra);

      return fragment;
    }
}


function createDataSelector(scalars) {
  const Array = [];
  for (const scalar of scalars) {
    Array.push(scalar);
  }
  return createRunSelector(Array,"data-selector");

}

export function createLayerDrawers(tagsToScalars) {

  if (!tagsToScalars || tagsToScalars.length === 0) {
      console.error('No FAQ data provided.');
      alert('No FAQ data provided.');
      return null;
  }




  // Create the container div
  const container = document.createElement('div');
  container.className = 'container';

  let flag = false;
  let uniqueDrawer = [];
  let uniqueArray = [];

  let layer_map = [];
  // Create each FAQ drawer and append to the container
  tagsToScalars.forEach((scalars, run) => {

    let [prefix_run, tag] = run.split("/");

    if (!uniqueArray.includes(prefix_run)) {
          uniqueArray.push();
          flag = true;
          layer_map.push({prefix_run:[tag,scalars]});
                    
    }else{

    }

    // if (flag) {
      const drawer = document.createElement('div');
      drawer.classList.add('faq-drawer');

      const input = document.createElement('input');
      input.id = prefix_run+"_layer";
      input.className = 'faq-drawer__trigger';
      input.type = 'checkbox';

      const label = document.createElement('label');
      label.className = 'faq-drawer__title';
      label.setAttribute('for', prefix_run+"_layer");
      label.textContent = prefix_run + " " + tag;

      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'faq-drawer__content-wrapper';

      const content = document.createElement('div');
      content.id = prefix_run+"_content";
      uniqueDrawer.push(content);

      content.className = 'faq-drawer__content';
      content.innerHTML = prefix_run.content || '';
      content.appendChild(cardformat(prefix_run,tag,scalars));

      contentWrapper.appendChild(content);
      drawer.appendChild(input);
      drawer.appendChild(label);

      drawer.appendChild(contentWrapper);

      container.appendChild(drawer);
  });

  return container;
}

function cardformat(layer,tag,scalar){
  
  // Create cards container
  const cardsContainer = createElement('div');
  cardsContainer.className = 'cards-container';
  cardsContainer.id = layer + "-" + tag;
  console.log(scalar);

  const data = [
    { date: new Date('2020-01-01'), value: 10 },
    { date: new Date('2020-01-02'), value: 12 },
    { date: new Date('2020-01-03'), value: 13 },
    { date: new Date('2020-01-04'), value: 15 },
    { date: new Date('2020-01-05'), value: 17 },
    { date: new Date('2020-01-06'), value: 18 },
    { date: new Date('2020-01-07'), value: 20 },
    { date: new Date('2020-01-08'), value: 22 },
    { date: new Date('2020-01-09'), value: 23 },
    { date: new Date('2020-01-10'), value: 25 },
    { date: new Date('2020-01-11'), value: 15 }, // Jump of 5
    { date: new Date('2020-01-12'), value: 24 },
    { date: new Date('2020-01-13'), value: 30 },
    { date: new Date('2020-01-14'), value: 34 },
    { date: new Date('2020-01-15'), value: 36 },
    { date: new Date('2020-01-16'), value: 20 },
    { date: new Date('2020-01-17'), value: 26 },
    { date: new Date('2020-01-18'), value: 41 },
    { date: new Date('2020-01-19'), value: 42 },
    { date: new Date('2020-01-20'), value: 44 },
    { date: new Date('2020-01-21'), value: 10 },
    { date: new Date('2020-01-22'), value: 12 },
    { date: new Date('2020-01-24'), value: 13 },
    { date: new Date('2020-01-25'), value: 15 },
    { date: new Date('2020-01-26'), value: 17 },
    { date: new Date('2020-01-27'), value: 18 },
    { date: new Date('2020-01-28'), value: 20 },
    { date: new Date('2020-01-29'), value: 22 },
    { date: new Date('2020-01-30'), value: 23 },
    { date: new Date('2020-01-31'), value: 25 },
    { date: new Date('2020-02-01'), value: 15 }, // Jump of 5
    { date: new Date('2020-02-02'), value: 24 },
    { date: new Date('2020-02-03'), value: 30 },
    { date: new Date('2020-02-04'), value: 34 },
    { date: new Date('2020-02-05'), value: 36 },
    { date: new Date('2020-02-06'), value: 20 },
    { date: new Date('2020-02-07'), value: 26 },
    { date: new Date('2020-02-08'), value: 41 },
    { date: new Date('2020-02-09'), value: 42 },
    { date: new Date('2020-02-10'), value: 44 },
    { date: new Date('2020-02-11'), value: 10 },
    { date: new Date('2020-02-12'), value: 12 },
    { date: new Date('2020-02-13'), value: 13 },
    { date: new Date('2020-02-14'), value: 15 },
];

const simplifiedData = [
  { date: "2013-04-28", value: 135.98 },
  { date: "2013-05-01", value: 139.89 },
  { date: "2013-06-01", value: 129.78 },
  { date: "2013-07-01", value: 97.66 },
  { date: "2013-08-01", value: 108 },
  { date: "2013-09-01", value: 145.81 },
  { date: "2013-10-01", value: 134.63 },
  { date: "2013-11-01", value: 206.65 },
  { date: "2013-12-01", value: 1133.08 },
  { date: "2014-01-01", value: 775.35 },
  // Continue for each month...
  { date: "2017-11-01", value: 6767.31 },
  { date: "2017-12-01", value: 11046.7 },
  { date: "2018-01-01", value: 14112.2 },
  { date: "2018-02-01", value: 10288.8 },
  { date: "2018-03-01", value: 11052.3 },
  { date: "2018-04-01", value: 7060.95 }
];

console.log(scalar)

// for()

    const card = document.createElement('div');
    card.className = 'card';
    // card.appendChild(Utils.createLineChart(multiData));
    // card.appendChild(Utils.createZoomableLineChart (data));
    // card.appendChild(Utils.SmoothLineChart());
    console.log(scalar);
    card.appendChild(Utils.generateLineChart(scalar));

    // Example usage
    // Utils.createD3Chart({
    //   svgWidth: 600,
    //   svgHeight: 400,
    //   margin: { top: 20, right: 20, bottom: 70, left: 40 },
    //   chartTitleDim: 30,
    //   xTitleDim: 20,
    //   xAxisDim: 20,
    //   navChartDim: 70,
    //   border: true,
    //   xTitle: "Time",
    //   yTitle: "Energy Usage",
    //   chartTitle: "Resource Monitoring",
    //   xDomain: [new Date(2020, 0, 1), new Date(2020, 11, 31)],
    //   navXDomain: [new Date(2020, 0, 1), new Date(2020, 11, 31)],
    //   yDomain: ['A', 'B', 'C', 'D'],
    //   tickFormat: d3.timeFormat("%b"),
    // });

    // Create a new div element
    var chartContainer = document.createElement('div');
    chartContainer.id = 'chartContainer'; // Assign an ID or class for selection

    // Append the new div to the body or another container element
    document.body.appendChild(chartContainer); // Append to body or any specific container

    return card;

  // Append the cards container to the body or any specific element
  mainContainer.appendChild(cardsContainer);
}


function createElement(tag, className) {
    const result = document.createElement(tag);
    if (className) {
      result.className = className;
    }
    return result;
  }
  