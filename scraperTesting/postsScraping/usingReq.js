const fs = require("fs-extra");
const main = async function () {
  console.log(`Started........`);

  const response = await fetch("https://www.instagram.com/api/v1/media/3675173274767425015/comments/", {
    //   const response = await fetch("https://www.instagram.com/api/v1/media/3675173274767425015/comments/?can_support_threading=true&permalink_enabled=false", {
    //   const response = await fetch("https://www.instagram.com/api/v1/media/3675758967867786132/comments/", {
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
      "x-ig-www-claim": "hmac.AR3YARulAADSxUotiSbpJp1akgEoG7HFc-DIA4j939ojRFSr",
      "x-requested-with": "XMLHttpRequest",
      "x-web-session-id": "9v5uoq:bbi5eu:gim9ts",
      cookie:
        'csrftoken=usvvW4eoQz52KNXPpOB1e9; ps_l=1; ps_n=1; mid=aDcY-AALAAHecj0sENg3Y-dI0bgS; ig_did=23BCD5E4-5B81-4419-8806-F1F79AF0D917; ig_nrcb=1; datr=9Rg3aLqDHunf0CHSq1zEmUYp; ds_user_id=64724107848; dpr=1.25; sessionid=64724107848%3Axcvhu1wtGLtK0c%3A8%3AAYd39eymmDbCp7-erg38mwHkYm0AVS5t4m4ctx6R_G8; wd=767x703; rur="CCO\\05464724107848\\0541783953669:01fe1984847e9ce046f79aed5202d6938854299968511b260b1280a9a60254751d74f112"',
      Referer: "https://www.instagram.com/chandani144__/reel/DMA1p8ahX33/",
    },
    body: null,
    method: "GET",
  });
  const resJSON = await response.json();
  console.log(`=========================`);
  console.log(resJSON);
  await fs.appendFile("./scraperTesting/postsScraping/response.json", JSON.stringify(resJSON, null, 2) + ",\n");
  console.log(`=========================`);
  console.log(`Ended.......`);

  const response2 = await fetch(
    "https://www.instagram.com/api/v1/media/3675173274767425015/comments/?can_support_threading=true&min_id=%7B%22bifilter_token%22%3A%20%22KDEAoxs2ii8OQQCzCpiRqJpAADQR-_FpoT8A1TR1a31NQADaYunPOfM_AMySNbPkMkAAAA%3D%3D%22%7D&sort_order=popular",
    {
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
        "x-ig-www-claim": "hmac.AR3YARulAADSxUotiSbpJp1akgEoG7HFc-DIA4j939ojRHJq",
        "x-requested-with": "XMLHttpRequest",
        "x-web-session-id": "20qzs0:xoyez0:2wbher",
        cookie:
          'csrftoken=usvvW4eoQz52KNXPpOB1e9; ps_l=1; ps_n=1; mid=aDcY-AALAAHecj0sENg3Y-dI0bgS; ig_did=23BCD5E4-5B81-4419-8806-F1F79AF0D917; ig_nrcb=1; datr=9Rg3aLqDHunf0CHSq1zEmUYp; ds_user_id=64724107848; dpr=1.25; wd=802x703; sessionid=64724107848%3Axcvhu1wtGLtK0c%3A8%3AAYepXhGS2kB4gnTknv1YcKxV-BK03xedyQeCnyWiIQ0; rur="CCO\\05464724107848\\0541784034418:01fec476e32b808d6f81da4efac3cd0e77683277ff2c1ad11cedede870f917e4c3a4230e"',
        Referer: "https://www.instagram.com/chandani144__/reel/DMA1p8ahX33/",
      },
      body: null,
      method: "GET",
    }
  );
};
main();

// useFull requests copied as nodeJS fetch
const req1 = fetch("https://www.instagram.com/api/v1/media/3675173274767425015/info/", {
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
    "x-ig-www-claim": "hmac.AR3YARulAADSxUotiSbpJp1akgEoG7HFc-DIA4j939ojRPDb",
    "x-requested-with": "XMLHttpRequest",
    "x-web-session-id": "4vljj8:dcwgjh:6d21p4",
    cookie:
      'csrftoken=usvvW4eoQz52KNXPpOB1e9; ps_l=1; ps_n=1; mid=aDcY-AALAAHecj0sENg3Y-dI0bgS; ig_did=23BCD5E4-5B81-4419-8806-F1F79AF0D917; ig_nrcb=1; datr=9Rg3aLqDHunf0CHSq1zEmUYp; ds_user_id=64724107848; dpr=1.25; sessionid=64724107848%3Axcvhu1wtGLtK0c%3A8%3AAYepXhGS2kB4gnTknv1YcKxV-BK03xedyQeCnyWiIQ0; wd=500x703; rur="CCO\\05464724107848\\0541784034712:01fed7e4a4e7f951eb03e446bb875b08eab7ced4699968dab184021101572f012a04b0d9"',
    Referer: "https://www.instagram.com/chandani144__/reel/DMA1p8ahX33/",
  },
  body: null,
  method: "GET",
});
