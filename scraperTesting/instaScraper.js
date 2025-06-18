/**
 * Intercepts network requests in a Puppeteer page
 *
 * @param {Object} page - Puppeteer page instance
 * @param {Object} options - Configuration options
 * @param {boolean} options.interceptCompletedOnly - If true, intercepts only completed requests. If false, intercepts requests before they are sent.
 * @param {Function} filterFn - Function that determines if a request should be processed.
 *                             Receives request and response (if completed) as arguments.
 *                             Should return true if the request should be processed.
 * @param {Function} handlerFn - Function that processes the request if filterFn returns true.
 *                              Receives request and response (if completed) as arguments.
 * @returns {Promise<void>}
 */
async function interceptRequests(page, options, filterFn, handlerFn) {
  if (!page) {
    throw new Error("Page instance is required");
  }

  if (typeof filterFn !== "function") {
    throw new Error("Filter function is required");
  }

  if (typeof handlerFn !== "function") {
    throw new Error("Handler function is required");
  }

  const interceptCompletedOnly = options?.interceptCompletedOnly ?? false;

  if (interceptCompletedOnly) {
    // Intercept completed requests
    page.on("response", async (response) => {
      try {
        const request = response.request();

        // Check if this request should be processed
        if (await filterFn(request, response)) {
          await handlerFn(request, response);
        }
      } catch (error) {
        console.error("Error in response interceptor:", error);
      }
    });
  } else {
    // Intercept requests before they are sent
    await page.setRequestInterception(true);

    page.on("request", async (request) => {
      try {
        // Check if this request should be processed
        if (await filterFn(request, null)) {
          await handlerFn(request, null);
        }

        // Continue the request (important!)
        if (!request.isInterceptionHandled()) {
          await request.continue();
        }
      } catch (error) {
        console.error("Error in request interceptor:", error);
        // Make sure the request continues even if there's an error
        if (!request.isInterceptionHandled()) {
          await request.continue();
        }
      }
    });
  }
}

/**
 * Creates a robust request interceptor that can be easily configured
 *
 * @param {Function} filterFn - Function that determines if a request should be processed.
 *                             Receives request and response (if completed) as arguments.
 *                             Should return true if the request should be processed.
 * @param {Function} handlerFn - Function that processes the request if filterFn returns true.
 *                              Receives request and response (if completed) as arguments.
 * @returns {Function} - A configured interceptor function that takes a page and options
 */
// function createRequestInterceptor(filterFn, handlerFn) {
//   return async function (page, options = { interceptCompletedOnly: false }) {
//     await interceptRequests(page, options, filterFn, handlerFn);
//   };
// }

const fs = require("fs-extra");

const extractPostsFromResponse = async function (responseJSON) {
  // const postsArray = [];

  responseJSON.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges.forEach((postNode) => {
    if (this.state.scrapedMetaDataOfPosts.some((post) => post.code === postNode.code)) return;
    try {
      this.state.scrapedMetaDataOfPosts.push({
        code: postNode.node.code,
        pk: postNode.node.pk,
        caption: postNode.node.caption,
        video_versions: postNode.node.video_versions[0].url,
        user: postNode.node.user.username,
        user: postNode.node.user,
        coauthor_producers: postNode.node.coauthor_producers,
        title: postNode.node.title,
        comment_count: postNode.node.comment_count,
        like_count: postNode.node.like_count,
        product_type: postNode.node.product_type,
        media_type: postNode.node.media_type,
        clips_metadata: postNode.node.clips_metadata,
        comments: postNode.node.comments,
      });
    } catch (error) {
      console.log(`Cannot extract data from postNade: ${postNode}`);
      console.log(`88888888888`);
      console.log(postNode);
      console.log(`88888888888`);
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
  await interceptRequests(this.page, { interceptCompletedOnly: true }, filterFn.bind(this), handlerFn.bind(this));

  console.log("postsScraper function completed.");
};
const catchAsync = require("../utils/catchAsync.js");
module.exports = {
  postsScraper: catchAsync(postsScraper),
  interceptRequests,
  // createRequestInterceptor,
};
