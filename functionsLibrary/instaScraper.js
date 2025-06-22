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
    const newResourceObj = { userName, resourceDataPath, posts: [], followers: [], followings: [] };

    await fs.ensureDir(`./data/instaResourcesData/${userName}`);
    await fs.writeJSON(resourceDataPath, newResourceObj, { spaces: 2 });
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

const scrapeUserData = async function (userName, needFollowers = true, needFollowings = true) {
  // const userName = "diwanshi1619";
  // const userName = "best.frnds.jsm";
  /* It is not needed to navigate to user before scraping but it is better so not get banned.*/
  if (this.page.url() !== `https://www.instagram.com/${userName}`) await this.page.navigateTo(`https://www.instagram.com/${userName}`);

  let scrapedData;
  // --- Logic for scraping data is copied from "getUserDataFromInterceptedRequest" function of instaAuto git repo of mifi.
  const t = setTimeout(async () => {
    console.log("Unable to intercept request, will send manually");
    try {
      await this.page.evaluate(async (username2) => {
        const response = await window.fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username2.toLowerCase())}`, {
          mode: "cors",
          credentials: "include",
          headers: { "x-ig-app-id": "936619743392459" },
        });
        await response.json(); // else it will not finish the request
      }, userName);
      // todo `https://i.instagram.com/api/v1/users/${userId}/info/`
      // https://www.javafixing.com/2022/07/fixed-can-get-instagram-profile-picture.html?m=1
    } catch (err) {
      console.error("Failed to manually send request", err);
    }
  }, 5000);

  try {
    const [foundResponse] = await Promise.all([
      this.page.waitForResponse(
        (response) => {
          const request = response.request();
          return (
            request.method() === "GET" &&
            new RegExp(`https:\\/\\/i\\.instagram\\.com\\/api\\/v1\\/users\\/web_profile_info\\/\\?username=${encodeURIComponent(userName.toLowerCase())}`).test(request.url())
          );
        },
        { timeout: 30000 }
      ),
      // navigateToUserWithCheck(userName),
      // page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    const json = JSON.parse(await foundResponse.text());
    scrapedData = json.data.user;
  } finally {
    clearTimeout(t);
  }
  console.log("the scraped data is as: ");
  console.log(`User name is: ${scrapedData.username}`);
  console.log(`User's id is: ${scrapedData.id}`);
  console.log(`Number of Posts are: ${scrapedData.edge_owner_to_timeline_media.count}`);
  console.log(`followers are: ${scrapedData.edge_followed_by.count}`);
  console.log(`followings are: ${scrapedData.edge_follow.count}`);
  console.log(`mutual followers are: ${scrapedData.edge_mutual_followed_by.count}`);
  console.log(`1st mutual follower: ${scrapedData.edge_mutual_followed_by.edges[0]}`);

  // Logic to get followers and followings also

  if (needFollowers || needFollowings) {
    const { followers, followings } = await getListOfFollowersOrFollowings.call(this, scrapedData.id, needFollowers, needFollowings);
    scrapedData.followers = followers;
    scrapedData.followings = followings;
  }
  console.log(`Successfully scraped data for user: ${userName}`);

  return scrapedData;
};

const getListOfFollowersOrFollowings = async function (targetUserId, needFollowers, needFollowings) {
  console.log(`Starting to get list of followers or followings...`);

  let page = this.page;
  const instagramBaseUrl = "https://www.instagram.com";

  async function getPageJson() {
    return JSON.parse(await (await (await page.$("pre")).getProperty("textContent")).jsonValue());
  }
  async function* graphqlQueryUsers({ queryHash, getResponseProp, graphqlVariables: graphqlVariablesIn }) {
    const graphqlUrl = `${instagramBaseUrl}/graphql/query/?query_hash=${queryHash}`;

    const graphqlVariables = {
      first: 50,
      ...graphqlVariablesIn,
    };

    const outUsers = [];

    let hasNextPage = true;
    let i = 0;

    while (hasNextPage) {
      const url = `${graphqlUrl}&variables=${JSON.stringify(graphqlVariables)}`;
      // logger.log(url);
      await page.navigateTo(url);
      // await page.goto(url);
      const json = await getPageJson();

      const subProp = getResponseProp(json);
      const pageInfo = subProp.page_info;
      const { edges } = subProp;

      const ret = [];
      edges.forEach((e) => ret.push(e.node.username));

      graphqlVariables.after = pageInfo.end_cursor;
      hasNextPage = pageInfo.has_next_page;
      i += 1;

      if (hasNextPage) {
        // logger.log(`Has more pages (current ${i})`);
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Wait for 1 second before next request
      }

      yield ret;
    }

    return outUsers;
  }
  function getFollowersOrFollowingGenerator({ userId, getFollowers = false }) {
    return graphqlQueryUsers({
      getResponseProp: (json) => json.data.user[getFollowers ? "edge_followed_by" : "edge_follow"],
      graphqlVariables: { id: userId },
      queryHash: getFollowers ? "37479f2b8209594dde7facb0d904896a" : "58712303d941c6855d4e888c5f0cd22f",
    });
  }
  async function getFollowersOrFollowing({ userId, getFollowers = false }) {
    let users = [];
    for await (const usersBatch of getFollowersOrFollowingGenerator({
      userId,
      getFollowers,
    })) {
      users = [...users, ...usersBatch];
    }

    return users;
  }

  // Getting all followers
  let followers, followings;
  if (needFollowers) {
    followers = await getFollowersOrFollowing({
      userId: targetUserId,
      getFollowers: true,
    });
    // console.log(`Followers are as:`);
    // console.log(followers);
  }
  await goInstaHome.call(this);
  if (needFollowings) {
    followings = await getFollowersOrFollowing({
      userId: targetUserId,
      getFollowers: false,
    });
    // console.log(`followings are as:`);
    // console.log(followings);
  }
  await goInstaHome.call(this);
  return { followers, followings };
};

const extractPostsFromResponse = async function (responseJSON) {
  // const postsArray = [];
  // this.state.currentResourceData.posts = []

  responseJSON.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges.forEach((postNode) => {
    if (this.state.currentResourceData.posts.some((post) => post.code === postNode.node.code)) return;
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
      this.state.currentResourceData.posts.push(node);
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

const getScraperConfig = async function (targetString) {
  // Default scraper configuration
  this.state.scraperConftg = {
    isResource: true,
  };
  console.log(`-=-=- Default scraper configuration is as below -=-=-`);
  console.log(this.state.scraperConftg);
  if ((await this.utils.askUser(`Do you want to change the default scraper configuration? (y/n): `)).toLowerCase() === "y") {
    const isResource = await this.utils.askUser(`Is this a resource scraping? (y/n): `);
    this.state.scraperConftg.isResource = isResource.toLowerCase() === "y";
  }
  return this.state.scraperConftg;
};

const resourceScraper = async function (userName) {
  if (!userName) throw new Error("Target string is required for resourceScraper function.");

  this.state.currentResourceData = await readResourceData.call(this, userName);

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

      console.log(`==============================================`); // for testing purpose only
      await fs.appendFile("./scraperTesting/responseAsItIs.json", JSON.stringify(resJSON, null, 2) + ",\n"); // for testing purpose only
      console.log(`Currently length of scrapedMetaDataOfPosts is : ${this.state.currentResourceData.posts.length}`); // for testing purpose only
      console.log(`==============================================`); // for testing purpose only

      await extractPostsFromResponse.call(this, resJSON);
      await fs.writeFile("./scraperTesting/extractedPosts.json", JSON.stringify(this.state.currentResourceData.posts, null, 2));
    }
  };

  // Start the interceptor over completed requests
  await this.page.interceptRequests({ interceptCompletedOnly: true }, filterFn.bind(this), handlerFn.bind(this));

  console.log("postsScraper function completed.");
};

const postsScraper = async function (targetString) {
  if (!targetString) throw new Error("Target string is required for postsScraper function.");

  // 1. Analyze the targetString to identify the type of scraping required (e.g., user profile, hashtag, location).
  let targetStringType;
  if (!targetString.startsWith("https://www.instagram.com/")) targetStringType = "userName";
  else if (targetString.includes("/p/")) targetStringType = "postUrl"; // i.e. a post modal window opened, it can be a image post or video post or carousel post.
  else if (targetString.includes("/reels/")) targetStringType = "reelsHomePageUrl"; // i.e. Reels home page ex. https://www.instagram.com/nanu_cute_00/reels/.
  else if (targetString.includes("/reel/")) targetStringType = "reelUrl"; // i.e. a reel modal window opened, it is a video post. ex. https://www.instagram.com/reel/DLKZmEATRYH/
  else if (targetString.includes("/highlights/")) targetStringType = "highlightsUrl"; // ex. https://www.instagram.com/stories/its_cute_girl__85/
  else if (targetString.includes("/stories/")) targetStringType = "storiesUrl";

  // 2. Get the scraper configuration based on the targetString type.
  this.state.scraperConftg = await getScraperConfig.call(this, targetString);

  // 3. Execute the scraping logic based on the scraperConfig type.
  if (this.state.scraperConftg.isResource) {
    // If it's a resource scraping, we will scrape the metaData & posts of the user.
    const isScrapingSuccess = await resourceScraper.call(this, targetString);
  }
};
const catchAsync = require("../utils/catchAsync.js");
module.exports = {
  postsScraper: catchAsync(postsScraper),
  readResourceData: catchAsync(readResourceData),
  testing: catchAsync(testing),
};
