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
        const row = table.insertRow();
        row.insertCell().textContent = tag;
        const cell = row.insertCell();
        // cell.textContent = scalars
        cell.appendChild(createDataSelector(scalars));
      }
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
  
  
    // return canvas;
  
}


function createElement(tag, className) {
    const result = document.createElement(tag);
    if (className) {
      result.className = className;
    }
    return result;
  }
  