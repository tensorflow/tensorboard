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


export function livechart(tagsToScalars){

  livechart = document.createElement('div');
  livechart.classList.add('container');

  const margin = { top: 20, right: 20, bottom: 30, left: 50 },
      width = 1400 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

// Append SVG object to the body
const svg = d3.select(livechart).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Initialize scale for x as a time scale
const xScale = d3.scaleTime().range([0, width]);
const yScale = d3.scaleLinear().range([height, 0]);

// Adjust the yScale domain for seconds (0 to 59)
yScale.domain([0, 59]);

// Define the line
const valueLine = d3.line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y));

// Get the start time
const startTime = new Date();

// Initialize data array
let data = [];

// Initial domain for scales; xScale will dynamically update
xScale.domain([startTime, new Date(startTime.getTime() + 1000)]);

// Create the line path element
const linePath = svg.append("path")
    .attr("class", "line")
    .attr("stroke", "blue")
    .attr("stroke-width", 2)
    .attr("fill", "none");

  svg.append("text")
  .attr("class","chart-title")
  .attr("x", margin.left- 115)
  .attr("y", margin.top - 100)
  .style("font-size", "24px")
  .style("font-weight", "bold")
  .style("font-family", "sans-serif")
  .text("Energy Usage");

// Add the X and Y Axis
const xAxis = svg.append("g")
    .attr("transform", `translate(0,${height})`);
const yAxis = svg.append("g")
    .call(d3.axisLeft(yScale)); // y-axis is static, we set it up here


// function updateChart() {
//     // Calculate elapsed time as x-value
//     const now = new Date();
//     const elapsed = new Date(now - startTime);

//     // Get the current second for y-value
//     const second = now.getSeconds();
    
//     // Add new data point
//     data.push({ x: now, y: second });

//     // Update xScale domain to include the new range
//     xScale.domain([startTime, now]);

//     // Update the line path and axes with a smooth transition
//     linePath
//         .datum(data)
//         .transition().duration(950) // slightly less than interval to smooth out transition
//         .attr("d", valueLine);

//     xAxis.transition().duration(950)
//         .call(d3.axisBottom(xScale));
// }
const displayDuration = 100 * 1000; // Display window in milliseconds (e.g., last 100 seconds)

// Define transition duration
const transitionDuration = 1000; // 1 second

function updateDataKeepOld() {
    // Assuming 'now' is the current time for the new data point
//     
  const newX = new Date(); // Example for adding a new timestamp
    const newY = Math.random() * 59; // Random value for demonstration
    data.push({ x: newX, y: newY });

    // Update the xScale domain
    const timeExtent = d3.extent(data, d => d.x);
    xScale.domain(timeExtent);

    // Update the line
    linePath.datum(data)
        .transition()
        .duration(transitionDuration)
        .attr("d", valueLine);

    // Update xAxis with new domain
    xAxis.transition().duration(transitionDuration)
        .call(d3.axisBottom(xScale));

    // Apply dynamic tick formatting
    formatTicksForTimeSpan();
  
  // formatTicksForTimeSpan();
}

// Periodically update the chart with new data
setInterval(updateDataKeepOld, 1000); // Update every 2 seconds for a more observable transition

function formatTicksForTimeSpan() {
    const domain = xScale.domain(); // Get the current domain of the xScale
    const span = domain[1] - domain[0]; // Calculate the span in milliseconds

    // Decide on the format based on the span
    let format;
    if (span > 86400000) { // More than 24 hours
        format = d3.timeFormat("%H:%M"); // Hours and minutes
    } else if (span > 3600000) { // More than 1 hour
        format = d3.timeFormat("%H:%M"); // Hours and minutes
    } else if (span > 60000) { // More than 1 minute
        format = d3.timeFormat("%M:%S"); // Minutes and seconds
    } else { // Less than 1 minute
        format = d3.timeFormat("%S.%L"); // Seconds and milliseconds
    }

    // Update the xAxis with the new format
    xAxis.call(d3.axisBottom(xScale).tickFormat(format));

  }

  return livechart;
}


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
      // console.log("run="+run);
      // if(run == "system_performance"){
        fragment.appendChild(livechart(tagsToScalars));
      // }
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
  var index = 1;

  // Utils.SimulateData(tagsToScalars);
  // Create each FAQ drawer and append to the container
  tagsToScalars.forEach((scalars, run) => {

    let [prefix_run, resource] = run.split("/");

    if (!uniqueArray.includes(prefix_run)) {

          uniqueArray.push(prefix_run);
          flag = true;
                    
    }else{
      flag = false;
    }

    if (flag) {
      const drawer = document.createElement('div');
      drawer.classList.add('faq-drawer');

      const input = document.createElement('input');
      input.id = "drawer_"+index;
      input.className = 'faq-drawer__trigger';
      input.type = 'checkbox';

      const label = document.createElement('label');
      label.className = 'faq-drawer__title';
      label.setAttribute('for', "drawer_"+index);
      label.textContent = prefix_run;

      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'faq-drawer__content-wrapper';
      contentWrapper.id =  "wrapper_"+index;

      const content = document.createElement('div');
      content.id = "wrapper_content_"+index;
      // uniqueDrawer.push(content);

      content.className = 'faq-drawer__content';
      content.innerHTML = prefix_run.content || '';
      index = index + 1;

      content.appendChild(cardformat(prefix_run,resource,scalars,index));
      contentWrapper.appendChild(content);
      drawer.appendChild(input);
      drawer.appendChild(label);
      drawer.appendChild(contentWrapper);
      uniqueDrawer.push(drawer);
    }
  });

  uniqueDrawer.forEach((drawer) => {
    container.appendChild(drawer);
  });

  index = 1;
  tagsToScalars.forEach((scalars, run) => {

    let [prefix_run, resource] = run.split("/");

    let title  = uniqueDrawer[index-1].querySelector('label');

    if(title == prefix_run){
      uniqueDrawer[index].appendChild(cardformat());
    }
    let drawer = document.getElementById("wrapper_content__"+index);
    


  });
  
  // uniqueDrawer.forEach((drawer) => {
    
  // });



  return container;
}

function cardformat(layer,tag,scalar,idx){
  
  // Create cards container
  const cardsContainer = createElement('div');
  cardsContainer.className = 'cards-container';
  cardsContainer.id = layer + "-" + tag;

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
// 
// for()

    const card = document.createElement('div');
    card.className = 'card';
    // card.appendChild(Utils.createLineChart(multiData));
    // card.appendChild(Utils.createZoomableLineChart (data));
    // card.appendChild(Utils.SmoothLineChart());
    // Utils.generateLineChart(scalar);
    card.appendChild(Utils.generateLineChart(layer,tag,scalar,idx));

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
  