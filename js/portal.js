(function () {
  var GROUPS = {
    buy: [
      { id: "plans", label: "Plans" },
      { id: "contracts", label: "Contract List" },
      { id: "history", label: "Transaction History" }
    ],
    metrics: [
      { id: "metrics", label: "Dashboard" },
      { id: "objectives", label: "Program Objectives" },
      { id: "trades", label: "Trading History" },
      { id: "certificates", label: "Certificates" }
    ],
    support: [
      { id: "support", label: "Support Ticket" },
      { id: "faq", label: "FAQ", href: "faq.html" },
      { id: "kyc", label: "KYC" }
    ],
    payouts: [
      { id: "payout", label: "Trading account" },
      { id: "affiliate-payout", label: "Affiliate Payout" },
      { id: "withdrawals", label: "Withdrawal History" }
    ],
    content: [
      { id: "podcasts", label: "Podcasts" },
      { id: "pdfs", label: "PDF Materials" },
      { id: "educators", label: "Partnered Educators" }
    ],
    platforms: [
      { id: "mt5", label: "MT5" },
      { id: "tradelocker", label: "Tradelocker" }
    ],
    affiliate: [
      { id: "affiliate", label: "Overview" },
      { id: "referral", label: "Referral" }
    ],
    settings: [
      { id: "profile", label: "Account Details" },
      { id: "billing", label: "Billing Details" }
    ]
  };

  var VIEW_GROUP = {};
  Object.keys(GROUPS).forEach(function (group) {
    GROUPS[group].forEach(function (item) {
      if (!item.href) VIEW_GROUP[item.id] = group;
    });
  });
  VIEW_GROUP.checkout = "buy";

  var PLANS = [
    { id: "standard", name: "Standard", phases: 2 },
    { id: "middle", name: "Middleweight", phases: 2, consistency: "30%" },
    { id: "light", name: "Lightweight", phases: 2, consistency: "50%", funded: "40%" },
    { id: "onestep", name: "1 Step Standard", phases: 1 },
    { id: "instant", name: "Instant Funding", phases: 0 }
  ];

  var SIZES = [
    { label: "5K", amount: 5000, was: "64.00", now: "$19.20" },
    { label: "10K", amount: 10000, was: "193.33", now: "$39.00" },
    { label: "25K", amount: 25000, was: "228.00", now: "$68.40" },
    { label: "50K", amount: 50000, was: "360.80", now: "$108.24" },
    { label: "100K", amount: 100000, was: "763.33", now: "$229.00" },
    { label: "200K", amount: 200000, was: "2115.00", now: "$634.50" },
    { label: "300K", amount: 300000, was: "3281.67", now: "$984.50" }
  ];

  var state = {
    plan: "standard",
    platform: "tradelocker",
    order: null,
    chart: "Balance",
    range: "ALL",
    accountOpen: false,
    accountFilter: "active",
    infoOpen: false,
    resetEnds: 0,
    dashFilter: "All",
    dashOpen: false,
    caseType: "general",
    videoCat: "Price Action",
    affCode: "",
    affLink: "",
    affNote: "",
    profileEdit: false,
    passwordEdit: false,
    profileFields: {
      nickname: "",
      first_name: "",
      last_name: "",
      country_code: "",
      contact: "",
      email: "",
      country: "Select your country",
      city: ""
    },
    passwordFields: {
      current_password: "",
      new_password: "",
      verifyPassword: ""
    }
  };
  var resetTimer = null;

  function esc(value) {
    return String(value).replace(/[&<>"]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char];
    });
  }

  function money(amount) {
    return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function currentId() {
    var id = (location.hash || "#plans").slice(1);
    return VIEW_GROUP[id] ? id : "plans";
  }

  function planById(id) {
    return PLANS.filter(function (plan) { return plan.id === id; })[0] || PLANS[0];
  }

  function sizeByLabel(label) {
    return SIZES.filter(function (size) { return size.label === label; })[0] || SIZES[0];
  }

  function rulesFor(plan, size) {
    var rows = [];
    if (plan.phases >= 1) rows.push(["Phase 1 Target", money(size.amount * 0.1)]);
    if (plan.phases >= 2) rows.push(["Phase 2 Target", money(size.amount * 0.05)]);
    rows.push(["Max. Daily Loss", money(size.amount * 0.04)]);
    rows.push(["Max. Loss", money(size.amount * 0.08)]);
    if (plan.phases === 0) rows.push(["Profit Split", "Bi-weekly 50%"]);
    rows.push(["Trading Period", "Unlimited"]);
    rows.push(["Min. Trading Days", "1"]);
    return rows;
  }

  function tabs(group, active) {
    return GROUPS[group].map(function (item) {
      var href = item.href || "#" + item.id;
      var on = item.id === active ? " is-on" : "";
      return '<a class="section-tab' + on + '" href="' + href + '">' + esc(item.label) + "</a>";
    }).join("");
  }

  function page(title, group, active, body) {
    return '<section class="page"><h1>' + esc(title) + "</h1>" + body + "</section>";
  }

  function table(headers, emptyText) {
    return '<div class="main_table"><table><thead><tr>' +
      headers.map(function (header) { return "<th>" + esc(header) + "</th>"; }).join("") +
      '</tr></thead><tbody></tbody></table><p class="no-data">' + esc(emptyText || "No Data found") + "</p></div>";
  }

  function goalGrid(rows) {
    return '<div class="goals">' + rows.map(function (row) {
      return '<div class="item_wrapper"><p class="title">' + esc(row[0]) + '</p><p class="value">' + esc(row[1]) + "</p></div>";
    }).join("") + "</div>";
  }

  function toast(message) {
    var el = document.getElementById("ckToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "ckToast";
      el.className = "ck-toast";
      el.setAttribute("role", "status");
      el.innerHTML = '<span class="ck-toast-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#07bc0c"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="ck-toast-text"></span><span class="ck-toast-bar"></span>';
      document.body.appendChild(el);
    }
    el.querySelector(".ck-toast-text").textContent = message;
    el.classList.remove("is-on");
    void el.offsetWidth;
    el.classList.add("is-on");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { el.classList.remove("is-on"); }, 2000);
  }

  function profileShell(active, body) {
    return '<section class="page myprofile"><div class="profile_header"><h4 class="myprofile_header">Profile</h4><div class="section-tabs">' +
      tabs("settings", active) + "</div></div>" + body + "</section>";
  }

  function accountField(label, name, placeholder) {
    var editable = state.profileEdit ? " editable" : "";
    return '<div class="account_input"><label for="' + name + '">' + label + '</label><br><div class="account_input_wrapper' +
      editable + '"><input class="account_details_input" id="' + name + '" name="' + name +
      '" type="text" placeholder="' + placeholder + '" value="' + esc(state.profileFields[name] || "") + '"></div></div>';
  }

  function editControls(editing, cancelAttr, editAttr) {
    if (!editing) return '<button class="save-btn" type="button" ' + editAttr + ">Edit</button>";
    return '<button type="button" class="cross_btn_editable" ' + cancelAttr + ' aria-label="Cancel"><img src="assets/portal/profile-cross.svg" alt=""></button>' +
      '<button class="save-changes" type="submit">Save Changes</button>';
  }

  function passwordField(label, name) {
    var editable = state.passwordEdit ? " editable" : "";
    return '<div class="account_input"><label for="' + name + '">' + label + '</label><br><div class="account_input_inner_wrapper">' +
      '<div class="password_conatiner' + editable + '"><input class="account_password_input" id="' + name + '" name="' + name +
      '" type="password" placeholder="' + label + '" value="' + esc(state.passwordFields[name] || "") + '">' +
      '<img class="eye_icon" data-eye src="assets/portal/eye-close.svg" alt="" width="24" height="24"></div></div></div>';
  }

  function accountDetails() {
    var contactEdit = state.profileEdit ? " editable" : "";
    return '<div class="generalinfo"><div class="general-info-wrapper"><div class="generalinfo_top"><div class="generalinfo_top_wrapper">' +
      '<div class="account_details_upper"><div class="account_details_upper_left"><div class="account_person_details">' +
        '<div class="account_img_wrapper"><img src="assets/portal/man-icon.svg" alt="" width="108" height="108"></div>' +
        '<div class="account_details_upper_content"><h4></h4></div></div></div></div>' +
      '<div class="account_details"><div class="account_details_lower"><form class="local-form profile-form"><div class="account_form">' +
        '<div class="account_form_header"><p class="form_heading">Personal Details</p><div class="account_form_btns">' +
          editControls(state.profileEdit, "data-profile-cancel", "data-profile-edit") + "</div></div>" +
        '<div class="account_fields"><div class="account_input_container_upper">' +
          accountField("Nick Name", "nickname", "Nick Name") +
          accountField("First Name", "first_name", "First Name") +
          accountField("Last Name", "last_name", "Last Name") +
          '<div class="account_input"><label for="contact">Contact Number</label><br><div class="contactNumber_div' + contactEdit + '">' +
            '<div class="countryCodeDiv' + contactEdit + '"><span class="contactNumber_p">+</span><input class="contactNumber_input" name="country_code" type="text" maxlength="4" value="' + esc(state.profileFields.country_code) + '"></div>' +
            '<div class="account_input_wrapper_contact' + contactEdit + '"><input class="account_details_input contact_input" id="contact" name="contact" type="text" maxlength="15" value="' + esc(state.profileFields.contact) + '"></div>' +
          "</div></div></div>" +
        '<div class="account_input_container_lower">' +
          accountField("Email", "email", "Email") +
          '<div class="account_input country_selector"><label for="country">Country</label><br><div class="account_input_wrapper' + contactEdit + '">' +
            '<select class="account_details_input" id="country" name="country"><option>Select your country</option></select></div></div>' +
          accountField("City", "city", "City") +
        "</div></div></div></form></div></div>" +
      '<div class="account_password"><form class="local-form password-form"><div class="account_password_input_container">' +
        '<div class="header_wrapper"><h3 class="password_header">Password</h3><div class="account_form_btns">' +
          editControls(state.passwordEdit, "data-pass-cancel", "data-pass-edit") + "</div></div>" +
        '<div class="account_password_inputs_wrapper">' +
          passwordField("Current Password", "current_password") +
          passwordField("New Password", "new_password") +
          passwordField("Verify Password", "verifyPassword") +
        "</div></div></form></div>" +
      '<div class="btns_wrapper"><a class="logout-btn" href="signin.html">Log Out</a></div>' +
      "</div></div></div></div>";
  }

  function billingDetails() {
    return '<div class="banks"><div class="banks_container">' +
      methodCard({
        name: "Rise",
        icon: "assets/portal/rise.svg",
        soon: false,
        lines: [
          "A Rise account is required for payouts.",
          ["Rise is a Web3-enabled payout and compliance platform for both Fiat and Crypto. For more information see: ", "https://www.riseworks.io/"],
          ["Please create an account with Rise and complete KYC to get your payout.", "https://www.riseworks.io/"],
          "Please submit the details you have used on your Rise account here."
        ]
      }) +
      methodCard({
        name: "Crypto",
        icon: "assets/portal/crypto.svg",
        soon: true,
        lines: [
          "A Crypto wallet is required for crypto payouts.",
          ["Submit your wallet address to receive payouts directly in crypto.", "https://crypto.com/en"],
          ["Please provide a valid wallet address to get your payout.", "https://crypto.com/en"],
          "Please submit the wallet address you'd like your crypto payouts sent to."
        ]
      }) +
      "</div></div>";
  }

  function methodCard(card) {
    var action = card.soon
      ? '<button class="edit-btn" type="button" disabled>Coming Soon</button>'
      : '<button class="edit-btn" type="button" data-method="' + esc(card.name) + '">My details</button>';
    var lines = card.lines.map(function (line) {
      if (typeof line === "string") return '<p class="account_desc">' + esc(line) + "</p>";
      return '<p class="account_desc">' + esc(line[0]) + ' <a href="' + line[1] + '" target="_blank" rel="noopener noreferrer">' + esc(line[1]) + "</a></p>";
    }).join("");
    return '<article class="radiobox"><div class="radiobox_header"><div class="unverified"><img src="assets/portal/unverified.svg" alt="">Not Submitted</div></div>' +
      '<div class="radiobox_content"><div class="account_type_row"><img src="' + card.icon + '" alt="' + esc(card.name) + '"><p class="account_type">' + esc(card.name) + "</p></div>" +
      lines + "</div>" +
      '<div class="radiobox_details"><div class="radiobox_buttons">' + action + "</div></div></article>";
  }

  function copyIcon() {
    return '<img src="assets/portal/copy.svg" width="18" height="18" alt="">';
  }

  function note() {
    return '<p class="demo-note" hidden>This demo stays on this site. Nothing is sent to CK Capital.</p>';
  }

  function form(fields, submitLabel) {
    var html = '<form class="local-form"><div class="form-grid">';
    fields.forEach(function (field) {
      var wide = field.wide ? " full" : "";
      html += '<label class="field' + wide + '"><span>' + esc(field.label) + "</span>";
      if (field.type === "textarea") {
        html += '<textarea name="' + esc(field.name) + '" placeholder="' + esc(field.label) + '"></textarea>';
      } else if (field.options) {
        html += '<select name="' + esc(field.name) + '">' + field.options.map(function (option) {
          return "<option>" + esc(option) + "</option>";
        }).join("") + "</select>";
      } else {
        html += '<input name="' + esc(field.name) + '" type="' + esc(field.type || "text") + '" placeholder="' + esc(field.label) + '">';
      }
      html += "</label>";
    });
    html += '</div><div class="form-actions"><button class="standard_button activePlanBtn" type="submit">' +
      esc(submitLabel) + "</button>" + note() + "</div></form>";
    return html;
  }

  function plansView() {
    var plan = planById(state.plan);
    var filters = PLANS.map(function (item) {
      var on = item.id === plan.id ? " activePlanBtn" : "";
      return '<button class="standard_button' + on + '" type="button" data-plan="' + item.id + '">' + esc(item.name) + "</button>";
    }).join("");
    var cards = SIZES.map(function (size) {
      var rows = rulesFor(plan, size).map(function (row) {
        return '<div class="item_wrapper"><p class="title">' + esc(row[0]) + '</p><p class="value">' + esc(row[1]) + "</p></div>";
      }).join("");
      var price = plan.id === "standard"
        ? 'Buy Now - <s>' + size.was + "</s> - " + size.now
        : "Buy Now";
      var split = plan.phases === 0
        ? ""
        : '<div class="item_wrapper profitSplit_wrapper"><p class="title">Profit Split Request</p><div class="value"><div class="profit_split">' +
          "<div><p>1-13</p><p>Days</p><p>50%</p></div>" +
          "<div><p>14-30</p><p>Days</p><p>75%</p></div>" +
          "<div><p>31+</p><p>Days</p><p>100%</p></div>" +
          "</div></div></div>";
      return '<article class="planbox">' +
        '<div class="planbox_header"><h4>Essential</h4><div><h2>' + size.label + "</h2><p>" + esc(plan.name) + "</p></div></div>" +
        '<div class="planbox_details">' + rows + split +
        '<div class="item_wrapper"><p class="title">For More Info</p><p class="value"><a class="gold" href="faq.html">See FAQ</a></p></div>' +
        (plan.consistency ? '<div class="item_wrapper"><p class="title">Consistency</p><p class="value">' + esc(plan.consistency) + "</p></div>" : "") +
        (plan.funded ? '<div class="item_wrapper"><p class="title">Funded Consistency</p><p class="value">' + esc(plan.funded) + "</p></div>" : "") +
        "</div>" +
        '<button class="planbox_btn" type="button" data-buy="' + size.label + '">' + price + "</button>" +
        "</article>";
    }).join("");
    var platforms = ["tradelocker", "mt5"].map(function (id) {
      var on = state.platform === id ? " activePlanBtn" : "";
      var label = id === "mt5" ? "MT5" : "TradeLocker";
      return '<button class="standard_button' + on + '" type="button" data-platform-btn="' + id + '">' + label + "</button>";
    }).join("");
    var body = '<div class="plans-container"><div class="plansTopHeader"><p class="seeFAQ"><a href="faq.html">See FAQ</a></p><div class="plansFilterBtns">' + filters +
      '</div><div class="plansFilterBtns trading_platform">' + platforms + "</div>" +
      '<select class="platform-select" data-platform aria-label="Trading platform">' +
      '<option value="tradelocker"' + (state.platform === "tradelocker" ? " selected" : "") + ">TradeLocker</option>" +
      '<option value="mt5"' + (state.platform === "mt5" ? " selected" : "") + ">MT5</option>" +
      "</select></div><div class=\"plans-subcontainer\">" + cards + "</div></div>";
    return page("Funding Evaluation", "buy", "plans", body);
  }

  function checkoutView() {
    var order = state.order;
    if (!order) return page("Payments", "buy", "plans", '<div class="panel"><p class="muted">Choose a plan from Funding Evaluation.</p></div>');
    var plan = planById(order.plan);
    var size = sizeByLabel(order.size);
    var lines = rulesFor(plan, size).map(function (row) {
      return "<li><span>" + esc(row[0]) + "</span><strong>" + esc(row[1]) + "</strong></li>";
    }).join("");
    var price = plan.id === "standard" ? size.now : "Shown on the Standard challenge";
    var body = '<div class="checkout-grid"><div class="panel"><h2>' + esc(plan.name) + " · " + esc(size.label) + " · " +
      esc(order.platform === "mt5" ? "MT5" : "TradeLocker") + '</h2><ul class="rule-list">' + lines +
      "</ul></div><div class=\"panel\"><h2>Summary</h2><ul class=\"rule-list\"><li><span>Price</span><strong>" +
      esc(price) + "</strong></li><li><span>Discount</span><strong>" + (plan.id === "standard" ? esc(size.was) : "—") +
      '</strong></li></ul>' + form([{ label: "Coupon", name: "coupon" }], "Pay") + "</div></div>";
    return page("Payments", "buy", "plans", body);
  }

  function metricsView() {
    var options = ["All", "Active", "Inactive"].map(function (name) {
      var on = state.dashFilter === name ? " active_menu_item" : " inactive_menu_item";
      return '<p class="menu_item' + on + '" data-dash="' + name + '">' + name + "</p>";
    }).join("");
    return '<section class="page dashboard"><div class="accounts_header"><div class="dashboard_nav_options">' +
      '<div class="accfilter_dropdown_wrapper"><button class="accfilter_dropdown" type="button" data-dash-toggle>' +
      esc(state.dashFilter) +
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1L5 5L9 1" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<div class="accfilter_dropdown_menu"' + (state.dashOpen ? "" : " hidden") + ">" + options + "</div></div>" +
      '<a class="add_account" href="#plans">Add Account</a></div></div>' +
      '<p class="no-data">No Data found</p></section>';
  }

  function statRow(label, value, extra) {
    return '<div class="statistic_details_Wrapper"><div class="statistic_info"><h5>' +
      esc(label) + '</h5><p' + (extra ? ' class="' + extra + '"' : "") + ">" + value + "</p></div></div>";
  }

  function performanceChart() {
    var levels = ["$5.00", "$4.00", "$3.00", "$2.00", "$1.00", "$0.00"];
    var grid = levels.map(function (label, index) {
      var y = 18 + index * 34;
      return '<text x="0" y="' + (y + 4) + '" fill="#6a796e" font-size="11" font-family="Noto Sans, sans-serif">' + label +
        '</text><line x1="54" y1="' + y + '" x2="680" y2="' + y + '" stroke="#2a2a2a"/>';
    }).join("");
    var days = ["24 Sep", "25 Sep", "26 Sep", "27 Sep", "28 Sep", "29 Sep", "30 Sep"];
    var ticks = days.map(function (day, index) {
      return '<text x="' + (78 + index * 92) + '" y="242" fill="#6a796e" font-size="11" text-anchor="middle" font-family="Noto Sans, sans-serif">' + day + "</text>";
    }).join("");
    return '<svg class="perf-chart" viewBox="0 0 680 256" role="img" aria-label="' + esc(state.chart) + ' chart">' +
      grid + '<polyline points="54,188 680,188" fill="none" stroke="#9a9a9a" stroke-width="1.5"/>' + ticks + "</svg>";
  }

  function goalCard(heading, target, recorded) {
    return '<article class="goalBox"><div class="goalBox_status"><p class="status">NA</p></div>' +
      '<div class="goalBox_progress" aria-hidden="true"><svg viewBox="0 0 120 62" width="110" height="56">' +
      '<path d="M8 58 A52 52 0 0 1 112 58" fill="none" stroke="#D0D0CE" stroke-width="8" stroke-linecap="round"/></svg></div>' +
      "<h1>" + esc(heading) + '</h1><div class="goalBox_details"><div class="minMax"><p>' + esc(heading) +
      " target</p><p>" + target + '</p></div><div class="resultRecord"><h2>' + esc(heading) + " recorded</h2><p>" + recorded + "</p></div></div></article>";
  }

  function objectivesView() {
    var modes = ["Balance", "Profit"].map(function (name) {
      return '<button type="button" data-chart="' + name + '"' + (state.chart === name ? ' class="is-on"' : "") + ">" + name + "</button>";
    }).join("");
    var ranges = ["1D", "1W", "1M", "ALL"].map(function (name) {
      return '<button type="button" data-range="' + name + '"' + (state.range === name ? ' class="is-on"' : "") + ">" + name + "</button>";
    }).join("");
    var goals = [
      ["Max loss", "NaN", "NaN"],
      ["Profit", "", ""],
      ["Daily loss", "", ""],
      ["Trading days", " Days", " Days"]
    ].map(function (item) { return goalCard(item[0], item[1], item[2]); }).join("");
    var stats = [
      statRow("Balance", "$NaN"),
      statRow("Equity", "$NaN"),
      statRow("Win Rate", "NaN%"),
      statRow("Lots", ""),
      statRow("No. of trade", ""),
      statRow("Account size", ""),
      statRow("Consistency", " %"),
      statRow("Next payout date", ""),
      statRow("Reset In", "13:18:56", "time_wrapper"),
      statRow("Reset Balance", "$NaN"),
      statRow("Reset Equity", "$NaN"),
      statRow("Trading Platform", ""),
      statRow("Best day date", ""),
      statRow("Best day profit", "$NaN")
    ].join("");
    return '<section class="programobjectives-container">' +
      '<div class="header-selector"><h4 class="programobjectives_header">Program Objectives</h4>' +
      '<button class="account-selector" type="button" data-account-toggle><span class="selected-account"><p></p></span>' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="7" viewBox="0 0 10 7" fill="none" aria-hidden="true"><path d="M1 1.5L5 5.5L9 1.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<div class="account-dropdown-selector ' + (state.accountOpen ? "visible" : "notVisible") + '">' +
      '<div class="filter-button"><button type="button" data-account-filter="active"' + (state.accountFilter === "active" ? ' class="active-filter-button"' : "") +
      '>Active</button><button type="button" data-account-filter="inactive"' + (state.accountFilter === "inactive" ? ' class="active-filter-button"' : "") +
      ">Inactive</button></div><div class=\"filter-accounts\"></div></div></div>" +
      '<div class="information-container"><div class="account-status status"><h2>N/A</h2></div>' +
      '<div class="program_objective_right_header"><button class="account-info-button" type="button" data-account-info><h2>Account Info</h2></button></div></div>' +
      '<div class="row1 infobox_main"><div class="financialperformance_main"><div class="financialperformance-container">' +
      "<h4>Financial Performance</h4><div class=\"Chart_tabination\"><div class=\"chart-modes\">" + modes +
      '</div><div class="toolbar">' + ranges + "</div></div><div class=\"chart_container\">" + performanceChart() +
      '</div><div class="addon_List"><div class="statistic_info"><h5>Add on:</h5><p>N/A</p></div></div></div></div>' +
      '<aside class="statistic-container"><div class="statistic-subcontainer"><h4>Statistic</h4><div class="statistic_details_container">' +
      stats + "</div></div></aside></div>" +
      '<div class="row2"><div class="goals_overview_contaniner"><div class="goalsHeading"><h1>Goals Overview</h1></div>' +
      '<div class="goalsContent">' + goals + "</div></div></div>" +
      '<div class="account-info-box"' + (state.infoOpen ? "" : " hidden") + '><div class="account-info-card" role="dialog" aria-label="Account Info">' +
      '<div class="account-info-top"><h3>Account Info</h3><button type="button" data-info-close>Close</button></div>' +
      "<ul><li><span>Id</span><strong>N/A</strong></li><li><span>Challenge</span><strong>N/A</strong></li>" +
      "<li><span>Phase</span><strong>N/A</strong></li><li><span>Start Date</span><strong>N/A</strong></li>" +
      "<li><span>Next Payout Date</span><strong>N/A</strong></li><li><span>Trading Platform</span><strong>N/A</strong></li>" +
      "<li><span>Add on</span><strong>No</strong></li></ul></div></div></section>";
  }

  function platformPage(title, options) {
    var list = options.map(function (item, index) {
      return '<option value="' + esc(item[1]) + '"' + (index === 0 ? " selected" : "") + ">" + esc(item[0]) + "</option>";
    }).join("");
    return page(title, "platforms", title === "MT5" ? "mt5" : "tradelocker",
      '<div class="platform-download"><select data-download-select>' + list +
      '</select><a class="standard_button activePlanBtn" data-download href="' + esc(options[0][1]) + '" target="_blank" rel="noopener">Download</a></div>');
  }

  function downloads(title, items) {
    var links = items.map(function (item) {
      return '<a href="' + esc(item.href) + '" target="_blank" rel="noopener">' + esc(item.label) + "</a>";
    }).join("");
    return '<article class="download-card"><h3>' + esc(title) + '</h3><div class="download-list">' + links + "</div></article>";
  }

  var views = {
    plans: plansView,
    checkout: checkoutView,
    contracts: function () {
      return page("Contract List", "buy", "contracts", '<div class="panel">' +
        table(["Id", "Challenge Name", "Phase", "Trading Platform", "Price", "Start Date", "Status"]) + "</div>");
    },
    history: function () {
      return page("Payment History", "buy", "history", '<div class="panel">' +
        table(["#", "Funding Evaluation", "Account Number", "Transaction Id", "Date", "Amount", "Invoice", "Status"]) + "</div>");
    },
    metrics: metricsView,
    objectives: objectivesView,
    trades: function () {
      var columns = state.platform === "mt5"
        ? ["Action", "Position", "Symbol", "Open Date", "Close Date", "Profit", "Commission", "Swap", "Avg Price Buy", "Avg Price Sell", "Stop Loss", "Take Profit"]
        : ["Instrument", "Open Date/Time", "Order Type", "Position Side", "Close Amount", "Average Open Price", "Close Price", "Close Date/Time", "Open Amount", "Commission", "Swap", "Profit", "Net Profit"];
      return '<section class="page tradingactivity-container"><div class="tradingactivity-container_header"><h2>Trading History</h2></div>' +
        table(columns, "No trades found!") + "</section>";
    },
    certificates: function () {
      return '<section class="page"><p class="certs-title">Certificates</p><p class="no-data">No certificates found</p></section>';
    },
    support: function () {
      return '<section class="page initialSupportPage">' +
        '<div class="upper_section">' +
          '<div class="upper_one"><h2 class="title">Support Center</h2></div>' +
          '<a class="upper_two" href="https://bit.ly/dc-ckcapital" target="_blank" rel="noopener noreferrer">' +
            '<p>Connect on Discord</p>' +
            '<img src="assets/portal/discord-gold.svg" width="25" height="25" alt="">' +
          "</a>" +
        "</div>" +
        '<div class="video_section">' +
          '<div class="iframe_video">' +
            "<h2>How to create Support Ticket?</h2>" +
            '<iframe class="iFrame" src="https://www.youtube.com/embed/0_YzykTGzOM?si=DtYk5O0uUVUDaRyF" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>' +
          "</div>" +
        "</div>" +
      "</section>";
    },
    kyc: function () {
      return page("KYC", "support", "kyc",
        '<div class="panel"><h2>Identity verification</h2><p class="status">Not verified</p>' +
        form([
          { label: "Document type", name: "doc", options: ["Passport", "Driving licence", "National ID"] },
          { label: "Document number", name: "number" },
          { label: "Front of document", name: "front", type: "file" },
          { label: "Back of document", name: "back", type: "file" }
        ], "Submit") + "</div>");
    },
    payout: function () {
      return page("Request Payout", "payouts", "payout",
        '<div class="panel"><h2>Trading account</h2>' + form([
          { label: "Choose Account Login ID*", name: "login", options: ["No funded account"] },
          { label: "Amount", name: "amount", type: "number" },
          { label: "Method", name: "method", options: ["Bank", "Crypto"] },
          { label: "Reason", name: "reason", type: "textarea", wide: true }
        ], "Request payout") + '<p class="muted">Profit split is 50% for days 1–13, 75% for days 14–30, and 100% from day 31.</p></div>');
    },
    "affiliate-payout": function () {
      return page("Affiliate Payout", "payouts", "affiliate-payout",
        '<div class="stat-row"><div class="stat"><span>Available</span><strong>$0.00</strong></div><div class="stat"><span>Minimum payout</span><strong>$250</strong></div></div>' +
        '<div class="panel">' + form([
          { label: "Amount", name: "amount", type: "number" },
          { label: "Method", name: "method", options: ["Bank", "Crypto"] }
        ], "Request payout") + "</div>");
    },
    withdrawals: function () {
      return page("Withdrawal History", "payouts", "withdrawals", '<div class="panel">' +
        table(["Date", "Type", "Amount", "Method", "Status"]) + "</div>");
    },
    podcasts: function () {
      return '<section class="page TradeEducation"><div class="Trade_edu_main"><h1 class="title">Blogs</h1><div class="tradeCard_main"></div></div></section>';
    },
    pdfs: function () {
      return '<section class="page TradeEducation"><div class="PDFMailer_main"><h1 class="title">PDFs</h1><div class="pdf_Main"></div></div></section>';
    },
    educators: function () {
      var cats = ["Price Action", "Swing", "FNO", "Misc"];
      var pills = cats.map(function (name) {
        var on = state.videoCat === name ? " tabination-toggle" : "";
        return '<button type="button" class="' + on + '" data-video-cat="' + esc(name) + '">' + esc(name) + "</button>";
      }).join("");
      return '<section class="page TradeEducation"><div class="Strategy_Videos_main">' +
        '<h1 class="title">Educational Videos</h1>' +
        '<div class="youtub_main">' +
          '<div class="tabination"><div class="tabination-container variant_5"><div class="tabination-subcontainer">' + pills + "</div></div></div>" +
        "</div></div></section>";
    },
    mt5: function () {
      return platformPage("MT5", [
        ["Windows", "https://download.mql5.com/cdn/web/metaquotes.ltd/mt5/mt5setup.exe?utm_source=www.metatrader5.com&utm_campaign=download"],
        ["Mac OS", "https://download.mql5.com/cdn/web/metaquotes.ltd/mt5/MetaTrader5.pkg.zip?utm_source=www.metatrader5.com&utm_campaign=download.mt5.macos"],
        ["Web Terminal", "https://web.metatrader.app/terminal?lang=en"],
        ["Linux", "https://www.mql5.com/en/articles/625?utm_source=www.metatrader5.com&utm_campaign=download.mt5.linux"]
      ]);
    },
    tradelocker: function () {
      return platformPage("TradeLocker", [
        ["Windows", "https://tradelocker-desktop.s3.amazonaws.com/tradelocker/win32/x64/TradeLocker.exe"],
        ["Mac OS Intel", "https://tradelocker-desktop.s3.amazonaws.com/tradelocker/darwin/x64/TradeLocker.dmg"],
        ["Mac OS Silicon", "https://tradelocker-desktop.s3.amazonaws.com/tradelocker/darwin/arm64/TradeLocker.dmg"]
      ]);
    },
    affiliate: function () {
      var stats = [
        ["Clicks", "0"],
        ["Pushed Leads", "0"],
        ["Commissions", "$0.00"],
        ["Conversions", "0"],
        ["AFS Payout Date", "-"]
      ].map(function (item) {
        return '<article class="card-container info_box"><div class="content_div"><h4 class="upper_title">' +
          esc(item[0]) + '</h4><h2 class="upper_value">' + esc(item[1]) + "</h2></div></article>";
      }).join("");
      return '<section class="page overview">' +
        '<h4 class="overview-header">Overview</h4>' +
        '<div class="grid_container"><div class="column column-70">' +
          '<h2 class="column-header">Clicks Statistic</h2>' +
          '<div class="row-1"><div class="infobox_col1_container">' + stats + "</div></div>" +
        "</div></div>" +
        '<div class="overview_table"><div class="table_wrapper">' +
          '<div class="table_header"><h2>Financial Performance/Transaction</h2><button class="show-more-button" type="button">Show More</button></div>' +
          '<div class="affiliate-box-wrapper"></div>' +
          '<div class="affiliate_list_details"><h2>Affiliate code Details:-</h2>' +
          table(["ID", "Payment User Email", "Payment User"]) +
          "</div></div></div></section>";
    },
    referral: function () {
      var noteText = state.affNote ? '<p class="demo-note">' + esc(state.affNote) + "</p>" : '<p class="demo-note" hidden></p>';
      return '<section class="page affiliate_codes">' +
        "<h4>Referrals</h4>" +
        '<div class="affiliate_table"><div class="commission_link_wrapper">' +
          '<div class="commission_rate_container"><div class="commission_rate">' +
            '<div class="coupon_code"><div class="common_container"><p>Flat 10% for all the Users</p></div></div>' +
            '<div class="code_generator"><div class="commission_rate_wrapper"><div class="rate"><p>0%</p></div></div></div>' +
            '<button class="genrate_button standard_button activePlanBtn" type="button" data-generate>Generate</button>' +
          "</div></div>" +
          '<div class="get_a_link_container"><div class="get_a_link_containerOne"><div class="coupon_code">' +
            '<div class="common_container"><h4>Your Unique Affiliate Code is</h4>' +
              '<div class="input_div"><input id="affCode" class="input_container" type="text" maxlength="15" placeholder="Coupon Code" value="' + esc(state.affCode) + '">' +
              '<button type="button" data-copy-code aria-label="Copy code">' + copyIcon() + "</button></div></div>" +
            '<div class="common_container"><h4>Your Affiliate link</h4>' +
              '<div class="input_div"><input id="refLink" class="copy_text" type="text" readonly placeholder="Fill Coupon code field to get link" value="' + esc(state.affLink) + '">' +
              '<button type="button" data-copy aria-label="Copy link">' + copyIcon() + "</button></div></div>" +
          "</div></div></div>" +
        "</div>" + noteText + "</div></section>";
    },
    profile: function () {
      return profileShell("profile", accountDetails());
    },
    verification: function () {
      return profileShell("profile", accountDetails());
    },
    billing: function () {
      return profileShell("billing", billingDetails());
    }
  };

  function paint() {
    var id = currentId();
    var view = document.getElementById("view");
    view.innerHTML = (views[id] || views.plans)();
    document.querySelectorAll(".nav_item").forEach(function (link) {
      link.classList.toggle("active_item", link.getAttribute("data-group") === VIEW_GROUP[id]);
    });
    document.querySelectorAll(".sub_menu_item").forEach(function (link) {
      var href = link.getAttribute("href") || "";
      link.classList.toggle("active_sub_menu_item", href === "#" + id);
    });
    document.querySelectorAll(".profile").forEach(function (link) {
      link.classList.toggle("is-on", VIEW_GROUP[id] === "settings");
    });
    document.title = "CK Capital";
    startReset();
  }

  function startReset() {
    clearInterval(resetTimer);
    if (currentId() !== "objectives") return;
    if (!state.resetEnds) state.resetEnds = Date.now() + ((13 * 3600 + 18 * 60 + 56) * 1000);
    function tick() {
      var el = document.querySelector(".time_wrapper");
      if (!el) return;
      var left = Math.max(0, state.resetEnds - Date.now());
      var total = Math.floor(left / 1000);
      var hours = String(Math.floor(total / 3600)).padStart(2, "0");
      var minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
      var seconds = String(total % 60).padStart(2, "0");
      el.textContent = hours + ":" + minutes + ":" + seconds;
    }
    tick();
    resetTimer = setInterval(tick, 1000);
  }

  document.getElementById("burger").addEventListener("click", function () {
    document.querySelector(".portal-head").classList.toggle("is-open");
  });

  document.getElementById("nav").addEventListener("click", function (event) {
    var title = event.target.closest(".main_header_titles");
    if (window.matchMedia("(max-width: 1100px)").matches && event.target.closest(".nav_item") && title) {
      event.preventDefault();
      title.classList.toggle("is-open");
    }
  });

  document.getElementById("view").addEventListener("input", function (event) {
    var name = event.target.name;
    if (name && Object.prototype.hasOwnProperty.call(state.profileFields, name)) {
      state.profileFields[name] = event.target.value;
    }
    if (name && Object.prototype.hasOwnProperty.call(state.passwordFields, name)) {
      state.passwordFields[name] = event.target.value;
    }
  });

  document.getElementById("view").addEventListener("click", function (event) {
    var chartBtn = event.target.closest("[data-chart]");
    if (chartBtn) {
      state.chart = chartBtn.getAttribute("data-chart");
      paint();
      return;
    }
    var rangeBtn = event.target.closest("[data-range]");
    if (rangeBtn) {
      state.range = rangeBtn.getAttribute("data-range");
      paint();
      return;
    }
    if (event.target.closest("[data-account-toggle]")) {
      state.accountOpen = !state.accountOpen;
      paint();
      return;
    }
    var filterBtn = event.target.closest("[data-account-filter]");
    if (filterBtn) {
      state.accountFilter = filterBtn.getAttribute("data-account-filter");
      state.accountOpen = true;
      paint();
      return;
    }
    if (event.target.closest("[data-dash-toggle]")) {
      state.dashOpen = !state.dashOpen;
      paint();
      return;
    }
    var dashItem = event.target.closest("[data-dash]");
    if (dashItem) {
      state.dashFilter = dashItem.getAttribute("data-dash");
      state.dashOpen = false;
      paint();
      return;
    }
    var caseCard = event.target.closest("[data-case]");
    if (caseCard) {
      state.caseType = caseCard.getAttribute("data-case");
      paint();
      return;
    }
    if (event.target.closest("[data-account-info]")) {
      state.infoOpen = true;
      paint();
      return;
    }
    if (event.target.closest("[data-info-close]") || event.target.classList.contains("account-info-box")) {
      state.infoOpen = false;
      paint();
      return;
    }
    var platformBtn = event.target.closest("[data-platform-btn]");
    if (platformBtn) {
      state.platform = platformBtn.getAttribute("data-platform-btn");
      paint();
      return;
    }
    var videoCat = event.target.closest("[data-video-cat]");
    if (videoCat) {
      state.videoCat = videoCat.getAttribute("data-video-cat");
      paint();
      return;
    }
    var planBtn = event.target.closest("[data-plan]");
    if (planBtn) {
      state.plan = planBtn.getAttribute("data-plan");
      paint();
      return;
    }
    var buy = event.target.closest("[data-buy]");
    if (buy) {
      state.order = { plan: state.plan, size: buy.getAttribute("data-buy"), platform: state.platform };
      location.hash = "checkout";
      return;
    }
    if (event.target.closest("[data-create]")) {
      var formPanel = document.getElementById("caseForm");
      var listPanel = document.getElementById("caseList");
      if (formPanel) formPanel.hidden = false;
      if (listPanel) listPanel.hidden = true;
      return;
    }
    if (event.target.closest("[data-cases]")) {
      var formPanel2 = document.getElementById("caseForm");
      var listPanel2 = document.getElementById("caseList");
      if (formPanel2) formPanel2.hidden = true;
      if (listPanel2) listPanel2.hidden = false;
      return;
    }
    if (event.target.closest("[data-generate]")) {
      var codeEl = document.getElementById("affCode");
      var code = (codeEl && codeEl.value || "").trim().toUpperCase();
      if (!code) {
        state.affNote = "Enter a coupon code. This demo stays on this site.";
        paint();
        return;
      }
      state.affCode = code;
      state.affLink = new URL("signup.html?code=" + encodeURIComponent(code), location.href).href;
      state.affNote = "Code saved on this demo. Nothing is sent to CK Capital.";
      paint();
      return;
    }
    if (event.target.closest("[data-copy-code]")) {
      var coupon = document.getElementById("affCode");
      toast("Your Unique Coupon Code Copied!");
      if (navigator.clipboard && coupon) navigator.clipboard.writeText(coupon.value || "").catch(function () {});
      return;
    }
    if (event.target.closest("[data-copy]")) {
      var input = document.getElementById("refLink");
      toast("Your affiliate Code link Copied!");
      if (navigator.clipboard && input) navigator.clipboard.writeText(input.value || "").catch(function () {});
      return;
    }
    if (event.target.closest("[data-profile-edit]")) {
      state.profileEdit = true;
      paint();
      return;
    }
    if (event.target.closest("[data-profile-cancel]")) {
      state.profileEdit = false;
      paint();
      return;
    }
    if (event.target.closest("[data-pass-edit]")) {
      state.passwordEdit = true;
      paint();
      return;
    }
    if (event.target.closest("[data-pass-cancel]")) {
      state.passwordEdit = false;
      paint();
      return;
    }
    var eye = event.target.closest("[data-eye]");
    if (eye) {
      var pass = eye.parentElement.querySelector("input");
      if (pass && !pass.disabled) {
        var show = pass.type === "password";
        pass.type = show ? "text" : "password";
        eye.src = show ? "assets/portal/eye-blue.svg" : "assets/portal/eye-close.svg";
      }
      return;
    }
    if (event.target.closest("[data-method]")) {
      toast("This demo stays on this site. Nothing is sent to CK Capital.");
    }
  });

  document.getElementById("view").addEventListener("change", function (event) {
    if (event.target.matches("[data-platform]")) {
      state.platform = event.target.value;
    }
    if (event.target.matches("[data-download-select]")) {
      var link = event.target.parentElement.querySelector("[data-download]");
      if (link) link.href = event.target.value;
    }
  });

  document.getElementById("view").addEventListener("submit", function (event) {
    var formEl = event.target.closest(".local-form");
    if (!formEl) return;
    event.preventDefault();
    if (formEl.classList.contains("profile-form")) {
      state.profileEdit = false;
      fetch("api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.profileFields)
      }).then(function (response) {
        if (!response.ok) throw new Error("save failed");
        toast("Personal details saved in this site's database. Nothing is sent to CK Capital.");
        paint();
      }).catch(function () {
        toast("Could not save to the database. Nothing is sent to CK Capital.");
        paint();
      });
      return;
    }
    if (formEl.classList.contains("password-form")) {
      state.passwordEdit = false;
      toast("This demo stays on this site. Nothing is sent to CK Capital.");
      paint();
      return;
    }
    var noteEl = formEl.querySelector(".demo-note");
    if (noteEl) noteEl.hidden = false;
  });

  fetch("api/profile").then(function (response) {
    return response.ok ? response.json() : null;
  }).then(function (data) {
    if (!data || !data.profile) return;
    Object.keys(state.profileFields).forEach(function (key) {
      if (data.profile[key] != null) state.profileFields[key] = data.profile[key];
    });
  }).catch(function () {}).then(function () {
    window.addEventListener("hashchange", paint);
    paint();
  });
})();
