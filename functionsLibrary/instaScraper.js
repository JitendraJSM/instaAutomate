const fs = require("fs-extra");

// ==== All Resources Data Functions ====
const readAllResourcesData = async () => JSON.parse(await fs.readFile("./data/instaResourcesData/allResourcesData.json"));
readAllResourcesData.shouldStoreState = "allResourcesData";

const writeAllResourcesData = async function (allResourcesData) {
  if (!allResourcesData || !Array.isArray(allResourcesData)) throw new Error(`Invalid allResourcesData object provided. It must be an array.`);

  // Ensure all profiles have userName, userDataPath properties and do not have duplicate objects in dueTasks
  allResourcesData.forEach((resourceProfile) => {
    if (!resourceProfile.userName || !resourceProfile.resourceDataPath) throw new Error(`Invalid resourcesProfile object provided. It must contain userName and resourceDataPath properties.`);
  });

  await fs.writeFile("./data/instaResourcesData/allResourcesData.json", JSON.stringify(allResourcesData, null, 2));
  this.state.allResourcesData = allResourcesData; // Update the state with the new data
  console.log(`Updated allResourcesData.json with ${allResourcesData.length} resources.`);
  return true;
};
writeAllResourcesData.doNotParseArgumentString = true;

const updateAllResourcesDataForLastUpdate = async function (userName) {
  if (!this.state.allResourcesData) this.state.allResourcesData = await readAllResourcesData.call(this);
  if (!userName) throw new Error("UserName is required to update allResourcesData for last update.");
  const index = this.state.allResourcesData.findIndex((resource) => resource.userName === userName);
  if (index === -1) throw new Error(`Resource data for user: ${userName} not found in allResourcesData.`);
  this.state.allResourcesData[index].lastUpdate = new Date().toISOString();
  await writeAllResourcesData.call(this, this.state.allResourcesData);
  return true;
};
updateAllResourcesDataForLastUpdate.doNotParseArgumentString = true;

// ==== Specific Resource Data Functions ====
const getResourceDataPath = async function (userName) {
  if (!this.state.allResourcesData) this.state.allResourcesData = await readAllResourcesData();

  if (!userName) throw new Error("UserName is required to get resources data path.");

  let resourceDataPath = this.state.allResourcesData.find((resource) => resource.userName === userName)?.resourceDataPath;

  if (!resourceDataPath) {
    console.log(
      `No resourceDataPath found for user: ${userName}, Either there is no user details in allResources for : ${userName}, or the ${userName} has no "resourceDataPath" defined in allResourcesData.json`
    );

    resourceDataPath = `./data/instaResourcesData/${userName}/${userName}-data.json`;
    console.log("\x1b[33m%s\x1b[0m", `Creating a new resourceDataPath for user: ${userName} at ${resourceDataPath}`);
  }
  return resourceDataPath;
};
getResourceDataPath.doNotParseArgumentString = true;

const createNewResourceDir = async function (userName) {
  if (!userName) throw new Error("UserName is required to create a new resource directory.");

  if (!this.state.allResourcesData) this.state.allResourcesData = await readAllResourcesData();
  if (this.state.allResourcesData.some((resource) => resource.userName === userName)) throw new Error(`Resource directory for user: ${userName} already exists.`);

  const userInput = await this.utils.askUser(`Do you want to create a new resource directory for user: ${userName}? (y/n): `);
  if (userInput.toLowerCase() === "y") {
    const resourceDataPath = `./data/instaResourcesData/${userName}/${userName}-data.json`;
    await fs.ensureDir(`./data/instaResourcesData/${userName}`);
    await fs.writeJSON(resourceDataPath, { userName, resourceDataPath }, { spaces: 2 });
    this.state.allResourcesData.push({ userName, resourceDataPath });
    await writeAllResourcesData.call(this, this.state.allResourcesData);
    console.log(`Created new resource directory for user: ${userName} at ${resourceDataPath}`);
    return resourceDataPath;
  }
  return false; // If user chooses not to create a new directory, return false
};
createNewResourceDir.doNotParseArgumentString = true;

const readResourceData = async function (userName) {
  const resourceDataPath = await getResourceDataPath.call(this, userName);

  if (!fs.existsSync(resourceDataPath)) await createNewResourceDir.call(this, userName);

  return await fs.readJSON(resourceDataPath);
};
readResourceData.shouldStoreState = "currentResourceData";
readResourceData.doNotParseArgumentString = true;

const updateResourceData = async function (resourceData) {
  if (!resourceData || typeof resourceData !== "object") throw new Error("Resource data must be a valid object.");
  if (!resourceData.userName) throw new Error("UserName is required to write resources data.");

  const userName = resourceData.userName;
  // const resourceDataPath = await getResourceDataPath.call(this, userName);
  const oldResourceData = await readResourceData.call(this, userName); // This will call createNewResourceDir if not exist.
  const newResourceData = { ...oldResourceData, ...resourceData, lastUpdate: new Date().toISOString() };

  await fs.writeJSON(newResourceData.resourceDataPath, newResourceData, { spaces: 2 });

  const isAllResourcesDataUpdated = await updateAllResourcesDataForLastUpdate.call(this, userName);

  console.log(`Resource data for ${userName} written successfully to ${newResourceData.resourceDataPath} & allResourcesData updated: ${isAllResourcesDataUpdated}.`);
  return true;
};
updateResourceData.doNotParseArgumentString = true;

const testing = async function () {
  const resultOfTestingFunction = await updateResourceData.call(this, {
    userName: "its_cute_girl__85",
    testProrty: "testValue",
  });
  console.log(`Result of testing function: ${resultOfTestingFunction}`);
};

// (async () => {
//   try {
//     const res = await readResourceData("its_cute_girl__85");
//     console.log(`res is as below:`);
//     console.log(res);
//   } catch (err) {
//     console.error("Error in IIFE:", err);
//   }
// })();
const extractPostsFromResponse = async function (responseJSON) {
  // const postsArray = [];

  responseJSON.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges.forEach((postNode) => {
    if (this.state.scrapedMetaDataOfPosts.some((post) => post.code === postNode.node.code)) return;
    try {
      const node = {
        code: postNode.node.code,
        pk: postNode.node.pk,
        caption: postNode.node.caption,
        caption: postNode.node.taken_at, // this is date and time of post upload/1000
        userName: postNode.node.owner.username,
        coauthor_producers: postNode.node.coauthor_producers,
        title: postNode.node.title,
        comment_count: postNode.node.comment_count,
        like_count: postNode.node.like_count,
        product_type: postNode.node.product_type,
        media_type: postNode.node.media_type,
        clips_metadata: postNode.node.clips_metadata,
        comments: postNode.node.comments,
        location: postNode.node?.location,
      };
      if (postNode.node.product_type === "clips") node.video_versions = postNode.node.video_versions[0].url;
      else if (postNode.node.product_type === "feed") {
        node.image_versions2 = postNode.node.image_versions2.candidates[0].url;
        node.accessibility_caption = postNode.node.accessibility_caption;
      } else if (postNode.node.product_type === "carousel_container") {
        node.carousel_media_count = postNode.node.carousel_media_count;
        node.carousel_media = [];
        node.carousel_media_count = postNode.node.carousel_media.forEach((obj, i) => node.carousel_media.push({ url: obj.image_versions2.candidates[0].url, imgIndex: i }));
      }
      this.state.scrapedMetaDataOfPosts.push(node);
    } catch (error) {
      console.log(error);

      console.log(`Cannot extract data from postNade: ${postNode}`);
      console.log(`-=-=-=-=-=-=-=-`);
      console.log(postNode.node.code);
      console.log(`-=-=-=-=-=-=-=-`);
    }
  });
  return true;
};

const postsScraper = async function () {
  // Read Already existed data
  const userDataPath = "./scraperTesting/extractedPosts.json"; // this file must be array
  this.state.scrapedMetaDataOfPosts = JSON.parse(await fs.readFile(userDataPath));
  // Filter function - process requests
  const filterFn = async (request, response) => {
    {
      if (request.url() === "https://www.instagram.com/graphql/query") {
        const headers = request.headers()["x-fb-friendly-name"];
        console.log("Request Headers:", headers);
        return true;
      }
      // return request.resourceType() === "image" && response.status() === 200;
    }
  };

  // Handler function - successful requests
  const handlerFn = async (request, response) => {
    if (request.headers()["x-fb-friendly-name"] === "PolarisProfilePostsQuery" || request.headers()["x-fb-friendly-name"] === "PolarisProfilePostsTabContentQuery_connection") {
      const resJSON = await response.json();
      console.log(`==============================================`);
      await fs.appendFile("./scraperTesting/responseAsItIs.json", JSON.stringify(resJSON, null, 2) + ",\n");

      console.log(`OK check Appended. ---`);
      console.log(`Currently length of scrapedMetaDataOfPosts is : ${this.state.scrapedMetaDataOfPosts.length}`);

      await extractPostsFromResponse.call(this, resJSON);
      await fs.writeFile("./scraperTesting/extractedPosts.json", JSON.stringify(this.state.scrapedMetaDataOfPosts, null, 2));
      console.log(`==============================================`);
    }
  };

  // const interceptCompletedRequests = createRequestInterceptor.call(this, filterFn.bind(this), handlerFn.bind(this));

  // Apply the interceptor to completed requests
  await this.page.interceptRequests({ interceptCompletedOnly: true }, filterFn.bind(this), handlerFn.bind(this));

  console.log("postsScraper function completed.");
};
const catchAsync = require("../utils/catchAsync.js");
module.exports = {
  postsScraper: catchAsync(postsScraper),
  readResourceData: catchAsync(readResourceData),
  testing: catchAsync(testing),
};
