// import * as Model from './model.js';
// import * as Views from './views.js';
import * as d3 from "d3";


export async function render() {

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = './static/style.css';

  document.body.appendChild(stylesheet);

  const msg = createElement("h1", "My Plugin");
  document.body.appendChild(msg);

  var data = [10, 20, 30, 40, 50];

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

  // var buttonStyles = {
  //   padding: "10px 20px",
  //   backgroundColor: "#4CAF50",
  //   border: "none",
  //   color: "white",
  //   textAlign: "center",
  //   textDecoration: "none",
  //   display: "inline-block",
  //   fontSize: "16px",
  //   margin: "4px 2px",
  //   cursor: "pointer",
  //   borderRadius: "10px",
  // };

  var exportGraph = createElement("button", "Download PNG");
  exportGraph.classList.add("graph-button");
  // applyStyles(exportGraph, buttonStyles);

  exportGraph.addEventListener("click", function () {
    var downloadGraph = document.createElement("a");
    
    downloadGraph.href = canvas.toDataURL("image/png");
    downloadGraph.download = "custom_graph.png";

    document.body.appendChild(downloadGraph);
    
    downloadGraph.click();
    document.body.removeChild(downloadGraph);

  });


  document.body.appendChild(exportGraph);


  // Create a simple dataset
const dataset = [10, 20, 30, 40, 50];

// Create a SVG element
const svg = d3.create("svg")
  .attr("width", 400)
  .attr("height", 300);

// Create bars for each data point
svg.selectAll("rect")
  .data(dataset)
  .enter()
  .append("rect")
  .attr("x", (d, i) => i * 80)
  .attr("y", (d) => 300 - d)
  .attr("width", 50)
  .attr("height", (d) => d)
  .attr("fill", "orange");

// Append the SVG to the body or another container element
document.body.appendChild(svg.node());

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
