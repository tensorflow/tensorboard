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

export function CalculationChart(main_tag,scalar_tag,dataArray) {

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


export function multilinechart(tagsToScalars){
  
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
    stacked: false
  },
  dataLabels: {
    enabled: false
  },
  colors: ["#FF1654", "#247BA0","FFFFFF"], // Adjust colors as needed
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
    // tickAmount: tickAmount,
    title: {
      text: 'Epoch Steps'
    }
  },
  yaxis: {
    title: {
      text: 'FLOP Counts'
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
