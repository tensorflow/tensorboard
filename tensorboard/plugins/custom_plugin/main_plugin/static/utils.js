// For Loading Javascript files dynamically
export function createJSElement(file,object,path="./static"){

    return new Promise((resolve,rejetct)=>{

      // add relevant js file object which you will be passing/using in ur script.
      const list = {
        "d3": typeof d3, 
        "converter": typeof jsPDF,
        "apexchart": typeof ApexCharts,
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

export function EnergyUsageChart(main_tag,scalar_tag,dataArray) {

  main_tag = main_tag.replace(/[.,]/g, "-").split("").reverse().join("").replace(/\)\(/, "").split("").reverse().join("");
  console.log("main_tag=",main_tag);
  var container = document.createElement('div');

  const data = dataArray.map(d => ({
      date: new Date(d[1] * 1000),
      value: +d[2]
  }));

  // Set the dimensions and margins of the graph
  const margin = {top: 10, right: 30, bottom: 30, left: 60},
        width = 600 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

  let svg = d3.select(container)
    .append("svg")
      // .attr("width", width + margin.left + margin.right)
      // .attr("height", height + margin.top + margin.bottom)
      .attr("id", `${main_tag}_${scalar_tag}`) // Set the SVG ID here
      .attr('width', '100%') // Make the SVG width responsive
      .attr('height', '100%') // Make the SVG height responsive
      .attr('viewBox', `0 0 ${width+ margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);    

    svg.append("text")
      .attr("class", "chart-title")
      .attr("x", width / 2) // Center the title
      .attr("y", 0 - (margin.top / 2)) // Position above the top margin
      .attr("text-anchor", "middle") // Ensure it's centered
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .style("font-family", "sans-serif")
      .text("Energy Usage");

      svg.append("text")
      .attr("class", "x-axis-title")
      .attr("x", width / 2) // Center the title
      .attr("y", height + margin.bottom) // Position just above the bottom margin
      .attr("text-anchor", "middle") // Ensure it's centered
      .style("font-size", "10px")
      .style("font-family", "sans-serif")
      .text("Time"); // Replace with your x-axis title

      svg.append("text")
      .attr("class", "y-axis-title")
      .attr("transform", "rotate(-90)") // Rotate the text
      .attr("y", 0 - margin.left) // Position to the left of the left margin
      .attr("x", 0 - (height / 2)) // Center vertically based on the chart's height
      .attr("dy", "1em") // Adjust distance from the y-axis
      .attr("text-anchor", "middle") // Ensure it's centered after rotation
      .style("font-size", "10px")
      .style("font-family", "sans-serif")
      .text("Jules"); // Replace with your y-axis title



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
    .attr("stroke-width", 2.5)
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
  downloadButton.id = `${main_tag}_${scalar_tag}download`;
  downloadButton.classList.add("download"); 
  container.appendChild(downloadButton);




  downloadButton.addEventListener('click', function(event) {

    var buttonIdParts = event.target.id.split("download");
    var svgId = buttonIdParts[0];

    var svg = document.getElementById(svgId);
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
  // expandButton.id =  layer+"_"+ tag+"_expand";
  expandButton.classList.add("expand");



  // Create and setup the button
var paletteExpand = document.createElement("button");
paletteExpand.id = "palette_expand";
paletteExpand.innerText = "Show Color Palette";
paletteExpand.classList.add("expand");
container.appendChild(expandButton);

// // Create the color palette container
var colorPalette = document.createElement("div");
colorPalette.id = "colorPalette";
colorPalette.classList.add("color-palette");

// // Array of colors for the palette
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

// // Add click event listener to the button to show the color palette
paletteExpand.addEventListener('click', function() {
    // Toggle display of the color palette
    if (colorPalette.style.display === "none") {
        colorPalette.style.display = "block";
    } else {
        colorPalette.style.display = "none";
    }
});

// document.body.appendChild(downloadButton);

//   container.appendChild(expandButton);
  container.appendChild(colorPalette);

  return container;
}

// For Pytorch Model Calculations like loss,Accuracy, Flop Calculation.
export function CalculationChart(main_tag,scalar_tag,dataArray) {

  main_tag = main_tag.replace(/[.,]/g, "-").split("").reverse().join("").replace(/\)\(/, "").split("").reverse().join("");
  console.log("main_tag=",main_tag);
  var container = document.createElement('div');

  const data = dataArray.map(d => ({
      step: +d[1],
      value: +d[2]
  }));

  // Set the dimensions and margins of the graph
  const margin = {top: 30, right: 30, bottom: 30, left: 60},
        width = 600 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

  let svg = d3.select(container)
    .append("svg")
      // .attr("width", width + margin.left + margin.right)
      // .attr("height", height + margin.top + margin.bottom)
      .attr("id", `${main_tag}_${scalar_tag}`) // Set the SVG ID here
      .attr('width', '100%') // Make the SVG width responsive
      .attr('height', '100%') // Make the SVG height responsive
      .attr('viewBox', `0 0 ${width+ margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);    

  // Add X axis --> it is a date format
  const x = d3.scaleLinear()
  .domain([d3.min(data, d => d.step), d3.max(data, d => d.step) + 10]) // Use step values for domain
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

  svg.append("text") // Append text element
   .attr("x", (width + margin.left + margin.right) / 2) // Center the text (assuming 'width' is the width of the chart area)
   .attr("y", 0 - (margin.top / 2)) // Position above the chart by half the top margin
   .attr("text-anchor", "middle") // Ensure the text is centered at its position
   .style("font-size", "16px") // Set the text size
   .style("font-weight", "bold") // Make the title bold
   .text(scalar_tag);

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
      .x(d => x(d.step))
      .y(d => y(d.value));

  // Add the line
  const lineChart = svg.append("g")
    .attr("clip-path", "url(#clip)");

  lineChart.append("path")
    .datum(data)
    .attr("class", "line")
    .attr("fill", "none")      
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2.5)
    .attr("d", d3.line()
      .x(function(d) { return x(d.step) })
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
          x.domain(d3.extent(data, d => d.step));
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
      x.domain(d3.extent(data, function(d) { return d.step; }));
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
  downloadButton.id = `${main_tag}_${scalar_tag}download`;
  downloadButton.classList.add("download"); 
  container.appendChild(downloadButton);




  downloadButton.addEventListener('click', function(event) {

    var buttonIdParts = event.target.id.split("download");
    var svgId = buttonIdParts[0];

    var svg = document.getElementById(svgId);
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
  // expandButton.id =  layer+"_"+ tag+"_expand";
  expandButton.classList.add("expand");



  // Create and setup the button
var paletteExpand = document.createElement("button");
paletteExpand.id = "palette_expand";
paletteExpand.innerText = "Show Color Palette";
paletteExpand.classList.add("expand");
// container.appendChild(expandButton);

// // Create the color palette container
var colorPalette = document.createElement("div");
colorPalette.id = "colorPalette";
colorPalette.classList.add("color-palette");

// // Array of colors for the palette
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

// // Add click event listener to the button to show the color palette
paletteExpand.addEventListener('click', function() {
    // Toggle display of the color palette
    if (colorPalette.style.display === "none") {
        colorPalette.style.display = "block";
    } else {
        colorPalette.style.display = "none";
    }
});

// document.body.appendChild(downloadButton);

//   container.appendChild(expandButton);
  container.appendChild(colorPalette);

  return container;
}

export function Energy(dataArray, main_tag="Energy",scalar_tag="Experiment") {

  // dataArray

  const data1 = dataArray.map(d => ({
    timestamp: d[1],
    energy: d[2]
  }));

  console.log("data1",data1);


  // const data1 = [
  //   { timestamp: 1702011251398996000, energy: 10 },
  //   { timestamp: 1702011351398996500, energy: 7 },
  //   { timestamp: 1702011451398997000, energy: 15 },
  //   { timestamp: 1702011551398997500, energy: 9 },
  //   { timestamp: 1702011651398998000, energy: 20 },
  //   { timestamp: 1702011751398998500, energy: 15 },
  //   { timestamp: 1702012251398999000, energy: 25 },
  //   { timestamp: 1702012251398999500, energy: 20 },
  //   { timestamp: 1702012751399000000, energy: 30 },
  //   { timestamp: 1702012851399000500, energy: 25 },
  //   { timestamp: 1702012951399000400, energy: 22 },
  //   { timestamp: 1702013251399001500, energy: 15 },
  //   { timestamp: 1702013551399002000, energy: 10 },
  //   { timestamp: 1702013751399002500, energy: 5 },
  //   { timestamp: 1702013951399003000, energy: 12 },
  //   { timestamp: 1702014251509003500, energy: 8 },
  //   { timestamp: 1702014251999004000, energy: 16 },
  //   { timestamp: 1702015251399004500, energy: 23 },
  //   { timestamp: 1702015251399005000, energy: 19 },
  //   // Add more data points as needed
  // ].map(d => ({ timestamp: d.timestamp / 1000000, energy: d.energy }));
  
  console.log("defualt",data1);
  var container = document.createElement('div');
  container.id = "graph-custom"

  const data = data1.map(d => ({
      step: d.timestamp/1000000,
      value: d.energy
  }));

  console.log("data",data);

  // Set the dimensions and margins of the graph
  const margin = {top: 30, right: 30, bottom: 30, left: 60},
        width = 950 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

  let svg = d3.select(container)
    .append("svg")
      // .attr("width", width + margin.left + margin.right)
      // .attr("height", height + margin.top + margin.bottom)
      // .attr("id", `${main_tag}_${scalar_tag}`) // Set the SVG ID here
      .attr('width', '100%') // Make the SVG width responsive
      .attr('height', '100%') // Make the SVG height responsive
      .attr('viewBox', `0 0 ${width+ margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);    

  // Add X axis --> it is a date format
  const x = d3.scaleTime().range([0, width]).domain(d3.extent(data, d => new Date(d.timestamp)));
    
  const xAxis = svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  // Add Y axis
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => +d.value)])
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

  svg.selectAll("yGrid").data(x.ticks())
  .join("line")
  .attr("x1", 0)
  .attr("x2", width)
  .attr("y1", d => x(d))
  .attr("y2", d => x(d))
  .attr("stroke", "#e0e0e0")
  .attr("stroke-width",1);

  svg.append("text") // Append text element
   .attr("x", (width + margin.left + margin.right) / 2) // Center the text (assuming 'width' is the width of the chart area)
   .attr("y", 0 - (margin.top / 2)) // Position above the chart by half the top margin
   .attr("text-anchor", "middle") // Ensure the text is centered at its position
   .style("font-size", "16px") // Set the text size
   .style("font-weight", "bold") // Make the title bold
   .text(scalar_tag);

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
      .x(d => x(d.step))
      .y(d => y(d.value));    
      // .curve(d3.curveMonotoneX); // This makes the line smoother

  // Add the line
  const lineChart = svg.append("g")
    .attr("clip-path", "url(#clip)");

  lineChart.append("path")
    .datum(data)
    .attr("class", "line")
    .attr("fill", "none")      
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1)
    // .attr("d", d3.line()
    //   .x(function(d) { return x(d.step) })
    //   .y(function(d) { return y(d.value) })
    //   )
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
          x.domain(d3.extent(data, d => d.step));
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
      x.domain(d3.extent(data, function(d) { return d.step; }));
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
  // downloadButton.id = `${main_tag}_${scalar_tag}download`;
  downloadButton.classList.add("download"); 
  container.appendChild(downloadButton);

  downloadButton.addEventListener('click', function(event) {

    var buttonIdParts = event.target.id.split("download");
    var svgId = buttonIdParts[0];

    var svg = document.getElementById(svgId);
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


  return container;
}


export function ResorceMonitorChart(main_tag,scalar_tag,dataArray) {

  const container = document.createElement('div');
  container.id ="resorce_monitor";

  // Sample data for CPU, RAM, GPU. Each inner array represents a segment of data points.
// var cpu = [[15, 72, 61], [24, 3, 22, 53], [30, 38, 2]];
// var ram = [[89, 49, 91], [60, 80, 15], [62, 47, 62]];
var gpu = [[39, 18, 4, 89], [2, 84, 92], [47, 35]];

// Individual elapsed times for each CPU data subset, in seconds
var cpuElapsedTimes = [
  [0.5, 1.0, 1.5], // Elapsed times for the first CPU data subset
  [2.0, 2.5, 3.0, 3.5], // Second subset
  [4.0, 4.5, 5.0] // Third subset
];

// Starting execution time (in milliseconds) - Example timestamp
var startExecutionTime = 1702011520384; // Simplified for demonstration

// Function to convert CPU data and its elapsed times to [timestamp, value] pairs
function convertCPUsToTimeSeries(cpuData, cpuElapsed, startTime) {
  var timeSeries = [];
  var currentTime = startTime;
  cpuData.forEach((segment, segmentIndex) => {
    segment.forEach((value, valueIndex) => {
      currentTime += cpuElapsed[segmentIndex][valueIndex] * 1000; // Convert seconds to milliseconds
      timeSeries.push([currentTime, value]);
    });
  });
  return timeSeries;
}



// Simulated elapsed times in seconds for each data point
// Assuming a uniform distribution of time for simplicity
var elapsedTimes = Array.from({length: cpu.flat().length}, (_, i) => i * 0.5 + 0.5);
console.log(elapsedTimes);
// Convert the data arrays to [timestamp, value] pairs
function convertToTimeSeries(data, startTime, elapsed) {
  var timeSeries = [];
  var currentTime = startTime;
  var elapsedTimesCopy = [...elapsed]; // Copy to avoid modifying the original array
  data.flat().forEach((value, index) => {
    currentTime += elapsedTimesCopy[index] * 1000; // Convert seconds to milliseconds
    timeSeries.push([currentTime, value]);
  });
  return timeSeries;
}

// var cpuTimeSeries = convertToTimeSeries(cpu, startExecutionTime, elapsedTimes);
// var ramTimeSeries = convertToTimeSeries(ram, startExecutionTime, elapsedTimes);
var gpuTimeSeries = convertToTimeSeries(gpu, startExecutionTime, elapsedTimes);

// Prepare the series data for CPU, RAM, GPU with time series data
var seriesData = [
  // { name: "CPU", data: cpuTimeSeries },
  // { name: "RAM", data: ramTimeSeries },
  { name: "GPU", data: gpuTimeSeries }
];

// Annotations at the end of each CPU segment
var cpuAnnotations = [];
var segmentEnds = cpu.map(segment => segment.length).reduce((acc, cur, i) => {
  acc.push((acc[i - 1] || 0) + cur);
  return acc;
}, []);

segmentEnds.forEach((endIndex, index) => {
  if (index < cpu.length - 1) { // Skip the last segment, as it naturally ends without a marker
    cpuAnnotations.push({
      x: cpuTimeSeries[endIndex - 1][0], // Timestamp of the last point in each segment
      borderColor: "#FEB019",
      label: {
        orientation: "horizontal",
        text: `CPU Segment ${index + 1} End`
      }
    });
  }
});

// Combine all modifications into the ApexCharts options
var options = {
  annotations: {
    xaxis: cpuAnnotations
  },
  chart: {
    height: 380,
    type: "line"
  },
  series: seriesData,
  xaxis: {
    type: "datetime"
  },
  // Additional configuration as needed...
};

var chart = new ApexCharts(document.querySelector("#resorce_monitor"), options);
chart.render();

}

export function Resource(){
  // Example datasets
  const cpu = [
      [1, 2, 3, 4, 5, 6, 7],
      [11, 23, 20, 10, 5],
      [0, 5, 2, 2, 7, 1, 6, 2]
  ];
  const gpu = [
      [5, 7, 20, 25, 30, 45, 50],
      [55, 6, 6, 7, 7],
      [30, 35, 120, 2, 7, 15, 67, 2]

  ];
  const ram = [
      [10, 20, 30, 40, 50, 60, 70],
      [55, 60, 65, 70, 75],
      [30, 35, 12, 2, 7, 15, 67, 2]

  ];

  const container = document.createElement("div");
  container.id = "chart1";
  document.body.appendChild(container);


  // Function to adjust color brightness remains the same
  function adjustColorBrightness(hex, lum) {
      hex = String(hex).replace(/[^0-9a-f]/gi, '');
      if (hex.length < 6) {
          hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      lum = lum || 0;

      let rgb = "", c, i;
      for (i = 0; i < 3; i++) {
          c = parseInt(hex.substr(i * 2, 2), 16);
          c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
          rgb += ("00" + c).substr(c.length);
      }

      return "#" + rgb;
  }


  // Function to generate annotations for sub-arrays needs a slight adjustment to accommodate multiple datasets
  // Function to generate annotations for the CPU sub-arrays with unique non-matching colors
  function generateAnnotationsForCPUSubArrays(cpuDataset) {
      const annotations = { xaxis: [] };
      let startPosition = 1; // Initial start position on the x-axis
      // Define a unique color palette for annotations, ensuring these don't match the series line colors
      const annotationColors = ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#ff9f40', '#ff6384', '#4bc0c0'];

      cpuDataset.forEach((subArray, index) => {
          const length = subArray.length;
          const endPosition = startPosition + length - 1;
          // Cycle through the annotation color palette based on the current index
          const fillColor = annotationColors[index % annotationColors.length]; // Use modulus to cycle through colors

          annotations.xaxis.push({
              x: startPosition,
              x2: endPosition,
              fillColor: fillColor,
              opacity: 0.1,
              label: {
                  borderColor: fillColor,
                  style: {
                      fontSize: '12px',
                      color: '#fff',
                      background: fillColor,
                  },
                  text: `Layer ${index + 1}`
              }
          });

          startPosition += length; // Prepare the start position for the next dataset
      });

      return annotations;
  }

  // Continue using the rest of your code as it was, with this updated function for generating CPU annotations.
  // This ensures the annotations have distinct colors that do not match the line colors for CPU, GPU, and RAM data.


  // Flatten the datasets for the series data
  const flatCpuData = cpu.flat();
  const flatGpuData = gpu.flat();
  const flatRamData = ram.flat();

  // Determine the max categories needed for the x-axis
  const maxCategories = Math.max(flatCpuData.length, flatGpuData.length, flatRamData.length);

  // Configuring the chart options to include CPU, GPU, and RAM data
  var options = {
      chart: {
          type: 'line',
          height: 350
      },
      series: [{
          name: 'CPU',
          data: flatCpuData
      }, {
          name: 'GPU',
          data: flatGpuData
      }, {
          name: 'RAM',
          data: flatRamData
      }],
      stroke: {
          width: 2 // Set this to make the series lines thin
      },
      xaxis: {
          categories: Array.from({length: maxCategories}, (_, i) => i + 1)
      },
      annotations: generateAnnotationsForCPUSubArrays(cpu),
      tooltip: {
          shared: true,
          intersect: false,
          y: {
              formatter: function (y) {
                  if (typeof y !== "undefined") {
                      return `${y} Units`;
                  }
                  return y;
              }
          }
      }
  };

  // Initialize and render the chart
  var chart = new ApexCharts(document.querySelector("#chart1"), options);
  chart.render();

return container;

}

export function FinalResource(datasets,layerLabels) {



  // console.log("datasets=",datasets,typeof(layerLabels));

  const container = document.createElement('div');
  container.id = "chart";
  document.body.appendChild(container);

  let seriesData = [];
  let annotations = [];

  let data = [];

  datasets[0].forEach((dataset, index) => {

    dataset.forEach(dataPoint => {
      data.push({
        x: new Date(dataPoint.timestamp),
        y: dataPoint.energy
      });
    });

    // Define colors for the annotations and box areas for each dataset
    const annotationColors = ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#ff9f40', '#ff6384', '#4bc0c0'];
    const fillColor = annotationColors[index % annotationColors.length]; // Use modulus to cycle through colors

    // Add annotation for the starting and ending of the dataset
    annotations.push({
      x: dataset[0].timestamp,
      strokeDashArray: 0,
      borderColor: fillColor,
      label: {
        style: {
          color: '#fff',
          background: fillColor,
        },
        // offsetY:300,
        // orientation: "horizontal",
        text: `${layerLabels[index]} Start`
      }
    });
    annotations.push({
      x: dataset[dataset.length - 1].timestamp,
      strokeDashArray: 0,
      borderColor: fillColor,
      label: {
        style: {
          color: '#fff',
          background: fillColor
        },
      }
    });

    // Add annotation to highlight the area of the dataset
    annotations.push({
      x: dataset[0].timestamp,
      x2: dataset[dataset.length - 1].timestamp,
      fillColor: fillColor,
      opacity: 0.2,
      label: {
        text: '',
        position: 'back'
      }
    });


  });

  seriesData.push({
    name: `Dataset`,
    data: data
  });

  // Sort seriesData based on timestamp
  seriesData.sort((a, b) => {
    return a.data[0].x - b.data[0].x;
  });

  const options = {
    chart: {
      height: 500,
      type: 'line',
       zoom: {
        enabled: true, // Enable zoom
        type: 'x', // Optional: Specify the type of zoom ('x', 'y', 'xy')
        autoScaleYaxis: true // Optional: Automatically scale the Y-axis as the chart is zoomed
      }
    },
    annotations: {
      xaxis: annotations
    },
    series: seriesData,
    xaxis: {
      type: 'datetime',
      title:{
        text: 'Time & API Call Sequence'
      }
    },
    yaxis:{
      title: {
          text: 'Energy (Joules)'
      },
      labels: {
        formatter: function (value) {
          return value.toFixed(2);
        }
      }
    },
     legend: {
      show: true
    }
  };

  const chart = new ApexCharts(document.querySelector("#chart"), options);
  chart.render();

  return container;
}


// export function Resource1(gpu){
//   var chartDiv = document.createElement('div');
    
//   // Assign an ID to the div
//   chartDiv.id = 'chart';
  
//   // Append the newly created div to the body or another container element
//   document.body.appendChild(chartDiv);

//   gpu = gpu.map(d => ({
//     timestamp: d[1],
//     energy: d[2]
//   }));
  
//   // Assuming CPU, RAM, and GPU have the same timestamp and energy data for demonstration
//   // let cpuData = {
//   //     timestamps: exampleTimestamps,
//   //     energy: exampleEnergy
//   // };
  
//   // let ramData = {
//   //     timestamps: exampleTimestamps,
//   //     energy: exampleEnergy
//   // };
  
//   let gpuData = {
//       timestamps: gpu.map(d => d.timestamp/1000000),
//       energy: gpu.map(d => d.energy)
//   };

//   console.log(gpuData);



//   // Preparing the series data for ApexCharts
//   let series = [
//       // {
//       //     name: 'CPU',
//       //     data: cpuData.timestamps.map((ts, index) => [ts, cpuData.energy[index]])
//       // },
//       // {
//       //     name: 'RAM',
//       //     data: ramData.timestamps.map((ts, index) => [ts, ramData.energy[index]])
//       // },
//       {
//           name: 'GPU',
//           data: gpuData.timestamps.map((ts, index) => [ts, gpuData.energy[index]])
//       }
//   ];
  
//   // Chart options
//   let options = {
//       chart: {
//           type: 'line',
//           height: 350,
//           zoom: {
//             enabled: true, // Enable zoom
//             type: 'x', // Optional: Specify the type of zoom ('x', 'y', 'xy')
//             autoScaleYaxis: true // Optional: Automatically scale the Y-axis as the chart is zoomed
//           }
//       },
//       series: series,
//       xaxis: {
//           type: 'datetime',          
//           labels: {
//               year: 'yyyy',
//               month: 'MMM \'yy',
//               day: 'dd MMM',
//               hour: 'HH:mm:ss',
//               minute: 'HH:mm:ss',
//               milisecond: 'HH:mm:ss.fff',
//             },
//       },
//       yaxis: {
//           title: {
//               text: 'Energy (Joules)'
//           },
//           labels: {
//             formatter: function (value) {
//               return value.toFixed(2);
//             }
//           }
      
//       },
//       // annotations: generateAnnotationsForCPUSubArrays(cpu),
//       tooltip: {
//           x: {
//               format: 'dd MMM yyyy HH:mm:ss.fff'
//           }
//       }
//   };

//   function generateAnnotationsForCPUSubArrays(cpuDataset) {
//   const annotations = { xaxis: [] };
//   let startPosition = 1; // Initial start position on the x-axis
//   // Define a unique color palette for annotations, ensuring these don't match the series line colors
//   const annotationColors = ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#ff9f40', '#ff6384', '#4bc0c0'];

//   cpuDataset.forEach((subArray, index) => {
//       const length = subArray.length;
//       const endPosition = startPosition + length - 1;
//       // Cycle through the annotation color palette based on the current index
//       const fillColor = annotationColors[index % annotationColors.length]; // Use modulus to cycle through colors

//       annotations.xaxis.push({
//           x: startPosition,
//           x2: endPosition,
//           fillColor: fillColor,
//           opacity: 0.1,
//           label: {
//               borderColor: fillColor,
//               style: {
//                   fontSize: '12px',
//                   color: '#fff',
//                   background: fillColor,
//               },
//               text: `Layer ${index + 1}`
//           }
//       });

//       startPosition += length; // Prepare the start position for the next dataset
//   });

//   return annotations;
// }
  
//   // Initialize the chart
//   let chart = new ApexCharts(document.querySelector("#chart"), options);
  
//   // Render the chart
//   chart.render();
//   return chartDiv;

// }


// export function livechart(tagsToScalars){

//   const chartDiv = document.createElement('div');
//   chartDiv.classList.add('container');

//   const margin = { top: 20, right: 20, bottom: 30, left: 50 },
//       width = 1400 - margin.left - margin.right,
//       height = 400 - margin.top - margin.bottom;

// // Append SVG object to the body
// const svg = d3.select(chartDiv).append("svg")
//     .attr("width", width + margin.left + margin.right)
//     .attr("height", height + margin.top + margin.bottom)
//     .attr('viewBox', `0 0 ${width} ${height}`)
//     .attr('preserveAspectRatio', 'xMidYMid meet')
//   .append("g")
//     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// // Initialize scale for x as a time scale
// const xScale = d3.scaleTime().range([0, width]);
// const yScale = d3.scaleLinear().range([height, 0]);

// // Adjust the yScale domain for seconds (0 to 59)
// yScale.domain([0, 59]);

// // Define the line
// const valueLine = d3.line()
//     .x(d => xScale(d.x))
//     .y(d => yScale(d.y));

// // Get the start time
// const startTime = new Date();

// // Initialize data array
// let data = [];

// // Initial domain for scales; xScale will dynamically update
// xScale.domain([startTime, new Date(startTime.getTime() + 1000)]);

// // Create the line path element
// const linePath = svg.append("path")
//     .attr("class", "line")
//     .attr("stroke", "blue")
//     .attr("stroke-width", 2)
//     .attr("fill", "none");

//   svg.append("text")
//   .attr("class","chart-title")
//   .attr("x", margin.left- 115)
//   .attr("y", margin.top - 100)
//   .style("font-size", "24px")
//   .style("font-weight", "bold")
//   .style("font-family", "sans-serif")
//   .text("Energy Usage");

// // Add the X and Y Axis
// const xAxis = svg.append("g")
//     .attr("transform", `translate(0,${height})`);
// const yAxis = svg.append("g")
//     .call(d3.axisLeft(yScale)); // y-axis is static, we set it up here


// // function updateChart() {
// //     // Calculate elapsed time as x-value
// //     const now = new Date();
// //     const elapsed = new Date(now - startTime);

// //     // Get the current second for y-value
// //     const second = now.getSeconds();
    
// //     // Add new data point
// //     data.push({ x: now, y: second });

// //     // Update xScale domain to include the new range
// //     xScale.domain([startTime, now]);

// //     // Update the line path and axes with a smooth transition
// //     linePath
// //         .datum(data)
// //         .transition().duration(950) // slightly less than interval to smooth out transition
// //         .attr("d", valueLine);

// //     xAxis.transition().duration(950)
// //         .call(d3.axisBottom(xScale));
// // }
// const displayDuration = 100 * 1000; // Display window in milliseconds (e.g., last 100 seconds)

// // Define transition duration
// const transitionDuration = 1000; // 1 second

// function updateDataKeepOld() {
//     // Assuming 'now' is the current time for the new data point
// //     
//   const newX = new Date(); // Example for adding a new timestamp
//     const newY = Math.random() * 59; // Random value for demonstration
//     data.push({ x: newX, y: newY });

//     // Update the xScale domain
//     const timeExtent = d3.extent(data, d => d.x);
//     xScale.domain(timeExtent);

//     // Update the line
//     linePath.datum(data)
//         .transition()
//         .duration(transitionDuration)
//         .attr("d", valueLine);

//     // Update xAxis with new domain
//     xAxis.transition().duration(transitionDuration)
//         .call(d3.axisBottom(xScale));

//     // Apply dynamic tick formatting
//     formatTicksForTimeSpan();
  
//   // formatTicksForTimeSpan();
// }

// // Periodically update the chart with new data
// setInterval(updateDataKeepOld, 1000); // Update every 2 seconds for a more observable transition

// function formatTicksForTimeSpan() {
//     const domain = xScale.domain(); // Get the current domain of the xScale
//     const span = domain[1] - domain[0]; // Calculate the span in milliseconds

//     // Decide on the format based on the span
//     let format;
//     if (span > 86400000) { // More than 24 hours
//         format = d3.timeFormat("%H:%M"); // Hours and minutes
//     } else if (span > 3600000) { // More than 1 hour
//         format = d3.timeFormat("%H:%M"); // Hours and minutes
//     } else if (span > 60000) { // More than 1 minute
//         format = d3.timeFormat("%M:%S"); // Minutes and seconds
//     } else { // Less than 1 minute
//         format = d3.timeFormat("%S.%L"); // Seconds and milliseconds
//     }

//     // Update the xAxis with the new format
//     xAxis.call(d3.axisBottom(xScale).tickFormat(format));

//   }

//   return chartDiv;
// }


export function multilinechart(tagsToScalars,xTitle="",yTitle="",chartTitle=""){
  
const container = document.createElement("div");
container.classList.add("background-pink");
container.id = "container";

// Create the line chart div
const linechart = document.createElement("div");
linechart.classList.add("background-pink");
linechart.id = "chart";

// Create the color picker div
const colorpicker = document.createElement("div");
colorpicker.classList.add("color-picker");
colorpicker.id = "colorPickerContainer";

// Append the linechart and colorpicker to the container
container.appendChild(linechart);
container.appendChild(colorpicker);

// Finally, append the container to the document body
document.body.appendChild(container);


// Define the Map with the specified format
var layerData = new Map([
  ["Dense", [[1, 1, 5320], [2, 2, 7600], [3, 3, 12500], [4, 4, 9000], [5, 5, 10000], [6, 6, 16800], [7, 7, 25080], [8, 8, 39560]]],
  ["Flatten", [[1, 1, 2000], [2, 2, 3000], [3, 3, 4000], [4, 4, 5000], [5, 5, 6000], [6, 6, 7000], [7, 7, 8000], [8, 8, 9000]]],
  // Additional layer data can be added here in the same format
]);

// Function to transform Map data into series format used by ApexCharts
function transformMapDataToSeries(mapData) {
  let series = [];
  mapData.forEach((values, key) => {
    let dataSeries = values.map(entry => entry[2]); // Extract the value for y-axis
    series.push({
      name: `${key}`,
      data: dataSeries
    });
  });
  return series;
}

// var xAxisCategories = extractXAxisCategories(layerData);

// Determine the range for the X-axis dynamically
// var minX = Math.min(...xAxisCategories);
// var maxX = Math.max(...xAxisCategories);
// var tickAmount = 10;

// Generate the series data from the Map
var seriesData = transformMapDataToSeries(tagsToScalars);

var options = {
  chart: {
    height: 350,
    type: "line",
    stacked: false,
    zoom: {
            enabled: true, // Enable zoom
            type: 'x', // Optional: Specify the type of zoom ('x', 'y', 'xy')
            autoScaleYaxis: true, // Optional: Automatically scale the Y-axis as the chart is zoomed
            autoScaleXaxis: true // Optional: Automatically scale the Y-axis as the chart is zoomed
    }
  },
  dataLabels: {
    enabled: false
  },
  colors: ["#FF1654", "#247BA0", '#cc65fe', '#ffce56', '#ff9f40', '#ff6384', '#4bc0c0',"#008FFB", // Vivid Blue
  "#00E396", // Bright Green
  "#FEB019", // Sunny Yellow
  "#FF4560", // Fiery Red
  "#775DD0", // Deep Purple
  "#546E7A", // Cool Grey
  "#26a69a", // Teal
  "#D10CE8", // Magenta
  "#FF9800", // Orange
  "#3F51B5", // Indigo
  "#00D084", // Mint Green
  "#4CAF50", // Green
  "#F9C80E", // Lightning Yellow
  "#663399", // Rebecca Purple
  "#9C27B0", // Violet
  "#1E88E5", // Blue
  "#D81B60", // Pink
  "#FFC107", // Amber
  "#004D40", // Dark Teal
  "#E91E63"],  // Light Pink], // Adjust colors as needed
  series: seriesData,
  stroke: {
    width: [2, 2] // Adjust line thickness
  },
  plotOptions: {
    bar: {
      columnWidth: "20%"
    }
  },
  xaxis: {
    // Assuming steps are uniform and sequential, they could also be dynamically extracted if necessary
    // categories: [1, 2, 3, 4, 5, 6, 7, 8],
    // type: 'numeric', // Use 'numeric' type for better control over the scale
    // min: minX,
    // max: maxX,
    tickAmount: 100,
    title: {
      text: xTitle
    }
  },
  yaxis: {
    title: {
      text: yTitle
    },
    labels: {
      formatter: function (val) {
        if (val > 1000) {
          return (val / 1000).toFixed(2) + "K";
        }
        else{
          return val.toFixed(2);
        }
      }
    }
  },
  tooltip: {
    shared: true,
    intersect: false,
    x: {
      show: true
    },
    y: {
      formatter: function (val, { series, seriesIndex, dataPointIndex, w }) {
        return w.globals.seriesNames[seriesIndex] + ": " + val + " FLOPs";
      }
    }
  },
  legend: {
    horizontalAlign: "left",
    offsetX: 40
  }
};



// Update chart color function
function updateChartColor(seriesIndex, color) {
  chart.updateOptions({
    colors: options.colors.map((c, i) => i === seriesIndex ? color : c)
  });
}


var chart = new ApexCharts(document.querySelector("#chart"), options);

chart.render();

// Dynamically create color pickers for each series
function createColorPickers(seriesData) {
  const colorPickerContainer = document.getElementById('colorPickerContainer');
  seriesData.forEach((series, index) => {
    const pickerLabel = document.createElement('label');
    pickerLabel.classList.add('picker');
    pickerLabel.textContent = `${series.name}: `;
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.classList.add('picker');
    colorPicker.id = `colorPicker${index}`;
    colorPicker.value = options.colors[index]; // Set default colors

    // Update chart color on change
    colorPicker.addEventListener('change', function() {
      updateChartColor(index, colorPicker.value);
    });

    pickerLabel.appendChild(colorPicker);
    colorPickerContainer.appendChild(pickerLabel);
  });
}

// function extractXAxisCategories(mapData) {
//   let categories = new Set();
//   mapData.forEach(values => {
//     values.forEach(value => {
//       categories.add(value[0]); // Assuming the first element is the X-axis value
//     });
//   });
//   return Array.from(categories).sort((a, b) => a - b); // Convert to array and sort
// }

createColorPickers(seriesData);

  tagsToScalars.forEach((value, key) => {
    if(key === "FLOPs"){

      

    }


  });

  console.log("multiline chart=",tagsToScalars);  
  return container;
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
