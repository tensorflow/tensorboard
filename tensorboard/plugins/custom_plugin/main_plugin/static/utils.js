export function createJSElement(file,object,path="./static"){

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

export function generateLineChart(layer, tag,dataArray,idx) {

  var container = document.createElement('div');
  container.classList.add('graph');
  // document.body.appendChild(container); // Append the container to the DOM
  // Process the data
  const data = dataArray.map(d => ({
      date: new Date(d[1] * 1000),
      value: +d[2]
  }));

  // Set the dimensions and margins of the graph
  const margin = {top: 10, right: 30, bottom: 30, left: 60},
        width = 1400 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

  let svg = d3.select(container)
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("id", `${tag+String(idx)}`) // Set the SVG ID here
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);    

  // Add X axis --> it is a date format
  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([0, width]);
    
  const xAxis = svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  // Add Y axis
  const y = d3.scaleLinear()
    .domain([d3.min(data, d => d.value), d3.max(data, d => +d.value)])
    .range([height, 0]);
  const yAxis = svg.append("g")
    .call(d3.axisLeft(y));

  // svg.call(d3.axisLeft(y).tickFormat(d => { return `${d} J`}))

  svg.selectAll("xGrid").data(x.ticks())
  .join("line")
  .attr("x1", d => x(d))
  .attr("x2", d => x(d))
  .attr("y1", 0)
  .attr("y2", height)
  .attr("stroke", "#e0e0e0")
  .attr("stroke-width",1);

  svg.selectAll("xGrid").data(x.ticks())
  .join("line")
  .attr("x1", 0)
  .attr("x2", width)
  .attr("y1", d => x(d))
  .attr("y2", d => x(d))
  .attr("stroke", "#e0e0e0")
  .attr("stroke-width",1);

  svg.append("text")
  .attr("class","chart-title")
  .attr("x", margin.left- 115)
  .attr("y", margin.top - 100)
  .style("font-size", "24px")
  .style("font-weight", "bold")
  .style("font-family", "sans-serif")
  .text("Energy Usage");

  // Clipping path
  svg.append("defs").append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("x", 0)
      .attr("y", 0);

  // Add brushing
  const brush = d3.brushX()                   
      .extent([[0, 0], [width, height]])   
      .on("end", updateChart);              

  // Line generation
  const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.value));

  // Add the line
  const lineChart = svg.append("g")
    .attr("clip-path", "url(#clip)");

  lineChart.append("path")
    .datum(data)
    .attr("class", "line")
    .attr("fill", "none")      
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", d3.line()
      .x(function(d) { return x(d.date) })
      .y(function(d) { return y(d.value) })
      )
    // .attr("d", line);

  // Add the brushing
  lineChart.append("g")
    .attr("class", "brush")
    .call(brush);

  // A function that updates the chart
  function updateChart(event) {
      const selection = event.selection;
      if (!selection) {
          if (!idleTimeout) return idleTimeout = setTimeout(() => idleTimeout = null, 350);
          x.domain(d3.extent(data, d => d.date));
      } else {
          x.domain([x.invert(selection[0]), x.invert(selection[1])]);
          lineChart.select(".brush").call(brush.move, null);
      }
      xAxis.transition().call(d3.axisBottom(x));
      lineChart
          .select('.line')
          .transition()
          .attr("d", line);
  }

  // If user double clicks, reset the chart
  svg.on("dblclick", function() {
      x.domain(d3.extent(data, function(d) { return d.date; }));
      xAxis.transition().call(d3.axisBottom(x));
      lineChart
        .select('.line')
        .transition()
        .attr("d", line);
  });

  let idleTimeout;
  function idled() { idleTimeout = null; }

  // Create a new button element
  var downloadButton = document.createElement("button");
  downloadButton.id = tag + "" + String(idx) + "_download";
  downloadButton.classList.add("download"); 
  container.appendChild(downloadButton);


  downloadButton.addEventListener('click', function(event) {

    var buttonIdParts = event.target.id.split("_");
    var svgId = buttonIdParts[1] + "_" + buttonIdParts[2]; // Adjust based on your ID structure
    console.log("id="+svgId);
    var svg = document.getElementById(svgId);
    // var svg = document.querySelector("svg");
    console.log(svg);
    var serializer = new XMLSerializer();
    var svgStr = serializer.serializeToString(svg);

    var svgBlob = new Blob([svgStr], {type:"image/svg+xml;charset=utf-8"});
    var svgUrl = URL.createObjectURL(svgBlob);

    var downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = "chart.svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
});

  var expandButton = document.createElement("button");
  expandButton.id =  layer+"_"+ tag+"_expand";
  expandButton.classList.add("expand");



  // Create and setup the button
var paletteExpand = document.createElement("button");
paletteExpand.id = "palette_expand";
paletteExpand.innerText = "Show Color Palette";
paletteExpand.classList.add("expand");
container.appendChild(expandButton);

// Create the color palette container
var colorPalette = document.createElement("div");
colorPalette.id = "colorPalette";
colorPalette.classList.add("color-palette");

// Array of colors for the palette
var colors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"];

// Populate the color palette with colors
colors.forEach(function(color) {
    var colorOption = document.createElement("div");
    colorOption.classList.add("color-option");
    colorOption.style.backgroundColor = color;
    colorPalette.appendChild(colorOption);
    
    // Optionally, add click event to each color to do something when a color is selected
    colorOption.addEventListener('click', function() {
        console.log("Color selected:", color);
        // You can extend this function to do more when a color is selected
    });
});

// Add click event listener to the button to show the color palette
paletteExpand.addEventListener('click', function() {
    // Toggle display of the color palette
    if (colorPalette.style.display === "none") {
        colorPalette.style.display = "block";
    } else {
        colorPalette.style.display = "none";
    }
});

// document.body.appendChild(downloadButton);

  container.appendChild(expandButton);
  container.appendChild(colorPalette);

  return container;
}

export function livechart(tagsToScalars){

  const chartDiv = document.createElement('div');
  chartDiv.classList.add('container');

  const margin = { top: 20, right: 20, bottom: 30, left: 50 },
      width = 1400 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

// Append SVG object to the body
const svg = d3.select(chartDiv).append("svg")
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

  return chartDiv;
}

export function multilinechart(tagsToScalars){
  const div = document.createElement('div');
  div.classList.add('container');
  
  return div;
}

// export function SimulateData(dataArray) {

//   let info = [];


//   var container = document.createElement('div');
//   container.classList.add('graph');
//   // document.body.appendChild(container); // Append the container to the DOM
//   // Process the data
//   const data = dataArray.map(d => ({
//       date: new Date(d[0] * 1000),
//       value: +d[2]
//   }));

//   // Set the dimensions and margins of the graph
//   const margin = {top: 10, right: 30, bottom: 30, left: 60},
//         width = 1400 - margin.left - margin.right,
//         height = 400 - margin.top - margin.bottom;

//   let svg = d3.select(container)
//     .append("svg")
//       .attr("width", width + margin.left + margin.right)
//       .attr("height", height + margin.top + margin.bottom)
//       .attr("id", `${tag+String(idx)}`) // Set the SVG ID here
//       .append("g")
//       .attr("transform", `translate(${margin.left},${margin.top})`);    

//   // Add X axis --> it is a date format
//   const x = d3.scaleTime()
//     .domain(d3.extent(data, d => d.date))
//     .range([0, width]);
    
//   const xAxis = svg.append("g")
//     .attr("transform", `translate(0,${height})`)
//     .call(d3.axisBottom(x));

//   // Add Y axis
//   const y = d3.scaleLinear()
//     .domain([d3.min(data, d => d.value), d3.max(data, d => +d.value)])
//     .range([height, 0]);
//   const yAxis = svg.append("g")
//     .call(d3.axisLeft(y));

//   // svg.call(d3.axisLeft(y).tickFormat(d => { return `${d} J`}))

//   svg.selectAll("xGrid").data(x.ticks())
//   .join("line")
//   .attr("x1", d => x(d))
//   .attr("x2", d => x(d))
//   .attr("y1", 0)
//   .attr("y2", height)
//   .attr("stroke", "#e0e0e0")
//   .attr("stroke-width",1);

//   svg.selectAll("xGrid").data(x.ticks())
//   .join("line")
//   .attr("x1", 0)
//   .attr("x2", width)
//   .attr("y1", d => x(d))
//   .attr("y2", d => x(d))
//   .attr("stroke", "#e0e0e0")
//   .attr("stroke-width",1);

//   svg.append("text")
//   .attr("class","chart-title")
//   .attr("x", margin.left- 115)
//   .attr("y", margin.top - 100)
//   .style("font-size", "24px")
//   .style("font-weight", "bold")
//   .style("font-family", "sans-serif")
//   .text("Energy Usage");

//   // Clipping path
//   svg.append("defs").append("clipPath")
//       .attr("id", "clip")
//       .append("rect")
//       .attr("width", width)
//       .attr("height", height)
//       .attr("x", 0)
//       .attr("y", 0);

//   // Add brushing
//   const brush = d3.brushX()                   
//       .extent([[0, 0], [width, height]])   
//       .on("end", updateChart);              

//   // Line generation
//   const line = d3.line()
//       .x(d => x(d.date))
//       .y(d => y(d.value));

//   // Add the line
//   const lineChart = svg.append("g")
//     .attr("clip-path", "url(#clip)");

//   lineChart.append("path")
//     .datum(data)
//     .attr("class", "line")
//     .attr("fill", "none")      
//     .attr("stroke", "steelblue")
//     .attr("stroke-width", 1.5)
//     .attr("d", d3.line()
//       .x(function(d) { return x(d.date) })
//       .y(function(d) { return y(d.value) })
//       )
//     // .attr("d", line);

//   // Add the brushing
//   lineChart.append("g")
//     .attr("class", "brush")
//     .call(brush);

//   // A function that updates the chart
//   function updateChart(event) {
//       const selection = event.selection;
//       if (!selection) {
//           if (!idleTimeout) return idleTimeout = setTimeout(() => idleTimeout = null, 350);
//           x.domain(d3.extent(data, d => d.date));
//       } else {
//           x.domain([x.invert(selection[0]), x.invert(selection[1])]);
//           lineChart.select(".brush").call(brush.move, null);
//       }
//       xAxis.transition().call(d3.axisBottom(x));
//       lineChart
//           .select('.line')
//           .transition()
//           .attr("d", line);
//   }

//   // If user double clicks, reset the chart
//   svg.on("dblclick", function() {
//       x.domain(d3.extent(data, function(d) { return d.date; }));
//       xAxis.transition().call(d3.axisBottom(x));
//       lineChart
//         .select('.line')
//         .transition()
//         .attr("d", line);
//   });

//   let idleTimeout;
//   function idled() { idleTimeout = null; }

//   document.body.appendChild(container);

//   container.appendChild(expandButton);
//   container.appendChild(colorPalette);

//   return container;
// }

// Example usage
 // Update data after 2s


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
