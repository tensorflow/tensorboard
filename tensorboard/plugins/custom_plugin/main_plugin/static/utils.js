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

// export function Energy(dataArray, main_tag="Energy",scalar_tag="Experiment") {

//   // dataArray

//   const data1 = dataArray.map(d => ({
//     timestamp: d[1],
//     energy: d[2]
//   }));

//   console.log("data1",data1);


//   // const data1 = [
//   //   { timestamp: 1702011251398996000, energy: 10 },
//   //   { timestamp: 1702011351398996500, energy: 7 },
//   //   { timestamp: 1702011451398997000, energy: 15 },
//   //   { timestamp: 1702011551398997500, energy: 9 },
//   //   { timestamp: 1702011651398998000, energy: 20 },
//   //   { timestamp: 1702011751398998500, energy: 15 },
//   //   { timestamp: 1702012251398999000, energy: 25 },
//   //   { timestamp: 1702012251398999500, energy: 20 },
//   //   { timestamp: 1702012751399000000, energy: 30 },
//   //   { timestamp: 1702012851399000500, energy: 25 },
//   //   { timestamp: 1702012951399000400, energy: 22 },
//   //   { timestamp: 1702013251399001500, energy: 15 },
//   //   { timestamp: 1702013551399002000, energy: 10 },
//   //   { timestamp: 1702013751399002500, energy: 5 },
//   //   { timestamp: 1702013951399003000, energy: 12 },
//   //   { timestamp: 1702014251509003500, energy: 8 },
//   //   { timestamp: 1702014251999004000, energy: 16 },
//   //   { timestamp: 1702015251399004500, energy: 23 },
//   //   { timestamp: 1702015251399005000, energy: 19 },
//   //   // Add more data points as needed
//   // ].map(d => ({ timestamp: d.timestamp / 1000000, energy: d.energy }));
  
//   console.log("defualt",data1);
//   var container = document.createElement('div');
//   container.id = "graph-custom"

//   const data = data1.map(d => ({
//       step: d.timestamp/1000000,
//       value: d.energy
//   }));

//   console.log("data",data);

//   // Set the dimensions and margins of the graph
//   const margin = {top: 30, right: 30, bottom: 30, left: 60},
//         width = 950 - margin.left - margin.right,
//         height = 300 - margin.top - margin.bottom;

//   let svg = d3.select(container)
//     .append("svg")
//       // .attr("width", width + margin.left + margin.right)
//       // .attr("height", height + margin.top + margin.bottom)
//       // .attr("id", `${main_tag}_${scalar_tag}`) // Set the SVG ID here
//       .attr('width', '100%') // Make the SVG width responsive
//       .attr('height', '100%') // Make the SVG height responsive
//       .attr('viewBox', `0 0 ${width+ margin.left + margin.right} ${height + margin.top + margin.bottom}`)
//       .attr('preserveAspectRatio', 'xMidYMid meet')
//       .append("g")
//       .attr("transform", `translate(${margin.left},${margin.top})`);    

//   // Add X axis --> it is a date format
//   const x = d3.scaleTime().range([0, width]).domain(d3.extent(data, d => new Date(d.timestamp)));
    
//   const xAxis = svg.append("g")
//     .attr("transform", `translate(0,${height})`)
//     .call(d3.axisBottom(x));

//   // Add Y axis
//   const y = d3.scaleLinear()
//     .domain([0, d3.max(data, d => +d.value)])
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

//   svg.selectAll("yGrid").data(x.ticks())
//   .join("line")
//   .attr("x1", 0)
//   .attr("x2", width)
//   .attr("y1", d => x(d))
//   .attr("y2", d => x(d))
//   .attr("stroke", "#e0e0e0")
//   .attr("stroke-width",1);

//   svg.append("text") // Append text element
//    .attr("x", (width + margin.left + margin.right) / 2) // Center the text (assuming 'width' is the width of the chart area)
//    .attr("y", 0 - (margin.top / 2)) // Position above the chart by half the top margin
//    .attr("text-anchor", "middle") // Ensure the text is centered at its position
//    .style("font-size", "16px") // Set the text size
//    .style("font-weight", "bold") // Make the title bold
//    .text(scalar_tag);

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
//       .x(d => x(d.step))
//       .y(d => y(d.value));    
//       // .curve(d3.curveMonotoneX); // This makes the line smoother

//   // Add the line
//   const lineChart = svg.append("g")
//     .attr("clip-path", "url(#clip)");

//   lineChart.append("path")
//     .datum(data)
//     .attr("class", "line")
//     .attr("fill", "none")      
//     .attr("stroke", "steelblue")
//     .attr("stroke-width", 1)
//     // .attr("d", d3.line()
//     //   .x(function(d) { return x(d.step) })
//     //   .y(function(d) { return y(d.value) })
//     //   )
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
//           x.domain(d3.extent(data, d => d.step));
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
//       x.domain(d3.extent(data, function(d) { return d.step; }));
//       xAxis.transition().call(d3.axisBottom(x));
//       lineChart
//         .select('.line')
//         .transition()
//         .attr("d", line);
//   });

//   let idleTimeout;
//   function idled() { idleTimeout = null; }

//   // Create a new button element
//   var downloadButton = document.createElement("button");
//   // downloadButton.id = `${main_tag}_${scalar_tag}download`;
//   downloadButton.classList.add("download"); 
//   container.appendChild(downloadButton);

//   downloadButton.addEventListener('click', function(event) {

//     var buttonIdParts = event.target.id.split("download");
//     var svgId = buttonIdParts[0];

//     var svg = document.getElementById(svgId);
//     console.log(svg);

//     var serializer = new XMLSerializer();
//     var svgStr = serializer.serializeToString(svg);

//     var svgBlob = new Blob([svgStr], {type:"image/svg+xml;charset=utf-8"});
//     var svgUrl = URL.createObjectURL(svgBlob);

//     var downloadLink = document.createElement("a");
//     downloadLink.href = svgUrl;
//     downloadLink.download = "chart.svg";
//     document.body.appendChild(downloadLink);
//     downloadLink.click();
//     document.body.removeChild(downloadLink);
// });


//   return container;
// }

export function FinalResource(context="Energy",datasets,layerLabels,default_key="gpu") {

  var color = [
    '#008FFB', // Blue
    '#00E396', // Green
    '#FEB019', // Orange
    '#FF4560', // Red
    '#775DD0', // Purple
    '#EA5455', // Tomato
    '#785EF0', // Violet
    '#66A8FF', // Sky Blue
    '#F6C23E', // Yellow
    '#1BC5BD', // Turquoise
    '#F64E60', // Coral
    '#2DCE89', // Emerald
    '#FD7E14', // Mango
    '#45Aaf2', // Dodger Blue
    '#F78DB2', // Light Pink
    '#4AD8D9', // Cyan
    '#F97B8B', // Pink
    '#8D82B9', // Lavender
    '#3A77B8', // Cerulean
    '#ECCB7D'  // Buff
];


  // console.log("datasets=",datasets,typeof(layerLabels));


  var sys = document.createElement('div');
  sys.id = "system";

  var container = document.createElement('div');
  container.id = "chart";


  const yaxis = document.createElement('div');
  yaxis.id = "yaxis";

  var label = document.createElement("label");
  label.setAttribute("for", "autoScaleCheckbox");
  label.textContent = "Auto Scale Y-axis:";

  // Create checkbox element
  var checkbox = document.createElement("input");
  checkbox.setAttribute("type", "checkbox");
  checkbox.setAttribute("id", "autoScaleCheckbox");
  checkbox.classList.add("yAutoScale");
  checkbox.checked = true;

  checkbox.addEventListener('change', function() {
    var checked = this.checked;
    // chart.updateOptions({
    //   yaxis: {
    //     forceNiceScale: checked
    //   }
    // });
  });

  // // Append label and checkbox to a container
 

  document.body.appendChild(container);
  // yaxis.appendChild(checkbox);
  // yaxis.appendChild(label);
  // document.body.appendChild(yaxis);

  let seriesData = [];
  let allAnnotations = new Map();
const annotationVisibility = {};

console.log("Final",datasets);

  datasets.forEach((val, key) => {

    let annotations = [];
    let data = [];
    console.log("val",val);

    val.forEach((dataset, index) => {

      dataset.forEach(dataPoint => {
        data.push({
          x: dataPoint.timestamp,
          y: dataPoint.energy
        });
      });

      // if (keys == key){
         // Define colors for the annotations and box areas for each dataset
        const annotationColors = ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#ff9f40', '#ff6384', '#4bc0c0'];
        const fillColor = annotationColors[index % annotationColors.length]; // Use modulus to cycle through colors

        const startAnnotationId = `${key}_start_${index}`;
        const endAnnotationId = `${key}_end_${index}`;
    
        // Add annotation for the starting and ending of the dataset
        annotations.push({
          id: startAnnotationId,
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
          id: endAnnotationId,
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
        const highlightAnnotationId = `${key}_highlight_${index}`;
        annotations.push({
          id: highlightAnnotationId,
          x: dataset[0].timestamp,
          x2: dataset[dataset.length - 1].timestamp,
          fillColor: fillColor,
          opacity: 0.2,
          label: {
            text: '',
            position: 'back'
          }
        });
      // }
  
    });

    allAnnotations.set(key, annotations);

    seriesData.push({
      name: `${key}`,
      data: data
    });

  });

  console.log("seriesData",seriesData);

  // Sort seriesData based on timestamp
  // seriesData.sort((a, b) => {
  //   return a.data[0].x - b.data[0].x;
  // });

  const options = {
    chart: {
      height: 600 ,
      type: 'line',
       zoom: {
        // enabled: true, // Enable zoom
        type: 'x', // Optional: Specify the type of zoom ('x', 'y', 'xy')
        // autoScaleYaxis: true, // Optional: Automatically scale the Y-axis as the chart is zoomed,
        // autoScale: true, // Enable auto scaling when zooming
        // min: 20, // Specify the minimum y-axis value to show initially
        // max: 100 
      },
      events: {
        rendered: function(chartContext, config) {
          console.log('Chart has been rendered!');
          // Your code to trigger actions when chart rendering is complete
        }
      }
    },
    annotations: {
      xaxis: allAnnotations.get(default_key)
    },
    series: seriesData,
    xaxis: {
      type: 'datetime',
      title:{
        text: 'Time & API Call Sequence'
      },
      labels: {
        datetimeUTC: false,
        format: 'HH:mm:ss'
      }
    },
    yaxis:{
      title: {
          text: `${context}`
      },
      labels: {
        formatter: function (value) {
          return value.toFixed(2);
        },
      }
    },
     legend: {
      show: true,
      
    },
    tooltip: {
      x: {
          format: 'dd MMM yyyy HH:mm:ss.fff'
      },
      
    },
    stroke: {
      curve: 'smooth',
      width: 1, // You can adjust this value to make the stroke thinner or thicker
      colors: [
        '#008FFB', // Blue
        '#00E396', // Green
        '#FEB019', // Orange
        '#FF4560', // Red
        '#775DD0', // Purple
        '#EA5455', // Tomato
        '#785EF0', // Violet
        '#66A8FF', // Sky Blue
        '#F6C23E', // Yellow
        '#1BC5BD', // Turquoise
        '#F64E60', // Coral
        '#2DCE89', // Emerald
        '#FD7E14', // Mango
        '#45Aaf2', // Dodger Blue
        '#F78DB2', // Light Pink
        '#4AD8D9', // Cyan
        '#F97B8B', // Pink
        '#8D82B9', // Lavender
        '#3A77B8', // Cerulean
        '#ECCB7D'  // Buff
      ]
    }
  };


function toggleAnnotationVisibility(groupId, annotationsData) {
  console.log(annotationsData);
  annotationsData.forEach(annotation => {
    // if (annotation.group === groupId) {
      annotation.hidden = !annotation.hidden;
    // }
  });
  chart.updateOptions({
    annotations: {
      xaxis: annotationsData
    },
    legend: {
      show: true,
      
    }
  });
}

  const chart = new ApexCharts(document.querySelector("#chart"), options);
  chart.render();

  let annotationContainer = document.createElement("div");
  annotationContainer.classList.add("annotation-container");

  var count = 0;
  allAnnotations.forEach((annotations, groupId) => {
    const toggleButton = document.createElement("button");
    toggleButton.style.backgroundColor = color[count++];
    toggleButton.classList.add("toggle-button");
    toggleButton.textContent = groupId;
    toggleButton.dataset.groupId = groupId; // Set dataset attribute for group ID
    annotationContainer.appendChild(toggleButton);

    toggleButton.addEventListener("click", function(event) {
      // Toggle the visibility of the annotation group
      const groupId = event.target.dataset.groupId;
      this.classList.toggle("active");
      toggleAnnotationVisibility(groupId, allAnnotations.get(groupId)); // Example: toggles annotations with group identifier 'group1'
    });

  });

  sys.appendChild(container);
  sys.appendChild(annotationContainer);
  return sys;
}

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

function calculateDeviation(data) {
  const mean = data.reduce((acc, val) => acc + val, 0) / data.length;
  return data.map(val => Math.abs(val - mean));
}

const deviationData = seriesData.map(series => calculateDeviation(series.data));
let deviationSeriesIds = []; // To store the IDs of deviation series added to the chart


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
    offsetX: 40,
    show: true
  }
};



// Update chart color function
function updateChartColor(seriesIndex, color) {
  chart.updateOptions({
    colors: options.colors.map((c, i) => i === seriesIndex ? color : c),
    legend:{
      show: true
    }
  });
}

function appendDeviationSeries() {
  deviationData.forEach((deviation, index) => {
      const seriesName = `${seriesData[index].name} Deviation`;
      chart.appendSeries({
          name: seriesName,
          data: deviation,
          type: 'line',
          show: true,
          line: {
              opacity: 0.5,
              dashArray: [5, 5]
          }
      });
  });
}

// Append deviation series to the chart

var chart = new ApexCharts(document.querySelector("#chart"), options);
chart.render();

appendDeviationSeries();


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
 
  return container;
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

