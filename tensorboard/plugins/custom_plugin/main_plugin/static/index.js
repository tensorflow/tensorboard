// import { Chart } from "./chart";

export async function render() {
  var script = document.createElement("script");
  script.src = "https://d3js.org/d3.v7.min.js";
  script.onload = function () {
    // D3.js is loaded, you can start using it
    createElements();
  };
  document.head.appendChild(script);

  const msg = createElement("h1", "My Plugin");
  document.body.appendChild(msg);

  var data = [10, 20, 30, 40, 50];

  // Select the container div using D3.js
  var container = d3.select("body").append("div").attr("id", "container");

  // Use D3.js to bind data and create elements
  container
    .selectAll("p")
    .data(data)
    .enter()
    .append("p")
    .text(function (d) {
      return "Data value: " + d;
    });

  const labels = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
  ];

  var canvas = document.createElement("canvas");

  canvas.width = 400;
  canvas.height = 300;
  document.body.appendChild(canvas);

  // Get the canvas context
  var ctx = canvas.getContext("2d");

  // Dummy data for the graph
  var data = [
    { x: 0, y: 20 },
    { x: 20, y: 50 },
    { x: 40, y: 30 },
    { x: 60, y: 70 },
    { x: 80, y: 40 },
    { x: 100, y: 90 },
  ];

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw axes
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(0, 0);
  ctx.lineTo(canvas.width, 0);
  ctx.stroke();

  // Draw data points
  ctx.fillStyle = "blue";
  var radius = 4;
  data.forEach(function (point) {
    ctx.beginPath();
    ctx.arc(point.x, canvas.height - point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  var buttonStyles = {
    padding: "10px 20px",
    backgroundColor: "#4CAF50",
    border: "none",
    color: "white",
    textAlign: "center",
    textDecoration: "none",
    display: "inline-block",
    fontSize: "16px",
    margin: "4px 2px",
    cursor: "pointer",
    borderRadius: "10px",
  };

  var downloadButton = createElement("button", "Download PNG");
  applyStyles(downloadButton, buttonStyles);

  downloadButton.addEventListener("click", function () {
    var downloadLink = document.createElement("a");
    downloadLink.href = canvas.toDataURL("image/png");
    downloadLink.download = "graph.png";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  });
  document.body.appendChild(downloadButton);

  // Declare the chart dimensions and margins.
  const width = 640;
  const height = 400;
  const marginTop = 20;
  const marginRight = 20;
  const marginBottom = 30;
  const marginLeft = 40;

  // Declare the x (horizontal position) scale.
  const x = d3
    .scaleUtc()
    .domain([new Date("2023-01-01"), new Date("2024-01-01")])
    .range([marginLeft, width - marginRight]);

  // Declare the y (vertical position) scale.
  const y = d3
    .scaleLinear()
    .domain([0, 100])
    .range([height - marginBottom, marginTop]);

  // Create the SVG container.
  const svg = d3.create("svg").attr("width", width).attr("height", height);

  // Add the x-axis.
  svg
    .append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x));

  // Add the y-axis.
  svg
    .append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y));

  // Append the SVG element.
  container.append(svg.node());

  // Render the graph

  //   const runToFlag = await fetch("./tags").then((response) => response.json());
  //   const data = await Promise.all();
}

function createElement(tag, children) {
  const result = document.createElement(tag);
  if (children != null) {
    if (typeof children === "string") {
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
