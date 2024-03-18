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
  
    for (let index = 0; index < data.length; index++) {
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
