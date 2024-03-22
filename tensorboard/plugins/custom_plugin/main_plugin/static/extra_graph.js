  
export function createScaleLinear(
    aapl,
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


export function createLineChart(
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

    // const x = d3.scaleTime().range([0, width]);

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
  
    for (let index = 1; index < data.length; index++) {
      svg
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', 'red')
      .attr('stroke-width', 1.5)
      .attr('d', line(data[index]));
    
    }

    container.append(svg.node());
    container.classList.add('graph');
    container.append(downloadGraph());
    return container;
  }

export function SmoothLineChart(){

  var container = document.createElement('div');
  container.classList.add('graph');
  container.id = "my_dataviz";
  document.body.appendChild(container); // Append the container to the DOM


    // Static demo data
    var demoData = [
        { date: "2020-01-01", value: 10 },
        { date: "2020-01-02", value: 20 },
        { date: "2020-01-03", value: 30 },
        { date: "2020-01-04", value: 40 }
        // Add more data points as needed
    ];

    // Parse the date / time and convert values to numbers
    demoData.forEach(function(d) {
        d.date = d3.timeParse("%Y-%m-%d")(d.date);
        d.value = +d.value;
    });

    // Set the dimensions and margins of the graph
    var margin = {top: 10, right: 30, bottom: 30, left: 60},
        width = 460 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    // Append the svg object to the specified div
    var svg = d3.select("#my_dataviz").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");

    // X axis
    var x = d3.scaleTime()
      .domain(d3.extent(demoData, function(d) { return d.date; }))
      .range([ 0, width ]);
    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));

    // Y axis
    var y = d3.scaleLinear()
      .domain([0, d3.max(demoData, function(d) { return d.value; })])
      .range([ height, 0 ]);
    svg.append("g")
      .call(d3.axisLeft(y));

    // Add a clipPath: everything out of this area won't be drawn.
    var clip = svg.append("defs").append("svg:clipPath")
        .attr("id", "clip")
        .append("svg:rect")
        .attr("width", width)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 0);

    // Add brushing
    var brush = d3.brushX() // Add the brush feature using the d3.brush function
        .extent([[0, 0], [width, height]]) // initialise the brush area
        .on("end", updateChart); // Each time the brush selection changes

    // Line drawing function
    var line = d3.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.value); });

    // Create the line variable: where both the line and the brush take place
    var lineGroup = svg.append('g')
      .attr("clip-path", "url(#clip)");

    // Add the line
    lineGroup.append("path")
      .datum(demoData)
      .attr("class", "line") // Add for styling
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", line);

    // Add the brushing
    lineGroup
      .append("g")
        .attr("class", "brush")
        .call(brush);

        // Function to handle the idle state after brushing
        var idleTimeout;
        function idled() { idleTimeout = null; }
    
        // Configure the initial X axis:
        var xAxis = svg.append("g")
          .attr("transform", "translate(0," + height + ")")
          .call(d3.axisBottom(x));
    
        // Configure the initial Y axis:
        var yAxis = svg.append("g")
          .call(d3.axisLeft(y));

           // If user double clicks, reinitialize the chart
           svg.on("dblclick", function() {
            x.domainx.domain(d3.extent(demoData, function(d) { return d.date; }));
            xAxis.transition().call(d3.axisBottom(x));
            lineGroup
                .select(".line")
                .transition()
                .attr("d", line(demoData));
        });

    // A function that update the chart
    function updateChart(event) {
        var selection = event.selection;
        if (!selection) {
            if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
            x.domain([4, 8]);
        } else {
            x.domain([x.invert(selection[0]), x.invert(selection[1])]);
            lineGroup.select(".brush").call(brush.move, null); // This remove the grey brush area
        }

        // Update axis and line position
        xAxis.transition().duration(1000).call(d3.axisBottom(x));
        lineGroup
            .select('.line')
            .transition()
            .duration(1000)
            .attr("d", line);
    }


    
      return container;
}

export function createZoomableLineChart(data) {
  var container = document.createElement('div');
  container.classList.add('graph');
  document.body.appendChild(container); // Append the container to the DOM

  // Define dimensions and margins
  const width = 928;
  const height = 500;
  const margins = { top: 20, right: 30, bottom: 30, left: 40 };
  
  // Scales
  const x = d3.scaleUtc()
      .domain(d3.extent(data, d => d.date))
      .range([margins.left, width - margins.right]);
  const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)]).nice()
      .range([height - margins.bottom, margins.top]);
  
  // Line generator
  const lineGenerator = d3.line()
      .curve(d3.curveStepAfter)
      .x(d => x(d.date))
      .y(d => y(d.value));
  
  // Append SVG to the container
  const svg = d3.select(container).append("svg")
      .attr("viewBox", [0, 0, width, height])
      .style("overflow", "visible");

  // Clipping path (to ensure elements don't go outside the chart area)
  svg.append("defs").append("clipPath")
      .attr("id", "clip")
    .append("rect")
      .attr("width", width - margins.left - margins.right)
      .attr("height", height)
      .attr("x", margins.left)
      .attr("y", margins.top);

  // Append the line
  const line = svg.append("g")
      .attr("clip-path", "url(#clip)")
    .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("class", "line-path") // Class to easily select later
      .attr("d", lineGenerator);

  // Axes
  svg.append("g")
      .attr("transform", `translate(0,${height - margins.bottom})`)
      .call(d3.axisBottom(x));
  svg.append("g")
      .attr("transform", `translate(${margins.left},0)`)
      .call(d3.axisLeft(y));

  // Zoom behavior
  const zoom = d3.zoom()
      .scaleExtent([1, 10]) // Limit zoom scale
      .translateExtent([[margins.left, -Infinity], [width - margins.right, Infinity]])
      .extent([[margins.left, 0], [width - margins.right, height]])
      .on("zoom", zoomed);

  // Apply the zoom behavior to the SVG
  svg.call(zoom);

  // Zoom event handler
  function zoomed(event) {
      const xz = event.transform.rescaleX(x); // New x scale based on zoom
      svg.selectAll(".line-path").attr("d", d3.line()
          .curve(d3.curveStepAfter)
          .x(d => xz(d.date))
          .y(d => y(d.value))
      );
      // Update the x-axis
      svg.selectAll("g").filter(function() {
          return this.getAttribute("transform") === `translate(0,${height - margins.bottom})`;
      }).call(d3.axisBottom(xz));
  }
  return container;
}


export function realTimeChartMulti() {
    var version = "0.1.0",
        datum, data = [],
        maxSeconds = 300, pixelsPerSecond = 10,
        svgWidth = 700, svgHeight = 300,
        margin = { top: 20, bottom: 20, left: 100, right: 30, topNav: 10, bottomNav: 20 },
        dimension = { chartTitle: 20, xAxis: 20, yAxis: 20, xTitle: 20, yTitle: 20, navChart: 70 },
        maxY = 100, minY = 0,
        chartTitle = "", yTitle = "", xTitle = "",
        drawXAxis = true, drawYAxis = true, drawNavChart = true,
        border = false,
        selection,
        barId = 0,
        yDomain = [],
        debug = false,
        barWidth = 5,
        halted = false,
        x, y, xNav, yNav,
        xAxis, yAxis,
        svg;
  
    // create the chart
    var chart = function(s) {
      selection = s;
      if (!selection) {
        console.error("Selection is undefined");
        return;
      }
  
      // Compute dimensions and offsets
      var chartTitleDim = chartTitle ? dimension.chartTitle : 0,
          xTitleDim = xTitle ? dimension.xTitle : 0,
          yTitleDim = yTitle ? dimension.yTitle : 0,
          xAxisDim = drawXAxis ? dimension.xAxis : 0,
          yAxisDim = drawYAxis ? dimension.yAxis : 0,
          navChartDim = drawNavChart ? dimension.navChart : 0,
          marginTop = margin.top + chartTitleDim,
          height = svgHeight - marginTop - margin.bottom - chartTitleDim - xTitleDim - xAxisDim - navChartDim + 30,
          heightNav = navChartDim - margin.topNav - margin.bottomNav,
          marginTopNav = svgHeight - margin.bottom - heightNav - margin.topNav,
          width = svgWidth - margin.left - margin.right,
          widthNav = width;
  
      // Append the SVG
      svg = selection.append("svg")
          .attr("width", svgWidth)
          .attr("height", svgHeight)
          .style("border", border ? "1px solid lightgray" : null);
  
      // Create main chart group
      var main = svg.append("g")
          .attr("transform", `translate(${margin.left},${marginTop})`);
  
      // Define clip-path
      main.append("defs").append("clipPath")
          .attr("id", "myClip")
          .append("rect")
          .attr("width", width)
          .attr("height", height);
  
      // Main chart background
      main.append("rect")
          .attr("width", width)
          .attr("height", height)
          .style("fill", "#f5f5f5");
  
      // Main chart scales and axes
      x = d3.scaleTime().range([0, width]);
      y = d3.scalePoint().domain(yDomain).range([height, 0]).padding(1);
      xAxis = d3.axisBottom(x);
      yAxis = d3.axisLeft(y);
  
      // Add axes to the main chart
      xAxisG = main.append("g")
          .attr("transform", `translate(0,${height})`)
          .call(xAxis);
      yAxisG = main.append("g")
          .call(yAxis);
  
      // Axis titles
      if (xTitle) {
        xAxisG.append("text")
            .attr("class", "title")
            .attr("x", width / 2)
            .attr("y", 25)
            .text(xTitle);
      }
  
      if (yTitle) {
        yAxisG.append("text")
            .attr("class", "title")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 15)
            .text(yTitle);
      }
  
      // Chart title
      if (chartTitle) {
        main.append("text")
            .attr("class", "chartTitle")
            .attr("x", width / 2)
            .attr("y", -20)
            .text(chartTitle);
      }
  
      // Navigation chart
      var nav = svg.append("g")
          .attr("transform", `translate(${margin.left},${marginTopNav})`);
  
      // Navigation chart background
      nav.append("rect")
          .attr("width", widthNav)
          .attr("height", heightNav)
          .style("fill", "#f5f5f5");
  
      // Navigation chart scales
      xNav = d3.scaleTime().range([0, widthNav]);
      yNav = d3.scalePoint().domain(yDomain).range([heightNav, 0]).padding(1);
  
      // Navigation chart axes
      var xAxisNav = d3.axisBottom(xNav);
  
      // Add nav chart x-axis
      var xAxisGNav = nav.append("g")
          .attr("transform", `translate(0,${heightNav})`)
          .call(xAxisNav);
  
      // Initialize brush component
      var brush = d3.brushX()
          .extent([[0, 0], [widthNav, heightNav]])
          .on("brush end", brushed);
  
      // Add brush to nav chart
      var viewportG = nav.append("g")
          .attr("class", "viewport")
          .call(brush)
          .call(brush.move, x.range());
  
      // Brush handler
      function brushed(event) {
          if (event.sourceEvent && event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
          var s = event.selection || xNav.range();
          x.domain(s.map(xNav.invert, xNav));
          main.select(".x.axis").call(xAxis);
          // Optionally, update the main chart content based on the brush
      }
  
      // Update functions, getters, and setters
  
      chart.updateData = function(newData) {
          // Implement data update logic here
      };
  
      // More getters and setters for chart properties
  
      return chart;
    }
  }
  
  
export function createD3Chart({ svgWidth, svgHeight, margin, chartTitleDim, xTitleDim, xAxisDim, navChartDim, border, xTitle, yTitle, chartTitle, xDomain, navXDomain, yDomain, navYDomain, tickFormat}) {
    // Dynamically create the container div for the chart
    const chartContainer = document.createElement('div');
    chartContainer.id = 'd3-chart-container';
    document.body.appendChild(chartContainer); // Append to body or any other container element as needed
  
    // Select the newly created container for the D3 chart
    const selection = d3.select('#d3-chart-container');
  
    // Compute dimensions and offsets
    const marginTop = margin.top + chartTitleDim;
    const height = svgHeight - marginTop - margin.bottom - chartTitleDim - xTitleDim - xAxisDim - navChartDim + 30;
    const width = svgWidth - margin.left - margin.right;
  
    // Append the svg to the container
    const svg = selection.append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .style("border", border ? "1px solid lightgray" : null);
  
    // Create main group and translate
    const main = svg.append("g")
        .attr("transform", `translate(${margin.left},${marginTop})`);
  
    // Define clip-path for the chart content
    main.append("defs").append("clipPath")
        .attr("id", "myClip")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height);
  
    // Create chart background
    main.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
        .style("fill", "#f5f5f5");
  
    // Add axis groups (placeholders for now)
    const xAxisG = main.append("g")
        .attr("class", "x axis")
        .attr("transform", `translate(0,${height})`);
    const yAxisG = main.append("g")
        .attr("class", "y axis");
  
    // Axis titles and chart title
    xAxisG.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", 25)
        .attr("dy", ".71em")
        .text(xTitle ?? "");
    yAxisG.append("text")
        .attr("class", "title")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .attr("dy", ".71em")
        .text(yTitle ?? "");
    main.append("text")
        .attr("class", "chartTitle")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("dy", ".71em")
        .text(chartTitle ?? "");
  
  }
  
