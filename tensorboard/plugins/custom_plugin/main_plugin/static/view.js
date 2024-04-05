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
      const NotagsElement = createElement('div');
      NotagsElement.className = 'no-tags';

      const messageElement = createElement('h2');
      messageElement.className = 'no-tags__message';
      messageElement.textContent = 'No tags found.';
      console.log(tagsToScalars);

      NotagsElement.appendChild(messageElement);

      fragment.appendChild(NotagsElement);
      return fragment;
    }

    else{

      console.log(tagsToScalars);
      if(run == "system_performance"){

        // console.log(tagsToScalars);

        let startTime = new Map();

        tagsToScalars.forEach((scalars, tag) => {

          let time = scalars.get("start_time_execution");
          startTime.set(tag,time[0][2]);

        });

        const sortedMap = new Map([...startTime.entries()].sort((a, b) => a[1] - b[1]));
        console.log("sorted values",sortedMap);

        const data = merge(tagsToScalars,sortedMap);
        console.log("merged data",data);

        data.forEach((value,context) => {

          const drawer = document.createElement('div');
          drawer.classList.add('faq-drawer');
    
    
          const input = document.createElement('input');
          input.className = 'faq-drawer__trigger';
          input.type = 'checkbox';
          input.id = `drawer_${context != undefined ? context : "Energy"}`;
    
    
          const label = document.createElement('label');
          label.className = 'faq-drawer__title';
          label.setAttribute('for', `drawer_${context != undefined ? context : "Energy"}`);
          label.textContent = context != undefined ? context : "Energy";
    
    
          const contentWrapper = document.createElement('div');
          contentWrapper.className = 'faq-drawer__content-wrapper';
          contentWrapper.id =  `wrapper_${context != undefined ? context : "Energy"}`;
    
    
          const content = document.createElement('div');
          content.className = 'faq-drawer__content';
    
          content.appendChild(Utils.FinalResource(context,value,Array.from(sortedMap.keys())));
          contentWrapper.appendChild(content);
          drawer.appendChild(input);
          drawer.appendChild(label);
          drawer.appendChild(contentWrapper);
          fragment.appendChild(drawer);

          // fragment.appendChild(Utils.FinalResource(context,value,Array.from(sortedMap.keys()))); 
        });

      }
      else{
        let extra = createLayerDrawers(run, tagsToScalars);
        fragment.appendChild(extra);
      }
      return fragment;
    }

  }


  function convertToNanoseconds(startTime, elapsedTimeInSeconds) {
    // Convert seconds to nanoseconds
    const elapsedTimeInNanoseconds = elapsedTimeInSeconds * 1e9;
  
    
    // Add elapsed time to the start time
    const newTimestamp = startTime + elapsedTimeInNanoseconds;
    
    return newTimestamp;
}

function calculateNewTimestamp1(originalTimestamp, timeElapsedInSeconds) {
  // Convert time elapsed from seconds to nanoseconds
  const timeElapsedInNanoseconds = Math.floor(timeElapsedInSeconds * 1e9);
  
  // Add time elapsed to the original timestamp
  const newTimestamp = BigInt(originalTimestamp) + BigInt(timeElapsedInNanoseconds);
  
  return Number(newTimestamp);
}

function padZero(number, width = 2) {
    return String(number).padStart(width, '0');
}

function merge(tagsToScalars, map, timeOffset = 1) {

  let uniqeContext = [];
  let graphData = new Map();
  // let tagData = new Map();
  // let cpu = [];
  // let ram = [];
  // let gpu = [];
  // let gpuTemp = [];

// let mergedCPU = [].concat(...tagsToScalars.forEach(t => t.get("CPU")));
// console.log(mergedCPU);

  map.keys().forEach((tag) => {

    let target = tagsToScalars.get(tag);
    let start = target.get("start_time_execution")[0][1];
      
    // let cpuData = target.get("CPU").map((item) => {
    //   // console.log("item=",item);
    //   return {timestamp:Math.floor(convertToNanoseconds(start,item[1]/1000000000)/1000000), energy:item[2]};
    // });

    // let ramData = target.get("RAM").map((item) => {
    //   return {timestamp:Math.floor(convertToNanoseconds(start,item[1]/1000000000)/1000000), energy:item[2]};
    // });

    // let gpuData = target.get("GPU").map((item) => {
    //   return {timestamp:item[1]/1000000, energy:item[2]};
    // });

    // let gpuTempData = target.get("GPU-temperature").map((item) => {
    //   return {timestamp:item[1]/1000000, energy:item[2]};
    // });

    target.forEach((value,key) => {
      console.log(key,value);

      let [resorceKey,context] = key.split("-");
      console.log(resorceKey,context);

      if (!uniqeContext.includes(context)) {
        uniqeContext.push(context);

        let tagData = new Map();

        if (tagData.has(key) && key != "start_time_execution" && key != "end_time_execution") {
          const existingArray = tagData.get(key);
    
          let arrayToAppend = target.get(key).map((item) => {
            return {timestamp:(item[1]/timeOffset)/1000000, energy:item[2]};
          });
    
          existingArray.push(arrayToAppend);
          tagData.set(key, existingArray);
        } 
        else if(key != "start_time_execution" && key != "end_time_execution")
        {
            let arrayToAppend = target.get(key).map((item) => {
              return {timestamp:(item[1]/timeOffset)/1000000, energy:item[2]};
            });
    
            tagData.set(key, [arrayToAppend]);
        }

        graphData.set(context,tagData);
      }
      else{

        let tagData = graphData.get(context);

        if (tagData.has(key) && key != "start_time_execution" && key != "end_time_execution") {
          const existingArray = tagData.get(key);
    
          let arrayToAppend = target.get(key).map((item) => {
            return {timestamp:(item[1]/timeOffset)/1000000, energy:item[2]};
          });
    
          existingArray.push(arrayToAppend);
          tagData.set(key, existingArray);
        } 
        else if(key != "start_time_execution" && key != "end_time_execution")
        {
            let arrayToAppend = target.get(key).map((item) => {
              return {timestamp:(item[1]/timeOffset)/1000000, energy:item[2]};
            });
    
            tagData.set(key, [arrayToAppend]);
        }

      }

      // if (tagData.has(key) && key != "start_time_execution" && key != "end_time_execution") {
      //   const existingArray = tagData.get(key);
  
      //   let arrayToAppend = target.get(key).map((item) => {
      //     return {timestamp:(item[1]/timeOffset)/1000000, energy:item[2]};
      //   });
  
      //   existingArray.push(arrayToAppend);
      //   tagData.set(key, existingArray);
      // } 
      // else if(key != "start_time_execution" && key != "end_time_execution")
      // {
      //     let arrayToAppend = target.get(key).map((item) => {
      //       return {timestamp:(item[1]/timeOffset)/1000000, energy:item[2]};
      //     });
  
      //     tagData.set(key, [arrayToAppend]);
      // }

    });

    
    

    // tagData.set("cpu",cpuData);
    // tagData.set("ram",ramData);
    // tagData.set("gpu",gpuData);
    // tagData.set("GPU-temperature",gpuTempData);

    // cpu.push(cpuData);
    // gpu.push(gpuData);
    // ram.push(ramData);

  });

  return graphData;

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
    //deprecated - direct controll is passed 
  }
  else if(run === "calculate_states"){

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
// ];

// const simplifiedData = [
//   { date: "2013-04-28", value: 135.98 },
//   { date: "2013-05-01", value: 139.89 },
//   { date: "2013-06-01", value: 129.78 },
//   { date: "2013-07-01", value: 97.66 },
// ];


// Extra graphs created to check visulizations of different kinds - if you are modifying the extension send appropriatedata
// Different graph uses different data so analyze the method to decide what is the format. - Above are few examples only.

    // const card = document.createElement('div');
    // card.className = 'card';
    // card.appendChild(Utils.createLineChart(multiData));
    // card.appendChild(Utils.createZoomableLineChart (data));
    // card.appendChild(Utils.SmoothLineChart());
    // Utils.generateLineChart(scalar);

  
    // card.appendChild(Utils.generateLineChart(layer,tag,scalar,idx));



