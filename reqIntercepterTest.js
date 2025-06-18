/**
 * Test script for Request Interceptor
 * 
 * This script demonstrates how to use the request interceptor module
 * with different configurations.
 */

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { createRequestInterceptor } = require("./reqIntercepter");

// Apply stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

/**
 * Test function to demonstrate request interception
 */
async function testRequestInterception() {
  console.log("Starting request interception test...");
  
  // Launch browser
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--window-size=1280,800']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log("Browser launched successfully");
    
    // Example 1: Intercept completed requests (responses)
    console.log("Setting up completed request interceptor...");
    
    // Create an interceptor for completed requests (responses)
    const interceptCompletedRequests = createRequestInterceptor(
      // Filter function - check if this is a JSON response
      (request, response) => {
        const contentType = response.headers()['content-type'] || '';
        return contentType.includes('application/json');
      },
      // Handler function - log JSON responses
      (request, response) => {
        console.log(`[COMPLETED] JSON response from: ${request.url()}`);
        // You can also clone the response and read its body
        response.json().then(data => {
          console.log("Response data sample:", JSON.stringify(data).substring(0, 100) + "...");
        }).catch(err => {
          console.log("Could not parse JSON response");
        });
      }
    );
    
    // Apply the completed requests interceptor
    await interceptCompletedRequests(page, { interceptCompletedOnly: true });
    
    // Example 2: Intercept requests before they are sent
    console.log("Setting up pre-request interceptor...");
    
    // Create an interceptor for requests before they are sent
    const interceptBeforeSending = createRequestInterceptor(
      // Filter function - only process image requests
      (request) => {
        return request.resourceType() === "image";
      },
      // Handler function - log and modify image requests
      (request) => {
        console.log(`[PRE-REQUEST] Image request to: ${request.url()}`);
        
        // Example: You could modify headers for these requests
        const headers = request.headers();
        headers["Cache-Control"] = "no-cache";
        
        // Continue the request with modified headers
        request.continue({ headers });
      }
    );
    
    // Apply the pre-request interceptor
    await interceptBeforeSending(page, { interceptCompletedOnly: false });
    
    // Navigate to a page with various request types
    console.log("Navigating to test page...");
    await page.goto("https://jsonplaceholder.typicode.com/", { 
      waitUntil: "networkidle2",
      timeout: 30000
    });
    
    // Click on a link that will trigger a JSON API request
    console.log("Clicking on a link to trigger API requests...");
    await page.click('a[href="/posts"]');
    
    // Wait for network to be idle
    await page.waitForNetworkIdle({ idleTime: 1000 });
    
    console.log("Test completed successfully");
    
    // Keep the browser open for a while to observe the results
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error("Error during test:", error);
  } finally {
    // Close the browser
    await browser.close();
    console.log("Browser closed");
  }
}

/**
 * Advanced example showing how to use the request interceptor for specific use cases
 */
async function advancedExample() {
  console.log("Starting advanced request interception example...");
  
  // Launch browser
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--window-size=1280,800']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Example: Intercept and modify API requests
    const interceptApiRequests = createRequestInterceptor(
      // Filter function - check if this is an API request
      (request) => {
        return request.url().includes('/api/') || 
               request.url().includes('.json');
      },
      // Handler function - modify API requests
      (request) => {
        console.log(`Intercepted API request to: ${request.url()}`);
        
        // Example: Add authentication headers
        const headers = request.headers();
        headers["Authorization"] = "Bearer fake-token-for-demo";
        
        // Example: Modify request body (if it's a POST request)
        if (request.method() === 'POST') {
          let postData = request.postData();
          
          if (postData) {
            try {
              // Parse the post data if it's JSON
              const jsonData = JSON.parse(postData);
              
              // Add a custom field
              jsonData.interceptedAt = new Date().toISOString();
              
              // Continue with modified data
              request.continue({
                headers,
                postData: JSON.stringify(jsonData)
              });
              return; // Important: return early since we've handled the request
            } catch (e) {
              console.log("Not JSON post data, continuing with header modification only");
            }
          }
        }
        
        // Continue the request with modified headers
        request.continue({ headers });
      }
    );
    
    // Apply the API request interceptor
    await interceptApiRequests(page, { interceptCompletedOnly: false });
    
    // Example: Log all network errors
    const interceptNetworkErrors = createRequestInterceptor(
      // Filter function - process all responses
      (request, response) => {
        // Check if this is a failed response (4xx or 5xx status)
        return response && response.status() >= 400;
      },
      // Handler function - log network errors
      (request, response) => {
        console.error(`Network error: ${response.status()} ${response.statusText()} for ${request.url()}`);
      }
    );
    
    // Apply the network error interceptor
    await interceptNetworkErrors(page, { interceptCompletedOnly: true });
    
    // Navigate to test page
    await page.goto("https://jsonplaceholder.typicode.com/", { 
      waitUntil: "networkidle2" 
    });
    
    // Test a POST request
    console.log("Making a POST request...");
    await page.evaluate(() => {
      fetch('/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Post',
          body: 'This is a test post',
          userId: 1
        }),
        headers: {
          'Content-type': 'application/json; charset=UTF-8',
        },
      })
      .then(response => response.json())
      .then(json => console.log('Post response:', json));
    });
    
    // Test a request that will result in an error (404)
    console.log("Making a request that will result in a 404 error...");
    await page.evaluate(() => {
      fetch('/nonexistent-endpoint')
        .then(response => {
          console.log('Error response status:', response.status);
        })
        .catch(error => console.error('Fetch error:', error));
    });
    
    // Wait for network to be idle
    await page.waitForNetworkIdle({ idleTime: 1000 });
    
    console.log("Advanced example completed successfully");
    
    // Keep the browser open for a while to observe the results
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error("Error during advanced example:", error);
  } finally {
    // Close the browser
    await browser.close();
    console.log("Browser closed");
  }
}

// Run the test
(async () => {
  console.log("=== BASIC TEST ===");
  await testRequestInterception();
  
  console.log("\n=== ADVANCED EXAMPLE ===");
  await advancedExample();
  
  console.log("\nAll tests completed");
})();
