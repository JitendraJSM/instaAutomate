let myObj = {};
const findNestedKey = (obj, targetKey) => {
  if (obj && typeof obj === "object") {
    if (obj[targetKey]) return obj[targetKey];
    for (const key in obj) {
      const result = findNestedKey(obj[key], targetKey);
      if (result) return result;
    }
  }
  return null;
};

const scriptElementsArray = [...document.querySelectorAll('script[type="application/json"][data-content-len][data-sjs][data-processed]')].filter(
  (el) =>
    el.attributes.length === 4 &&
    (function hasEdges(obj) {
      if (obj && typeof obj === "object") {
        if ("edges" in obj) return true;
        return Object.values(obj).some((v) => hasEdges(v));
      }
      return false;
    })(JSON.parse(el.textContent))
);

if (!scriptElementsArray.length) console.warn("No matching script elements found!");
for (const scriptElement of scriptElementsArray) {
  const data = JSON.parse(scriptElement.textContent);
  myObj.edgesArray = [];
  myObj.edgesArray.push(findNestedKey(data, "edges"));
  myObj.pageInfo = [];
  myObj.pageInfo.push(findNestedKey(data, "page_info"));
}

const commentsArray = [];
for (const edge of myObj.edgesArray) {
  for (const node of edge) {
    commentsArray.push({
      username: node.node.user?.username,
      text: node.node.text,
      comment_like_count: node.node.comment_like_count,
    });
  }
}

// =================================
fetch("https://www.instagram.com/graphql/query", {
  headers: {
    "x-root-field-name": "xdt_api__v1__media__media_id__comments__connection",
  },
  method: "POST",
});
// the request that i want to capture is as below:
fetch("https://www.instagram.com/graphql/query", {
  headers: {
    "x-root-field-name": "xdt_api__v1__media__media_id__comments__connection",
  },
  method: "POST",
});
// on page give me page.on() code for puppeteer   3675173274767425015

fetch("https://www.instagram.com/api/v1/media/3675173274767425015/info/", {
  headers: {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    priority: "u=1, i",
    "sec-ch-prefers-color-scheme": "light",
    "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
    "sec-ch-ua-full-version-list": '"Not)A;Brand";v="8.0.0.0", "Chromium";v="138.0.7204.101", "Google Chrome";v="138.0.7204.101"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-model": '""',
    "sec-ch-ua-platform": '"Windows"',
    "sec-ch-ua-platform-version": '"10.0.0"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-asbd-id": "359341",
    "x-csrftoken": "usvvW4eoQz52KNXPpOB1e9",
    "x-ig-app-id": "936619743392459",
    "x-ig-www-claim": "hmac.AR3YARulAADSxUotiSbpJp1akgEoG7HFc-DIA4j939ojRJaU",
    "x-requested-with": "XMLHttpRequest",
    "x-web-session-id": "igy647:ln6zxy:b8noxo",
    cookie:
      'csrftoken=usvvW4eoQz52KNXPpOB1e9; ps_l=1; ps_n=1; mid=aDcY-AALAAHecj0sENg3Y-dI0bgS; ig_did=23BCD5E4-5B81-4419-8806-F1F79AF0D917; ig_nrcb=1; datr=9Rg3aLqDHunf0CHSq1zEmUYp; ds_user_id=64724107848; dpr=1.25; sessionid=64724107848%3Axcvhu1wtGLtK0c%3A8%3AAYd39eymmDbCp7-erg38mwHkYm0AVS5t4m4ctx6R_G8; wd=767x703; rur="CCO\\05464724107848\\0541783951628:01fed2c7e3003561b2bad1d37d64cdee109194b4057cc2b4891f57cf1222e39fe740fb96"',
    Referer: "https://www.instagram.com/chandani144__/reel/DMA1p8ahX33/",
  },
  body: null,
  method: "GET",
});
