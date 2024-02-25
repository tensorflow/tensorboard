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

  const msg = createElement('h1', 'My Plugin');
  document.body.appendChild(msg);

  const container = createElement('div');
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

  const width = 928;
  const height = 500;
  const marginTop = 20;
  const marginRight = 30;
  const marginBottom = 30;
  const marginLeft = 40;

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
    .call((g) =>
      g
        .append('text')
        .attr('x', -marginLeft)
        .attr('y', 10)
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'start')
        .text('↑ Daily close ($)')
    );

  container.append(svg.node());
  document.body.appendChild(container);

  // var canvas = document.createElement('canvas');
  // canvas.width = 400;
  // canvas.height = 300;
  // document.body.appendChild(canvas);

  // var ctx = canvas.getContext('2d');

  // var data = [
  //   {x: 0, y: 20},
  //   {x: 20, y: 50},
  //   {x: 40, y: 30},
  //   {x: 60, y: 70},
  //   {x: 80, y: 40},
  //   {x: 100, y: 90},
  // ];

  // ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ctx.beginPath();
  // ctx.moveTo(0, canvas.height);
  // ctx.lineTo(0, 0);
  // ctx.lineTo(canvas.width, 0);
  // ctx.stroke();

  // ctx.fillStyle = 'blue';
  // var radius = 4;
  // data.forEach(function (point) {
  //   ctx.beginPath();
  //   ctx.arc(point.x, canvas.height - point.y, radius, 0, Math.PI * 2);
  //   ctx.fill();
  // });

  // For canvas
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

  document.body.appendChild(exportGraph);
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
