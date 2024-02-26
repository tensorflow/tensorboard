// Define your render function
export async function render() {
  try {
    await loadD3();
    console.log('D3.js has been loaded successfully.');

    // Now you can safely use D3.js here
    const container = createElement('div');
    // Your D3.js code here...
  } catch (error) {
    console.error('Failed to load D3.js:', error);
  }

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = './static/style.css';
  document.body.appendChild(stylesheet);

  const msg = createElement('h1', 'BERT- Custom Plugin');
  document.body.appendChild(msg);

  var mainContainer = createElement('div');
  mainContainer.classList.add('main-container');

  var graphArea = createElement('div');
  graphArea.classList.add('graph-area');

  var sideToolbar = createElement('div');
  sideToolbar.classList.add('side-toolbar');

  var toolbarTitle = createElement('h2', 'Settings');
  toolbarTitle.classList.add('toolbar-title');
  sideToolbar.appendChild(toolbarTitle);

  graphArea.appendChild(createScaleLinear());
  graphArea.appendChild(createLineChart());

  document.body.appendChild(sideToolbar);
  document.body.appendChild(graphArea);

  mainContainer.appendChild(sideToolbar);
  mainContainer.appendChild(graphArea);

  document.body.appendChild(mainContainer);

  // var exportGraph = createElement('button', 'Download PNG');
  // exportGraph.classList.add('graph-button');

  // exportGraph.addEventListener('click', function () {
  //   var downloadGraph = document.createElement('a');
  //   downloadGraph.href = canvas.toDataURL('image/png');
  //   downloadGraph.download = 'custom_graph.png';
  //   document.body.appendChild(downloadGraph);
  //   downloadGraph.click();
  //   document.body.removeChild(downloadGraph);
  // });

  // document.body.appendChild(exportGraph);
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
  svg
    .append('path')
    .attr('fill', 'none')
    .attr('stroke', 'red')
    .attr('stroke-width', 1.5)
    .attr('d', line(aapl));

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

// Function to load D3.js dynamically
function loadD3() {
  return new Promise((resolve, reject) => {
    // Check if D3 is already loaded
    if (typeof d3 !== 'undefined') {
      console.log('D3.js is already loaded.');
      resolve();
      return;
    }

    // Create a script element
    const script = document.createElement('script');

    // Set the source to the D3.js CDN link
    script.src = './static/d3.v7.min.js';

    // Add an onload event handler to execute code after script loaded
    script.onload = function () {
      console.log('D3.js loaded successfully.');
      resolve();
    };

    script.onerror = function () {
      reject(new Error('Failed to load D3.js'));
    };

    // Append the script element to the document's head
    document.head.appendChild(script);
  });
}
