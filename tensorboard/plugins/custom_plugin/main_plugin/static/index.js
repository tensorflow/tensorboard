
import * as Model from './model.js';
import * as Views from './view.js';


// Define your render function
export async function render() {


 const previewContainer = document.createElement('div');
  const runs = await Model.getRuns();
  const runSelector = Views.createRunSelector(runs);
  const updatePreviewBound = updatePreview.bind(
    null,
    runSelector,
    previewContainer
  );

  runSelector.onchange = updatePreviewBound;

  updatePreviewBound();


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

  try {
    // await loadD3();
    await createJSElement("d3.v7.min.js","d3");

  } catch (error) {
    console.error('Failed to load D3.js:', error);
  }

  try {
    // await loadD3();
    await createJSElement("jspdf.umd.min.js","converter");

  } catch (error) {
    console.error('Failed to load D3.js:', error);
  }

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = './static/style.css';
  document.body.appendChild(stylesheet);

  // Heading
  const msg = createElement('h1', 'BERT- Custom Plugin');
  document.body.appendChild(msg);

  //Body
  var mainContainer = createElement('div');
  mainContainer.classList.add('main-container');

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
  sideToolbar.appendChild(previewContainer);

// =========================================

  graphArea.appendChild(createScaleLinear(aapl));
  graphArea.appendChild(createLineChart(multiData));

  document.body.appendChild(sideToolbar);
  document.body.appendChild(graphArea);
  graphArea.onclick = convertSvgToImage;

  mainContainer.appendChild(sideToolbar);
  mainContainer.appendChild(graphArea);
  graphArea.onclick = generatePDF;

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

function createScaleLinear(
  data,
  width = 600,
  height = 400,
  marginTop = 20,
  marginRight = 30,
  marginBottom = 30,
  marginLeft = 40
) {
  var container = createElement('div');
  container.classList.add('graph');
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

  // Declare the x (horizontal position) scale.
  const x = d3.scaleUtc(
    d3.extent(aapl, (d) => d.date),
    [marginLeft, width - marginRight]
  );

  // Declare the y (vertical position) scale.
  const y = d3.scaleLinear(
    [0, d3.max(aapl, (d) => d.close)],
    [height - marginBottom, marginTop]
  );

  // Declare the area generator.
  const area = d3
    .area()
    .x((d) => x(d.date))
    .y0(y(0))
    .y1((d) => y(d.close));

  // Create the SVG container.
  const svg = d3
    .create('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .attr('style', 'max-width: 100%; height: auto;');

  // Append a path for the area (under the axes).
  svg.append('path').attr('fill', 'steelblue').attr('d', area(aapl));

  // Add the x-axis.
  svg
    .append('g')
    .attr('transform', `translate(0,${height - marginBottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(width / 80)
        .tickSizeOuter(0)
    );

  // Add the y-axis, remove the domain line, add grid lines and a label.
  svg
    .append('g')
    .attr('transform', `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y).ticks(height / 40))
    .call((g) => g.select('.domain').remove())
    .call((g) =>
      g
        .selectAll('.tick line')
        .clone()
        .attr('x2', width - marginLeft - marginRight)
        .attr('stroke-opacity', 0.1)
    )
    .call(
      (g) =>
        g
          .append('text')
          .attr('x', -marginLeft)
          .attr('y', 10)
          .attr('fill', 'currentColor')
          .attr('text-anchor', 'start')
          .text('↑ Daily close ($)')
          .transition() // Add transition for animation
          .duration(1000) // Animation duration in milliseconds
          .attr('cy', 50) // Move circles to new Y position
    );

  container.append(svg.node());
  container.classList.add('graph');
  container.append(downloadGraph());
  return container;
}

function createLineChart(
  data,
  width = 600,
  height = 400,
  marginTop = 20,
  marginRight = 30,
  marginBottom = 30,
  marginLeft = 40
) {



  var container = createElement('div');
  container.classList.add('graph');

  // Declare the x (horizontal position) scale.
  const x = d3.scaleUtc(
    d3.extent(data[0], (d) => d.date),
    [marginLeft, width - marginRight]
  );

  // Declare the y (vertical position) scale.
  const y = d3.scaleLinear(
    [0, d3.max(data[0], (d) => d.close)],
    [height - marginBottom, marginTop]
  );

  // Declare the line generator.
  const line = d3
    .line()
    .x((d) => x(d.date))
    .y((d) => y(d.close));

  // Create the SVG container.
  const svg = d3
    .create('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

  // Add the x-axis.
  svg
    .append('g')
    .attr('transform', `translate(0,${height - marginBottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(width / 80)
        .tickSizeOuter(0)
    );

  // Add the y-axis, remove the domain line, add grid lines and a label.
  svg
    .append('g')
    .attr('transform', `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y).ticks(height / 40))
    .call((g) => g.select('.domain').remove())
    .call((g) =>
      g
        .selectAll('.tick line')
        .clone()
        .attr('x2', width - marginLeft - marginRight)
        .attr('stroke-opacity', 0.1)
    )
    .call((g) =>
      g
        .append('text')
        .attr('x', -marginLeft)
        .attr('y', 10)
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'start')
        .text('↑ Daily close ($)')
    );

  // Append a path for the line.

  for (let index = 0; index < data.length; index++) {
    svg
    .append('path')
    .attr('fill', 'none')
    .attr('stroke', 'red')
    .attr('stroke-width', 1.5)
    .attr('d', line(data[index]));
    
    // console.log(data[index]);
  }

  // svg
  //   .append('path')
  //   .attr('fill', 'none')
  //   .attr('stroke', 'red')
  //   .attr('stroke-width', 1.5)
  //   .attr('d', line(data[0]));

  //   svg
  //   .append('path')
  //   .attr('fill', 'none')
  //   .attr('stroke', 'blue')
  //   .attr('stroke-width', 1.5)
  //   .attr('d', line(data[1]));

  container.append(svg.node());
  container.classList.add('graph');
  container.append(downloadGraph());
  return container;
}

function downloadGraph(name = 'graph.png') {
  var exportGraph = createElement('button', 'Download PNG');
  exportGraph.classList.add('graph-button');
  exportGraph.addEventListener('click', function () {
    var downloadGraph = document.createElement('a');
    downloadGraph.href = canvas.toDataURL('image/png');
    downloadGraph.download = 'custom_graph.png';
    document.body.appendChild(downloadGraph);
    downloadGraph.click();
    document.body.removeChild(downloadGraph);
  });
  return exportGraph;
}

function applyStyles(element, styles) {
  for (var style in styles) {
    element.style[style] = styles[style];
  }
}

function convertSvgToImage(svg) {
  // Get the SVG element as a string
  const svgString = new XMLSerializer().serializeToString(svg);

  // Create Blob object from SVG string
  const blob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});

  // Create a URL for the Blob
  const url = URL.createObjectURL(blob);

  // Create an image element
  const img = new Image();

  img.onload = function () {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    // Draw the image onto the canvas
    ctx.drawImage(img, 0, 0);

    // Convert canvas to PNG image
    const pngImage = canvas.toDataURL('image/png');

    // Open the PNG image in a new window
    window.open(pngImage);

    // Clean up
    URL.revokeObjectURL(url);
  };

  // Set the source of the image element to the Blob URL
  img.src = url;
}

function createJSElement(file,object,path="./static"){

  return new Promise((resolve,rejetct)=>{

    const list = {
      "d3": typeof d3, 
      "converter": typeof jsPDF
    };

    if (list[object] !== 'undefined'){
      console.log(file +' Loaded.');
      resolve();
      return;
    }

    const script = document.createElement('script');

    script.src = path + '/' + file;

    script.onload = function () {
      console.log(file +' loaded successfully.');
      resolve();
    };

    script.onerror = function () {
      reject(new Error('Failed to load '+ file));
    };

    // Append the script element to the document's head
    document.head.appendChild(script);
  });
}

function generatePDF(id) {
  const svgElement = document.querySelector("svg");
  console.log(svgElement);
  const svgString = new XMLSerializer().serializeToString(svgElement);

  // Create a new jsPDF instance
  const doc = new jsPDF();

  // Add SVG to PDF
  doc.text(10, 10, "D3.js SVG to PDF Example");
  doc.addSvgAsImage(svgString, 15, 15, 180, 120);

  // Save the PDF
  doc.save("graph.pdf");
}

async function updatePreview(runSelector, container) {
  container.textContent = 'Loading...';
  console.log("update Preview")
  const requestedRun = runSelector.value;
  const tagsToScalars = await Model.getTagsToScalars(requestedRun);
  const preview = Views.createPreviews(tagsToScalars);

  // Cancel the update if the UI has a different run selected.
  if (runSelector.value !== requestedRun) {
    return;
  }
  container.textContent = '';
  container.appendChild(preview);
}

// Function to load D3.js dynamically
// function loadD3() {
//   return new Promise((resolve, reject) => {
//     // Check if D3 is already loaded
//     if (typeof d3 !== 'undefined') {
//       console.log('D3.js is already loaded.');
//       resolve();
//       return;
//     }

//     // Create a script element
//     const script = document.createElement('script');

//     // Set the source to the D3.js CDN link
//     script.src = './static/d3.v7.min.js';

//     // Add an onload event handler to execute code after script loaded
//     script.onload = function () {
//       console.log('D3.js loaded successfully.');
//       resolve();
//     };

//     script.onerror = function () {
//       reject(new Error('Failed to load D3.js'));
//     };

//     // Append the script element to the document's head
//     document.head.appendChild(script);
//   });
// }

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

