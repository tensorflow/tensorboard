import * as Model from './model.js';

// Global variable to store the run to tag info.
let runToTagInfo = null;
let uniqueTags = [];

// Specific Tag Information Handling
let start_time_execution = [];
let end_time_execution = [];



// WSGI server will serve the data from the backend.
async function updateRunInfo() {
    if (!runToTagInfo) {
      runToTagInfo = (await fetchJSON('./tags')) || {};
      console.log('runToTagInfo', runToTagInfo);
    }
  }

//return the object containig the tags and the runs.
  export async function getRuns() {
    await updateRunInfo();
    return Object.keys(runToTagInfo);
  }

  export async function getTagsToScalars(run) {
    const result = new Map();
  
    const tags = await getTags(run);
    if (!tags) {
      return result;
    }
  

    // Impliment some loginc here to save start_time_execution and end_time_execution
    const scalarPromises = tags.map(async (tag) => {
      const [prefix, type] = tag.split("/"); // Split the tag into prefix and type.

      if (!uniqueTags.includes(prefix)) {
        uniqueTags.push(prefix);
      }

      const scalars = await getScalars(run, tag);
      if (scalars) {
        let typeMap;
        if (result.has(prefix)) {
          // If the prefix already exists in the result map, get the inner map.
          typeMap = result.get(prefix);
        } else {
          // Otherwise, create a new map for this prefix.
          typeMap = new Map();
          result.set(prefix, typeMap);
        }
        // Set the scalars array for the type (train/test) in the inner map.
        typeMap.set(type, scalars);
      }
    });

    console.log("result",result)
  
    await Promise.all(scalarPromises);
    return result;
  }


  export function process_data(data) {
    if(runToTagInfo){
      
    }
  }
  
  async function getTags(run) {
    await updateRunInfo();
    return runToTagInfo[run] || null;
  }

  async function getScalars(run, tag) {
    const params = new URLSearchParams({run, tag});
    return await fetchJSON(`./systerm?${params}`);
  }


  async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return response.json();
  }