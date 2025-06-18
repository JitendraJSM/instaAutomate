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
function createRequestInterceptor(filterFn, handlerFn) {
  return async (page, options = { interceptCompletedOnly: false }) => {
    await interceptRequests(page, options, filterFn, handlerFn);
  };
}

const postsScraper = async function () {
  const interceptCompletedRequests = createRequestInterceptor(
    // Filter function - only process image requests
    async (request, response) => {
      {
        console.log(JSON.stringify(request));
        const headers = request.headers();
        let postData = request.postData();
        console.log("Request Headers:", headers);
        if (postData) {
          console.log("Request Body:", postData);
        } else {
          console.log("Request Body: <none>");
        }
        return true;
        // return request.resourceType() === "image" && response.status() === 200;
      }
    },
    // Handler function - log successful image requests
    (request, response) => {
      console.log(`Successful url with res: ${request.url()}`);
    }
  );
  // Apply the interceptor to completed requests
  await interceptCompletedRequests(this.page, { interceptCompletedOnly: true });
  console.log("postsScraper function completed.");
};
const catchAsync = require("../utils/catchAsync.js");
module.exports = {
  postsScraper: catchAsync(postsScraper),
  interceptRequests,
  createRequestInterceptor,
};
