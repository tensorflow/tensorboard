import * as Model from './model.js';

// Global variable to store the run to tag info.
let runToTagInfo = null;


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
  
    const scalarPromises = tags.map(async (tag) => {
      const scalars = await getScalars(run, tag);
      console.log(scalars);
      if (scalars) {
        result.set(tag, scalars);
      }
    });
    await Promise.all(scalarPromises);
  
    return result;
  }

// Get tags for furthure usage.
  async function getTags(run) {
    await updateRunInfo();
    return runToTagInfo[run] || null;
  }

  async function getScalars(run, tag) {
    const params = new URLSearchParams({run, tag});
    return await fetchJSON(`./systerm_performance?${params}`);
  }


  async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return response.json();
  }