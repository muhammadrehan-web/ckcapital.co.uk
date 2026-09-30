const COUNTRIES = [
  ["Albania", "355"], ["Algeria", "213"], ["American Samoa", "1684"], ["Andorra", "376"], ["Angola", "244"],
  ["Anguilla", "1264"], ["Antarctica", "672"], ["Antigua and Barbuda", "1268"], ["Argentina", "54"], ["Armenia", "374"],
  ["Aruba", "297"], ["Australia", "61"], ["Austria", "43"], ["Azerbaijan", "994"], ["Bahamas", "1242"],
  ["Bahrain", "973"], ["Bangladesh", "880"], ["Barbados", "1246"], ["Belgium", "32"], ["Belize", "501"],
  ["Benin", "229"], ["Bermuda", "1441"], ["Bhutan", "975"], ["Bolivia", "591"], ["Bosnia and Herzegovina", "387"],
  ["Botswana", "267"], ["Brazil", "55"], ["British Indian Ocean Territory", "246"], ["British Virgin Islands", "1284"], ["Brunei", "673"],
  ["Bulgaria", "359"], ["Burkina Faso", "226"], ["Cambodia", "855"], ["Cameroon", "237"], ["Canada", "1"],
  ["Cape Verde", "238"], ["Cayman Islands", "1345"], ["Chad", "235"], ["Chile", "56"], ["China", "86"],
  ["Christmas Island", "61"], ["Cocos Islands", "61"], ["Colombia", "57"], ["Comoros", "269"], ["Cook Islands", "682"],
  ["Costa Rica", "506"], ["Croatia", "385"], ["Curacao", "599"], ["Cyprus", "357"], ["Czech Republic", "420"],
  ["Denmark", "45"], ["Djibouti", "253"], ["Dominica", "1767"], ["Dominican Republic", "1809"], ["East Timor", "670"],
  ["Ecuador", "593"], ["Egypt", "20"], ["El Salvador", "503"], ["Equatorial Guinea", "240"], ["Estonia", "372"],
  ["Ethiopia", "251"], ["Falkland Islands", "500"], ["Fiji", "679"], ["Finland", "358"], ["France", "33"],
  ["French Polynesia", "689"], ["Gabon", "241"], ["Gambia", "220"], ["Georgia", "995"], ["Germany", "49"],
  ["Ghana", "233"], ["Gibraltar", "350"], ["Greece", "30"], ["Greenland", "299"], ["Grenada", "1473"],
  ["Guam", "1671"], ["Guatemala", "502"], ["Guernsey", "44"], ["Guinea", "224"], ["Guyana", "592"],
  ["Haiti", "509"], ["Honduras", "504"], ["Hong Kong", "852"], ["Hungary", "36"], ["Iceland", "354"],
  ["India", "91"], ["Indonesia", "62"], ["Ireland", "353"], ["Isle of Man", "44"], ["Israel", "972"],
  ["Italy", "39"], ["Ivory Coast", "225"], ["Jamaica", "1876"], ["Jersey", "44"], ["Jordan", "962"],
  ["Kazakhstan", "7"], ["Kenya", "254"], ["Kiribati", "686"], ["Kosovo", "383"], ["Kyrgyzstan", "996"],
  ["Laos", "856"], ["Latvia", "371"], ["Lesotho", "266"], ["Liberia", "231"], ["Liechtenstein", "423"],
  ["Lithuania", "370"], ["Luxembourg", "352"], ["Macao", "853"], ["Macedonia", "389"], ["Madagascar", "261"],
  ["Malawi", "265"], ["Maldives", "960"], ["Malta", "356"], ["Marshall Islands", "692"], ["Mauritania", "222"],
  ["Mauritius", "230"], ["Mayotte", "262"], ["Mexico", "52"], ["Micronesia", "691"], ["Moldova", "373"],
  ["Monaco", "377"], ["Mongolia", "976"], ["Montenegro", "382"], ["Montserrat", "1664"], ["Morocco", "212"],
  ["Mozambique", "258"], ["Namibia", "264"], ["Nauru", "674"], ["Nepal", "977"], ["Netherlands", "31"],
  ["Netherlands Antilles", "599"], ["New Caledonia", "687"], ["New Zealand", "64"], ["Nicaragua", "505"], ["Niger", "227"],
  ["Nigeria", "234"], ["Niue", "683"], ["Northern Mariana Islands", "1670"], ["Norway", "47"], ["Oman", "968"],
  ["Pakistan", "92"], ["Palau", "680"], ["Panama", "507"], ["Papua New Guinea", "675"], ["Paraguay", "595"],
  ["Peru", "51"], ["Philippines", "63"], ["Pitcairn", "64"], ["Poland", "48"], ["Portugal", "351"],
  ["Puerto Rico", "1787"], ["Qatar", "974"], ["Republic of the Congo", "242"], ["Reunion", "262"], ["Romania", "40"],
  ["Rwanda", "250"], ["Saint Barthelemy", "590"], ["Saint Helena", "290"], ["Saint Kitts and Nevis", "1869"], ["Saint Lucia", "1758"],
  ["Saint Martin", "590"], ["Saint Pierre and Miquelon", "508"], ["Saint Vincent and the Grenadines", "1784"], ["Samoa", "685"], ["San Marino", "378"],
  ["Sao Tome and Principe", "239"], ["Senegal", "221"], ["Serbia", "381"], ["Seychelles", "248"], ["Sierra Leone", "232"],
  ["Singapore", "65"], ["Sint Maarten", "1721"], ["Slovenia", "386"], ["Solomon Islands", "677"], ["South Africa", "27"],
  ["South Korea", "82"], ["Spain", "34"], ["Sri Lanka", "94"], ["Suriname", "597"], ["Svalbard and Jan Mayen", "47"],
  ["Swaziland", "268"], ["Sweden", "46"], ["Switzerland", "41"], ["Taiwan", "886"], ["Tajikistan", "992"],
  ["Tanzania", "255"], ["Thailand", "66"], ["Togo", "228"], ["Tokelau", "690"], ["Tonga", "676"],
  ["Trinidad and Tobago", "1868"], ["Tunisia", "216"], ["Turkey", "90"], ["Turkmenistan", "993"], ["Turks and Caicos Islands", "1649"],
  ["Tuvalu", "688"], ["U.S. Virgin Islands", "1340"], ["Uganda", "256"], ["Ukraine", "380"], ["United Kingdom", "44"],
  ["United States", "1"], ["Uruguay", "598"], ["Uzbekistan", "998"], ["Vanuatu", "678"], ["Vatican", "379"],
  ["Vietnam", "84"], ["Wallis and Futuna", "681"], ["Western Sahara", "212"], ["Zambia", "260"], ["Zimbabwe", "263"]
];

function setupSignupPickers() {
  if (!document.querySelector(".is-signup")) return;
  const countryMenu = document.querySelector("[data-menu=country]");
  const countryInput = document.querySelector("[name=country]");
  const codeInput = document.querySelector("[name=code]");
  if (!countryMenu || !countryInput) return;

  function showList(query) {
    const text = query.trim().toLowerCase();
    countryMenu.innerHTML = "";
    COUNTRIES.forEach(([name, code]) => {
      if (text && name.toLowerCase().indexOf(text) === -1) return;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.name = name;
      button.dataset.code = code;
      button.textContent = name;
      if (name.toLowerCase() === countryInput.value.trim().toLowerCase()) button.classList.add("is-on");
      countryMenu.appendChild(button);
    });
    countryMenu.hidden = countryMenu.children.length === 0;
  }

  countryInput.addEventListener("focus", () => showList(""));
  countryInput.addEventListener("input", () => showList(countryInput.value));
  countryMenu.addEventListener("mousedown", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    event.preventDefault();
    countryInput.value = button.dataset.name;
    if (codeInput) codeInput.value = button.dataset.code;
    countryMenu.hidden = true;
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-menu=country]") && event.target !== countryInput) {
      countryMenu.hidden = true;
    }
  });
}

setupSignupPickers();

document.querySelectorAll("[data-eye]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.parentElement.querySelector("input");
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
  });
});

document.querySelectorAll("form.auth-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (/forgot/.test(location.pathname)) {
      const note = form.querySelector(".auth-note");
      if (note) note.hidden = false;
      return;
    }
    if (/signup/.test(location.pathname)) {
      const robot = form.querySelector("[name=robot]");
      const note = form.querySelector(".auth-note");
      if (robot && !robot.checked) {
        if (note) {
          note.hidden = false;
          note.textContent = "Please confirm you are not a robot.";
        }
        return;
      }
    }
    location.href = "portal.html";
  });
});
