import * as Utils from './utils.js';



export function createRunSelector(runs,class_name="run-selector") {
    /**
     * Build a component in this form:
     *   <select class="run-selector">
     *     <option value="${run}">${run}</option>
     *     ...
     *   </select>
     */
    const element = createElement('select', class_name);
    element.id="run-selector"
    for (const run of runs) {
      element.options.add(new Option(run, run));
    }
  
    return element;
  }

export function createPreviews(run, tagsToScalars) {
    const fragment = document.createDocumentFragment();
  
    if (!tagsToScalars.size) {
      const messageElement = createElement('h2');
      messageElement.textContent = 'No tags found.';
      fragment.appendChild(messageElement);
      return fragment;
    }
    else{

      if(run == "system_performance"){

        // console.log(tagsToScalars);

        let startTime = new Map();

        tagsToScalars.forEach((scalars, tag) => {


          let time = scalars.get("start_time_execution");

          startTime.set(tag,time[0][2]);
          // console.log(time);


          if(tag == "start_time_execution"){
            // console.log(tag,scalars.keys());
          }
        });


        const sortedMap = new Map([...startTime.entries()].sort((a, b) => a[1] - b[1]));
        console.log("sorted values",sortedMap);

        const data = merge(tagsToScalars,sortedMap);
        console.log("merged data",data);
        
        fragment.appendChild(Utils.FinalResource(data,Array.from(sortedMap.keys())));
        // fragment.appendChild(Utils.Energy(data));
        // fragment.appendChild(Utils.Resource());
        // fragment.appendChild(Utils.Resource1(data));
        
   
      }
      else{
        let extra = createLayerDrawers(run, tagsToScalars);
        fragment.appendChild(extra);
      }
      return fragment;
    }

  }

function merge(tagsToScalars, map){


  let cpu = [];
  let ram = [];
  let gpu = [];

// let mergedCPU = [].concat(...tagsToScalars.forEach(t => t.get("CPU")));
// console.log(mergedCPU);

  map.keys().forEach((tag) => {

    let target = tagsToScalars.get(tag);
    // cpu.push(target.get("CPU"));

    let cpuData = target.get("GPU").map((item) => {
      // console.log("item=",item);
      return {timestamp:item[1]/1000000, energy:item[2]};
    });
    
    gpu.push(cpuData);

  });

  // console.log("gpu=check",gpu);
  // cpu = [].concat(...cpu);
  
  // const modifyCPU = cpu.map((item) => {

  //   let [,second, third] = item;
  //   second = second / 1000000000;
  //   console.log(second,third);
  //   return [second, third];
  // });

  return gpu;
}

export function createLayerDrawers(run,tagScalars) {

  if (!tagScalars || tagScalars.length === 0) {
      console.error('No FAQ data provided.');
      alert('No FAQ data provided.');
      return null;
  }

  const container = document.createElement('div');
  container.className = 'container';

  tagScalars.forEach((scalars, tag) => {

      // console.log(tag,scalars);

      const drawer = document.createElement('div');
      drawer.classList.add('faq-drawer');


      const input = document.createElement('input');
      input.className = 'faq-drawer__trigger';
      input.type = 'checkbox';
      input.id = `drawer_${tag}`;


      const label = document.createElement('label');
      label.className = 'faq-drawer__title';
      label.setAttribute('for', `drawer_${tag}`);
      label.textContent = tag;


      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'faq-drawer__content-wrapper';
      contentWrapper.id =  `wrapper_${tag}`;


      const content = document.createElement('div');
      content.className = 'faq-drawer__content';

      content.appendChild(cardformat(run,tag,scalars));
      contentWrapper.appendChild(content);
      drawer.appendChild(input);
      drawer.appendChild(label);
      drawer.appendChild(contentWrapper);
      container.appendChild(drawer);
  });

  return container;
}


function cardformat(run,tag,scalars){
  
  // Create cards container
  const container = createElement('div');


  const cardsContainer = createElement('div');
  cardsContainer.className = 'cards-container';
  cardsContainer.id = `cards-container_${tag}`;

  if(run === "system_performance"){

    // scalars.forEach((scalar, scalar_tag) => {

    //   if(scalar_tag != "start_time_execution" && scalar_tag != "end_time_execution")
    //   {
        
    //   const card = document.createElement('div');
    //   card.className = 'card';
    //   card.id = `card_${tag}_${scalar_tag}`;
    //   console.log(scalar);
  
    //   card.appendChild(Utils.EnergyUsageChart(tag,scalar_tag,scalar));
    //   cardsContainer.appendChild(card);

    //   }

    // });
  }
  else if(run === "fake_bert"){

    if(tag == "FLOPs"){
      container.appendChild(Utils.multilinechart(scalars,"Steps","Flop Counts"));
    }
    else{
      container.appendChild(Utils.multilinechart(scalars));
    }

    scalars.forEach((scalar, scalar_tag) => {
      
      const card = document.createElement('div');
      card.className = 'card';
      card.id = `card_${tag}_${scalar_tag}`;
      console.log(scalar);
  
      card.appendChild(Utils.CalculationChart(tag,scalar_tag,scalar));
      cardsContainer.appendChild(card);
    });

  }

   container.appendChild(cardsContainer);
    return container;

  // Append the cards container to the body or any specific element
}


function createElement(tag, className) {
    const result = document.createElement(tag);
    if (className) {
      result.className = className;
    }
    return result;
  }

//   const data = [
//     { date: new Date('2020-01-01'), value: 10 },
//     { date: new Date('2020-01-02'), value: 12 },
//     { date: new Date('2020-01-03'), value: 13 },
//     { date: new Date('2020-01-04'), value: 15 },
//     { date: new Date('2020-01-05'), value: 17 },
//     { date: new Date('2020-01-06'), value: 18 },
//     { date: new Date('2020-01-07'), value: 20 },
//     { date: new Date('2020-01-08'), value: 22 },
//     { date: new Date('2020-01-09'), value: 23 },
//     { date: new Date('2020-01-10'), value: 25 },
//     { date: new Date('2020-01-11'), value: 15 }, // Jump of 5
//     { date: new Date('2020-01-12'), value: 24 },
//     { date: new Date('2020-01-13'), value: 30 },
//     { date: new Date('2020-01-14'), value: 34 },
//     { date: new Date('2020-01-15'), value: 36 },
//     { date: new Date('2020-01-16'), value: 20 },
//     { date: new Date('2020-01-17'), value: 26 },
//     { date: new Date('2020-01-18'), value: 41 },
//     { date: new Date('2020-01-19'), value: 42 },
//     { date: new Date('2020-01-20'), value: 44 },
//     { date: new Date('2020-01-21'), value: 10 },
//     { date: new Date('2020-01-22'), value: 12 },
//     { date: new Date('2020-01-24'), value: 13 },
//     { date: new Date('2020-01-25'), value: 15 },
//     { date: new Date('2020-01-26'), value: 17 },
//     { date: new Date('2020-01-27'), value: 18 },
//     { date: new Date('2020-01-28'), value: 20 },
//     { date: new Date('2020-01-29'), value: 22 },
//     { date: new Date('2020-01-30'), value: 23 },
//     { date: new Date('2020-01-31'), value: 25 },
//     { date: new Date('2020-02-01'), value: 15 }, // Jump of 5
//     { date: new Date('2020-02-02'), value: 24 },
//     { date: new Date('2020-02-03'), value: 30 },
//     { date: new Date('2020-02-04'), value: 34 },
//     { date: new Date('2020-02-05'), value: 36 },
//     { date: new Date('2020-02-06'), value: 20 },
//     { date: new Date('2020-02-07'), value: 26 },
//     { date: new Date('2020-02-08'), value: 41 },
//     { date: new Date('2020-02-09'), value: 42 },
//     { date: new Date('2020-02-10'), value: 44 },
//     { date: new Date('2020-02-11'), value: 10 },
//     { date: new Date('2020-02-12'), value: 12 },
//     { date: new Date('2020-02-13'), value: 13 },
//     { date: new Date('2020-02-14'), value: 15 },
// ];

// const simplifiedData = [
//   { date: "2013-04-28", value: 135.98 },
//   { date: "2013-05-01", value: 139.89 },
//   { date: "2013-06-01", value: 129.78 },
//   { date: "2013-07-01", value: 97.66 },
//   { date: "2013-08-01", value: 108 },
//   { date: "2013-09-01", value: 145.81 },
//   { date: "2013-10-01", value: 134.63 },
//   { date: "2013-11-01", value: 206.65 },
//   { date: "2013-12-01", value: 1133.08 },
//   { date: "2014-01-01", value: 775.35 },
//   // Continue for each month...
//   { date: "2017-11-01", value: 6767.31 },
//   { date: "2017-12-01", value: 11046.7 },
//   { date: "2018-01-01", value: 14112.2 },
//   { date: "2018-02-01", value: 10288.8 },
//   { date: "2018-03-01", value: 11052.3 },
//   { date: "2018-04-01", value: 7060.95 }
// ];

// Extra graphs created to check visulizations of different kinds
    // const card = document.createElement('div');
    // card.className = 'card';
    // card.appendChild(Utils.createLineChart(multiData));
    // card.appendChild(Utils.createZoomableLineChart (data));
    // card.appendChild(Utils.SmoothLineChart());
    // Utils.generateLineChart(scalar);

  
    // card.appendChild(Utils.generateLineChart(layer,tag,scalar,idx));



