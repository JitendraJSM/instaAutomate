const findTextInDom = (text) => {
  const allEls = $$("*");
  const textContentOfAllEls = allEls.map((el) => el.textContent);
  return allEls.find((el) => el.textContent.trim() === text);
};
