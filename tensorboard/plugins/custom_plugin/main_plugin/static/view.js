const aapl = [
  {date: new Date('2007-04-23'), close: 10.24},
  {date: new Date('2007-04-24'), close: 20.35},
  {date: new Date('2007-04-25'), close: 30.84},
  {date: new Date('2007-04-26'), close: 40.92},
  {date: new Date('2007-04-29'), close: 50.8},
  {date: new Date('2007-05-01'), close: 60.47},
  {date: new Date('2007-05-02'), close: 70.39},
  {date: new Date('2007-05-03'), close: 80.4},
  {date: new Date('2007-05-04'), close: 90.81},
  {date: new Date('2007-05-07'), close: 10.92},
  {date: new Date('2007-05-08'), close: 11.06},
  {date: new Date('2007-05-09'), close: 12.88},
  // Add more objects as needed
];

const aapl2 = [
  {date: new Date('2007-04-23'), close: 5.24},
  {date: new Date('2007-04-24'), close: 45.35},
  {date: new Date('2007-04-25'), close: 30.84},
  {date: new Date('2007-04-26'), close: 50.92},
  {date: new Date('2007-04-29'), close: 60.8},
  {date: new Date('2007-05-01'), close: 70.47},
  {date: new Date('2007-05-02'), close: 20.39},
  {date: new Date('2007-05-03'), close: 80.4},
  {date: new Date('2007-05-04'), close: 10.81},
  {date: new Date('2007-05-07'), close: 20.92},
  {date: new Date('2007-05-08'), close: 21.06},
  {date: new Date('2007-05-09'), close: 22.88}
  // Add more objects as needed
];

const multiData = [aapl,aapl2]

export function createRunSelector(runs,class_name="run-selector") {
    /**
     * Build a component in this form:
     *   <select class="run-selector">
     *     <option value="${run}">${run}</option>
     *     ...
     *   </select>
     */
    const element = createElement('select', class_name);
    for (const run of runs) {
      element.options.add(new Option(run, run));
    }
  
    return element;
  }

export function createPreviews(tagsToScalars) {
    const fragment = document.createDocumentFragment();
  
    if (!tagsToScalars.size) {
      const messageElement = createElement('h2');
      messageElement.textContent = 'No tags found.';
      fragment.appendChild(messageElement);
      return fragment;
    }
    else{
      const table = createElement('table', 'preview-table');
      


      for (const [tag, scalars] of tagsToScalars) {
        // console.log(scalars);
        // createCollapsibleComponent(fragment);
        const row = table.insertRow();
        row.insertCell().textContent = tag;
        const cell = row.insertCell();
        // cell.textContent = scalars
        cell.appendChild(createDataSelector(scalars));
      }

      let extra = createLayerDrawers(tagsToScalars);
      fragment.appendChild(extra);

      fragment.appendChild(table);
      // fragment.appendChild
      return fragment;
    }
}


function createDataSelector(scalars) {
  const Array = [];
  for (const scalar of scalars) {
    Array.push(scalar);
  }
  return createRunSelector(Array,"data-selector");

}

export function createLayerDrawers(tagsToScalars) {

  if (!tagsToScalars || tagsToScalars.length === 0) {
      console.error('No FAQ data provided.');
      alert('No FAQ data provided.');
      return null;
  }

  // Create the container div
  const container = document.createElement('div');
  container.className = 'container';

  let uniqueArray = [];
  // Create each FAQ drawer and append to the container
  tagsToScalars.forEach((scalars, run) => {

    let [prefix_run, tag] = run.split("/");


    if (!uniqueArray.includes(prefix_run)) {
          uniqueArray.push(prefix_run);
    }

    let map_info = {
      "tag_name":tag,
      "tag_scalar":scalars,
    };


    console.log(tagsToScalars);
    console.log(tag);
    console.log("abc ="+scalars);
      const drawer = document.createElement('div');
      drawer.classList.add('faq-drawer');

      const input = document.createElement('input');
      input.id = prefix_run
      input.className = 'faq-drawer__trigger';
      input.type = 'checkbox';

      const label = document.createElement('label');
      label.className = 'faq-drawer__title';
      label.setAttribute('for', prefix_run);
      label.textContent = prefix_run

      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'faq-drawer__content-wrapper';

      const content = document.createElement('div');
      content.className = 'faq-drawer__content';
      content.innerHTML = prefix_run.content || ''; // Ensure content is a string, even if empty

      contentWrapper.appendChild(content);

      drawer.appendChild(input);
      drawer.appendChild(label);
      drawer.appendChild(contentWrapper);

      container.appendChild(drawer);
  });

  return container;
}


function createElement(tag, className) {
    const result = document.createElement(tag);
    if (className) {
      result.className = className;
    }
    return result;
  }
  